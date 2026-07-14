<?php

namespace App\Services;

use App\Models\TelegramChannel;
use App\Models\TelegramMessage;
use App\Repositories\ChannelRepository;
use App\Repositories\UserRepository;
use App\Support\Pagination;
use Carbon\Carbon;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChannelService
{
    public function __construct(
        private ChannelRepository $channelRepo,
        private UserRepository $userRepo,
        private TelegramAuthService $telegramAuth,
        private ApplicationEngineService $engine,
        private LogService $logService,
    ) {}

    public function list(array $filter, ?int $page, ?int $pageSize): array
    {
        $pagination = Pagination::resolve($page, $pageSize);
        ['items' => $items, 'total' => $total] = $this->channelRepo->list($filter, $pagination);

        return [
            'items' => $items,
            'page' => $pagination['page'],
            'pageSize' => $pagination['pageSize'],
            'total' => $total,
            'totalPages' => $pagination['pageSize'] > 0
                ? (int) ceil($total / $pagination['pageSize']) : 0,
        ];
    }

    public function create(string $userId, array $input): TelegramChannel
    {
        $user = $this->userRepo->findById($userId);
        if (!$user || !$user->telegram_verified_at) {
            throw new HttpException(422, 'Link your Telegram account before adding channels');
        }

        $resolved = $this->resolveChannel($user, $input['channelId']);

        $channel = $this->channelRepo->create([
            'userId' => $userId,
            'channelId' => $resolved['channelId'],
            'title' => $input['title'] ?: $resolved['title'],
            'username' => $input['username'] ?? $resolved['username'],
        ]);

        try {
            $this->syncHistory($userId, $channel->id);
        } catch (\Throwable $e) {
            $this->logService->warn('TELEGRAM', 'Initial channel sync failed', [
                'userId' => $userId,
                'channelId' => $channel->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $channel->fresh();
    }

    public function get(string $userId, string $id): TelegramChannel
    {
        $channel = $this->channelRepo->findById($userId, $id);
        if (!$channel) {
            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Channel not found');
        }
        return $channel;
    }

    public function update(string $userId, string $id, array $input): TelegramChannel
    {
        $this->get($userId, $id);
        return $this->channelRepo->update($id, $input);
    }

    public function remove(string $userId, string $id): void
    {
        $this->get($userId, $id);
        $this->channelRepo->delete($id);
    }

    public function setStatus(string $userId, string $id, string $status): TelegramChannel
    {
        $this->get($userId, $id);
        return $this->channelRepo->update($id, ['status' => $status]);
    }

    public function syncHistory(string $userId, string $channelDbId): array
    {
        $user = $this->userRepo->findById($userId);
        if (!$user || !$user->telegram_verified_at) {
            throw new HttpException(422, 'Telegram account is not linked');
        }

        $channel = $this->get($userId, $channelDbId);
        $api = $this->telegramAuth->makeUserApi($user);
        $peer = $channel->username ? '@' . ltrim($channel->username, '@') : $channel->channel_id;

        try {
            $resolved = $this->resolveChannel($user, $peer, $api);
            if (
                $resolved['channelId'] !== $channel->channel_id ||
                ($resolved['username'] && $resolved['username'] !== $channel->username)
            ) {
                $channel = $this->channelRepo->update($channel->id, [
                    'channel_id' => $resolved['channelId'],
                    'username' => $resolved['username'] ?? $channel->username,
                    'title' => $channel->title ?: $resolved['title'],
                    'status' => 'ACTIVE',
                ]);
            }

            // Incremental sync: only fetch messages newer than the last one
            // we already stored for this channel.
            $lastSyncedId = (int) TelegramMessage::where('channel_id', $channel->id)
                ->whereRaw("telegram_msg_id ~ '^[0-9]+$'")
                ->selectRaw("MAX(CAST(telegram_msg_id AS BIGINT)) as max_id")
                ->value('max_id');

            $history = $api->messages->getHistory(
                peer: $peer,
                offset_id: 0,
                offset_date: 0,
                add_offset: 0,
                limit: 50,
                max_id: 0,
                min_id: $lastSyncedId,
                hash: [],
            );

            $messages = array_reverse($history['messages'] ?? []);
            $processed = 0;
            $jobs = 0;

            foreach ($messages as $message) {
                $text = $message['message'] ?? '';
                $msgId = (int) ($message['id'] ?? 0);
                if (!$text || ($lastSyncedId && $msgId <= $lastSyncedId)) {
                    continue;
                }

                $processed++;
                $result = $this->engine->processMessage([
                    'userId' => $userId,
                    'channelId' => $channel->id,
                    'telegramMsgId' => (string) $msgId,
                    'rawText' => $text,
                    'replyMarkup' => $message['reply_markup'] ?? null,
                    'senderId' => isset($message['from_id']['user_id']) ? (string) $message['from_id']['user_id'] : null,
                    'messageDate' => Carbon::createFromTimestamp($message['date'] ?? time()),
                ]);

                $status = $result['status'] ?? 'IGNORED';
                if (!in_array($status, ['IGNORED', 'DUPLICATE'], true)) {
                    $jobs++;
                    $channel->update(['last_message_at' => now()]);
                }
            }

            // Score any jobs that were detected before the user had a profile
            $this->engine->scoreUnprocessedJobs($userId);

            $this->logService->info('TELEGRAM', 'Channel history synced', [
                'userId' => $userId,
                'channelId' => $channel->id,
                'processed' => $processed,
                'jobs' => $jobs,
            ]);

            return ['processed' => $processed, 'jobs' => $jobs];
        } catch (\Throwable $e) {
            $channel->update(['status' => 'ERROR']);
            $this->logService->error('TELEGRAM', 'Channel history sync failed', [
                'userId' => $userId,
                'channelId' => $channel->id,
                'error' => $e->getMessage(),
            ]);
            throw new HttpException(502, 'Failed to sync Telegram channel: ' . $e->getMessage());
        } finally {
            unset($api);
            gc_collect_cycles();
        }
    }

    public function syncAllForUser(string $userId): array
    {
        $user = $this->userRepo->findById($userId);
        if (!$user || !$user->telegram_verified_at) {
            throw new HttpException(422, 'Telegram account is not linked');
        }

        $channels = $this->channelRepo->findActiveForUser($userId);
        $totalProcessed = 0;
        $totalJobs = 0;
        $errors = [];

        foreach ($channels as $channel) {
            try {
                $result = $this->syncHistory($userId, $channel->id);
                $totalProcessed += $result['processed'];
                $totalJobs += $result['jobs'];
            } catch (\Throwable $e) {
                $errors[] = [
                    'channelId' => $channel->id,
                    'title'     => $channel->title,
                    'error'     => $e->getMessage(),
                ];
                $this->logService->warn('TELEGRAM', 'Sync failed for channel during sync-all', [
                    'userId'    => $userId,
                    'channelId' => $channel->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }

        return [
            'processed' => $totalProcessed,
            'jobs'      => $totalJobs,
            'channels'  => count($channels),
            'errors'    => $errors,
        ];
    }

    private function resolveChannel($user, string $identifier, $api = null): array
    {
        $api ??= $this->telegramAuth->makeUserApi($user);
        $peer = $this->normalizePeerIdentifier($identifier);

        try {
            $info = $api->getInfo($peer);
        } catch (\Throwable $e) {
            throw new HttpException(422, 'Unable to find or access Telegram channel ' . $identifier . ': ' . $e->getMessage());
        }

        $chat = $info['Chat'] ?? $info['User'] ?? [];
        $channelId = $info['bot_api_id'] ?? $info['channel_id'] ?? $info['chat_id'] ?? null;

        if (!$channelId) {
            throw new HttpException(422, 'Telegram did not return a usable channel id for ' . $identifier);
        }

        $username = $chat['username'] ?? $this->extractUsername($identifier);

        return [
            'channelId' => (string) $channelId,
            'title' => $chat['title'] ?? $chat['first_name'] ?? $username ?? $identifier,
            'username' => $username ? ltrim($username, '@') : null,
        ];
    }

    private function normalizePeerIdentifier(string $identifier): string
    {
        $identifier = trim($identifier);

        if (preg_match('~^(?:https?://)?t\.me/([^/?#]+)~i', $identifier, $match)) {
            return '@' . ltrim($match[1], '@');
        }

        if (preg_match('~^(?:https?://)?telegram\.me/([^/?#]+)~i', $identifier, $match)) {
            return '@' . ltrim($match[1], '@');
        }

        if (preg_match('~^[A-Za-z][A-Za-z0-9_]{3,}$~', $identifier)) {
            return '@' . $identifier;
        }

        return $identifier;
    }

    private function extractUsername(string $identifier): ?string
    {
        $normalized = $this->normalizePeerIdentifier($identifier);
        return str_starts_with($normalized, '@') ? ltrim($normalized, '@') : null;
    }
}

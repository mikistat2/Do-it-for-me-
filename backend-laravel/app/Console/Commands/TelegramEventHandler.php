<?php
declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\TelegramChannel;
use App\Services\ApplicationEngineService;
use App\Services\LogService;
use Carbon\Carbon;
use danog\MadelineProto\EventHandler;

 class TelegramEventHandler extends EventHandler
{
    public function onUpdateNewChannelMessage(array $update): void
    {
        $this->processUpdate($update);
    }

    public function onUpdateNewMessage(array $update): void
    {
        $this->processUpdate($update);
    }

    private function processUpdate(array $update): void
    {
        try {
            $message = $update['message'] ?? null;
            if (!$message || !isset($message['message']) || empty($message['message'])) {
                return;
            }

            $peerId = $message['peer_id']['channel_id']
                ?? $message['peer_id']['user_id']
                ?? $message['peer_id']['chat_id']
                ?? null;

            if (!$peerId) {
                return;
            }

            $chatId = (string) $peerId;
            $text = $message['message'];
            $msgId = $message['id'];
            $senderId = $message['from_id']['user_id'] ?? null;
            $date = Carbon::createFromTimestamp($message['date'] ?? time());

            $channels = TelegramChannel::where('channel_id', $chatId)
                ->where('status', 'ACTIVE')
                ->get();

            if ($channels->isEmpty()) {
                $cleanChatId = ltrim(str_replace('-100', '', $chatId), '-');
                $channels = TelegramChannel::whereIn('channel_id', [
                    $cleanChatId,
                    "-100{$cleanChatId}",
                    "-{$cleanChatId}"
                ])->where('status', 'ACTIVE')->get();
            }

            if ($channels->isEmpty()) {
                return;
            }

            $engine = app(ApplicationEngineService::class);
            $logService = app(LogService::class);

            $logService->info('TELEGRAM', 'Message received', [
                'chatId' => $chatId,
                'messageId' => $msgId,
            ]);

            foreach ($channels as $channel) {
                $result = $engine->processMessage([
                    'userId' => $channel->user_id,
                    'channelId' => $channel->id,
                    'telegramMsgId' => (string) $msgId,
                    'rawText' => $text,
                    'senderId' => $senderId ? (string) $senderId : null,
                    'messageDate' => $date,
                ]);

                if ($result['status'] !== 'IGNORED') {
                    $channel->update(['last_message_at' => now()]);
                }
            }
        } catch (\Throwable $e) {
            app(LogService::class)->error('TELEGRAM', 'Message processing failed', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}

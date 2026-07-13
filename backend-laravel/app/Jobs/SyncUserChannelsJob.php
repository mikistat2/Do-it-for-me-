<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\User;
use App\Services\ChannelService;
use App\Services\LogService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncUserChannelsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 2;

    /**
     * Timeout in seconds — channel sync can be slow over MTProto.
     */
    public int $timeout = 120;

    public function __construct(
        private string $userId
    ) {}

    public function handle(ChannelService $channelService, LogService $logService): void
    {
        $user = User::find($this->userId);

        if (!$user || !$user->telegram_session_path || !$user->telegram_verified_at) {
            Log::info('SyncUserChannelsJob: skipping — user not Telegram-verified', [
                'userId' => $this->userId,
            ]);
            return;
        }

        try {
            $logService->info('TELEGRAM', 'Auto-sync triggered on login', [
                'userId' => $this->userId,
            ]);

            $result = $channelService->syncAllForUser($this->userId);

            $logService->info('TELEGRAM', 'Auto-sync on login completed', [
                'userId'    => $this->userId,
                'processed' => $result['processed'],
                'jobs'      => $result['jobs'],
                'errors'    => count($result['errors']),
            ]);
        } catch (\Throwable $e) {
            Log::error('SyncUserChannelsJob failed', [
                'userId' => $this->userId,
                'error'  => $e->getMessage(),
            ]);
            // Don't rethrow — we don't want login-triggered sync failures to
            // fill the failed_jobs table. The scheduled sync-all will retry.
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\TelegramChannel;
use App\Models\User;
use App\Services\ChannelService;
use App\Services\LogService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncAllChannelsCommand extends Command
{
    protected $signature = 'telegram:sync-all';
    protected $description = 'Sync ALL Telegram channels (ACTIVE and ERROR) for every verified user';

    public function handle(ChannelService $channelService, LogService $logService): int
    {
        $this->info('Starting sync for all channels...');

        // Get all distinct user IDs that have at least one ACTIVE or ERROR channel
        $userIds = TelegramChannel::whereIn('status', ['ACTIVE', 'ERROR'])
            ->distinct()
            ->pluck('user_id');

        if ($userIds->isEmpty()) {
            $this->info('No syncable channels found.');
            return 0;
        }

        $totalProcessed = 0;
        $totalJobs = 0;
        $totalErrors = 0;
        $totalRecovered = 0;

        foreach ($userIds as $userId) {
            $user = User::find($userId);

            // Skip users without a linked Telegram session
            if (!$user || !$user->telegram_session_path || !$user->telegram_verified_at) {
                continue; // Silent skip — these users can't sync until they link Telegram
            }

            // Get ALL channels for this user (ACTIVE and ERROR — retry errors)
            $channels = TelegramChannel::where('user_id', $userId)
                ->whereIn('status', ['ACTIVE', 'ERROR'])
                ->get();

            foreach ($channels as $channel) {
                $wasError = $channel->status === 'ERROR';

                // If the channel was in ERROR, reset to ACTIVE before trying
                if ($wasError) {
                    $channel->update(['status' => 'ACTIVE']);
                    $this->info("  ↻ Retrying ERROR channel: {$channel->title}");
                }

                try {
                    $result = $channelService->syncHistory($userId, $channel->id);
                    $totalProcessed += $result['processed'];
                    $totalJobs += $result['jobs'];

                    if ($wasError) {
                        $totalRecovered++;
                        $this->info("  ✓ Recovered: {$channel->title} ({$result['processed']} messages, {$result['jobs']} jobs)");
                    } elseif ($result['jobs'] > 0) {
                        $this->info("  ✓ {$channel->title}: {$result['processed']} messages, {$result['jobs']} jobs found");
                    }
                } catch (\Throwable $e) {
                    $totalErrors++;
                    // syncHistory already sets status to ERROR on failure
                    $this->warn("  ✗ {$channel->title}: {$e->getMessage()}");
                    Log::warning('SyncAllChannels: channel sync failed', [
                        'userId'    => $userId,
                        'channelId' => $channel->id,
                        'title'     => $channel->title,
                        'error'     => $e->getMessage(),
                    ]);
                }
            }
        }

        $summary = "Sync complete: {$totalProcessed} messages, {$totalJobs} jobs, {$totalRecovered} recovered, {$totalErrors} errors";
        $this->info($summary);

        if ($totalProcessed > 0 || $totalRecovered > 0 || $totalErrors > 0) {
            $logService->info('TELEGRAM', 'Scheduled sync completed', [
                'processed' => $totalProcessed,
                'jobs'      => $totalJobs,
                'recovered' => $totalRecovered,
                'errors'    => $totalErrors,
            ]);
        }

        return 0;
    }
}

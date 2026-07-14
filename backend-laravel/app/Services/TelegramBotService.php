<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Interacts with third-party Telegram application bots on the user's
 * behalf, using their own linked MTProto session.
 *
 * Many job channels (Afriwork etc.) attach a "View Details / Apply"
 * button that deep-links into a bot: t.me/SomeBot?start=<job-payload>.
 * Launching that link is equivalent to sending "/start <payload>" to the
 * bot — which is exactly what messages.startBot does. Pre-launching means
 * the bot conversation for the right job is already open and waiting in
 * the user's Telegram when they get our notification.
 *
 * Mini App links (?startapp=) cannot be pre-launched server-side — the
 * app runs inside the official client only — so those are surfaced as a
 * clickable link in the web UI instead.
 */
class TelegramBotService
{
    public function __construct(
        private TelegramAuthService $telegramAuth,
        private JobDetectorService $jobDetector,
        private LogService $logService,
    ) {}

    /**
     * Open the apply bot for a job by sending /start <payload> from the
     * user's account. Returns true when the bot was actually started.
     */
    public function launchApplyBot(User $user, string $applyUrl): bool
    {
        if (!$user->telegram_verified_at || !$user->telegram_session_path) {
            return false;
        }

        $link = $this->jobDetector->parseStartBotLink($applyUrl);
        if (!$link) {
            // startapp / Mini App link — user must open it themselves
            return false;
        }

        $api = $this->telegramAuth->makeUserApi($user);
        try {
            $api->messages->startBot(
                bot: '@' . $link['bot'],
                peer: '@' . $link['bot'],
                start_param: $link['param'],
            );

            $this->logService->info('TELEGRAM', 'Apply bot launched', [
                'userId' => $user->id,
                'bot'    => '@' . $link['bot'],
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::warning('TelegramBotService: failed to launch apply bot', [
                'userId' => $user->id,
                'bot'    => $link['bot'],
                'error'  => $e->getMessage(),
            ]);
            return false;
        } finally {
            unset($api);
            gc_collect_cycles();
        }
    }
}

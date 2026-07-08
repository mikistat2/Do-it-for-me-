<?php
declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use danog\MadelineProto\API;
use danog\MadelineProto\Settings;
use danog\MadelineProto\Settings\AppInfo;
use App\Services\LogService;

class TelegramMonitorCommand extends Command
{
    protected $signature = 'telegram:monitor {--user= : Monitor channels for a specific user ID}';
    protected $description = 'Start the Telegram MTProto monitor daemon via MadelineProto';

    public function handle(LogService $logService)
    {
        $this->info('Starting Telegram MTProto Monitor...');

        $apiId = config('app.telegram_api_id');
        $apiHash = config('app.telegram_api_hash');

        if (!$apiId || !$apiHash) {
            $this->error('TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env');
            return 1;
        }

        $userId = $this->option('user');
        if (!$userId) {
            $this->error('Please specify --user=<user-id> to monitor with that user\'s Telegram session');
            $this->line('Each registered user has their own Telegram account linked during signup.');
            return 1;
        }

        $user = \App\Models\User::find($userId);
        if (!$user || !$user->telegram_session_path || !$user->telegram_verified_at) {
            $this->error('User not found or Telegram is not linked');
            return 1;
        }

        $settings = new Settings();
        $settings->setAppInfo((new AppInfo())->setApiId((int) $apiId)->setApiHash($apiHash));

        $this->info("Logged in as Telegram user {$user->telegram_user_id}");
        $logService->info('TELEGRAM', 'Telegram monitor started', ['userId' => $userId]);

        TelegramEventHandler::startAndLoop($user->telegram_session_path, $settings);
    }
}

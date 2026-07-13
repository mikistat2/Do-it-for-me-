<?php

use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DraftController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TelegramAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — mirrors Node.js routes/index.ts
|--------------------------------------------------------------------------
| Prefix: /api  (set in bootstrap/app.php)
| Auth guard: jwt (tymon/jwt-auth)
*/

// ── Health ──────────────────────────────────────────────────────────────
Route::get('/health', fn() => response()->json([
    'status' => 'ok',
    'uptime' => round(microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true))),
]));

Route::get('/abc', function () {
    return response()->json(['message' => 'Hello, World!']);
});
// ── Auth (public + rate-limited) ─────────────────────────────────────────
Route::prefix('auth')->middleware('throttle:30,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
    Route::post('/refresh',  [AuthController::class, 'refresh']);
    Route::post('/logout',   [AuthController::class, 'logout']);

    Route::prefix('telegram')->middleware('throttle:10,1')->group(function () {
        Route::post('/send-code',  [TelegramAuthController::class, 'sendCode']);
        Route::post('/verify',     [TelegramAuthController::class, 'verify']);
        Route::post('/verify-2fa', [TelegramAuthController::class, 'verify2fa']);
    });

    // Protected
    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// ── Authenticated routes ─────────────────────────────────────────────────
Route::middleware(['auth:api', 'throttle:200,1'])->group(function () {

    // Profile
    Route::prefix('profile')->group(function () {
        Route::get('/',  [ProfileController::class, 'get']);
        Route::put('/',  [ProfileController::class, 'update']);
    });

    // Settings
    Route::prefix('settings')->group(function () {
        Route::get('/',       [SettingsController::class, 'get']);
        Route::put('/',       [SettingsController::class, 'update']);
        Route::post('/pause', [SettingsController::class, 'pause']);
        Route::post('/resume',[SettingsController::class, 'resume']);
    });

    // Telegram Channels
    Route::prefix('channels')->group(function () {
        Route::get('/',             [ChannelController::class, 'list']);
        Route::post('/',            [ChannelController::class, 'create']);
        Route::post('/sync-all',    [ChannelController::class, 'syncAll']);
        Route::put('/{id}',         [ChannelController::class, 'update']);
        Route::delete('/{id}',      [ChannelController::class, 'remove']);
        Route::post('/{id}/sync',   [ChannelController::class, 'sync']);
    });

    // Jobs
    Route::prefix('jobs')->group(function () {
        Route::get('/',               [JobController::class, 'list']);
        Route::get('/{id}',           [JobController::class, 'get']);
        Route::post('/{id}/archive',  [JobController::class, 'archive']);
    });

    // Drafts
    Route::prefix('drafts')->group(function () {
        Route::get('/',                  [DraftController::class, 'list']);
        Route::get('/{id}',             [DraftController::class, 'get']);
        Route::put('/{id}',             [DraftController::class, 'update']);
        Route::post('/{id}/reject',     [DraftController::class, 'reject']);
        Route::post('/{id}/regenerate', [DraftController::class, 'regenerate']);
        Route::post('/{id}/approve',    [ApplicationController::class, 'approveDraft']);
    });

    // Applications
    Route::prefix('applications')->group(function () {
        Route::get('/',                       [ApplicationController::class, 'list']);
        Route::get('/{id}',                   [ApplicationController::class, 'get']);
        Route::post('/send',                  [ApplicationController::class, 'manualSend']);
        Route::post('/drafts/{id}/approve',   [ApplicationController::class, 'approveDraft']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/',              [NotificationController::class, 'list']);
        Route::get('/unread-count',  [NotificationController::class, 'unreadCount']);
        Route::match(['put', 'post'], '/read-all',  [NotificationController::class, 'markAllRead']);
        Route::match(['put', 'post'], '/{id}/read', [NotificationController::class, 'markRead']);
    });

    // Logs (admin guard could be added here)
    Route::prefix('logs')->group(function () {
        Route::get('/', [LogController::class, 'list']);
    });

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('/overview',    [DashboardController::class, 'overview']);
        Route::get('/statistics',  [DashboardController::class, 'statistics']);
    });

    // Automation
    Route::prefix('automation')->group(function () {
        Route::get('/status',    [AutomationController::class, 'status']);
        Route::post('/pause',    [AutomationController::class, 'pause']);
        Route::post('/resume',   [AutomationController::class, 'resume']);
    });
});

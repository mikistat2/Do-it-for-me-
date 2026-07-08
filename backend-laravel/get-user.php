<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::latest()->first();
if ($user) {
    echo "ID: {$user->id}\n";
    echo "Verified: " . ($user->telegram_verified_at ?? 'null') . "\n";
    echo "Path: " . ($user->telegram_session_path ?? 'null') . "\n";
} else {
    echo "No users found.\n";
}

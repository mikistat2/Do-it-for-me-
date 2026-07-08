<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$channels = App\Models\TelegramChannel::all();
foreach ($channels as $c) {
    echo "ID: " . $c->id . " | ChannelId: " . $c->channel_id . " | Status: " . $c->status . " | Name: " . $c->name . "\n";
}

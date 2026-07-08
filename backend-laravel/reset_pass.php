<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = App\Models\User::first();
if ($user) {
    echo "EMAIL: " . $user->email . "\n";
    $user->password_hash = Illuminate\Support\Facades\Hash::make('password123');
    $user->save();
    echo "PASSWORD UPDATED to 'password123'\n";
} else {
    echo "NO USERS FOUND\n";
}

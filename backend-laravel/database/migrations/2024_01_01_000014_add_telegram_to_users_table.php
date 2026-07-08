<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->bigInteger('telegram_user_id')->nullable()->unique();
            $table->string('telegram_phone')->nullable();
            $table->string('telegram_username')->nullable();
            $table->string('telegram_session_path')->nullable();
            $table->timestamp('telegram_verified_at')->nullable();

            $table->index('telegram_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['telegram_user_id']);
            $table->dropColumn([
                'telegram_user_id',
                'telegram_phone',
                'telegram_username',
                'telegram_session_path',
                'telegram_verified_at',
            ]);
        });
    }
};

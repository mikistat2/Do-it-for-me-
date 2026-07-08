<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_auth_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('phone');
            $table->string('session_path');
            $table->string('status')->default('WAITING_CODE'); // WAITING_CODE | WAITING_PASSWORD | LOGGED_IN
            $table->bigInteger('telegram_user_id')->nullable();
            $table->string('telegram_username')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('status');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_auth_sessions');
    }
};

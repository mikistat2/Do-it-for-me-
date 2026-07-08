<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_channels', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->string('channel_id');
            $table->string('title');
            $table->string('username')->nullable();
            $table->string('status')->default('ACTIVE'); // ACTIVE | PAUSED | ERROR
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'channel_id']);
            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_channels');
    }
};

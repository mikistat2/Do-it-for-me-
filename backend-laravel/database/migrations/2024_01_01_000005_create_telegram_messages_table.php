<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_messages', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('channel_id');
            $table->string('telegram_msg_id');
            $table->text('raw_text');
            $table->string('sender_id')->nullable();
            $table->boolean('is_job_post')->default(false);
            $table->timestamp('message_date');
            $table->timestamps();

            $table->foreign('channel_id')->references('id')->on('telegram_channels')->onDelete('cascade');
            $table->unique(['channel_id', 'telegram_msg_id']);
            $table->index('channel_id');
            $table->index('is_job_post');
            $table->index('message_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_messages');
    }
};

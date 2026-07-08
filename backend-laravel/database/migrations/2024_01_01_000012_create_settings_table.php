<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id')->unique();
            $table->boolean('automation_paused')->default(true);
            $table->boolean('auto_apply')->default(false);
            $table->integer('match_threshold')->default(70);
            $table->boolean('notify_on_high_score')->default(true);
            $table->boolean('notify_on_sent')->default(true);
            $table->boolean('notify_on_failed')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};

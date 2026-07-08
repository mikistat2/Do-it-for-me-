<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jobs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id');
            $table->uuid('message_id')->unique()->nullable();
            $table->string('title');
            $table->string('company')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('experience')->nullable();
            $table->string('salary')->nullable();
            $table->string('remote_type')->default('UNKNOWN'); // REMOTE|ONSITE|HYBRID|UNKNOWN
            $table->timestamp('deadline')->nullable();
            $table->text('description');
            $table->text('raw_text');
            $table->string('content_hash');
            $table->string('status')->default('DETECTED'); // DETECTED|MATCHED|DRAFTED|APPLIED|SKIPPED|ARCHIVED
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('message_id')->references('id')->on('telegram_messages')->onDelete('set null');
            $table->unique(['user_id', 'content_hash']);
            $table->index('user_id');
            $table->index('status');
            $table->index('company');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jobs');
    }
};

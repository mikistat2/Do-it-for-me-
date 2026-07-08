<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('job_id');
            $table->uuid('user_id');
            $table->uuid('draft_id')->unique()->nullable();
            $table->string('to_email');
            $table->string('subject');
            $table->text('body');
            $table->string('status')->default('QUEUED'); // QUEUED|SENDING|SENT|FAILED|SKIPPED
            $table->integer('attempts')->default(0);
            $table->text('error')->nullable();
            $table->string('message_id')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('draft_id')->references('id')->on('application_drafts')->onDelete('set null');
            $table->unique(['user_id', 'job_id']);
            $table->index('user_id');
            $table->index('job_id');
            $table->index('status');
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};

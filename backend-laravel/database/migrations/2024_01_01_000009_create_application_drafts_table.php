<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_drafts', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('job_id');
            $table->uuid('user_id');
            $table->string('subject');
            $table->text('body');
            $table->string('to_email');
            $table->string('status')->default('PENDING'); // PENDING|APPROVED|REJECTED|SENT
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('job_id');
            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_drafts');
    }
};

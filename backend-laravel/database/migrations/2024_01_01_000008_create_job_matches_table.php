<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_matches', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('job_id')->unique();
            $table->uuid('user_id');
            $table->integer('score');
            $table->jsonb('strengths')->default('[]');
            $table->jsonb('weaknesses')->default('[]');
            $table->text('reason');
            // STRONG_APPLY | APPLY | CONSIDER | SKIP
            $table->string('recommendation');
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
            $table->index('score');
            $table->index('recommendation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_matches');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_skills', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('job_id');
            $table->string('name');
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->unique(['job_id', 'name']);
            $table->index('job_id');
            $table->index('name');
        });

        Schema::create('job_locations', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('job_id');
            $table->string('name');
            $table->timestamps();

            $table->foreign('job_id')->references('id')->on('jobs')->onDelete('cascade');
            $table->unique(['job_id', 'name']);
            $table->index('job_id');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_locations');
        Schema::dropIfExists('job_skills');
    }
};

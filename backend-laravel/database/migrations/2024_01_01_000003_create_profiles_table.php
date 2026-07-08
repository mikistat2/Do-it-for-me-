<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('user_id')->unique();
            $table->string('full_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('portfolio')->nullable();
            $table->string('linkedin')->nullable();
            $table->string('github')->nullable();
            $table->text('resume_text')->nullable();
            $table->jsonb('skills')->default('[]');
            $table->jsonb('preferred_roles')->default('[]');
            $table->jsonb('preferred_locations')->default('[]');
            $table->integer('expected_salary')->nullable();
            $table->integer('min_match_score')->default(70);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};

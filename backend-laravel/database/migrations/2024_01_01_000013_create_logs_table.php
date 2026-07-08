<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            // TRACE|DEBUG|INFO|WARN|ERROR|FATAL
            $table->string('level');
            // TELEGRAM|AI|EMAIL|AUTH|SYSTEM|ERROR
            $table->string('category');
            $table->text('message');
            $table->jsonb('context')->nullable();
            $table->timestamps();

            $table->index('level');
            $table->index('category');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};

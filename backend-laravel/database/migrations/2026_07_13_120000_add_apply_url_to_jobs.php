<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            // Telegram bot deep link (t.me/bot?start=...) taken from the
            // post's inline "Apply/View Details" button or the post text.
            $table->string('apply_url', 500)->nullable()->after('contact_telegram');
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropColumn('apply_url');
        });
    }
};

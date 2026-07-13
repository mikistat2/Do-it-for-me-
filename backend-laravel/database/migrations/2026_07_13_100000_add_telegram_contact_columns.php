<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->string('contact_telegram')->nullable()->after('contact_phone');
        });

        Schema::table('application_drafts', function (Blueprint $table) {
            $table->string('to_telegram')->nullable()->after('to_email');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->string('to_telegram')->nullable()->after('to_email');
        });
    }

    public function down(): void
    {
        Schema::table('jobs', function (Blueprint $table) {
            $table->dropColumn('contact_telegram');
        });

        Schema::table('application_drafts', function (Blueprint $table) {
            $table->dropColumn('to_telegram');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('to_telegram');
        });
    }
};

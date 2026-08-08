<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admins', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('language', ['en', 'fa', 'ps'])->default('en');
            $table->rememberToken();
            $table->timestamps();
        });

        // NOTE: No default super admin is created in a migration.
        // Demo accounts are created by the database seeders instead
        // (see Database\Seeders\DatabaseSeeder).
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admins');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->text('company_address')->nullable();
            $table->string('company_phone')->nullable();
            $table->string('company_email')->unique();
            $table->string('city')->nullable();
            $table->string('logo')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('manager_name');
            $table->string('manager_phone')->nullable();
            $table->string('email')->unique();
            $table->string('manager_password');
            $table->enum('language', ['en', 'fa', 'ps'])->default('en');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
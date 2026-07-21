<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('branch_name');
            $table->string('branch_slogan')->nullable();
            $table->string('branch_logo_url')->nullable();
            $table->text('branch_street_address')->nullable();
            $table->string('branch_village')->nullable();
            $table->string('branch_district')->nullable();
            $table->string('branch_province')->nullable();
            $table->string('branch_country')->default('Afghanistan');
            $table->string('branch_phone')->nullable();
            $table->string('branch_email')->nullable();
            $table->string('branch_website')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Add indexes for common queries
            $table->index('branch_name');
            $table->index('branch_province');
            $table->index('branch_district');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
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
        Schema::create('warehouse_towers', function (Blueprint $table) {

            $table->id();

            /*
            |--------------------------------------------------------------------------
            | Ownership
            |--------------------------------------------------------------------------
            */

            $table->foreignId('company_id')
                ->constrained('companies')
                ->onDelete('cascade');

            $table->foreignId('branch_id')
                ->constrained('branches')
                ->onDelete('cascade');

            /*
            |--------------------------------------------------------------------------
            | Information
            |--------------------------------------------------------------------------
            */

            $table->string('name');

            /*
            |--------------------------------------------------------------------------
            | Address
            |--------------------------------------------------------------------------
            */

            $table->text('street_address')
                ->nullable();

            $table->string('village')
                ->nullable();

            $table->string('district')
                ->nullable();

            $table->string('province')
                ->nullable();

            $table->string('country')
                ->default('Afghanistan');

            /*
            |--------------------------------------------------------------------------
            | Type
            |--------------------------------------------------------------------------
            */

            $table->enum('type', [
                'warehouse',
                'tower'
            ])->default('warehouse');

            /*
            |--------------------------------------------------------------------------
            | GPS Coordinates
            |--------------------------------------------------------------------------
            */

            $table->decimal('gps_lat', 10, 7)
                ->nullable();

            $table->decimal('gps_lng', 10, 7)
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Audit
            |--------------------------------------------------------------------------
            */

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            /*
            |--------------------------------------------------------------------------
            | Indexes
            |--------------------------------------------------------------------------
            */

            $table->index(['company_id', 'branch_id']);

            $table->index(['branch_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('warehouse_towers');
    }
};
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
        Schema::create('customers', function (Blueprint $table) {

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
            | Customer Information
            |--------------------------------------------------------------------------
            */

            $table->string('user_code', 30)->nullable();

            $table->string('first_name');

            $table->string('last_name')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Contact Information
            |--------------------------------------------------------------------------
            */

            $table->string('phone', 30)->nullable();

            $table->string('email')->nullable();

            $table->text('street_address')->nullable();

            $table->string('district')->nullable();

            $table->string('province')->nullable();

            $table->decimal('gps_lat', 10, 7)->nullable();

            $table->decimal('gps_lng', 10, 7)->nullable();

            $table->string('country')
                ->default('Afghanistan');

            /*
            |--------------------------------------------------------------------------
            | Accounting
            |--------------------------------------------------------------------------
            */

            $table->decimal('opening_balance', 15, 2)
                ->default(0);

            $table->enum('opening_balance_type', [
                'debit',
                'credit'
            ])->default('debit');

            /*
            |--------------------------------------------------------------------------
            | Extra
            |--------------------------------------------------------------------------
            */

            $table->text('note')->nullable();

            $table->boolean('is_active')
                ->default(true);

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

            $table->unique(['branch_id', 'user_code']);

            $table->index(['company_id', 'branch_id']);

            $table->index(['branch_id', 'is_active']);

            $table->index(['first_name', 'last_name']);

            $table->index(['phone']);

            $table->index(['province']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
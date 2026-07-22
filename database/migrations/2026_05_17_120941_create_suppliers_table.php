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
        Schema::create('suppliers', function (Blueprint $table) {

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
            | Supplier Information
            |--------------------------------------------------------------------------
            */

            $table->string('supplier_code', 30)->nullable();

            $table->string('first_name');

            $table->string('last_name')->nullable();

            $table->string('contact_person')->nullable();

            /*
            |--------------------------------------------------------------------------
            | Contact Information
            |--------------------------------------------------------------------------
            */

            $table->string('phone', 30)->nullable();

            $table->string('email')->nullable();

            $table->text('address')->nullable();

            $table->string('city')->nullable();

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
            ])->default('credit');

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

            $table->unique(['branch_id', 'supplier_code']);

            $table->index(['company_id', 'branch_id']);

            $table->index(['branch_id', 'is_active']);

            $table->index(['first_name', 'last_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
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
        Schema::create('units', function (Blueprint $table) {

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
            | Unit Information
            |--------------------------------------------------------------------------
            */

            $table->foreignId('category_id')
                ->constrained('unit_categories')
                ->onDelete('cascade');

            $table->string('name');

            $table->enum('uom_type', [
                'reference',
                'bigger',
                'smaller',
            ])->default('reference');

            /*
            |--------------------------------------------------------------------------
            | Conversion
            |--------------------------------------------------------------------------
            */

            $table->decimal('factor', 20, 10)
                ->default(1);

            $table->decimal('factor_inv', 20, 10)
                ->default(1);

            /*
            |--------------------------------------------------------------------------
            | Precision
            |--------------------------------------------------------------------------
            */

            $table->decimal('rounding', 20, 10)
                ->default(0.01);

            /*
            |--------------------------------------------------------------------------
            | Status
            |--------------------------------------------------------------------------
            */

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

            $table->foreignId('updated_by')
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

            $table->index(['branch_id', 'category_id']);

            $table->index(['branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
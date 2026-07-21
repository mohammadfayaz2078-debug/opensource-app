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
        Schema::create('product_attachments', function (Blueprint $table) {

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
            | Relations
            |--------------------------------------------------------------------------
            */

            $table->foreignId('product_id')
                ->constrained('products')
                ->onDelete('cascade');

            /*
            |--------------------------------------------------------------------------
            | File Information
            |--------------------------------------------------------------------------
            */

            $table->string('file_name');

            $table->string('file_path');

            $table->string('file_type')
                ->nullable();

            $table->string('mime_type')
                ->nullable();

            $table->bigInteger('file_size')
                ->nullable();

            /*
            |--------------------------------------------------------------------------
            | Extra
            |--------------------------------------------------------------------------
            */

            $table->text('note')
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

            $table->index(['product_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_attachments');
    }
};
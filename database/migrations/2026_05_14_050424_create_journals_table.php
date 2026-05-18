<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * TABLE: journals
 * Represents an accounting journal (e.g. "General Journal", "Expense Journal", "Payroll Journal").
 * Each branch can have multiple journals. Journal entries belong to a journal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->string('name', 100);
            $table->string('code', 20);           // short code: GJ, EXP, PAY, BANK, etc.
            $table->enum('type', [
                'general',
                'expense',
                'payroll',
                'bank',
                'cash',
                'sale',
                'purchase',
            ])->default('expense');
            $table->string('currency', 3)->default('USD');
            $table->unsignedBigInteger('default_account_id')->nullable(); // payment account
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Code must be unique per branch
            $table->unique(['branch_id', 'code'], 'journals_branch_code_unique');
            $table->index(['branch_id', 'type'], 'journals_branch_type_idx');
            $table->index(['branch_id', 'is_active'], 'journals_branch_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};
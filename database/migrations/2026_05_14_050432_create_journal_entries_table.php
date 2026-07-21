<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * NEW TABLE: journal_entries
 * Double-entry accounting lines. Each expense payment creates journal entries.
 *
 * Double-entry pattern for an expense:
 *   DR  Expense Account   (debit  = amount)
 *   CR  Payment Account   (credit = amount)
 *
 * Linked to expenses via expense_id (nullable for manual entries).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('journal_id');

            // Source document reference (polymorphic-friendly)
            $table->string('reference_type', 50)->nullable(); // e.g. 'expense'
            $table->unsignedBigInteger('reference_id')->nullable(); // e.g. expense.id

            // For expenses specifically
            $table->unsignedBigInteger('expense_id')->nullable();

            // Entry header
            $table->string('entry_number', 60)->unique(); // JE-2024-00001
            $table->date('entry_date');
            $table->string('description')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('exchange_rate', 15, 6)->default(1.000000);

            // Entry status
            $table->enum('status', ['draft', 'posted', 'reversed'])->default('draft');

            // Totals (sum of all debit lines = sum of all credit lines)
            $table->decimal('total_debit', 15, 2)->default(0);
            $table->decimal('total_credit', 15, 2)->default(0);

            // Who posted/reversed
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('reversed_by')->nullable();
            $table->timestamp('reversed_at')->nullable();
            $table->text('reversal_reason')->nullable();

            // Link to the reversing entry
            $table->unsignedBigInteger('reversal_of')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('journal_id')->references('id')->on('journals');
            $table->foreign('expense_id')->references('id')->on('expenses')->nullOnDelete();

            $table->index(['branch_id', 'status'], 'je_branch_status_idx');
            $table->index(['branch_id', 'entry_date'], 'je_branch_date_idx');
            $table->index(['branch_id', 'journal_id'], 'je_branch_journal_idx');
            $table->index(['expense_id'], 'je_expense_idx');
            $table->index(['reference_type', 'reference_id'], 'je_reference_idx');
        });

        /**
         * NEW TABLE: journal_entry_lines
         * Individual debit/credit lines within a journal entry.
         * A balanced entry always has sum(debit) = sum(credit).
         */
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('journal_entry_id');
            $table->unsignedBigInteger('branch_id');

            // Account being debited/credited (references your chart of accounts)
            $table->unsignedBigInteger('account_id')->nullable();
            $table->string('account_code', 30)->nullable(); // denormalized for speed
            $table->string('account_name', 100)->nullable(); // denormalized for speed

            $table->enum('type', ['debit', 'credit']);
            $table->decimal('amount', 15, 2);
            $table->decimal('amount_base', 15, 2)->default(0);
            $table->string('description')->nullable();

            // Optional: partner/vendor reference
            $table->string('partner_name', 150)->nullable();

            $table->unsignedInteger('line_order')->default(0);
            $table->timestamps();

            $table->foreign('journal_entry_id')
                  ->references('id')
                  ->on('journal_entries')
                  ->cascadeOnDelete();

            $table->index(['journal_entry_id'], 'jel_entry_idx');
            $table->index(['branch_id', 'account_id'], 'jel_branch_account_idx');
            $table->index(['type'], 'jel_type_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('journal_entries');
    }
};
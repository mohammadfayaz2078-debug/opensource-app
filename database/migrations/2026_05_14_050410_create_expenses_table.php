<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();

            // Ownership
            $table->foreignId('company_id')
                ->constrained('companies')
                ->onDelete('cascade');

            $table->foreignId('branch_id')
                ->constrained('branches')
                ->onDelete('cascade');

            // Expense Information
            $table->foreignId('expense_type_id')
                ->nullable()
                ->constrained('expense_types')
                ->nullOnDelete();

            $table->foreignId('account_id')
                ->nullable()
                ->constrained('accounts')
                ->nullOnDelete();

            $table->date('date')
                ->default(DB::raw('CURRENT_DATE'));

            $table->string('paid_to', 100)
                ->nullable();

            $table->text('description')
                ->nullable();

            $table->decimal('amount', 15, 2);

            // Audit
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index(['company_id', 'branch_id']);
            $table->index(['branch_id', 'date']);
            $table->index(['branch_id', 'expense_type_id']);
            $table->index(['account_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
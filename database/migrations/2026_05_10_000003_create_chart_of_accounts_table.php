<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('code');                                          // e.g. "1010", "2100"
            $table->string('name');                                          // e.g. "Cash", "Accounts Receivable"
            $table->foreignId('account_type_id')->constrained('account_types')->onDelete('restrict');
            $table->foreignId('account_group_id')->nullable()->constrained('account_groups')->onDelete('set null');
            $table->foreignId('parent_id')->nullable()->constrained('chart_of_accounts')->onDelete('set null');
            $table->unsignedBigInteger('currency_id')->nullable();             // FK added in currencies migration
            $table->boolean('allow_reconciliation')->default(false);         // like Odoo
            $table->boolean('deprecated')->default(false);                   // soft-disable
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->string('tag')->nullable();                               // for grouping/filtering
            $table->decimal('opening_debit', 15, 2)->default(0);
            $table->decimal('opening_credit', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->enum('nature', ['debit', 'credit'])->default('debit');   // normal balance side
            $table->integer('level')->default(0);                            // hierarchy depth
            $table->timestamps();

            $table->unique(['branch_id', 'code']);
            $table->index(['branch_id', 'account_type_id']);
            $table->index(['branch_id', 'parent_id']);
            $table->index(['branch_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};

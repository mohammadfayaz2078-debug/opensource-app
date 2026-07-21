<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_types', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('expense_category_id');
            $table->unsignedBigInteger('expense_account_id')->nullable()->index();
            $table->string('name', 100);
            // $table->string('slug', 120);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('default_payment_account_id')->nullable();
            // $table->boolean('requires_receipt')->default(false);
            // $table->decimal('approval_threshold', 15, 2)->nullable();
            // $table->decimal('max_amount', 15, 2)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('expense_category_id')->references('id')->on('expense_categories')->cascadeOnDelete();
            $table->foreign('expense_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
            $table->foreign('default_payment_account_id')->references('id')->on('chart_of_accounts')->nullOnDelete();
            $table->unique(['branch_id'], 'expense_types_branch_unique');
            $table->index(['branch_id', 'expense_category_id'], 'et_branch_cat_idx');
            $table->index(['branch_id', 'is_active'], 'et_branch_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_types');
    }
};

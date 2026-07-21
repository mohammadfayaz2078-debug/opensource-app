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
            $table->unsignedBigInteger('branch_id')->index();
            $table->unsignedBigInteger('expense_type_id')->nullable()->index();
            $table->unsignedBigInteger('payment_account_id')->nullable()->index();
            $table->decimal('amount', 10, 2);
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->text('file')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->string('paid_to', 100)->nullable();
            $table->date('date')->default(DB::raw('CURRENT_DATE'));
            $table->enum('status', ['draft', 'submitted', 'paid', 'cancelled'])->default('draft');
            $table->string('reference_no', 60)->nullable();
            $table->unsignedBigInteger('created_by')->index();
            $table->timestamp('submitted_at')->nullable();
            $table->unsignedBigInteger('submitted_by')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->unsignedBigInteger('paid_by')->nullable();
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'card', 'other'])->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('expense_type_id')->references('id')->on('expense_types')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();

            $table->index(['branch_id', 'status'], 'exp_branch_status_idx');
            $table->index(['branch_id', 'date'], 'exp_branch_date_idx');
            $table->index(['branch_id', 'expense_type_id'], 'exp_branch_type_idx');
            $table->index(['branch_id', 'created_by'], 'exp_branch_created_by_idx');
            $table->index(['reference_no'], 'exp_ref_no_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};

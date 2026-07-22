<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();

            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');

            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('reference_no', 50)->nullable();
            $table->date('purchase_date');
            $table->date('due_date')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->enum('discount_type', ['percent', 'fixed'])->default('fixed');
            $table->decimal('discount_value', 15, 2)->default(0);
            $table->decimal('shipping_cost', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('due_amount', 15, 2)->default(0);

            $table->enum('payment_status', ['unpaid', 'partial', 'paid'])->default('unpaid');

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['branch_id', 'reference_no']);
            $table->index(['company_id', 'branch_id']);
            $table->index(['branch_id', 'supplier_id']);
            $table->index(['branch_id', 'payment_status']);
            $table->index('purchase_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};

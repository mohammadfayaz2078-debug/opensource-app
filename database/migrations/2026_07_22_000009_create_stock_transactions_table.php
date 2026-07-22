<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');

            $table->string('reference_type', 50);
            $table->unsignedBigInteger('reference_id');

            $table->enum('movement_type', ['in', 'out']);

            $table->decimal('quantity', 15, 4)->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('total_cost', 15, 2)->default(0);
            $table->decimal('balance_qty', 15, 4)->default(0);

            $table->foreignId('unit_id')->nullable()->constrained()->nullOnDelete();

            $table->text('notes')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['company_id', 'branch_id']);
            $table->index(['branch_id', 'product_id']);
            $table->index(['reference_type', 'reference_id']);
            $table->index(['branch_id', 'movement_type']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_transactions');
    }
};

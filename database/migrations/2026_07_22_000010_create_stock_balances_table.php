<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_balances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');

            $table->decimal('quantity', 15, 4)->default(0);
            $table->decimal('avg_cost', 15, 2)->default(0);
            $table->decimal('total_value', 15, 2)->default(0);

            $table->timestamp('last_movement_at')->nullable();

            $table->timestamps();

            $table->unique(['product_id', 'branch_id']);
            $table->index(['company_id', 'branch_id']);
            $table->index(['branch_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_balances');
    }
};

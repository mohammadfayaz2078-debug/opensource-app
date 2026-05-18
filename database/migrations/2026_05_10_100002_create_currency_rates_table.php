<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currency_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('currency_id')->constrained('currencies')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->decimal('rate', 20, 10);        // 1 base currency = rate of this currency
            $table->decimal('inverse_rate', 20, 10); // 1 of this currency = inverse_rate base
            $table->date('date');                     // effective date
            $table->timestamps();

            $table->unique(['currency_id', 'branch_id', 'date']);
            $table->index(['branch_id', 'date']);
            $table->index(['currency_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('currency_rates');
    }
};

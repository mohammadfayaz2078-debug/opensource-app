<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('name');                          // e.g. "Receivable", "Bank and Cash"
            $table->string('type');                          // asset, liability, equity, income, expense
            $table->string('internal_group');                // balance_sheet, profit_loss, off_balance
            $table->boolean('include_initial_balance')->default(false);
            $table->string('description')->nullable();
            $table->integer('sequence')->default(10);        // ordering
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_types');
    }
};

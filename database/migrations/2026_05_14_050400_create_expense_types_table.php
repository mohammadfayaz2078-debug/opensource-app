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
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
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

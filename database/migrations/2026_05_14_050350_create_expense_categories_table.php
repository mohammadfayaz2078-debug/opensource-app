<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name', 100);
            // $table->string('slug', 120);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('color', 7)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('branch_id')->references('id')->on('branches')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('expense_categories')->nullOnDelete();
            $table->unique(['branch_id'], 'expense_categories_branch_unique');
            $table->index(['branch_id', 'is_active'], 'ec_branch_active_idx');
            $table->index(['branch_id', 'parent_id'], 'ec_branch_parent_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};

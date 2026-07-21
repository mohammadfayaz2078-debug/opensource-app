<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('account_types', function (Blueprint $table) {
            $table->id();

            $table->foreignId('branch_id')
                ->constrained('branches')
                ->onDelete('cascade');

            $table->string('name');
            $table->string('type');
            $table->string('internal_group');
            $table->boolean('include_initial_balance')->default(false);
            $table->text('description')->nullable();
            $table->integer('sequence')->default(0);

            $table->timestamps();

            $table->unique(['branch_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_types');
    }
};

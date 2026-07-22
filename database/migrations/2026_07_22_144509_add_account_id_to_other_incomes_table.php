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
        Schema::table('other_incomes', function (Blueprint $table) {
            // Add account_id column
            $table->foreignId('account_id')
                ->nullable()
                ->after('branch_id')
                ->constrained('accounts')
                ->nullOnDelete();

            // Add index for account_id
            $table->index(['branch_id', 'account_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('other_incomes', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['account_id']);
            
            // Drop the column
            $table->dropColumn('account_id');
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modify the status column to include 'returned'
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['draft', 'confirmed', 'cancelled', 'returned'])
                ->default('draft')
                ->change();
        });
    }

    public function down(): void
    {
        // Revert back to original status values
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['draft', 'confirmed', 'cancelled'])
                ->default('draft')
                ->change();
        });
    }
};
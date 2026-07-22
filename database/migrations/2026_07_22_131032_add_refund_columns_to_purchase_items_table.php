<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->enum('refund_status', ['none', 'partial', 'full'])
                ->default('none')
                ->after('quantity');
            
            $table->decimal('refunded_quantity', 15, 4)
                ->default(0)
                ->after('refund_status');
            
            $table->decimal('refunded_amount', 15, 2)
                ->default(0)
                ->after('refunded_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->dropColumn(['refund_status', 'refunded_quantity', 'refunded_amount']);
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add status to customers
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'status')) {
                $table->string('status')->default('customer')->after('is_active');
            }
        });

        // Add customer_id, company_id, branch_id to orders
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->after('order_no')->constrained('customers')->nullOnDelete();
            }
            if (!Schema::hasColumn('orders', 'company_id')) {
                $table->foreignId('company_id')->nullable()->after('customer_id')->constrained('companies')->nullOnDelete();
            }
            if (!Schema::hasColumn('orders', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->after('company_id')->constrained('branches')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['company_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['customer_id', 'company_id', 'branch_id']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add unit_category_id and fifo_layers columns
        Schema::table('stock_balances', function (Blueprint $table) {
            $table->foreignId('unit_category_id')->nullable()->constrained('unit_categories')->nullOnDelete();
            $table->json('fifo_layers')->nullable();
        });

        // Disable FK checks to allow index restructure
        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        // Drop old unique index, create new one with unit_category_id
        DB::statement('ALTER TABLE stock_balances DROP INDEX stock_balances_product_id_branch_id_unique');
        DB::statement('ALTER TABLE stock_balances ADD UNIQUE INDEX stock_balances_product_branch_category_unique (product_id, branch_id, unit_category_id)');

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');

        // Add original_quantity and original_unit_id to stock_transactions if not present
        Schema::table('stock_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_transactions', 'original_quantity')) {
                $table->decimal('original_quantity', 15, 4)->nullable()->after('quantity')
                    ->comment('Quantity in the originally selected unit');
            }
            if (!Schema::hasColumn('stock_transactions', 'original_unit_id')) {
                $table->foreignId('original_unit_id')->nullable()->after('original_quantity')
                    ->constrained('units')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_transactions', function (Blueprint $table) {
            $table->dropForeign(['original_unit_id']);
            $table->dropColumn(['original_quantity', 'original_unit_id']);
        });

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');
        DB::statement('ALTER TABLE stock_balances DROP INDEX stock_balances_product_branch_category_unique');
        DB::statement('ALTER TABLE stock_balances ADD UNIQUE INDEX stock_balances_product_id_branch_id_unique (product_id, branch_id)');
        DB::statement('SET FOREIGN_KEY_CHECKS = 1');

        Schema::table('stock_balances', function (Blueprint $table) {
            $table->dropForeign(['unit_category_id']);
            $table->dropColumn(['unit_category_id', 'fifo_layers']);
        });
    }
};

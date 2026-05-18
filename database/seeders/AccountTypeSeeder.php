<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AccountType;
use App\Models\Branch;

class AccountTypeSeeder extends Seeder
{
    /**
     * Seed default account types for all branches.
     * Safe to re-run — uses updateOrCreate keyed on branch_id + name.
     */
    public function run(): void
    {
        $branches = Branch::all();

        if ($branches->isEmpty()) {
            $this->command?->warn('No branches found. Skipping account type seeding.');
            return;
        }

        foreach ($branches as $branch) {
            $this->seedForBranch($branch->id);
            $this->command?->info("Seeded account types for branch: {$branch->branch_name} (ID: {$branch->id})");
        }
    }

    /**
     * Seed default account types for a single branch.
     * Can be called from other places (e.g. after creating a new branch).
     */
    public static function seedForBranch(int $branchId): void
    {
        $types = self::getDefaultTypes();

        foreach ($types as $type) {
            AccountType::updateOrCreate(
                ['branch_id' => $branchId, 'name' => $type['name']],
                array_merge($type, ['branch_id' => $branchId])
            );
        }
    }

    /**
     * Default account types (Odoo-style).
     */
    public static function getDefaultTypes(): array
    {
        return [
            // ─── Assets ──────────────────────────────────────
            [
                'name' => 'Receivable',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Amounts owed to you by customers for goods or services delivered',
                'sequence' => 1,
            ],
            [
                'name' => 'Bank and Cash',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Bank accounts and cash on hand',
                'sequence' => 2,
            ],
            [
                'name' => 'Current Assets',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Short-term assets expected to be converted to cash within one year',
                'sequence' => 3,
            ],
            [
                'name' => 'Non-current Assets',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Long-term assets not expected to be converted to cash within one year',
                'sequence' => 4,
            ],
            [
                'name' => 'Fixed Assets',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Tangible long-term assets such as buildings, machinery, equipment',
                'sequence' => 5,
            ],
            [
                'name' => 'Prepayments',
                'type' => 'asset',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Payments made in advance for goods or services to be received later',
                'sequence' => 6,
            ],

            // ─── Liabilities ─────────────────────────────────
            [
                'name' => 'Payable',
                'type' => 'liability',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Amounts owed to suppliers for goods or services received',
                'sequence' => 7,
            ],
            [
                'name' => 'Current Liabilities',
                'type' => 'liability',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Short-term obligations due within one year',
                'sequence' => 8,
            ],
            [
                'name' => 'Non-current Liabilities',
                'type' => 'liability',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Long-term obligations due after one year',
                'sequence' => 9,
            ],

            // ─── Equity ──────────────────────────────────────
            [
                'name' => 'Equity',
                'type' => 'equity',
                'internal_group' => 'balance_sheet',
                'include_initial_balance' => true,
                'description' => 'Owner\'s equity, retained earnings, and capital accounts',
                'sequence' => 10,
            ],

            // ─── Income ──────────────────────────────────────
            [
                'name' => 'Revenue',
                'type' => 'income',
                'internal_group' => 'profit_loss',
                'include_initial_balance' => false,
                'description' => 'Income from sales of goods and services',
                'sequence' => 11,
            ],
            [
                'name' => 'Other Income',
                'type' => 'income',
                'internal_group' => 'profit_loss',
                'include_initial_balance' => false,
                'description' => 'Income from non-core business activities',
                'sequence' => 12,
            ],

            // ─── Expenses ────────────────────────────────────
            [
                'name' => 'Expense',
                'type' => 'expense',
                'internal_group' => 'profit_loss',
                'include_initial_balance' => false,
                'description' => 'General operating expenses',
                'sequence' => 13,
            ],
            [
                'name' => 'Cost of Revenue',
                'type' => 'expense',
                'internal_group' => 'profit_loss',
                'include_initial_balance' => false,
                'description' => 'Direct costs attributable to the production of goods or services sold',
                'sequence' => 14,
            ],
            [
                'name' => 'Depreciation',
                'type' => 'expense',
                'internal_group' => 'profit_loss',
                'include_initial_balance' => false,
                'description' => 'Allocation of cost of tangible assets over their useful life',
                'sequence' => 15,
            ],

            // ─── Off-Balance Sheet ───────────────────────────
            [
                'name' => 'Off-Balance Sheet',
                'type' => 'asset',
                'internal_group' => 'off_balance',
                'include_initial_balance' => false,
                'description' => 'Items not recorded on the balance sheet but may have financial impact',
                'sequence' => 16,
            ],
        ];
    }
}

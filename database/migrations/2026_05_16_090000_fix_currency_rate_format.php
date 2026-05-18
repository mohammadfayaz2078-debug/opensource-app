<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix old-format currency_rates where rate stored "foreign per base"
 * instead of "base per foreign" for weak currencies against strong bases.
 */
return new class extends Migration
{
    public function up(): void
    {
        $strongCodes = ['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','SGD','HKD','NZD','KWD','BHD','OMR'];

        // Find branches with strong base currencies
        $branches = DB::table('branches')
            ->join('currencies', 'currencies.id', '=', 'branches.base_currency_id')
            ->whereIn('currencies.code', $strongCodes)
            ->select('branches.id as branch_id', 'currencies.code as base_code')
            ->get();

        foreach ($branches as $branch) {
            // Find weak-currency rates in this branch where rate > 1 and inverse < 1
            $rates = DB::table('currency_rates')
                ->join('currencies', 'currencies.id', '=', 'currency_rates.currency_id')
                ->where('currency_rates.branch_id', $branch->branch_id)
                ->whereNotIn('currencies.code', $strongCodes)
                ->where('currency_rates.rate', '>', 1)
                ->where('currency_rates.inverse_rate', '<', 1)
                ->select('currency_rates.id', 'currency_rates.rate', 'currency_rates.inverse_rate')
                ->get();

            foreach ($rates as $rate) {
                // Swap rate and inverse_rate so rate = base_per_foreign
                DB::table('currency_rates')
                    ->where('id', $rate->id)
                    ->update([
                        'rate'         => $rate->inverse_rate,
                        'inverse_rate' => $rate->rate,
                    ]);
            }
        }
    }

    public function down(): void
    {
        // Reversal is complex and potentially lossy; not implemented
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Swap rate back: rate = foreign units per 1 base unit (user-entered market rate).
 * After the previous migration swapped values, this restores the intended convention.
 */
return new class extends Migration
{
    public function up(): void
    {
        $rates = DB::table('currency_rates')->get();

        foreach ($rates as $rate) {
            $r = (float) $rate->rate;
            $i = (float) $rate->inverse_rate;

            // If rate < 1 and inverse > 1, values were swapped by the previous fix.
            // Swap them back so rate = foreign_per_base (market rate).
            if ($r < 1 && $i > 1) {
                DB::table('currency_rates')
                    ->where('id', $rate->id)
                    ->update([
                        'rate'         => $i,
                        'inverse_rate' => $r,
                    ]);
            }
        }
    }

    public function down(): void
    {
        // Not reversible without tracking original state
    }
};

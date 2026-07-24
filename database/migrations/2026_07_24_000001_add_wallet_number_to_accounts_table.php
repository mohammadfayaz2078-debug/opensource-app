<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Check if column already exists to handle re-runs gracefully
        if (!Schema::hasColumn('accounts', 'wallet_number')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->string('wallet_number', 20)->nullable()->after('name');
            });
        }

        // Drop existing unique index if any (e.g. from a previous failed run)
        try {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropUnique('accounts_wallet_number_unique');
            });
        } catch (\Exception $e) {
            // Index may not exist
        }

        // Generate wallet numbers for accounts that don't have one
        $accounts = DB::table('accounts')
            ->whereNull('wallet_number')
            ->orWhere('wallet_number', '')
            ->orderBy('id')
            ->get();

        foreach ($accounts as $account) {
            $maxNumber = DB::table('accounts')
                ->where('wallet_number', 'like', 'WLT-%')
                ->max(DB::raw("CAST(SUBSTRING(wallet_number, 5) AS UNSIGNED)"));
            $nextNumber = ($maxNumber ?? 0) + 1;
            $walletNumber = 'WLT-' . str_pad($nextNumber, 12, '0', STR_PAD_LEFT);
            DB::table('accounts')
                ->where('id', $account->id)
                ->update(['wallet_number' => $walletNumber]);
        }

        // Now add unique constraint
        Schema::table('accounts', function (Blueprint $table) {
            $table->unique('wallet_number');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('accounts', 'wallet_number')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropColumn('wallet_number');
            });
        }
    }
};
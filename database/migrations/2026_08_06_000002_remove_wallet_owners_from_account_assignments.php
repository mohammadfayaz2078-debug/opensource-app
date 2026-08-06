<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('accounts')
            ->whereNotNull('owner_user_id')
            ->orderBy('id')
            ->each(function ($account) {
                DB::table('account_user')
                    ->where('account_id', $account->id)
                    ->where('user_id', $account->owner_user_id)
                    ->delete();
            });
    }

    public function down(): void
    {
        DB::table('accounts')
            ->whereNotNull('owner_user_id')
            ->orderBy('id')
            ->each(function ($account) {
                DB::table('account_user')->insertOrIgnore([
                    'account_id' => $account->id,
                    'user_id' => $account->owner_user_id,
                ]);
            });
    }
};

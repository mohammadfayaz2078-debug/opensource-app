<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_user', function (Blueprint $table) {
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['account_id', 'user_id']);
        });

        DB::table('accounts')->whereNotNull('branch_id')->orderBy('id')->each(function ($account) {
            $userIds = DB::table('users')
                ->where('company_id', $account->company_id)
                ->where('branch_id', $account->branch_id)
                ->pluck('id');

            foreach ($userIds as $userId) {
                DB::table('account_user')->insertOrIgnore([
                    'account_id' => $account->id,
                    'user_id' => $userId,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_user');
    }
};

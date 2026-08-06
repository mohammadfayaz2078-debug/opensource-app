<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreignId('owner_user_id')
                ->nullable()
                ->after('branch_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        DB::table('accounts')->orderBy('id')->each(function ($account) {
            $ownerId = DB::table('account_user')
                ->where('account_id', $account->id)
                ->orderBy('user_id')
                ->value('user_id');

            if ($ownerId) {
                DB::table('accounts')->where('id', $account->id)->update(['owner_user_id' => $ownerId]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('owner_user_id');
        });
    }
};

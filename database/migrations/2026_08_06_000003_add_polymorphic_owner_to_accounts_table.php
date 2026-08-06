<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('owner_type')->nullable()->after('owner_user_id');
            $table->unsignedBigInteger('owner_id')->nullable()->after('owner_type');
            $table->index(['owner_type', 'owner_id']);
        });

        DB::table('accounts')->whereNotNull('owner_user_id')->update([
            'owner_type' => User::class,
            'owner_id' => DB::raw('owner_user_id'),
        ]);
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropIndex(['owner_type', 'owner_id']);
            $table->dropColumn(['owner_type', 'owner_id']);
        });
    }
};

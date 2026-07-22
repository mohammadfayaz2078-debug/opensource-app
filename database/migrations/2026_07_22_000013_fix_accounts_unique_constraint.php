<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the global unique on name and add branch-scoped unique
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropUnique('accounts_name_unique');
            $table->unique(['branch_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropUnique(['branch_id', 'name']);
            $table->unique('name');
        });
    }
};

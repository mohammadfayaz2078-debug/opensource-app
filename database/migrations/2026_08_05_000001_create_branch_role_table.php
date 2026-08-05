<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_role', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'branch_id']);
        });

        DB::table('roles')
            ->whereNotNull('branch_id')
            ->orderBy('id')
            ->each(function ($role) {
                DB::table('branch_role')->insertOrIgnore([
                    'role_id' => $role->id,
                    'branch_id' => $role->branch_id,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_role');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix existing data first
        $firstCompany = \App\Models\Company::first();
        if ($firstCompany) {
            \Illuminate\Support\Facades\DB::table('accounts')
                ->where('company_id', 0)
                ->update(['company_id' => $firstCompany->id]);
        }

        Schema::table('accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('accounts', 'company_id')) {
                $table->foreignId('company_id')->constrained()->onDelete('cascade');
            }
            if (!Schema::hasColumn('accounts', 'branch_id')) {
                $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            }
            if (!Schema::hasColumn('accounts', 'type')) {
                $table->string('type')->default('cash')->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['company_id', 'branch_id', 'type']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_transfers', function (Blueprint $table) {
            $table->foreignId('original_transfer_id')->nullable()->constrained('account_transfers')->nullOnDelete()->after('created_by');
            $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete()->after('original_transfer_id');
            $table->timestamp('reversed_at')->nullable()->after('reversed_by');
        });
    }

    public function down(): void
    {
        Schema::table('account_transfers', function (Blueprint $table) {
            $table->dropForeign(['original_transfer_id']);
            $table->dropForeign(['reversed_by']);
            $table->dropColumn(['original_transfer_id', 'reversed_by', 'reversed_at']);
        });
    }
};
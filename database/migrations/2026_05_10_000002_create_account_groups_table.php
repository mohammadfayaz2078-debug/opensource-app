<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->foreignId('parent_id')->nullable()->constrained('account_groups')->onDelete('set null');
            $table->string('name');                          // e.g. "Current Assets"
            $table->string('code_prefix_start');             // e.g. "100"
            $table->string('code_prefix_end')->nullable();   // e.g. "199"
            $table->foreignId('account_type_id')->constrained('account_types')->onDelete('restrict');
            $table->timestamps();

            $table->index(['branch_id', 'code_prefix_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_groups');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('code', 10);                              // ISO 4217: USD, EUR, AFN
            $table->string('name');                                   // US Dollar, Euro, Afghani
            $table->string('symbol', 10)->nullable();                 // $, €, ؋
            $table->integer('decimal_places')->default(2);            // number of decimal places
            $table->enum('position', ['before', 'after'])->default('before'); // symbol position
            $table->decimal('rounding', 15, 6)->default(0.01);       // rounding factor
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'code']);
            $table->index(['branch_id', 'is_active']);
        });

        // FK constraint: chart_of_accounts references currencies
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
        });

        Schema::dropIfExists('currencies');
    }
};

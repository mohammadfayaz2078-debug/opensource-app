<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->dropColumn('received_qty');
        });
    }

    public function down()
    {
        Schema::table('purchase_items', function (Blueprint $table) {
            $table->decimal('received_qty', 15, 2)->default(0)->after('quantity');
        });
    }
};

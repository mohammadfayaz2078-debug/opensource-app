<?php

namespace Tests\Feature;

use App\Models\StockBalance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountingRegressionTest extends TestCase
{
    use RefreshDatabase;
    use CreatesTenants;

    public function test_sale_payment_rejects_overpayment(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);
        $this->createPurchase($t);
        $sale = $this->createSale($t);

        // Pay the full invoice (15)
        $this->postJson('/api/sales/' . $sale->id . '/pay', [
            'amount'     => 15,
            'account_id' => $t['account']->id,
        ])->assertOk();

        // Any further payment exceeds the remaining due (0) and must be rejected
        $this->postJson('/api/sales/' . $sale->id . '/pay', [
            'amount'     => 5,
            'account_id' => $t['account']->id,
        ])->assertStatus(422);
    }

    public function test_paid_sale_cannot_be_deleted(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);
        $this->createPurchase($t);
        $sale = $this->createSale($t);

        $this->postJson('/api/sales/' . $sale->id . '/pay', [
            'amount'     => 15,
            'account_id' => $t['account']->id,
        ])->assertOk();

        $this->deleteJson('/api/sales/' . $sale->id)->assertStatus(422);

        $this->assertDatabaseHas('sales', ['id' => $sale->id]);
    }

    public function test_purchase_edit_records_stock_correctly(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);

        $purchase = $this->createPurchase($t, 10);

        $balanceAfterCreate = StockBalance::where('product_id', $t['product']->id)->first();
        $this->assertNotNull($balanceAfterCreate);
        $this->assertEqualsWithDelta(10, (float) $balanceAfterCreate->quantity, 0.001);

        // Edit the purchase down to 5 units — stock must follow the document.
        $item = $purchase->items()->first();
        $this->putJson('/api/purchases/' . $purchase->id, [
            'items' => [
                ['id' => $item->id, 'product_id' => $t['product']->id, 'quantity' => 5, 'unit_price' => 10],
            ],
        ])->assertOk();

        $balanceAfterEdit = StockBalance::where('product_id', $t['product']->id)->first();
        $this->assertEqualsWithDelta(5, (float) $balanceAfterEdit->quantity, 0.001);
    }

    public function test_sale_creation_reduces_stock_and_prevents_overselling(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);
        $this->createPurchase($t, 3);

        // Sell 3 units (all available stock)
        $this->createSale($t, 3);

        $balance = StockBalance::where('product_id', $t['product']->id)->first();
        $this->assertEqualsWithDelta(0, (float) $balance->quantity, 0.001);

        // Selling one more unit must fail (insufficient stock)
        $this->postJson('/api/sales', [
            'account_id'    => $t['account']->id,
            'document_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $t['product']->id, 'quantity' => 1, 'unit_price' => 15],
            ],
        ])->assertStatus(500);
    }
}

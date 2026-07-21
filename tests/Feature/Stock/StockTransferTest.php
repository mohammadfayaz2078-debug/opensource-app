<?php

namespace Tests\Feature\Stock;

use Tests\TestCase;
use App\Models\StockBalance;
use App\Services\StockService;

class StockTransferTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_stock_transfers(): void
    {
        $response = $this->getJson('/api/stock-transfers');
        $response->assertOk();
    }

    public function test_can_create_stock_transfer(): void
    {
        $product = $this->createProduct();
        $warehouse1 = $this->createWarehouse(['name' => 'Source']);
        $warehouse2 = $this->createWarehouse(['name' => 'Destination']);

        // Add stock to source
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse1->id, null, 'in', 100, 10.00, 'Test', 1);

        $response = $this->postJson('/api/stock-transfers', [
            'from_warehouse_id' => $warehouse1->id,
            'to_warehouse_id' => $warehouse2->id,
            'transfer_date' => '2026-01-15',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 30,
                    'unit_cost' => 10.00,
                ],
            ],
        ]);

        $response->assertCreated();
    }

    public function test_stock_transfer_reduces_source_increases_dest(): void
    {
        $product = $this->createProduct();
        $warehouse1 = $this->createWarehouse(['name' => 'Source']);
        $warehouse2 = $this->createWarehouse(['name' => 'Dest']);

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse1->id, null, 'in', 100, 10.00, 'Test', 1);

        // Simulate transfer via service
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse1->id, null, 'out', 30, 10.00, 'Transfer', 2);
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse2->id, null, 'in', 30, 10.00, 'Transfer', 3);

        $source = StockBalance::where('product_id', $product->id)->where('warehouse_tower_id', $warehouse1->id)->first();
        $dest = StockBalance::where('product_id', $product->id)->where('warehouse_tower_id', $warehouse2->id)->first();

        $this->assertEquals(70, $source->quantity);
        $this->assertEquals(30, $dest->quantity);
    }

    public function test_can_generate_transfer_number(): void
    {
        $response = $this->getJson('/api/stock-transfers/generate-number');
        $response->assertOk();
    }

    public function test_can_get_stock_info(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);

        $response = $this->getJson("/api/stock-transfers/get-stock-info?product_id={$product->id}&warehouse_id={$warehouse->id}");
        $response->assertOk();
    }
}

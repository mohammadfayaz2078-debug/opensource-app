<?php

namespace Tests\Feature\Stock;

use Tests\TestCase;
use App\Models\StockBalance;
use App\Models\StockTransaction;
use App\Services\StockService;

class StockServiceTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_stock_in_creates_balance(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertNotNull($balance);
        $this->assertEquals(100, $balance->quantity);
        $this->assertEquals(10.00, $balance->avg_cost);
        $this->assertEquals(1000.00, $balance->total_value);
    }

    public function test_stock_out_reduces_quantity(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'out', 30, 10.00, 'Test', 2);

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(70, $balance->quantity);
    }

    public function test_stock_out_throws_on_insufficient_stock(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 10, 10.00, 'Test', 1);

        $this->expectException(\RuntimeException::class);

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'out', 20, 10.00, 'Test', 2);
    }

    public function test_average_cost_calculation(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // First batch: 100 units at $10
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);

        // Second batch: 50 units at $15
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 50, 15.00, 'Test', 2);

        $balance = StockBalance::where('product_id', $product->id)->first();

        // Average cost = (100*10 + 50*15) / 150 = 1750/150 = 11.67
        $this->assertEqualsWithDelta(11.67, $balance->avg_cost, 0.01);
        $this->assertEquals(150, $balance->quantity);
    }

    public function test_fifo_valuation(): void
    {
        $product = $this->createProduct(['inventory_valuation_method' => 'fifo']);
        $warehouse = $this->createWarehouse();

        // First batch: 100 units at $10
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);

        // Second batch: 50 units at $15
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 50, 15.00, 'Test', 2);

        // Sell 30 units (should come from first batch at $10)
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'out', 30, 10.00, 'Test', 3);

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(120, $balance->quantity);

        // FIFO layers should reflect remaining stock
        $this->assertNotNull($balance->fifo_layers);
    }

    public function test_stock_transfer_between_warehouses(): void
    {
        $product = $this->createProduct();
        $warehouse1 = $this->createWarehouse(['name' => 'Warehouse 1']);
        $warehouse2 = $this->createWarehouse(['name' => 'Warehouse 2']);

        // Add stock to warehouse 1
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse1->id, null, 'in', 100, 10.00, 'Test', 1);

        // Transfer 30 from warehouse 1 to warehouse 2
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse1->id, null, 'out', 30, 10.00, 'Transfer', 2);
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse2->id, null, 'in', 30, 10.00, 'Transfer', 3);

        $balance1 = StockBalance::where('product_id', $product->id)->where('warehouse_tower_id', $warehouse1->id)->first();
        $balance2 = StockBalance::where('product_id', $product->id)->where('warehouse_tower_id', $warehouse2->id)->first();

        $this->assertEquals(70, $balance1->quantity);
        $this->assertEquals(30, $balance2->quantity);
    }

    public function test_stock_reverse(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);
        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'out', 30, 10.00, 'Test', 2);

        // Reverse the OUT transaction
        StockService::reverse('Test', 2, 'Reversal');

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(100, $balance->quantity);
    }

    public function test_stock_transaction_recorded(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);

        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $product->id,
            'movement_type' => 'in',
            'quantity' => 100,
            'unit_cost' => 10.00,
        ]);
    }

    public function test_stock_balance_currency(): void
    {
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        StockService::record($this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1);

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals($this->currency->id, $balance->currency_id);
    }
}

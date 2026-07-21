<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryValuationService;
use App\Models\StockBalance;
use App\Models\InventoryValuationLayer;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryValuationServiceTest extends TestCase
{
    use RefreshDatabase;

    private InventoryValuationService $service;
    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new InventoryValuationService();
        $this->company = Company::factory()->create();
        $this->branch = Branch::factory()->create(['company_id' => $this->company->id]);
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $this->product = Product::factory()->create([
            'company_id' => $this->company->id,
            'stock_unit_id' => $unit->id,
            'inventory_valuation_method' => 'average',
        ]);
        $this->warehouse = WarehouseTower::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    private function createBalance(float $qty = 0, float $avgCost = 0, float $totalValue = 0): StockBalance
    {
        return StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => $qty,
            'reserved_quantity' => 0,
            'avg_cost' => $avgCost,
            'total_value' => $totalValue,
        ]);
    }

    // ── Average Cost Tests ───────────────────────────────────────────────

    public function test_average_cost_in_first_purchase(): void
    {
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 10.00);

        $this->assertEquals(100, (float) $balance->quantity);
        $this->assertEquals(10.00, (float) $balance->avg_cost);
        $this->assertEquals(1000.00, (float) $balance->total_value);
    }

    public function test_average_cost_in_weighted_average(): void
    {
        $balance = $this->createBalance(100, 10.00, 1000.00);

        $this->service->applyMovement($balance, 'in', 50, 15.00);

        // New avg = (100*10 + 50*15) / 150 = 1750/150 = 11.67
        $this->assertEquals(150, (float) $balance->quantity);
        $this->assertEquals(11.67, (float) $balance->avg_cost);
        $this->assertEquals(1750.00, (float) $balance->total_value);
    }

    public function test_average_cost_out(): void
    {
        $balance = $this->createBalance(100, 10.00, 1000.00);

        $this->service->applyMovement($balance, 'out', 30);

        $this->assertEquals(70, (float) $balance->quantity);
        $this->assertEquals(10.00, (float) $balance->avg_cost);
        $this->assertEquals(700.00, (float) $balance->total_value);
    }

    public function test_average_cost_out_to_zero(): void
    {
        $balance = $this->createBalance(50, 10.00, 500.00);

        $this->service->applyMovement($balance, 'out', 50);

        $this->assertEquals(0, (float) $balance->quantity);
        $this->assertEquals(0, (float) $balance->avg_cost);
        $this->assertEquals(0, (float) $balance->total_value);
    }

    // ── FIFO Tests ───────────────────────────────────────────────────────

    private function createFifoProduct(): Product
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        return Product::factory()->create([
            'company_id' => $this->company->id,
            'stock_unit_id' => $unit->id,
            'inventory_valuation_method' => 'fifo',
        ]);
    }

    public function test_fifo_in_creates_layer(): void
    {
        $this->product = $this->createFifoProduct();
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 5.00);

        $layers = InventoryValuationLayer::where('product_id', $this->product->id)->get();
        $this->assertCount(1, $layers);
        $this->assertEquals(100, (float) $layers->first()->remaining_quantity);
        $this->assertEquals(5.00, (float) $layers->first()->unit_cost);
    }

    public function test_fifo_in_multiple_layers(): void
    {
        $this->product = $this->createFifoProduct();
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 5.00);
        $this->service->applyMovement($balance, 'in', 50, 7.00);

        $layers = InventoryValuationLayer::where('product_id', $this->product->id)->active()->get();
        $this->assertCount(2, $layers);
        $this->assertEquals(150, (float) $balance->quantity);
    }

    public function test_fifo_out_consumes_oldest_first(): void
    {
        $this->product = $this->createFifoProduct();
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 5.00);
        $this->service->applyMovement($balance, 'in', 50, 7.00);

        // Sell 120: should consume 100@$5 + 20@$7
        $cogs = $this->service->applyFifoOut($balance, 120);

        $this->assertEquals(640.00, $cogs); // 100*5 + 20*7
        $this->assertEquals(30, (float) $balance->quantity);

        // Remaining layer should be 30@$7
        $layers = InventoryValuationLayer::where('product_id', $this->product->id)->active()->get();
        $this->assertCount(1, $layers);
        $this->assertEquals(30, (float) $layers->first()->remaining_quantity);
        $this->assertEquals(7.00, (float) $layers->first()->unit_cost);
    }

    public function test_fifo_cogs_calculation(): void
    {
        $this->product = $this->createFifoProduct();
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 5.00);
        $this->service->applyMovement($balance, 'in', 50, 7.00);

        $cogs = $this->service->calculateCogs($balance, 120);

        $this->assertEquals(640.00, $cogs);
    }

    public function test_fifo_total_value(): void
    {
        $this->product = $this->createFifoProduct();
        $balance = $this->createBalance();

        $this->service->applyMovement($balance, 'in', 100, 5.00);
        $this->service->applyMovement($balance, 'in', 50, 7.00);

        $value = $this->service->getCurrentValue($balance);

        // 100*5 + 50*7 = 500 + 350 = 850
        $this->assertEquals(850.00, $value);
    }
}

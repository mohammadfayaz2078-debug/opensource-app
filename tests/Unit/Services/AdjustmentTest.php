<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryService;
use App\Services\StockService;
use App\Services\StockBalanceService;
use App\Services\InventoryValuationService;
use App\Services\UnitConversionService;
use App\Models\StockBalance;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AdjustmentTest extends TestCase
{
    use RefreshDatabase;

    private InventoryService $inventoryService;
    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
        $valuationService = new InventoryValuationService();
        $balanceService = new StockBalanceService($valuationService);
        $stockService = new StockService($valuationService, $balanceService, new UnitConversionService());
        $this->inventoryService = new InventoryService($stockService, $balanceService, new UnitConversionService(), $valuationService);

        $this->company = Company::factory()->create();
        $this->branch = Branch::factory()->create(['company_id' => $this->company->id]);
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $this->product = Product::factory()->create([
            'company_id' => $this->company->id,
            'stock_unit_id' => $unit->id,
        ]);
        $this->warehouse = WarehouseTower::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    private function createBalance(float $qty = 100): StockBalance
    {
        return StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => $qty,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => $qty * 10.00,
        ]);
    }

    public function test_positive_adjustment_increases_stock(): void
    {
        $this->createBalance(100);

        $adjustment = StockAdjustment::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'adjustment_no' => 'ADJ-TEST-001',
            'adjustment_date' => now()->toDateString(),
            'reason' => 'physical_count',
            'status' => StockAdjustment::STATUS_APPROVED,
        ]);

        StockAdjustmentItem::create([
            'stock_adjustment_id' => $adjustment->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 105,
            'adjustment_quantity' => 5,
            'stock_unit_id' => $this->product->stock_unit_id,
            'unit_cost' => 10.00,
            'total_cost' => 50.00,
        ]);

        $this->inventoryService->postAdjustment($adjustment);

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(105, (float) $balance->quantity);
    }

    public function test_negative_adjustment_decreases_stock(): void
    {
        $this->createBalance(100);

        $adjustment = StockAdjustment::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'adjustment_no' => 'ADJ-TEST-002',
            'adjustment_date' => now()->toDateString(),
            'reason' => 'damage',
            'status' => StockAdjustment::STATUS_APPROVED,
        ]);

        StockAdjustmentItem::create([
            'stock_adjustment_id' => $adjustment->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'system_quantity' => 100,
            'counted_quantity' => 95,
            'adjustment_quantity' => -5,
            'stock_unit_id' => $this->product->stock_unit_id,
            'unit_cost' => 10.00,
            'total_cost' => 50.00,
        ]);

        $this->inventoryService->postAdjustment($adjustment);

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(95, (float) $balance->quantity);
    }
}

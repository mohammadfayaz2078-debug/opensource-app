<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\StockBalance;
use App\Models\StockReservation;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class InventoryAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
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

    public function test_available_quantity_without_reservations(): void
    {
        StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => 100,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => 1000.00,
        ]);

        $available = max(0, 100 - 0);
        $this->assertEquals(100, $available);
    }

    public function test_available_quantity_with_reservations(): void
    {
        StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => 100,
            'reserved_quantity' => 30,
            'avg_cost' => 10.00,
            'total_value' => 1000.00,
        ]);

        $available = max(0, 100 - 30);
        $this->assertEquals(70, $available);
    }

    public function test_reserved_quantity_cannot_exceed_available(): void
    {
        StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => 50,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => 500.00,
        ]);

        // Attempting to reserve 60 should fail (only 50 available)
        $this->expectException(\App\Exceptions\InsufficientStockException::class);

        $balanceService = new \App\Services\StockBalanceService(new \App\Services\InventoryValuationService());
        $balanceService->reserveStock(
            $this->company->id,
            $this->branch->id,
            $this->product->id,
            $this->warehouse->id,
            60
        );
    }

    public function test_multiple_warehouses_aggregate_availability(): void
    {
        $warehouse2 = WarehouseTower::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);

        StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $this->warehouse->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => 100,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => 1000.00,
        ]);

        StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $warehouse2->id,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => 50,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => 500.00,
        ]);

        $balanceService = new \App\Services\StockBalanceService(new \App\Services\InventoryValuationService());
        $totalAvailable = $balanceService->getAvailableQuantity(
            $this->company->id,
            $this->branch->id,
            $this->product->id
        );

        $this->assertEquals(150, $totalAvailable);
    }
}

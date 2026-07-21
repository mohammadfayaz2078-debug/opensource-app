<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\StockService;
use App\Services\InventoryValuationService;
use App\Services\StockBalanceService;
use App\Services\UnitConversionService;
use App\Models\StockBalance;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class StockServiceConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private StockService $service;
    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StockService(
            new InventoryValuationService(),
            new StockBalanceService(new InventoryValuationService()),
            new UnitConversionService()
        );
        $this->company = Company::factory()->create(['allow_negative_stock' => false]);
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

    public function test_single_stock_movement_updates_balance(): void
    {
        $this->createBalance(100);

        $this->service->record(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            movementType: 'out',
            movementTypeExtended: 'sale',
            originalQuantity: 30,
            originalUnitId: $this->product->stock_unit_id,
            convertedQuantity: 30,
            unitCost: 10.00,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(70, (float) $balance->quantity);
    }

    public function test_oversell_throws_exception(): void
    {
        $this->createBalance(50);

        $this->expectException(\App\Exceptions\InsufficientStockException::class);

        $this->service->record(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            movementType: 'out',
            movementTypeExtended: 'sale',
            originalQuantity: 80,
            originalUnitId: $this->product->stock_unit_id,
            convertedQuantity: 80,
            unitCost: 10.00,
            referenceType: 'Sale',
            referenceId: 1,
        );
    }

    public function test_negative_stock_allowed_when_configured(): void
    {
        $this->company->update(['allow_negative_stock' => true]);
        $this->createBalance(50);

        $this->service->record(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            movementType: 'out',
            movementTypeExtended: 'sale',
            originalQuantity: 80,
            originalUnitId: $this->product->stock_unit_id,
            convertedQuantity: 80,
            unitCost: 10.00,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(-30, (float) $balance->quantity);
    }

    public function test_stock_increases_balance(): void
    {
        $this->createBalance(100);

        $this->service->record(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            movementType: 'in',
            movementTypeExtended: 'purchase',
            originalQuantity: 50,
            originalUnitId: $this->product->stock_unit_id,
            convertedQuantity: 50,
            unitCost: 12.00,
            referenceType: 'PurchaseReceive',
            referenceId: 1,
        );

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(150, (float) $balance->quantity);
    }

    public function test_creates_stock_transaction(): void
    {
        $this->createBalance(100);

        $txn = $this->service->record(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            movementType: 'out',
            movementTypeExtended: 'sale',
            originalQuantity: 20,
            originalUnitId: $this->product->stock_unit_id,
            convertedQuantity: 20,
            unitCost: 10.00,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->assertNotNull($txn->id);
        $this->assertEquals('out', $txn->movement_type);
        $this->assertEquals('sale', $txn->movement_type_extended);
        $this->assertEquals(20, (float) $txn->quantity);
    }
}

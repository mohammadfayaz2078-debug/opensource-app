<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\InventoryService;
use App\Services\StockService;
use App\Services\StockBalanceService;
use App\Services\InventoryValuationService;
use App\Services\UnitConversionService;
use App\Models\StockBalance;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    private InventoryService $inventoryService;
    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouseA;
    private WarehouseTower $warehouseB;

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
        $this->warehouseA = WarehouseTower::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
        $this->warehouseB = WarehouseTower::factory()->create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    private function createBalance(int $warehouseId, float $qty = 100): StockBalance
    {
        return StockBalance::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'warehouse_tower_id' => $warehouseId,
            'unit_id' => $this->product->stock_unit_id,
            'quantity' => $qty,
            'reserved_quantity' => 0,
            'avg_cost' => 10.00,
            'total_value' => $qty * 10.00,
        ]);
    }

    public function test_transfer_moves_stock_between_warehouses(): void
    {
        $this->createBalance($this->warehouseA->id, 100);
        $this->createBalance($this->warehouseB->id, 50);

        $transfer = StockTransfer::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'transfer_no' => 'TRF-TEST-001',
            'from_warehouse_id' => $this->warehouseA->id,
            'to_warehouse_id' => $this->warehouseB->id,
            'transfer_date' => now(),
            'status' => 'draft',
        ]);

        StockTransferItem::create([
            'stock_transfer_id' => $transfer->id,
            'product_id' => $this->product->id,
            'quantity' => 30,
            'unit_cost' => 10.00,
            'total_cost' => 300.00,
        ]);

        $this->inventoryService->postTransfer($transfer);

        $balanceA = StockBalance::where('product_id', $this->product->id)
            ->where('warehouse_tower_id', $this->warehouseA->id)->first();
        $balanceB = StockBalance::where('product_id', $this->product->id)
            ->where('warehouse_tower_id', $this->warehouseB->id)->first();

        $this->assertEquals(70, (float) $balanceA->quantity);
        $this->assertEquals(80, (float) $balanceB->quantity);
        $this->assertEquals('transferred', $transfer->fresh()->status);
    }

    public function test_cancel_transfer_reverses_stock(): void
    {
        $this->createBalance($this->warehouseA->id, 100);
        $this->createBalance($this->warehouseB->id, 50);

        $transfer = StockTransfer::create([
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
            'transfer_no' => 'TRF-TEST-002',
            'from_warehouse_id' => $this->warehouseA->id,
            'to_warehouse_id' => $this->warehouseB->id,
            'transfer_date' => now(),
            'status' => 'draft',
        ]);

        StockTransferItem::create([
            'stock_transfer_id' => $transfer->id,
            'product_id' => $this->product->id,
            'quantity' => 30,
            'unit_cost' => 10.00,
            'total_cost' => 300.00,
        ]);

        $this->inventoryService->postTransfer($transfer);
        $this->inventoryService->reverseTransfer($transfer);

        $balanceA = StockBalance::where('product_id', $this->product->id)
            ->where('warehouse_tower_id', $this->warehouseA->id)->first();
        $balanceB = StockBalance::where('product_id', $this->product->id)
            ->where('warehouse_tower_id', $this->warehouseB->id)->first();

        $this->assertEquals(100, (float) $balanceA->quantity);
        $this->assertEquals(50, (float) $balanceB->quantity);
        $this->assertEquals('cancelled', $transfer->fresh()->status);
    }
}

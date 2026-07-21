<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\StockReservationService;
use App\Services\StockBalanceService;
use App\Services\InventoryValuationService;
use App\Models\StockBalance;
use App\Models\StockReservation;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StockReservationServiceTest extends TestCase
{
    use RefreshDatabase;

    private StockReservationService $service;
    private StockBalanceService $balanceService;
    private Company $company;
    private Branch $branch;
    private Product $product;
    private WarehouseTower $warehouse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->balanceService = new StockBalanceService(new InventoryValuationService());
        $this->service = new StockReservationService($this->balanceService);
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

    public function test_reserve_stock(): void
    {
        $this->createBalance(100);

        $reservation = $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 80,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->assertEquals(80, (float) $reservation->quantity);
        $this->assertEquals(StockReservation::STATUS_ACTIVE, $reservation->status);

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(80, (float) $balance->reserved_quantity);
    }

    public function test_reserve_insufficient_stock_throws(): void
    {
        $this->createBalance(50);

        $this->expectException(\App\Exceptions\InsufficientStockException::class);

        $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 80,
            referenceType: 'Sale',
            referenceId: 1,
        );
    }

    public function test_release_reservation(): void
    {
        $this->createBalance(100);

        $reservation = $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 80,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->service->release($reservation);

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(0, (float) $balance->reserved_quantity);
        $this->assertEquals(StockReservation::STATUS_RELEASED, $reservation->fresh()->status);
    }

    public function test_consume_reservation(): void
    {
        $this->createBalance(100);

        $reservation = $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 80,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->service->consume($reservation, 80, 10.00);

        $balance = StockBalance::where('product_id', $this->product->id)->first();
        $this->assertEquals(20, (float) $balance->quantity); // 100 - 80
        $this->assertEquals(0, (float) $balance->reserved_quantity); // 80 - 80
        $this->assertEquals(StockReservation::STATUS_CONSUMED, $reservation->fresh()->status);
    }

    public function test_partial_consume(): void
    {
        $this->createBalance(100);

        $reservation = $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 80,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->service->consume($reservation, 50, 10.00);

        $this->assertEquals(StockReservation::STATUS_ACTIVE, $reservation->fresh()->status);
        $this->assertEquals(50, (float) $reservation->fresh()->consumed_quantity);
    }

    public function test_release_all_for_reference(): void
    {
        $this->createBalance(100);

        $this->service->reserve(
            companyId: $this->company->id,
            branchId: $this->branch->id,
            productId: $this->product->id,
            warehouseTowerId: $this->warehouse->id,
            quantity: 30,
            referenceType: 'Sale',
            referenceId: 1,
        );

        $this->service->releaseAllForReference('Sale', 1);

        $active = StockReservation::where('reference_type', 'Sale')
            ->where('reference_id', 1)
            ->where('status', StockReservation::STATUS_ACTIVE)
            ->count();

        $this->assertEquals(0, $active);
    }
}

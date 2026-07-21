<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\InventorySerialNumber;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SerialNumberTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private Branch $branch;

    protected function setUp(): void
    {
        parent::setUp();
        $this->company = Company::factory()->create();
        $this->branch = Branch::factory()->create(['company_id' => $this->company->id]);
    }

    public function test_create_serial_number(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $serial = InventorySerialNumber::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'serial_number'      => 'DELL-X12345',
            'status'             => InventorySerialNumber::STATUS_AVAILABLE,
        ]);

        $this->assertEquals('DELL-X12345', $serial->serial_number);
        $this->assertEquals(InventorySerialNumber::STATUS_AVAILABLE, $serial->status);
    }

    public function test_serial_number_uniqueness(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        InventorySerialNumber::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'serial_number'      => 'DELL-X12345',
            'status'             => InventorySerialNumber::STATUS_AVAILABLE,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        InventorySerialNumber::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'serial_number'      => 'DELL-X12345',
            'status'             => InventorySerialNumber::STATUS_AVAILABLE,
        ]);
    }

    public function test_serial_number_status_transitions(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $serial = InventorySerialNumber::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'serial_number'      => 'DELL-X12346',
            'status'             => InventorySerialNumber::STATUS_AVAILABLE,
        ]);

        $serial->update(['status' => InventorySerialNumber::STATUS_RESERVED]);
        $this->assertEquals(InventorySerialNumber::STATUS_RESERVED, $serial->fresh()->status);

        $serial->update(['status' => InventorySerialNumber::STATUS_SOLD]);
        $this->assertEquals(InventorySerialNumber::STATUS_SOLD, $serial->fresh()->status);
    }
}

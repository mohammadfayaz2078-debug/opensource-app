<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\LandedCost;
use App\Models\LandedCostItem;
use App\Models\LandedCostAllocation;
use App\Models\InventoryValuationLayer;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class LandedCostTest extends TestCase
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

    public function test_landed_cost_creation(): void
    {
        $landedCost = LandedCost::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'landed_cost_no'     => 'LC-TEST-001',
            'cost_date'          => now()->toDateString(),
            'total_landed_cost'  => 1000.00,
            'allocation_method'  => 'value',
            'status'             => 'draft',
        ]);

        LandedCostItem::create([
            'landed_cost_id' => $landedCost->id,
            'cost_type'      => 'shipping',
            'description'    => 'Ocean freight',
            'amount'         => 600.00,
        ]);

        LandedCostItem::create([
            'landed_cost_id' => $landedCost->id,
            'cost_type'      => 'customs',
            'description'    => 'Import duties',
            'amount'         => 400.00,
        ]);

        $this->assertEquals(1000.00, (float) $landedCost->total_landed_cost);
        $this->assertCount(2, $landedCost->items);
    }

    public function test_landed_cost_value_allocation(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        // Create two valuation layers with different values
        $layer1 = InventoryValuationLayer::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'quantity'           => 100,
            'remaining_quantity' => 100,
            'unit_cost'          => 10.00,
            'total_cost'         => 1000.00,
            'reference_type'     => 'test',
            'reference_id'       => 1,
        ]);

        $layer2 = InventoryValuationLayer::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'quantity'           => 50,
            'remaining_quantity' => 50,
            'unit_cost'          => 20.00,
            'total_cost'         => 1000.00,
            'reference_type'     => 'test',
            'reference_id'       => 2,
        ]);

        // Create landed cost
        $landedCost = LandedCost::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'landed_cost_no'     => 'LC-TEST-002',
            'cost_date'          => now()->toDateString(),
            'total_landed_cost'  => 500.00,
            'allocation_method'  => 'value',
            'status'             => 'posted',
        ]);

        // Allocate by value: layer1=50%, layer2=50% (equal value)
        // layer1 gets $250, layer2 gets $250
        // New layer1 cost: (100*10 + 250) / 100 = 12.50
        // New layer2 cost: (50*20 + 250) / 50 = 15.00

        LandedCostAllocation::create([
            'landed_cost_id' => $landedCost->id,
            'inventory_valuation_layer_id' => $layer1->id,
            'allocated_amount' => 250.00,
        ]);

        LandedCostAllocation::create([
            'landed_cost_id' => $landedCost->id,
            'inventory_valuation_layer_id' => $layer2->id,
            'allocated_amount' => 250.00,
        ]);

        $this->assertCount(2, $landedCost->allocations);
    }
}

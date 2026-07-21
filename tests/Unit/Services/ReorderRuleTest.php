<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Models\StockReorderRule;
use App\Models\Product;
use App\Models\Company;
use App\Models\Branch;
use App\Models\Unit;
use App\Models\WarehouseTower;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ReorderRuleTest extends TestCase
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

    public function test_needs_reorder_when_below_minimum(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $rule = StockReorderRule::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'minimum_quantity'   => 20,
            'maximum_quantity'   => 100,
            'reorder_quantity'   => 80,
            'is_active'          => true,
        ]);

        $this->assertTrue($rule->needsReorder(10));
        $this->assertTrue($rule->needsReorder(20));
        $this->assertFalse($rule->needsReorder(25));
    }

    public function test_get_reorder_amount(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $rule = StockReorderRule::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'minimum_quantity'   => 20,
            'maximum_quantity'   => 100,
            'reorder_quantity'   => 80,
            'is_active'          => true,
        ]);

        $this->assertEquals(80, $rule->getReorderAmount(10));
        $this->assertEquals(0, $rule->getReorderAmount(50));
    }

    public function test_reorder_amount_calculates_to_max_when_no_reorder_qty(): void
    {
        $unit = Unit::factory()->create(['company_id' => $this->company->id]);
        $product = Product::factory()->create(['company_id' => $this->company->id, 'stock_unit_id' => $unit->id]);
        $warehouse = WarehouseTower::factory()->create(['company_id' => $this->company->id, 'branch_id' => $this->branch->id]);

        $rule = StockReorderRule::create([
            'company_id'         => $this->company->id,
            'branch_id'          => $this->branch->id,
            'product_id'         => $product->id,
            'warehouse_tower_id' => $warehouse->id,
            'minimum_quantity'   => 20,
            'maximum_quantity'   => 100,
            'reorder_quantity'   => 0,
            'is_active'          => true,
        ]);

        // When reorder_quantity is 0, it should return maximum - current
        $this->assertEquals(90, $rule->getReorderAmount(10));
    }
}

<?php

namespace Tests\Feature\Warehouse;

use Tests\TestCase;

class WarehouseTowerTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_warehouses(): void
    {
        $response = $this->getJson('/api/warehouse-towers');
        $response->assertOk();
    }

    public function test_can_create_warehouse(): void
    {
        $response = $this->postJson('/api/warehouse-towers', [
            'name' => 'New Warehouse',
            'type' => 'warehouse',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('warehouse_towers', [
            'name' => 'New Warehouse',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_create_tower(): void
    {
        $response = $this->postJson('/api/warehouse-towers', [
            'name' => 'Tower A',
            'type' => 'tower',
            'branch_id' => $this->branch->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('warehouse_towers', [
            'name' => 'Tower A',
            'type' => 'tower',
        ]);
    }

    public function test_can_update_warehouse(): void
    {
        $warehouse = $this->createWarehouse();

        $response = $this->putJson("/api/warehouse-towers/{$warehouse->id}", [
            'name' => 'Updated Warehouse',
        ]);

        $response->assertOk();
    }

    public function test_can_delete_warehouse(): void
    {
        $warehouse = $this->createWarehouse();

        $response = $this->deleteJson("/api/warehouse-towers/{$warehouse->id}");
        $response->assertOk();
    }

    public function test_warehouse_statistics(): void
    {
        $this->createWarehouse();

        $response = $this->getJson('/api/warehouse-towers/statistics');
        $response->assertOk();
    }

    public function test_warehouse_list_options(): void
    {
        $this->createWarehouse();

        $response = $this->getJson('/api/warehouse-towers/list/options');
        $response->assertOk();
    }

    public function test_change_warehouse_type(): void
    {
        $warehouse = $this->createWarehouse(['type' => 'warehouse']);

        $response = $this->postJson("/api/warehouse-towers/{$warehouse->id}/change-type", [
            'type' => 'tower',
        ]);

        $response->assertOk();
        $warehouse->refresh();
        $this->assertEquals('tower', $warehouse->type);
    }
}

<?php

namespace Tests\Feature\Supplier;

use Tests\TestCase;

class SupplierTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_suppliers(): void
    {
        $this->createSupplier(['first_name' => 'Supplier A']);
        $this->createSupplier(['first_name' => 'Supplier B']);

        $response = $this->getJson('/api/suppliers');
        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_can_create_supplier(): void
    {
        $response = $this->postJson('/api/suppliers', [
            'first_name' => 'New',
            'last_name' => 'Supplier',
            'phone' => '1234567890',
            'currency_id' => $this->currency->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('suppliers', [
            'first_name' => 'New',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_show_supplier(): void
    {
        $supplier = $this->createSupplier();

        $response = $this->getJson("/api/suppliers/{$supplier->id}");
        $response->assertOk();
    }

    public function test_can_update_supplier(): void
    {
        $supplier = $this->createSupplier();

        $response = $this->putJson("/api/suppliers/{$supplier->id}", [
            'first_name' => 'Updated',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'first_name' => 'Updated',
        ]);
    }

    public function test_can_delete_supplier(): void
    {
        $supplier = $this->createSupplier();

        $response = $this->deleteJson("/api/suppliers/{$supplier->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
    }

    public function test_supplier_list_options(): void
    {
        $this->createSupplier();

        $response = $this->getJson('/api/suppliers/list/options');
        $response->assertOk();
    }

    public function test_supplier_toggle_status(): void
    {
        $supplier = $this->createSupplier(['is_active' => true]);

        $response = $this->postJson("/api/suppliers/{$supplier->id}/toggle-status");
        $response->assertOk();

        $supplier->refresh();
        $this->assertFalse($supplier->is_active);
    }

    public function test_supplier_export(): void
    {
        $this->createSupplier();

        $response = $this->getJson('/api/suppliers/export/data');
        $response->assertOk();
    }
}

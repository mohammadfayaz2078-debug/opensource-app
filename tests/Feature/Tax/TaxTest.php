<?php

namespace Tests\Feature\Tax;

use Tests\TestCase;

class TaxTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_taxes(): void
    {
        $this->createTax();

        $response = $this->getJson('/api/taxes');
        $response->assertOk();
    }

    public function test_can_create_tax(): void
    {
        $response = $this->postJson('/api/taxes', [
            'name' => 'VAT 5%',
            'rate' => 5.00,
            'usage' => 'both',
            'status' => 'active',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('taxes', [
            'name' => 'VAT 5%',
            'rate' => 5.00,
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_update_tax(): void
    {
        $tax = $this->createTax();

        $response = $this->putJson("/api/taxes/{$tax->id}", [
            'rate' => 15.00,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('taxes', [
            'id' => $tax->id,
            'rate' => 15.00,
        ]);
    }

    public function test_can_delete_tax(): void
    {
        $tax = $this->createTax();

        $response = $this->deleteJson("/api/taxes/{$tax->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('taxes', ['id' => $tax->id]);
    }

    public function test_toggle_tax_active(): void
    {
        $tax = $this->createTax(['status' => 'active']);

        $response = $this->postJson("/api/taxes/{$tax->id}/toggle-active");
        $response->assertOk();

        $tax->refresh();
        $this->assertEquals('inactive', $tax->status);
    }

    public function test_active_list(): void
    {
        $this->createTax(['status' => 'active']);
        $this->createTax(['status' => 'inactive', 'name' => 'Inactive Tax']);

        $response = $this->getJson('/api/taxes/active-list');
        $response->assertOk();
    }
}

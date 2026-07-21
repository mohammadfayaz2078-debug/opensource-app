<?php

namespace Tests\Feature\AuditLog;

use Tests\TestCase;

class AuditLogTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_audit_logs(): void
    {
        $response = $this->getJson('/api/audit-logs');
        $response->assertOk();
    }

    public function test_can_get_audit_log_summary(): void
    {
        $response = $this->getJson('/api/audit-logs/summary');
        $response->assertOk();
    }

    public function test_audit_log_created_on_model_change(): void
    {
        // Create a product (should be audited)
        $product = $this->createProduct();

        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => 'Product',
            'subject_id' => $product->id,
            'action' => 'created',
        ]);
    }

    public function test_audit_log_created_on_update(): void
    {
        $product = $this->createProduct(['name' => 'Original']);

        $this->actingAsUser();
        $this->putJson("/api/products/{$product->id}", [
            'name' => 'Updated',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => 'Product',
            'subject_id' => $product->id,
            'action' => 'updated',
        ]);
    }

    public function test_audit_log_created_on_delete(): void
    {
        $product = $this->createProduct();
        $productId = $product->id;

        $this->deleteJson("/api/products/{$productId}");

        $this->assertDatabaseHas('audit_logs', [
            'subject_type' => 'Product',
            'subject_id' => $productId,
            'action' => 'deleted',
        ]);
    }

    public function test_audit_log_records_company_id(): void
    {
        $product = $this->createProduct();

        $this->assertDatabaseHas('audit_logs', [
            'company_id' => $this->company->id,
            'subject_type' => 'Product',
        ]);
    }
}

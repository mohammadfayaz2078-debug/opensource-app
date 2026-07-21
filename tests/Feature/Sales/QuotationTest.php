<?php

namespace Tests\Feature\Sales;

use Tests\TestCase;
use App\Models\Sale;
use App\Models\SaleItem;

class QuotationTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_can_list_quotations(): void
    {
        $response = $this->getJson('/api/quotations');
        $response->assertOk();
    }

    public function test_can_create_quotation(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $response = $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'due_date' => '2026-02-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'discount' => 0,
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('sales', [
            'document_type' => 'quotation',
            'status' => 'draft',
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    public function test_quotation_has_correct_totals(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $response = $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'discount' => 0,
                ],
            ],
        ]);

        $data = $response->json('data');
        $this->assertEquals(150.00, $data['total_amount']);
        $this->assertEquals(150.00, $data['subtotal']);
    }

    public function test_can_confirm_quotation(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $createResponse = $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 5,
                    'unit_price' => 20.00,
                ],
            ],
        ]);

        $quotationId = $createResponse->json('data.id');

        $response = $this->postJson("/api/quotations/{$quotationId}/confirm");
        $response->assertOk();

        $this->assertDatabaseHas('sales', [
            'id' => $quotationId,
            'status' => 'confirmed',
        ]);
    }

    public function test_can_cancel_quotation(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $createResponse = $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 5,
                    'unit_price' => 20.00,
                ],
            ],
        ]);

        $quotationId = $createResponse->json('data.id');

        $response = $this->postJson("/api/quotations/{$quotationId}/cancel");
        $response->assertOk();

        $this->assertDatabaseHas('sales', [
            'id' => $quotationId,
            'status' => 'cancelled',
        ]);
    }

    public function test_quotation_does_not_affect_stock(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                ],
            ],
        ]);

        // Stock should not change for quotations
        $this->assertDatabaseMissing('stock_transactions', [
            'product_id' => $product->id,
        ]);
    }

    public function test_quotation_does_not_affect_journal(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                ],
            ],
        ]);

        // No journal entries should be created for quotations
        $this->assertDatabaseCount('journal_entries', 0);
    }
}

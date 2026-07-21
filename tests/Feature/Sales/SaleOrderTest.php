<?php

namespace Tests\Feature\Sales;

use Tests\TestCase;
use App\Models\Sale;

class SaleOrderTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_can_list_sale_orders(): void
    {
        $response = $this->getJson('/api/sale-orders');
        $response->assertOk();
    }

    public function test_can_create_sale_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $response = $this->postJson('/api/sale-orders', [
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

        $response->assertCreated();
        $this->assertDatabaseHas('sales', [
            'document_type' => 'order',
            'status' => 'draft',
        ]);
    }

    public function test_can_confirm_sale_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $createResponse = $this->postJson('/api/sale-orders', [
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

        $orderId = $createResponse->json('data.id');

        $response = $this->postJson("/api/sale-orders/{$orderId}/confirm");
        $response->assertOk();

        $this->assertDatabaseHas('sales', [
            'id' => $orderId,
            'status' => 'confirmed',
        ]);
    }

    public function test_can_cancel_sale_order(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $createResponse = $this->postJson('/api/sale-orders', [
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

        $orderId = $createResponse->json('data.id');

        $response = $this->postJson("/api/sale-orders/{$orderId}/cancel");
        $response->assertOk();

        $this->assertDatabaseHas('sales', [
            'id' => $orderId,
            'status' => 'cancelled',
        ]);
    }

    public function test_sale_order_does_not_affect_stock(): void
    {
        $customer = $this->createCustomer();
        $product = $this->createProduct();

        $this->postJson('/api/sale-orders', [
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

        $this->assertDatabaseMissing('stock_transactions', [
            'product_id' => $product->id,
        ]);
    }
}

<?php

namespace Tests\Feature\Product;

use Tests\TestCase;

class ProductTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_products(): void
    {
        $this->createProduct(['name' => 'Product A']);
        $this->createProduct(['name' => 'Product B']);

        $response = $this->getJson('/api/products');
        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_can_create_product(): void
    {
        $response = $this->postJson('/api/products', [
            'name' => 'Widget',
            'purchase_price' => 10.00,
            'sale_price' => 15.00,
            'salable' => true,
            'purchasable' => true,
            'quantity_track' => true,
            'inventory_valuation_method' => 'average',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('products', [
            'name' => 'Widget',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_show_product(): void
    {
        $product = $this->createProduct();

        $response = $this->getJson("/api/products/{$product->id}");
        $response->assertOk();
        $response->assertJsonPath('data.id', $product->id);
    }

    public function test_can_update_product(): void
    {
        $product = $this->createProduct();

        $response = $this->putJson("/api/products/{$product->id}", [
            'name' => 'Updated Widget',
            'sale_price' => 20.00,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Widget',
        ]);
    }

    public function test_can_delete_product(): void
    {
        $product = $this->createProduct();

        $response = $this->deleteJson("/api/products/{$product->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_product_statistics(): void
    {
        $this->createProduct();

        $response = $this->getJson('/api/products/statistics');
        $response->assertOk();
    }

    public function test_product_find_by_barcode(): void
    {
        $product = $this->createProduct(['barcode' => '123456789']);

        $response = $this->getJson('/api/products/barcode/123456789');
        $response->assertOk();
    }

    public function test_product_list_options(): void
    {
        $this->createProduct();

        $response = $this->getJson('/api/products/list/options');
        $response->assertOk();
    }

    public function test_cannot_create_product_without_name(): void
    {
        $response = $this->postJson('/api/products', [
            'purchase_price' => 10.00,
        ]);

        $response->assertStatus(422);
    }

    public function test_product_belongs_to_company(): void
    {
        $product = $this->createProduct();

        $this->assertEquals($this->company->id, $product->company_id);
    }

    public function test_fifo_valuation_product(): void
    {
        $product = $this->createProduct(['inventory_valuation_method' => 'fifo']);
        $this->assertEquals('fifo', $product->inventory_valuation_method);
    }

    public function test_average_valuation_product(): void
    {
        $product = $this->createProduct(['inventory_valuation_method' => 'average']);
        $this->assertEquals('average', $product->inventory_valuation_method);
    }
}

<?php

namespace Tests\Feature\Product;

use Tests\TestCase;
use App\Models\ProductCategory;

class ProductCategoryTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_categories(): void
    {
        $response = $this->getJson('/api/product-categories');
        $response->assertOk();
    }

    public function test_can_create_category(): void
    {
        $response = $this->postJson('/api/product-categories', [
            'name' => 'Electronics',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('product_categories', [
            'name' => 'Electronics',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_update_category(): void
    {
        $category = ProductCategory::create([
            'company_id' => $this->company->id,
            'name' => 'Old Name',
        ]);

        $response = $this->putJson("/api/product-categories/{$category->id}", [
            'name' => 'New Name',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('product_categories', [
            'id' => $category->id,
            'name' => 'New Name',
        ]);
    }

    public function test_can_delete_category(): void
    {
        $category = ProductCategory::create([
            'company_id' => $this->company->id,
            'name' => 'To Delete',
        ]);

        $response = $this->deleteJson("/api/product-categories/{$category->id}");
        $response->assertOk();
    }

    public function test_category_tree(): void
    {
        $response = $this->getJson('/api/product-categories/tree');
        $response->assertOk();
    }

    public function test_category_statistics(): void
    {
        $response = $this->getJson('/api/product-categories/statistics');
        $response->assertOk();
    }

    public function test_category_list_options(): void
    {
        $response = $this->getJson('/api/product-categories/list/options');
        $response->assertOk();
    }
}

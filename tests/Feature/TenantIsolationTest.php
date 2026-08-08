<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;
    use CreatesTenants;

    public function test_sale_rejects_account_from_another_company(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        Sanctum::actingAs($a['user']);

        $this->postJson('/api/sales', [
            'account_id'    => $b['account']->id,
            'document_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $a['product']->id, 'quantity' => 1, 'unit_price' => 15],
            ],
        ])->assertStatus(422);
    }

    public function test_sale_rejects_customer_from_another_company(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        $foreignCustomer = \App\Models\Customer::create([
            'company_id' => $b['company']->id,
            'branch_id'  => $b['branch']->id,
            'first_name' => 'Foreign',
            'last_name'  => 'Customer',
            'phone'      => '+93 700 123 456',
            'email'      => 'foreign' . uniqid() . '@example.com',
            'status'     => 'customer',
            'is_active'  => true,
        ]);

        Sanctum::actingAs($a['user']);

        $this->postJson('/api/sales', [
            'account_id'    => $a['account']->id,
            'customer_id'   => $foreignCustomer->id,
            'document_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $a['product']->id, 'quantity' => 1, 'unit_price' => 15],
            ],
        ])->assertStatus(422);
    }

    public function test_purchase_rejects_account_from_another_company(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        Sanctum::actingAs($a['user']);

        $this->postJson('/api/purchases', [
            'account_id'    => $b['account']->id,
            'purchase_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $a['product']->id, 'quantity' => 1, 'unit_price' => 10],
            ],
        ])->assertStatus(422);
    }

    public function test_user_cannot_toggle_another_companys_product_publication(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        Sanctum::actingAs($a['user']);

        $this->postJson('/api/publications/' . $b['product']->id . '/toggle')->assertNotFound();
    }

    public function test_user_cannot_update_another_companys_order_status(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        $foreignOrder = Order::create([
            'order_no'      => 'ORD-' . uniqid(),
            'customer_name' => 'Other Company Buyer',
            'customer_phone' => '+93 700 999 999',
            'company_id'    => $b['company']->id,
            'branch_id'     => $b['branch']->id,
            'total_amount'  => 10,
        ]);

        Sanctum::actingAs($a['user']);

        $this->putJson('/api/orders/' . $foreignOrder->id . '/status', [
            'status' => 'confirmed',
        ])->assertNotFound();
    }

    public function test_user_cannot_view_another_companys_order(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        $foreignOrder = Order::create([
            'order_no'      => 'ORD-' . uniqid(),
            'customer_name' => 'Other Company Buyer',
            'customer_phone' => '+93 700 999 999',
            'company_id'    => $b['company']->id,
            'branch_id'     => $b['branch']->id,
            'total_amount'  => 10,
        ]);

        Sanctum::actingAs($a['user']);

        $this->getJson('/api/orders/' . $foreignOrder->id)->assertNotFound();
    }

    public function test_sale_payment_rejects_account_from_another_company(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        Sanctum::actingAs($a['user']);
        $this->createPurchase($a);
        $sale = $this->createSale($a);

        $this->postJson('/api/sales/' . $sale->id . '/pay', [
            'amount'     => 15,
            'account_id' => $b['account']->id,
        ])->assertStatus(422);
    }
}

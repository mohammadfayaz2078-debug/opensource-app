<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicMarketplaceSecurityTest extends TestCase
{
    use RefreshDatabase;
    use CreatesTenants;

    public function test_guest_cannot_list_orders(): void
    {
        $this->getJson('/api/orders')->assertUnauthorized();
    }

    public function test_guest_cannot_view_an_order(): void
    {
        $this->getJson('/api/orders/1')->assertUnauthorized();
    }

    public function test_guest_cannot_update_an_order_status(): void
    {
        $this->putJson('/api/orders/1/status', ['status' => 'confirmed'])->assertUnauthorized();
    }

    public function test_guest_can_place_an_order_for_public_products(): void
    {
        $t = $this->makeTenant();

        $this->postJson('/api/orders', [
            'customer_name'  => 'Buyer One',
            'customer_phone' => '+93 700 000 000',
            'items'          => [['product_id' => $t['product']->id, 'quantity' => 2]],
        ])->assertStatus(201);

        $this->assertDatabaseHas('orders', [
            'customer_name' => 'Buyer One',
            'company_id'    => $t['company']->id,
        ]);
    }

    public function test_guest_order_rejects_private_products(): void
    {
        $t = $this->makeTenant();
        $t['product']->update(['is_public' => false]);

        $this->postJson('/api/orders', [
            'customer_name'  => 'Buyer One',
            'customer_phone' => '+93 700 000 000',
            'items'          => [['product_id' => $t['product']->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    public function test_guest_order_rejects_items_from_different_companies(): void
    {
        $a = $this->makeTenant();
        $b = $this->makeTenant();

        $this->postJson('/api/orders', [
            'customer_name'  => 'Buyer One',
            'customer_phone' => '+93 700 000 000',
            'items'          => [
                ['product_id' => $a['product']->id, 'quantity' => 1],
                ['product_id' => $b['product']->id, 'quantity' => 1],
            ],
        ])->assertStatus(422);
    }

    public function test_check_email_does_not_disclose_sensitive_customer_fields(): void
    {
        $t = $this->makeTenant();

        $customer = Customer::create([
            'company_id'     => $t['company']->id,
            'branch_id'      => $t['branch']->id,
            'first_name'     => 'Jane',
            'last_name'      => 'Doe',
            'phone'          => '+93 700 111 222',
            'email'          => 'jane' . uniqid() . '@example.com',
            'street_address' => 'Secret Street 1',
            'province'       => 'Kabul',
            'status'         => 'lead',
            'is_active'      => true,
        ]);

        $response = $this->getJson('/api/customers/check-email?email=' . $customer->email);

        $response->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonPath('customer.first_name', 'Jane')
            ->assertJsonMissingPath('customer.address')
            ->assertJsonMissingPath('customer.province');
    }

    public function test_authenticated_admin_sees_only_their_own_companys_orders(): void
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
        $response = $this->getJson('/api/orders');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($foreignOrder->id, $ids);
    }
}

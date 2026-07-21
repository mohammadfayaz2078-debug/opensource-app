<?php

namespace Tests\Feature\Customer;

use Tests\TestCase;
use App\Models\Customer;

class CustomerTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_customers(): void
    {
        $this->createCustomer(['first_name' => 'John']);
        $this->createCustomer(['first_name' => 'Jane']);

        $response = $this->getJson('/api/customers');
        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }

    public function test_can_create_customer(): void
    {
        $response = $this->postJson('/api/customers', [
            'first_name' => 'New',
            'last_name' => 'Customer',
            'status' => 'Customer',
            'phone' => '1234567890',
            'currency_id' => $this->currency->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('customers', [
            'first_name' => 'New',
            'last_name' => 'Customer',
            'company_id' => $this->company->id,
            'branch_id' => $this->branch->id,
        ]);
    }

    public function test_can_show_customer(): void
    {
        $customer = $this->createCustomer();

        $response = $this->getJson("/api/customers/{$customer->id}");
        $response->assertOk();
        $response->assertJsonPath('data.id', $customer->id);
    }

    public function test_can_update_customer(): void
    {
        $customer = $this->createCustomer();

        $response = $this->putJson("/api/customers/{$customer->id}", [
            'first_name' => 'Updated',
            'last_name' => 'Name',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'first_name' => 'Updated',
        ]);
    }

    public function test_can_delete_customer(): void
    {
        $customer = $this->createCustomer();

        $response = $this->deleteJson("/api/customers/{$customer->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_customer_status_stats(): void
    {
        $this->createCustomer(['status' => 'Customer']);
        $this->createCustomer(['status' => 'Lead']);

        $response = $this->getJson('/api/customers/status-stats');
        $response->assertOk();
    }

    public function test_lead_creation(): void
    {
        $response = $this->postJson('/api/leads', [
            'first_name' => 'Lead',
            'last_name' => 'Prospect',
            'status' => 'Lead',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('customers', [
            'first_name' => 'Lead',
            'status' => 'Lead',
        ]);
    }

    public function test_lead_toggle_status(): void
    {
        $lead = $this->createCustomer(['status' => 'Lead']);

        $response = $this->postJson("/api/leads/{$lead->id}/toggle-status");
        $response->assertOk();
    }

    public function test_customer_with_related_users(): void
    {
        $customer = $this->createCustomer(['has_related_users' => true]);

        $response = $this->getJson("/api/customers/{$customer->id}");
        $response->assertOk();
    }

    public function test_cannot_create_customer_without_required_fields(): void
    {
        $response = $this->postJson('/api/customers', [
            'last_name' => 'Missing First Name',
        ]);

        $response->assertStatus(422);
    }

    public function test_bulk_delete_customers(): void
    {
        $c1 = $this->createCustomer(['first_name' => 'Delete1']);
        $c2 = $this->createCustomer(['first_name' => 'Delete2']);

        $response = $this->deleteJson('/api/customers/bulk/delete', [
            'customer_ids' => [$c1->id, $c2->id],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('customers', ['id' => $c1->id]);
        $this->assertDatabaseMissing('customers', ['id' => $c2->id]);
    }

    public function test_customer_list_options(): void
    {
        $this->createCustomer();

        $response = $this->getJson('/api/customers/list/options');
        $response->assertOk();
    }

    public function test_customer_export(): void
    {
        $this->createCustomer();

        $response = $this->getJson('/api/customers/export/data');
        $response->assertOk();
    }
}

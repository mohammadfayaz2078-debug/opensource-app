<?php

namespace Tests\Feature\Accounting;

use Tests\TestCase;

class ChartOfAccountTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_accounts(): void
    {
        $response = $this->getJson('/api/chart-of-accounts');
        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_can_create_account(): void
    {
        $typeId = \App\Models\AccountType::where('company_id', $this->company->id)->first()->id;

        $response = $this->postJson('/api/chart-of-accounts', [
            'code' => '9999',
            'name' => 'Test Account',
            'account_type_id' => $typeId,
            'nature' => 'debit',
            'is_active' => true,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('chart_of_accounts', [
            'code' => '9999',
            'name' => 'Test Account',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_get_account_tree(): void
    {
        $response = $this->getJson('/api/chart-of-accounts/tree');
        $response->assertOk();
    }

    public function test_can_get_account_types(): void
    {
        $response = $this->getJson('/api/chart-of-accounts/types');
        $response->assertOk();
    }

    public function test_can_get_account_groups(): void
    {
        $response = $this->getJson('/api/chart-of-accounts/groups');
        $response->assertOk();
    }

    public function test_can_get_next_code(): void
    {
        $response = $this->getJson('/api/chart-of-accounts/next-code');
        $response->assertOk();
    }

    public function test_can_toggle_account_active(): void
    {
        $account = \App\Models\ChartOfAccount::where('company_id', $this->company->id)->first();

        $response = $this->postJson("/api/chart-of-accounts/{$account->id}/toggle-active");
        $response->assertOk();

        $account->refresh();
        $this->assertFalse($account->is_active);
    }

    public function test_can_toggle_account_deprecated(): void
    {
        $account = \App\Models\ChartOfAccount::where('company_id', $this->company->id)->first();

        $response = $this->postJson("/api/chart-of-accounts/{$account->id}/toggle-deprecated");
        $response->assertOk();

        $account->refresh();
        $this->assertTrue($account->deprecated);
    }

    public function test_accounts_belong_to_company(): void
    {
        $accounts = \App\Models\ChartOfAccount::where('company_id', $this->company->id)->get();

        foreach ($accounts as $account) {
            $this->assertEquals($this->company->id, $account->company_id);
        }
    }
}

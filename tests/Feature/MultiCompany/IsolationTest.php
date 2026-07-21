<?php

namespace Tests\Feature\MultiCompany;

use Tests\TestCase;
use App\Models\Company;
use App\Models\Branch;
use App\Models\User;
use App\Models\Role;
use App\Models\Customer;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;

class IsolationTest extends TestCase
{

    protected Company $companyA;
    protected Company $companyB;
    protected Branch $branchA;
    protected Branch $branchB;
    protected User $userA;
    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        // Create SuperAdmin
        $superAdmin = \App\Models\SuperAdmin::create([
            'name' => 'Super',
            'email' => 'super@test.com',
            'password' => Hash::make('password'),
            'language' => 'en',
        ]);

        // Company A
        $this->companyA = Company::create([
            'company_name' => 'Company A',
            'company_email' => 'companyA@test.com',
            'email' => 'adminA@test.com',
            'manager_name' => 'Manager A',
            'manager_password' => 'password',
            'language' => 'en',
            'is_active' => true,
            'created_by' => $superAdmin->id,
        ]);

        $currencyA = \App\Models\Currency::create([
            'company_id' => $this->companyA->id,
            'code' => 'USD',
            'name' => 'US Dollar',
            'is_active' => true,
        ]);
        $this->companyA->update(['base_currency_id' => $currencyA->id]);

        $this->branchA = Branch::create([
            'company_id' => $this->companyA->id,
            'branch_name' => 'Branch A',
            'is_active' => true,
        ]);

        $roleA = Role::create([
            'branch_id' => $this->branchA->id,
            'role_name' => 'admin',
            'permissions' => config('permissions'),
        ]);

        $this->userA = User::create([
            'company_id' => $this->companyA->id,
            'branch_id' => $this->branchA->id,
            'role_id' => $roleA->id,
            'first_name' => 'User',
            'last_name' => 'A',
            'email' => 'userA@test.com',
            'password' => 'password',
            'status' => true,
            'language' => 'en',
        ]);

        // Company B
        $this->companyB = Company::create([
            'company_name' => 'Company B',
            'company_email' => 'companyB@test.com',
            'email' => 'adminB@test.com',
            'manager_name' => 'Manager B',
            'manager_password' => 'password',
            'language' => 'en',
            'is_active' => true,
            'created_by' => $superAdmin->id,
        ]);

        $currencyB = \App\Models\Currency::create([
            'company_id' => $this->companyB->id,
            'code' => 'USD',
            'name' => 'US Dollar',
            'is_active' => true,
        ]);
        $this->companyB->update(['base_currency_id' => $currencyB->id]);

        $this->branchB = Branch::create([
            'company_id' => $this->companyB->id,
            'branch_name' => 'Branch B',
            'is_active' => true,
        ]);

        $roleB = Role::create([
            'branch_id' => $this->branchB->id,
            'role_name' => 'admin',
            'permissions' => config('permissions'),
        ]);

        $this->userB = User::create([
            'company_id' => $this->companyB->id,
            'branch_id' => $this->branchB->id,
            'role_id' => $roleB->id,
            'first_name' => 'User',
            'last_name' => 'B',
            'email' => 'userB@test.com',
            'password' => 'password',
            'status' => true,
            'language' => 'en',
        ]);
    }

    public function test_user_a_cannot_see_company_b_customers(): void
    {
        // Create customer in Company B
        Customer::create([
            'company_id' => $this->companyB->id,
            'branch_id' => $this->branchB->id,
            'first_name' => 'Secret',
            'last_name' => 'Customer',
            'status' => 'Customer',
        ]);

        // Login as User A
        $token = $this->userA->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/customers');

        $response->assertOk();

        // Should not see Company B's customer
        foreach ($response->json('data') as $customer) {
            $this->assertNotEquals('Secret', $customer['first_name']);
        }
    }

    public function test_user_a_cannot_see_company_b_products(): void
    {
        Product::create([
            'company_id' => $this->companyB->id,
            'name' => 'Secret Product',
            'purchase_price' => 10,
            'sale_price' => 15,
        ]);

        $token = $this->userA->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/products');

        $response->assertOk();

        foreach ($response->json('data') as $product) {
            $this->assertNotEquals('Secret Product', $product['name']);
        }
    }

    public function test_user_b_cannot_see_company_a_customers(): void
    {
        Customer::create([
            'company_id' => $this->companyA->id,
            'branch_id' => $this->branchA->id,
            'first_name' => 'CompanyA',
            'last_name' => 'Customer',
            'status' => 'Customer',
        ]);

        $token = $this->userB->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/customers');

        $response->assertOk();

        foreach ($response->json('data') as $customer) {
            $this->assertNotEquals('CompanyA', $customer['first_name']);
        }
    }

    public function test_users_are_in_different_companies(): void
    {
        $this->assertEquals($this->companyA->id, $this->userA->company_id);
        $this->assertEquals($this->companyB->id, $this->userB->company_id);
        $this->assertNotEquals($this->userA->company_id, $this->userB->company_id);
    }
}

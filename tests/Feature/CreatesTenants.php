<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Branch;
use App\Models\Company;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;

trait CreatesTenants
{
    /**
     * Build a fully isolated, fictional tenant: company + branch + admin role
     * + branch user + cash account + public product.
     *
     * @return array{company: Company, branch: Branch, role: Role, user: User, account: Account, product: Product}
     */
    protected function makeTenant(): array
    {
        $company = Company::create([
            'company_name'    => 'Test Co ' . uniqid(),
            'company_email'   => 'co' . uniqid() . '@example.com',
            'email'           => 'manager' . uniqid() . '@example.com',
            'manager_name'    => 'Test Manager',
            'manager_password' => 'secret123',
            'language'        => 'en',
        ]);

        $branch = Branch::create([
            'company_id'                  => $company->id,
            'branch_name'                 => 'Main Branch',
            'is_active'                   => true,
            'allowed_user_count'          => 50,
            'allowed_product_publish_count' => 500,
        ]);

        $role = Role::create([
            'branch_id'   => $branch->id,
            'role_name'   => 'admin',
            'permissions' => ['dashboard' => ['view' => true]],
        ]);

        $user = User::create([
            'company_id' => $company->id,
            'branch_id'  => $branch->id,
            'role_id'    => $role->id,
            'first_name' => 'Test',
            'last_name'  => 'User',
            'email'      => 'user' . uniqid() . '@example.com',
            'password'   => 'password', // hashed by the model's 'hashed' cast
            'status'     => true,
            'language'   => 'en',
        ]);

        $account = Account::create([
            'company_id' => $company->id,
            'branch_id'  => $branch->id,
            'name'       => 'Cash Account',
            'type'       => 'cash',
            'is_active'  => true,
        ]);

        $product = Product::create([
            'company_id'    => $company->id,
            'branch_id'     => $branch->id,
            'name'          => 'Test Widget',
            'barcode'       => 'TEST-' . uniqid(),
            'purchase_price' => 10,
            'sale_price'    => 15,
            'is_public'     => true,
        ]);

        return compact('company', 'branch', 'role', 'user', 'account', 'product');
    }

    /**
     * Record stock by creating a purchase for a tenant (10 units of its product).
     */
    protected function createPurchase(array $t, int $quantity = 10): \App\Models\Purchase
    {
        $response = $this->postJson('/api/purchases', [
            'account_id'    => $t['account']->id,
            'purchase_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $t['product']->id, 'quantity' => $quantity, 'unit_price' => 10],
            ],
        ]);

        $response->assertStatus(201);

        return \App\Models\Purchase::findOrFail($response->json('data.id'));
    }

    /**
     * Create a confirmed sale for a tenant (1 unit of its product).
     */
    protected function createSale(array $t, int $quantity = 1): \App\Models\Sale
    {
        $response = $this->postJson('/api/sales', [
            'account_id'    => $t['account']->id,
            'document_date' => now()->toDateString(),
            'items'         => [
                ['product_id' => $t['product']->id, 'quantity' => $quantity, 'unit_price' => 15],
            ],
        ]);

        $response->assertStatus(201);

        return \App\Models\Sale::findOrFail($response->json('data.id'));
    }
}

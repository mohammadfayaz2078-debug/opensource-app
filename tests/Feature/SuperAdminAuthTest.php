<?php

namespace Tests\Feature;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The platform Super Admin actor (login + platform routes) was previously
 * unreachable: there was no login path and the routes the Super Admin UI calls
 * did not exist. These tests lock in the wiring so it cannot regress silently.
 */
class SuperAdminAuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeSuperAdmin(): SuperAdmin
    {
        return SuperAdmin::create([
            'name'     => 'Root Admin',
            'email'    => 'root' . uniqid() . '@example.com',
            'password' => Hash::make('correct-horse'),
            'language' => 'en',
        ]);
    }

    public function test_super_admin_can_log_in_and_receives_a_token(): void
    {
        $admin = $this->makeSuperAdmin();

        $response = $this->postJson('/api/login', [
            'email'    => $admin->email,
            'password' => 'correct-horse',
        ]);

        $response->assertOk()
            ->assertJsonPath('user_type', 'superadmin')
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonStructure(['token']);
    }

    public function test_wrong_password_is_rejected(): void
    {
        $admin = $this->makeSuperAdmin();

        $this->postJson('/api/login', [
            'email'    => $admin->email,
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_super_admin_can_list_companies_via_platform_route(): void
    {
        $admin = $this->makeSuperAdmin();

        Sanctum::actingAs($admin);

        $this->getJson('/api/super-admin/companies')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_super_admin_can_read_and_update_own_profile(): void
    {
        $admin = $this->makeSuperAdmin();

        Sanctum::actingAs($admin);

        $this->getJson('/api/super-admin/profile')->assertOk();

        $this->putJson('/api/super-admin/profile', [
            'name'  => 'Updated Root',
            'email' => $admin->email,
            'language' => 'en',
        ])->assertOk();

        $this->assertSame('Updated Root', $admin->fresh()->name);
    }

    public function test_regular_user_cannot_access_platform_routes(): void
    {
        $admin = $this->makeSuperAdmin();

        // A normal branch user must never reach the platform routes.
        $company = \App\Models\Company::create([
            'company_name'     => 'Tenant Co ' . uniqid(),
            'company_email'    => 'co' . uniqid() . '@example.com',
            'email'            => 'mgr' . uniqid() . '@example.com',
            'manager_name'     => 'Manager',
            'manager_password' => 'secret123',
            'language'         => 'en',
        ]);

        $branch = \App\Models\Branch::create([
            'company_id'                  => $company->id,
            'branch_name'                 => 'Branch',
            'is_active'                   => true,
            'allowed_user_count'          => 10,
            'allowed_product_publish_count' => 100,
        ]);

        $role = \App\Models\Role::create([
            'branch_id'   => $branch->id,
            'role_name'   => 'admin',
            'permissions' => ['dashboard' => ['view' => true]],
        ]);

        $user = \App\Models\User::create([
            'company_id' => $company->id,
            'branch_id'  => $branch->id,
            'role_id'    => $role->id,
            'first_name' => 'Test',
            'last_name'  => 'User',
            'email'      => 'user' . uniqid() . '@example.com',
            'password'   => 'password',
            'status'     => true,
            'language'   => 'en',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/super-admin/companies')->assertForbidden();
        $this->getJson('/api/super-admin/profile')->assertForbidden();
    }
}

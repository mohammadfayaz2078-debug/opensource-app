<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\User;

class AuthorizationTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
    }

    public function test_company_admin_has_full_access(): void
    {
        $this->actingAsCompany();

        $response = $this->getJson('/api/branches');
        $response->assertOk();
    }

    public function test_super_admin_has_full_access(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->getJson('/api/super-admin/super-admins');
        $response->assertOk();
    }

    public function test_user_with_admin_role_has_full_access(): void
    {
        $this->actingAsUser();

        $response = $this->getJson('/api/branches');
        $response->assertOk();
    }

    public function test_user_without_permission_is_denied(): void
    {
        $restrictedUser = $this->createUserWithRole([
            'users' => ['view' => false, 'create' => false, 'edit' => false, 'delete' => false],
        ]);

        $token = $restrictedUser->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/user');

        $response->assertStatus(403);
    }

    public function test_user_with_partial_permission_can_view(): void
    {
        $restrictedUser = $this->createUserWithRole([
            'users' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
        ]);

        $token = $restrictedUser->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/user');

        $response->assertOk();
    }

    public function test_user_with_permission_can_create(): void
    {
        $restrictedUser = $this->createUserWithRole([
            'users' => ['view' => true, 'create' => true, 'edit' => false, 'delete' => false],
        ]);

        $token = $restrictedUser->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/register', [
                'first_name' => 'New',
                'last_name' => 'User',
                'email' => 'new@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $this->role->id,
            ]);

        $response->assertCreated();
    }

    public function test_user_without_create_permission_cannot_create(): void
    {
        $restrictedUser = $this->createUserWithRole([
            'users' => ['view' => true, 'create' => false, 'edit' => false, 'delete' => false],
        ]);

        $token = $restrictedUser->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/register', [
                'first_name' => 'New',
                'last_name' => 'User',
                'email' => 'new@test.com',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'role_id' => $this->role->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_roles_modules_endpoint_returns_permission_list(): void
    {
        $token = $this->user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/roles/modules');

        $response->assertOk();
        $response->assertJsonStructure(['dashboard', 'roles', 'users']);
    }
}

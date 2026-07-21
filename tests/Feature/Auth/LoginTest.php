<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;
use App\Models\SuperAdmin;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class LoginTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
    }

    public function test_super_admin_can_login(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'superadmin@test.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'user_type',
            'token',
        ]);
        $this->assertEquals('super_admin', $response->json('user_type'));
    }

    public function test_company_admin_can_login(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'user_type',
            'token',
        ]);
        $this->assertEquals('company_admin', $response->json('user_type'));
    }

    public function test_regular_user_can_login(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'user@test.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'user_type',
            'token',
        ]);
        $this->assertEquals('user', $response->json('user_type'));
    }

    public function test_invalid_credentials_returns_401(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'superadmin@test.com',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(401);
    }

    public function test_nonexistent_email_returns_401(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    public function test_deactivated_company_cannot_login(): void
    {
        $this->company->update(['is_active' => false]);

        $response = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_deactivated_user_cannot_login(): void
    {
        $this->user->update(['status' => false]);

        $response = $this->postJson('/api/login', [
            'email' => 'user@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_deactivated_super_admin_cannot_login(): void
    {
        $this->superAdmin->update(['is_active' => false]);

        $response = $this->postJson('/api/login', [
            'email' => 'superadmin@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_login_creates_user_session(): void
    {
        $this->postJson('/api/login', [
            'email' => 'user@test.com',
            'password' => 'password',
        ]);

        $this->assertDatabaseHas('user_sessions', [
            'user_id' => $this->user->id,
            'is_active' => true,
        ]);
    }

    public function test_me_endpoint_returns_authenticated_user(): void
    {
        $token = $this->user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/me');

        $response->assertOk();
        $response->assertJsonStructure([
            'user' => ['id', 'first_name', 'last_name', 'email'],
            'user_type',
        ]);
    }

    public function test_logout_deletes_token(): void
    {
        $token = $this->user->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout');

        $response->assertOk();

        // Verify token is deleted
        $this->assertDatabaseMissing('personal_access_tokens', [
            'token' => hash('sha256', $token),
        ]);
    }

    public function test_unauthenticated_access_returns_401(): void
    {
        $response = $this->getJson('/api/me');
        $response->assertStatus(401);
    }
}

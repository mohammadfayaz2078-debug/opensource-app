<?php

namespace Tests\Feature\Company;

use Tests\TestCase;

class CompanyProfileTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsCompany();
    }

    public function test_can_get_company_profile(): void
    {
        $response = $this->getJson('/api/company-admin/profile');
        $response->assertOk();
        $response->assertJsonPath('data.company_name', 'Test Company');
    }

    public function test_can_update_company_profile(): void
    {
        $response = $this->putJson('/api/company-admin/profile', [
            'company_name' => 'Updated Company',
            'company_phone' => '1234567890',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('companies', [
            'id' => $this->company->id,
            'company_name' => 'Updated Company',
        ]);
    }

    public function test_can_change_password(): void
    {
        $response = $this->postJson('/api/company-admin/profile/change-password', [
            'current_password' => 'password',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123',
        ]);

        $response->assertOk();
    }

    public function test_cannot_change_password_with_wrong_current(): void
    {
        $response = $this->postJson('/api/company-admin/profile/change-password', [
            'current_password' => 'wrongpassword',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422);
    }
}

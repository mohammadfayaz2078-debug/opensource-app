<?php

namespace Tests\Feature;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BackupAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use CreatesTenants;

    public function test_unauthenticated_guest_cannot_download_backup(): void
    {
        $this->getJson('/api/backup/download')->assertUnauthorized();
    }

    public function test_branch_user_cannot_download_database_backup(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);

        $this->getJson('/api/backup/download')->assertForbidden();
    }

    public function test_company_admin_cannot_download_database_backup(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['company']);

        $this->getJson('/api/backup/download')->assertForbidden();
    }

    public function test_super_admin_passes_the_backup_authorization_guard(): void
    {
        $superAdmin = SuperAdmin::create([
            'name'     => 'Root Admin',
            'email'    => 'root' . uniqid() . '@example.com',
            'password' => Hash::make('secret-password'),
            'language' => 'en',
        ]);

        Sanctum::actingAs($superAdmin);

        $response = $this->getJson('/api/backup/download');

        // The authorization guard must NOT reject the super admin. The SQL dump
        // itself is MySQL-only, so on the SQLite test database the generation
        // step returns a 500 — the security-relevant assertion is that the
        // endpoint is not blocked with 403 for the platform owner.
        $this->assertNotSame(403, $response->status());
        $this->assertNotSame(401, $response->status());
    }
}

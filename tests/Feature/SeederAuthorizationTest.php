<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The /company-admin/seeder/* endpoints truncate tenant tables, so they must
 * only be reachable by an authenticated company admin. Before this test was
 * added, any authenticated branch user could call resetAndSeed() and wipe
 * every tenant's users, roles, branches and accounts.
 */
class SeederAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use CreatesTenants;

    public function test_guest_cannot_run_seeder(): void
    {
        $this->postJson('/api/company-admin/seeder/run')->assertUnauthorized();
        $this->postJson('/api/company-admin/seeder/reset')->assertUnauthorized();
        $this->getJson('/api/company-admin/seeder/status')->assertUnauthorized();
    }

    public function test_branch_user_cannot_run_seeder(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);

        $this->postJson('/api/company-admin/seeder/run')->assertForbidden();
        $this->postJson('/api/company-admin/seeder/reset')->assertForbidden();
        $this->getJson('/api/company-admin/seeder/status')->assertForbidden();
    }

    public function test_company_admin_can_check_seeder_status(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['company']);

        $this->getJson('/api/company-admin/seeder/status')->assertOk();
    }

    public function test_seeder_is_disabled_in_production_environment(): void
    {
        // Simulate a production install: the destructive demo seeder must refuse
        // to run regardless of who is authenticated.
        $this->withServerVariables(['APP_ENV' => 'production']);
        app()->detectEnvironment(fn () => 'production');

        $t = $this->makeTenant();

        Sanctum::actingAs($t['company']);

        $this->postJson('/api/company-admin/seeder/run')->assertForbidden();
        $this->postJson('/api/company-admin/seeder/reset')->assertForbidden();
    }

    public function test_register_options_requires_authentication(): void
    {
        $this->getJson('/api/register/options')->assertUnauthorized();
    }

    public function test_register_options_works_for_authenticated_user(): void
    {
        $t = $this->makeTenant();

        Sanctum::actingAs($t['user']);

        $this->getJson('/api/register/options')
            ->assertOk()
            ->assertJsonStructure(['branches', 'roles', 'companies']);
    }

    public function test_comment_delete_requires_authentication(): void
    {
        $t = $this->makeTenant();

        // Give the public product a comment, then confirm a guest cannot delete it.
        $product = $t['product'];
        $product->update(['comments' => [['name' => 'Guest', 'message' => 'Hi', 'created_at' => now()->toDateTimeString()]]]);

        $this->deleteJson("/api/products/{$product->id}/comments/0")->assertUnauthorized();

        Sanctum::actingAs($t['user']);
        $this->deleteJson("/api/products/{$product->id}/comments/0")->assertOk();
    }
}

<?php

namespace Tests\Feature\Company;

use Tests\TestCase;

class BranchTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsCompany();
    }

    public function test_can_list_branches(): void
    {
        $response = $this->getJson('/api/branches');
        $response->assertOk();
        $this->assertNotEmpty($response->json('data'));
    }

    public function test_can_create_branch(): void
    {
        $response = $this->postJson('/api/branches', [
            'branch_name' => 'New Branch',
            'branch_country' => 'Afghanistan',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('branches', [
            'branch_name' => 'New Branch',
            'company_id' => $this->company->id,
        ]);
    }

    public function test_can_show_branch(): void
    {
        $response = $this->getJson("/api/branches/{$this->branch->id}");
        $response->assertOk();
    }

    public function test_can_update_branch(): void
    {
        $response = $this->putJson("/api/branches/{$this->branch->id}", [
            'branch_name' => 'Updated Branch',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('branches', [
            'id' => $this->branch->id,
            'branch_name' => 'Updated Branch',
        ]);
    }

    public function test_can_delete_branch(): void
    {
        // Create a new branch to delete
        $branch = \App\Models\Branch::create([
            'company_id' => $this->company->id,
            'branch_name' => 'To Delete',
            'is_active' => true,
        ]);

        $response = $this->deleteJson("/api/branches/{$branch->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('branches', ['id' => $branch->id]);
    }

    public function test_toggle_branch_status(): void
    {
        $response = $this->patchJson("/api/branches/{$this->branch->id}/toggle-status");
        $response->assertOk();

        $this->branch->refresh();
        $this->assertFalse($this->branch->is_active);
    }
}

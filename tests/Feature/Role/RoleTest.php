<?php

namespace Tests\Feature\Role;

use Tests\TestCase;

class RoleTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->actingAsUser();
    }

    public function test_can_list_roles(): void
    {
        $response = $this->getJson('/api/roles');
        $response->assertOk();
    }

    public function test_can_create_role(): void
    {
        $response = $this->postJson('/api/roles', [
            'role_name' => 'Sales Manager',
            'branch_id' => $this->branch->id,
            'permissions' => [
                'customers' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
                'quotations' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => false],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('roles', [
            'role_name' => 'Sales Manager',
            'branch_id' => $this->branch->id,
        ]);
    }

    public function test_can_update_role(): void
    {
        $role = \App\Models\Role::create([
            'branch_id' => $this->branch->id,
            'role_name' => 'To Update',
            'permissions' => [],
        ]);

        $response = $this->putJson("/api/roles/{$role->id}", [
            'role_name' => 'Updated Role',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'role_name' => 'Updated Role',
        ]);
    }

    public function test_can_delete_role(): void
    {
        $role = \App\Models\Role::create([
            'branch_id' => $this->branch->id,
            'role_name' => 'To Delete',
            'permissions' => [],
        ]);

        $response = $this->deleteJson("/api/roles/{$role->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('roles', ['id' => $role->id]);
    }

    public function test_role_permissions_are_json(): void
    {
        $role = \App\Models\Role::create([
            'branch_id' => $this->branch->id,
            'role_name' => 'Test JSON',
            'permissions' => [
                'dashboard' => ['view' => true],
                'users' => ['view' => true, 'create' => false],
            ],
        ]);

        $this->assertIsArray($role->permissions);
        $this->assertTrue($role->permissions['dashboard']['view']);
        $this->assertFalse($role->permissions['users']['create']);
    }

    public function test_role_has_permission_method(): void
    {
        $role = \App\Models\Role::create([
            'branch_id' => $this->branch->id,
            'role_name' => 'Test HasPerm',
            'permissions' => [
                'users' => ['view' => true, 'create' => false],
            ],
        ]);

        $this->assertTrue($role->hasPermission('users', 'view'));
        $this->assertFalse($role->hasPermission('users', 'create'));
        $this->assertFalse($role->hasPermission('users', 'delete'));
    }
}

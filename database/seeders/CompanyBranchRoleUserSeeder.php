<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class CompanyBranchRoleUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Assume company already exists with ID = 1
        $companyId = 1;

        // ─── 1. Create Branch ─────────────────────────────────────────────────
        $branchId = DB::table('branches')->insertGetId([
            'company_id' => $companyId,
            'branch_name' => 'Kabul Main Branch',
            'branch_slogan' => 'Your Trusted Financial Partner',
            'branch_logo_url' => null,
            'branch_street_address' => '123 Main Street',
            'branch_village' => 'Wazir Akbar Khan',
            'branch_district' => 'District 10',
            'branch_province' => 'Kabul',
            'branch_country' => 'Afghanistan',
            'branch_phone' => '+93 700 123 456',
            'branch_email' => 'kabul@company.com',
            'branch_website' => 'https://www.company.com',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 2. Create Role ──────────────────────────────────────────────────
        $roleId = DB::table('roles')->insertGetId([
            'branch_id' => $branchId,
            'role_name' => 'manager',
            'permissions' => json_encode([
                'dashboard' => ['view' => true],
                'accounts' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'expenses' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'transactions' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'users' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'settings' => ['view' => true, 'edit' => true],
                'reports' => ['view' => true, 'create' => true, 'export' => true],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 3. Create User ──────────────────────────────────────────────────
        DB::table('users')->insert([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'role_id' => $roleId,
            'first_name' => 'Default',
            'last_name' => 'User',
            'email' => 'user1@gmail.com',
            'password' => Hash::make('admin@123'),
            'phone' => '+93 700 000 001',
            'status' => true,
            'language' => 'en',
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 4. Create Viewer Role ──────────────────────────────────────────
        $viewerRoleId = DB::table('roles')->insertGetId([
            'branch_id' => $branchId,
            'role_name' => 'viewer',
            'permissions' => json_encode([
                'dashboard' => ['view' => true],
                'accounts' => ['view' => true],
                'expenses' => ['view' => true],
                'transactions' => ['view' => true],
                'users' => ['view' => false],
                'settings' => ['view' => false],
                'reports' => ['view' => true],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->insert([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'role_id' => $viewerRoleId,
            'first_name' => 'Viewer',
            'last_name' => 'User',
            'email' => 'viewer@gmail.com',
            'password' => Hash::make('admin@123'),
            'phone' => '+93 700 000 002',
            'status' => true,
            'language' => 'en',
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 5. Create Super Admin User ─────────────────────────────────────
        DB::table('users')->insert([
            'company_id' => $companyId,
            'branch_id' => null,
            'role_id' => null,
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'superadmin@gmail.com',
            'password' => Hash::make('admin@123'),
            'phone' => '+93 700 000 003',
            'status' => true,
            'language' => 'en',
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 6. Create Admin Role ────────────────────────────────────────────
        $adminRoleId = DB::table('roles')->insertGetId([
            'branch_id' => null, // Global role
            'role_name' => 'admin',
            'permissions' => json_encode([
                'dashboard' => ['view' => true],
                'accounts' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'expenses' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'transactions' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'users' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'roles' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
                'settings' => ['view' => true, 'edit' => true],
                'reports' => ['view' => true, 'create' => true, 'export' => true],
                'companies' => ['view' => true, 'edit' => true],
                'branches' => ['view' => true, 'create' => true, 'edit' => true, 'delete' => true],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 7. Create Accounts ──────────────────────────────────────────────
        DB::table('accounts')->insert([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'name' => 'Main Cash Account',
            'balance' => 100000.00,
            'description' => 'Primary cash account for the company',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('accounts')->insert([
            'company_id' => $companyId,
            'branch_id' => $branchId,
            'name' => 'Bank Account',
            'balance' => 500000.00,
            'description' => 'Bank account for the company',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ─── 8. Create Expense Types ─────────────────────────────────────────
        $expenseTypes = [
            ['name' => 'Rent', 'description' => 'Office rent expenses'],
            ['name' => 'Utilities', 'description' => 'Electricity, water, gas bills'],
            ['name' => 'Salaries', 'description' => 'Employee salaries and wages'],
            ['name' => 'Office Supplies', 'description' => 'Stationery and office supplies'],
            ['name' => 'Transportation', 'description' => 'Fuel and transportation costs'],
            ['name' => 'Marketing', 'description' => 'Advertising and marketing expenses'],
            ['name' => 'Maintenance', 'description' => 'Repairs and maintenance'],
            ['name' => 'Insurance', 'description' => 'Insurance premiums'],
            ['name' => 'Taxes', 'description' => 'Tax payments'],
            ['name' => 'Other', 'description' => 'Miscellaneous expenses'],
        ];

        foreach ($expenseTypes as $type) {
            DB::table('expense_types')->insert([
                'company_id' => $companyId,
                'parent_id' => null,
                'name' => $type['name'],
                'description' => $type['description'],
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info('✅ Branch, Roles, Users, Accounts, and Expense Types seeded successfully!');
        $this->command->info('');
        $this->command->info('📋 Login Credentials:');
        $this->command->info('   Company Admin: admin@gmail.com / admin@123');
        $this->command->info('   Manager User: user1@gmail.com / admin@123');
        $this->command->info('   Viewer User: viewer@gmail.com / admin@123');
        $this->command->info('   Super Admin: superadmin@gmail.com / admin@123');
        $this->command->info('');
        $this->command->info('💼 Accounts Created:');
        $this->command->info('   - Main Cash Account (Balance: 100,000.00 AFN)');
        $this->command->info('   - Bank Account (Balance: 500,000.00 AFN)');
        $this->command->info('');
        $this->command->info('📂 Expense Types Created: 10 categories');
    }
}
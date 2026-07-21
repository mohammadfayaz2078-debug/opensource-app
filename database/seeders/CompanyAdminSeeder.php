<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;

class CompanyAdminSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::first();

        if ($company) {
            $company->update([
                'email' => 'admin@gmail.com',
                'manager_password' => 'admin',
            ]);
            $this->command->info("Updated existing company: {$company->company_name}");
        } else {
            Company::create([
                'company_name' => 'Default Company',
                'company_email' => 'admin@gmail.com',
                'email' => 'admin@gmail.com',
                'manager_name' => 'Admin',
                'manager_password' => 'admin',
                'language' => 'en',
            ]);
            $this->command->info('Created new company with admin credentials.');
        }

        $this->command->info('Email: admin@gmail.com');
        $this->command->info('Password: admin');
    }
}

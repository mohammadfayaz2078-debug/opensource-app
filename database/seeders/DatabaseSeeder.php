<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SuperAdmin;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application with a fully fictional demo tenant so a fresh
     * installation is immediately explorable:
     *
     *   Super Admin : superadmin@gmail.com / admin
     *   Company     : admin@gmail.com        / admin@123
     *   Branch user : user1@gmail.com        / admin@123
     *
     * IMPORTANT: these are DEMO-ONLY credentials. Change them before deploying
     * anywhere other than a local sandbox.
     */
    public function run(): void
    {
        if (!SuperAdmin::where('email', 'superadmin@gmail.com')->exists()) {
            SuperAdmin::create([
                'name'     => 'Super Admin',
                'email'    => 'superadmin@gmail.com',
                'password' => Hash::make('admin'),
                'language' => 'en',
            ]);

            $this->command->warn('⚠️  DEMO CREDENTIALS CREATED: superadmin@gmail.com / admin — change before production use!');
        }

        $this->call([
            CompanyAdminSeeder::class,
            CompanyBranchRoleUserSeeder::class,
            WelcomeMarketplaceSeeder::class,
        ]);
    }
}

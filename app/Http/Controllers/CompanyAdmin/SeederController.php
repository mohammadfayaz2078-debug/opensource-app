<?php

namespace App\Http\Controllers\CompanyAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SeederController extends Controller
{
    /**
     * Run the seeder
     */
    public function runSeeder(Request $request)
    {
        try {
            // Check if already seeded to prevent duplicates
            $branchExists = DB::table('branches')->where('company_id', 1)->exists();
            
            if ($branchExists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data already exists. Please truncate tables first if you want to re-seed.',
                ], 422);
            }

            // Run the seeder
            Artisan::call('db:seed', [
                '--class' => 'CompanyBranchRoleUserSeeder',
                '--force' => true,
            ]);

            $output = Artisan::output();

            Log::info('Seeder executed successfully', ['output' => $output]);

            return response()->json([
                'success' => true,
                'message' => 'Seeder executed successfully! All data has been seeded.',
                'output' => $output,
            ]);

        } catch (\Exception $e) {
            Log::error('Seeder execution failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to run seeder: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if data already exists
     */
    public function checkStatus()
    {
        $branchExists = DB::table('branches')->where('company_id', 1)->exists();
        $userExists = DB::table('users')->where('company_id', 1)->exists();
        $accountExists = DB::table('accounts')->where('company_id', 1)->exists();

        return response()->json([
            'data_seeded' => $branchExists && $userExists && $accountExists,
            'branches_exist' => $branchExists,
            'users_exist' => $userExists,
            'accounts_exist' => $accountExists,
            'message' => $branchExists ? 'Data already seeded' : 'Data not seeded yet',
        ]);
    }

    /**
     * Reset and re-seed (truncate tables first)
     */
    public function resetAndSeed(Request $request)
    {
        try {
            // Disable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            // Truncate tables
            DB::table('account_transactions')->truncate();
            DB::table('expenses')->truncate();
            DB::table('expense_types')->truncate();
            DB::table('accounts')->truncate();
            DB::table('users')->truncate();
            DB::table('roles')->truncate();
            DB::table('branches')->truncate();

            // Enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            // Run the seeder
            Artisan::call('db:seed', [
                '--class' => 'CompanyBranchRoleUserSeeder',
                '--force' => true,
            ]);

            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Data reset and re-seeded successfully!',
                'output' => $output,
            ]);

        } catch (\Exception $e) {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            Log::error('Reset and seed failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset and seed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
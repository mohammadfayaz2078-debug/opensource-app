<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use RuntimeException;

class WelcomeMarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::query()->first();
        $branch = Branch::query()
            ->when($company, fn ($query) => $query->where('company_id', $company->id))
            ->first();

        if (! $company || ! $branch) {
            throw new RuntimeException('Create a company and branch before seeding marketplace products.');
        }

        $catalog = [
            ['Wireless Headphones', 'Electronics', 850, 1250, 'Comfortable wireless headphones with clear sound and long battery life.'],
            ['Smart Fitness Watch', 'Electronics', 1350, 1890, 'A practical everyday watch for activity, calls and notifications.'],
            ['Premium Green Tea', 'Grocery', 180, 260, 'Fresh aromatic tea selected for a smooth daily cup.'],
            ['Natural Mountain Honey', 'Grocery', 420, 590, 'Pure local honey with a rich flavor and natural sweetness.'],
            ['Everyday Cotton Shirt', 'Fashion', 520, 790, 'A breathable cotton shirt with a clean, comfortable fit.'],
            ['Classic Leather Wallet', 'Fashion', 390, 620, 'Compact leather wallet with organized card and cash storage.'],
            ['Modern Table Lamp', 'Home', 680, 980, 'Warm, focused lighting for desks, bedrooms and reading corners.'],
            ['Insulated Travel Flask', 'Home', 460, 690, 'Keeps drinks hot or cold and travels without leaking.'],
            ['Creative Building Blocks', 'Toys', 540, 820, 'Colorful building pieces that encourage creative play and learning.'],
            ['Remote Control Car', 'Toys', 890, 1290, 'Responsive rechargeable car made for fast indoor and outdoor fun.'],
        ];

        foreach ($catalog as [$name, $categoryName, $purchasePrice, $salePrice, $description]) {
            $category = ProductCategory::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'branch_id' => $branch->id,
                    'name' => $categoryName,
                ],
                ['description' => "$categoryName products featured in the public marketplace."],
            );

            Product::updateOrCreate(
                [
                    'company_id' => $company->id,
                    'branch_id' => $branch->id,
                    'name' => $name,
                ],
                [
                    'barcode' => 'WELCOME-' . strtoupper(substr(md5($name), 0, 10)),
                    'description' => $description,
                    'category_id' => $category->id,
                    'purchase_price' => $purchasePrice,
                    'sale_price' => $salePrice,
                    'low_stock_warning_count' => 5,
                    'reorder_point' => 10,
                    'is_public' => true,
                ],
            );
        }

        $this->command?->info('Ten public welcome marketplace products are ready.');
    }
}

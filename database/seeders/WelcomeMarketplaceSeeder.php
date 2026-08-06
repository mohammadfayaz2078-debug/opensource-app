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
            // ── Electronics ──────────────────────────────────────
            ['Wireless Headphones', 'Electronics', 850, 1250, 'Comfortable wireless headphones with clear sound and long battery life.'],
            ['Smart Fitness Watch', 'Electronics', 1350, 1890, 'A practical everyday watch for activity, calls and notifications.'],
            ['Bluetooth Speaker', 'Electronics', 720, 1050, 'Compact portable speaker with deep bass and all-day playback.'],
            ['LED Desk Clock', 'Electronics', 250, 380, 'Modern digital clock with adjustable brightness and alarm.'],
            ['Portable Power Bank', 'Electronics', 480, 690, 'High-capacity charger that keeps your phone going all day.'],
            ['USB-C Fast Charger', 'Electronics', 210, 320, 'Quick and safe fast-charging adapter for phones and tablets.'],
            ['Wireless Mouse', 'Electronics', 300, 450, 'Smooth silent-click wireless mouse with long battery life.'],
            ['Mechanical Keyboard', 'Electronics', 1100, 1550, 'Tactile mechanical keyboard built for comfortable typing.'],
            ['Phone Tripod Stand', 'Electronics', 380, 560, 'Sturdy adjustable tripod for photos, videos and live calls.'],
            ['HDMI Cable 2m', 'Electronics', 150, 240, 'Reliable high-speed cable for crisp screen mirroring.'],

            // ── Grocery ──────────────────────────────────────────
            ['Premium Green Tea', 'Grocery', 180, 260, 'Fresh aromatic tea selected for a smooth daily cup.'],
            ['Natural Mountain Honey', 'Grocery', 420, 590, 'Pure local honey with a rich flavor and natural sweetness.'],
            ['Basmati Rice 5kg', 'Grocery', 450, 620, 'Long-grain aromatic rice, a perfect choice for everyday meals.'],
            ['Olive Oil 1L', 'Grocery', 520, 740, 'Cold-pressed olive oil with a light, fresh taste.'],
            ['Kandahari Dates 1kg', 'Grocery', 320, 460, 'Soft sweet dates picked at perfect ripeness.'],
            ['Roasted Almonds 500g', 'Grocery', 380, 540, 'Crunchy roasted almonds, great for snacking and cooking.'],
            ['Pistachios 500g', 'Grocery', 560, 780, 'Premium roasted pistachios with a rich buttery taste.'],
            ['Turmeric Powder', 'Grocery', 120, 190, 'Ground golden turmeric with a warm aroma for every kitchen.'],
            ['Black Pepper', 'Grocery', 90, 150, 'Fragrant whole peppercorns ground for bold flavor.'],
            ['Chickpeas 1kg', 'Grocery', 110, 170, 'Clean sorted chickpeas, ideal for soups and stews.'],

            // ── Fashion ──────────────────────────────────────────
            ['Everyday Cotton Shirt', 'Fashion', 520, 790, 'A breathable cotton shirt with a clean, comfortable fit.'],
            ['Classic Leather Wallet', 'Fashion', 390, 620, 'Compact leather wallet with organized card and cash storage.'],
            ['Wool Winter Scarf', 'Fashion', 280, 420, 'Soft warm scarf to keep you cozy through cold days.'],
            ['Genuine Leather Belt', 'Fashion', 260, 400, 'Durable everyday belt with a clean classic buckle.'],
            ['Casual Denim Jacket', 'Fashion', 1450, 2100, 'A timeless denim jacket that goes with everything.'],
            ['Embroidered Kurta', 'Fashion', 780, 1120, 'Traditional kurta with elegant hand-finished embroidery.'],
            ['Sport Sneakers', 'Fashion', 1250, 1750, 'Lightweight cushioned sneakers for everyday comfort.'],
            ['Cotton Socks 3-Pack', 'Fashion', 150, 230, 'Soft breathable cotton socks in everyday colors.'],
            ['Summer Sun Hat', 'Fashion', 220, 340, 'Wide-brim hat that keeps you cool and shaded outdoors.'],
            ['Silk Neck Tie', 'Fashion', 350, 520, 'Smooth polished tie to complete a formal look.'],

            // ── Home ─────────────────────────────────────────────
            ['Modern Table Lamp', 'Home', 680, 980, 'Warm, focused lighting for desks, bedrooms and reading corners.'],
            ['Insulated Travel Flask', 'Home', 460, 690, 'Keeps drinks hot or cold and travels without leaking.'],
            ['Ceramic Dinner Set', 'Home', 950, 1350, 'Elegant 16-piece dinnerware set for family meals.'],
            ['Cotton Bed Sheets', 'Home', 640, 890, 'Soft comfortable sheets that fit standard queen beds.'],
            ['Minimal Wall Clock', 'Home', 380, 560, 'Quiet clean-design wall clock for any room.'],
            ['Cushion Covers 2-Pack', 'Home', 250, 380, 'Decorative soft cushion covers in warm neutral tones.'],
            ['Kitchen Knife Set', 'Home', 780, 1120, 'Sharp durable knives for every day of effortless cooking.'],
            ['Bamboo Cutting Board', 'Home', 210, 320, 'Eco-friendly sturdy board, gentle on your knives.'],
            ['Scented Candle Set', 'Home', 340, 490, 'Relaxing hand-poured candles in calming fragrances.'],
            ['Foldable Laundry Basket', 'Home', 300, 450, 'Lightweight breathable basket that stores flat when empty.'],

            // ── Toys ─────────────────────────────────────────────
            ['Creative Building Blocks', 'Toys', 540, 820, 'Colorful building pieces that encourage creative play and learning.'],
            ['Remote Control Car', 'Toys', 890, 1290, 'Responsive rechargeable car made for fast indoor and outdoor fun.'],
            ['Plush Teddy Bear', 'Toys', 420, 620, 'Soft huggable teddy bear that kids will love.'],
            ['Wooden Puzzle Set', 'Toys', 360, 540, 'Bright wooden puzzles that build patience and logic.'],
            ['Kids Drawing Kit', 'Toys', 280, 410, 'Complete art set with crayons, markers and sketch pads.'],
            ['Toy Train Set', 'Toys', 720, 1040, 'A fun rolling train set with track pieces and stations.'],
            ['Soccer Ball Size 4', 'Toys', 480, 690, 'Durable playground soccer ball for hours of play.'],
            ['Ludo & Snakes Board Game', 'Toys', 390, 580, 'Classic family board games in one colorful set.'],
            ['Dollhouse Mini Set', 'Toys', 980, 1390, 'Detailed miniature dollhouse with furniture for imaginative play.'],
            ['Speed Rubik Cube', 'Toys', 140, 220, 'Smooth-turning puzzle cube for beginners and pros.'],
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

        $this->command?->info('Fifty public welcome marketplace products are ready.');
    }
}

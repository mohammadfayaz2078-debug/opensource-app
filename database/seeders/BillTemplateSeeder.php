<?php
// database/seeders/BillTemplateSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BillTemplate;

class BillTemplateSeeder extends Seeder
{
    public function run()
    {
        $templates = [
            [
                'name' => 'Simple Bill with Logo',
                'slug' => 'simple-bill-logo',
                'description' => 'Simple bill template with company logo at top',
                'sort_order' => 1,
                'template_data' => [
                    'show_logo' => true,
                    'logo_position' => 'center',
                    'show_company_name' => true,
                    'show_company_details' => true,
                    'show_customer_details' => true,
                    'show_bill_details' => true,
                    'show_items_table' => true,
                    'show_totals' => true,
                    'show_footer' => true
                ],
                'preview_data' => [
                    'logo' => null,
                    'company' => [
                        'name' => 'Your Company Name',
                        'address' => '123 Business Street, City, Country',
                        'phone' => '+1 234 567 890',
                        'email' => 'info@company.com',
                        'tax_number' => 'TAX123456'
                    ],
                    'bill' => [
                        'number' => 'BILL-2024-001',
                        'date' => '2024-01-15',
                        'due_date' => '2024-02-14'
                    ],
                    'customer' => [
                        'name' => 'John Doe',
                        'address' => '456 Customer Avenue, City, Country',
                        'phone' => '+1 987 654 321',
                        'email' => 'john@example.com'
                    ],
                    'items' => [
                        [
                            'name' => 'Internet Package - 10 Mbps',
                            'quantity' => 1,
                            'unit_price' => 50.00,
                            'total' => 50.00
                        ],
                        [
                            'name' => 'WiFi Router',
                            'quantity' => 1,
                            'unit_price' => 75.00,
                            'total' => 75.00
                        ],
                        [
                            'name' => 'Installation Fee',
                            'quantity' => 1,
                            'unit_price' => 25.00,
                            'total' => 25.00
                        ]
                    ],
                    'subtotal' => 150.00,
                    'tax' => 0,
                    'total' => 150.00
                ]
            ],
            [
                'name' => 'Modern Minimalist Bill',
                'slug' => 'modern-minimalist-bill',
                'description' => 'Clean and modern design with elegant borders and subtle colors',
                'sort_order' => 2,
                'template_data' => [
                    'show_logo' => true,
                    'logo_position' => 'left',
                    'show_company_name' => true,
                    'show_company_details' => true,
                    'show_customer_details' => true,
                    'show_bill_details' => true,
                    'show_items_table' => true,
                    'show_totals' => true,
                    'show_footer' => true,
                    'style' => 'modern'
                ],
                'preview_data' => [
                    'logo' => null,
                    'company' => [
                        'name' => 'Your Company Name',
                        'address' => '123 Business Street, City, Country',
                        'phone' => '+1 234 567 890',
                        'email' => 'info@company.com',
                        'tax_number' => 'TAX123456'
                    ],
                    'bill' => [
                        'number' => 'INV-2024-0042',
                        'date' => '2024-03-15',
                        'due_date' => '2024-04-14'
                    ],
                    'customer' => [
                        'name' => 'Acme Corporation',
                        'address' => '789 Corporate Blvd, City, Country',
                        'phone' => '+1 555 123 4567',
                        'email' => 'accounts@acme.com'
                    ],
                    'items' => [
                        [
                            'name' => 'Premium Internet Package',
                            'quantity' => 2,
                            'unit_price' => 89.99,
                            'total' => 179.98
                        ],
                        [
                            'name' => 'Network Setup Service',
                            'quantity' => 1,
                            'unit_price' => 150.00,
                            'total' => 150.00
                        ],
                        [
                            'name' => 'WiFi Mesh System',
                            'quantity' => 1,
                            'unit_price' => 199.99,
                            'total' => 199.99
                        ]
                    ],
                    'subtotal' => 529.97,
                    'tax' => 42.40,
                    'total' => 572.37
                ]
            ],
            [
                'name' => 'Ultra Modern Bill',
                'slug' => 'ultra-modern-bill',
                'description' => 'Sleek, contemporary design with card-style layout and subtle shadows',
                'sort_order' => 3,
                'template_data' => [
                    'show_logo' => true,
                    'logo_position' => 'center',
                    'show_company_name' => true,
                    'show_company_details' => true,
                    'show_customer_details' => true,
                    'show_bill_details' => true,
                    'show_items_table' => true,
                    'show_totals' => true,
                    'show_footer' => true,
                    'style' => 'ultra-modern'
                ],
                'preview_data' => [
                    'logo' => null,
                    'company' => [
                        'name' => 'Your Company Name',
                        'address' => '123 Business Street, City, Country',
                        'phone' => '+1 234 567 890',
                        'email' => 'info@company.com',
                        'tax_number' => 'TAX123456',
                        'website' => 'www.yourcompany.com'
                    ],
                    'bill' => [
                        'number' => 'INV-2024-0088',
                        'date' => '2024-05-20',
                        'due_date' => '2024-06-19'
                    ],
                    'customer' => [
                        'name' => 'TechStart Innovations',
                        'address' => '789 Digital Blvd, San Francisco, CA',
                        'phone' => '+1 415 555 0123',
                        'email' => 'billing@techstart.io'
                    ],
                    'items' => [
                        [
                            'name' => 'Enterprise Cloud Package',
                            'description' => 'Includes 1TB storage, 24/7 support',
                            'quantity' => 1,
                            'unit_price' => 499.99,
                            'total' => 499.99
                        ],
                        [
                            'name' => 'Professional Services',
                            'description' => 'System integration & training',
                            'quantity' => 8,
                            'unit_price' => 125.00,
                            'total' => 1000.00
                        ],
                        [
                            'name' => 'API Access License',
                            'description' => 'Premium API tier',
                            'quantity' => 3,
                            'unit_price' => 99.99,
                            'total' => 299.97
                        ],
                        [
                            'name' => 'SSL Certificate',
                            'description' => 'Extended validation',
                            'quantity' => 1,
                            'unit_price' => 199.99,
                            'total' => 199.99
                        ]
                    ],
                    'subtotal' => 1999.95,
                    'discount' => 199.99,
                    'tax' => 180.00,
                    'total' => 1979.96,
                    'notes' => 'Thank you for choosing our services! Payment due within 30 days.'
                ]
            ]
        ];

        foreach ($templates as $template) {
            BillTemplate::create($template);
        }
    }
}
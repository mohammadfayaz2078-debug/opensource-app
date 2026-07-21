<?php

namespace Tests\Feature\Sales;

use Tests\TestCase;
use App\Models\Sale;
use App\Models\StockBalance;
use App\Models\StockTransaction;
use App\Models\JournalEntry;

class InvoiceTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_can_create_invoice(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Add stock
        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $response = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('sales', [
            'document_type' => 'invoice',
            'status' => 'confirmed',
        ]);
    }

    public function test_invoice_creates_stock_transaction(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Add stock
        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        $this->assertDatabaseHas('stock_transactions', [
            'product_id' => $product->id,
            'movement_type' => 'out',
            'quantity' => 10,
        ]);
    }

    public function test_invoice_creates_journal_entries(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Add stock
        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        // Revenue journal should be created
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'Sale',
            'status' => 'posted',
        ]);

        // COGS journal should be created
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'Sale-COGS',
            'status' => 'posted',
        ]);
    }

    public function test_journal_entries_are_balanced(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        // Check that all journal entries have balanced debits and credits
        $entries = JournalEntry::where('status', 'posted')->get();
        foreach ($entries as $entry) {
            $this->assertEqualsWithDelta(
                $entry->total_debit,
                $entry->total_credit,
                0.01,
                "Journal entry {$entry->entry_number} is not balanced"
            );
        }
    }

    public function test_stock_deducted_correctly(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Add 100 units
        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        // Invoice for 10 units
        $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        // Stock should be 90
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(90, $balance->quantity);
    }

    public function test_cannot_create_invoice_with_insufficient_stock(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        // Add only 5 units
        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            5,
            10.00,
            'OpeningStock',
            1
        );

        // Try to invoice 10 units
        $response = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_can_record_payment(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $invoiceResponse = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        $invoiceId = $invoiceResponse->json('data.id');

        $response = $this->postJson("/api/invoices/{$invoiceId}/payment", [
            'amount' => 150.00,
            'payment_date' => '2026-01-20',
            'payment_method' => 'cash',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('customer_payments', [
            'sale_id' => $invoiceId,
            'amount' => 150.00,
        ]);

        // Payment journal should be created
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'CustomerPayment',
            'status' => 'posted',
        ]);
    }

    public function test_can_cancel_invoice(): void
    {
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id,
            $this->branch->id,
            $product->id,
            $warehouse->id,
            null,
            'in',
            100,
            10.00,
            'OpeningStock',
            1
        );

        $invoiceResponse = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);

        $invoiceId = $invoiceResponse->json('data.id');

        $response = $this->postJson("/api/invoices/{$invoiceId}/cancel");
        $response->assertOk();

        $this->assertDatabaseHas('sales', [
            'id' => $invoiceId,
            'status' => 'cancelled',
        ]);

        // Stock should be restored
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(100, $balance->quantity);
    }
}

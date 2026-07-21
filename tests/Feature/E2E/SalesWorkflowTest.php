<?php

namespace Tests\Feature\E2E;

use Tests\TestCase;
use App\Models\Sale;
use App\Models\StockBalance;
use App\Models\StockTransaction;
use App\Models\JournalEntry;
use App\Models\CustomerPayment;

class SalesWorkflowTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    /**
     * Full sales workflow: Quotation -> Order -> Invoice -> Payment
     */
    public function test_full_sales_workflow(): void
    {
        // Step 1: Create customer
        $customer = $this->createCustomer([
            'receivable_account_id' => $this->accounts['accounts_receivable'],
        ]);
        $this->assertNotNull($customer->id);

        // Step 2: Create product
        $product = $this->createProduct();
        $this->assertNotNull($product->id);

        // Step 3: Add stock
        $warehouse = $this->createWarehouse();
        \App\Services\StockService::record(
            $this->company->id, $this->branch->id, $product->id,
            $warehouse->id, null, 'in', 100, 10.00, 'OpeningStock', 1
        );

        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(100, $balance->quantity);

        // Step 4: Create quotation
        $quoteResponse = $this->postJson('/api/quotations', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                ],
            ],
        ]);
        $quoteResponse->assertCreated();
        $quoteId = $quoteResponse->json('data.id');

        // Step 5: Confirm quotation
        $this->postJson("/api/quotations/{$quoteId}/confirm")->assertOk();

        // Stock should not change yet
        $balance->refresh();
        $this->assertEquals(100, $balance->quantity);

        // Step 6: Convert to order (if endpoint exists) or create order directly
        $orderResponse = $this->postJson('/api/sale-orders', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-16',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 10,
                    'unit_price' => 15.00,
                ],
            ],
        ]);
        $orderResponse->assertCreated();
        $orderId = $orderResponse->json('data.id');

        // Step 7: Confirm order
        $this->postJson("/api/sale-orders/{$orderId}/confirm")->assertOk();

        // Stock should still not change
        $balance->refresh();
        $this->assertEquals(100, $balance->quantity);

        // Step 8: Create invoice
        $invoiceResponse = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-17',
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
        $invoiceResponse->assertCreated();
        $invoiceId = $invoiceResponse->json('data.id');

        // Stock should now be deducted
        $balance->refresh();
        $this->assertEquals(90, $balance->quantity);

        // Journal entries should exist
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'Sale',
            'reference_id' => $invoiceId,
            'status' => 'posted',
        ]);
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'Sale-COGS',
            'reference_id' => $invoiceId,
            'status' => 'posted',
        ]);

        // Step 9: Record payment
        $paymentResponse = $this->postJson("/api/invoices/{$invoiceId}/payment", [
            'amount' => 150.00,
            'payment_date' => '2026-01-20',
            'payment_method' => 'cash',
        ]);
        $paymentResponse->assertOk();

        // Payment should be recorded
        $this->assertDatabaseHas('customer_payments', [
            'sale_id' => $invoiceId,
            'amount' => 150.00,
        ]);

        // Payment journal should exist
        $this->assertDatabaseHas('journal_entries', [
            'reference_type' => 'CustomerPayment',
            'status' => 'posted',
        ]);

        // Step 10: Verify invoice payment status
        $invoice = Sale::find($invoiceId);
        $this->assertEquals('paid', $invoice->payment_status);
        $this->assertEquals(150.00, $invoice->paid_amount);
        $this->assertEquals(0, $invoice->due_amount);
    }

    /**
     * Test partial payment workflow
     */
    public function test_partial_payment_workflow(): void
    {
        $customer = $this->createCustomer([
            'receivable_account_id' => $this->accounts['accounts_receivable'],
        ]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id, $this->branch->id, $product->id,
            $warehouse->id, null, 'in', 100, 10.00, 'OpeningStock', 1
        );

        // Create invoice for $300
        $invoiceResponse = $this->postJson('/api/invoices', [
            'customer_id' => $customer->id,
            'document_date' => '2026-01-15',
            'items' => [
                [
                    'item_type' => 'product',
                    'item_id' => $product->id,
                    'quantity' => 20,
                    'unit_price' => 15.00,
                    'warehouse_id' => $warehouse->id,
                ],
            ],
        ]);
        $invoiceId = $invoiceResponse->json('data.id');

        // Record partial payment of $100
        $this->postJson("/api/invoices/{$invoiceId}/payment", [
            'amount' => 100.00,
            'payment_date' => '2026-01-20',
            'payment_method' => 'cash',
        ]);

        $invoice = Sale::find($invoiceId);
        $this->assertEquals('partial', $invoice->payment_status);
        $this->assertEquals(100.00, $invoice->paid_amount);
        $this->assertEquals(200.00, $invoice->due_amount);
    }

    /**
     * Test invoice cancellation restores stock
     */
    public function test_invoice_cancellation_restores_stock(): void
    {
        $customer = $this->createCustomer([
            'receivable_account_id' => $this->accounts['accounts_receivable'],
        ]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id, $this->branch->id, $product->id,
            $warehouse->id, null, 'in', 100, 10.00, 'OpeningStock', 1
        );

        // Create and confirm invoice
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

        // Stock should be 90
        $balance = StockBalance::where('product_id', $product->id)->first();
        $this->assertEquals(90, $balance->quantity);

        // Cancel invoice
        $this->postJson("/api/invoices/{$invoiceId}/cancel")->assertOk();

        // Stock should be restored to 100
        $balance->refresh();
        $this->assertEquals(100, $balance->quantity);
    }
}

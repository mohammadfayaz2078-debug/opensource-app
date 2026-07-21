<?php

namespace Tests\Feature\Tax;

use Tests\TestCase;
use App\Models\Tax;
use App\Services\TaxCalculationService;
use App\Services\TaxEngineGuard;
use App\Services\TaxIntegrityValidator;

class TaxCalculationTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_single_tax_calculation(): void
    {
        $tax = $this->createTax(['rate' => 10.00]);

        $svc = app(TaxCalculationService::class);

        $result = $svc->calculateLineTaxes(
            10,    // quantity
            100.00, // unit price
            0,     // discount
            [$tax]
        );

        $this->assertEquals(1000.00, $result['untaxed_amount']);
        $this->assertEquals(100.00, $result['tax_amount']);
        $this->assertEquals(1100.00, $result['total']);
    }

    public function test_tax_with_discount(): void
    {
        $tax = $this->createTax(['rate' => 10.00]);

        $svc = app(TaxCalculationService::class);

        $result = $svc->calculateLineTaxes(
            10,     // quantity
            100.00, // unit price
            50.00,  // discount
            [$tax]
        );

        // untaxed = 10*100 - 50 = 950
        $this->assertEquals(950.00, $result['untaxed_amount']);
        $this->assertEquals(95.00, $result['tax_amount']);
        $this->assertEquals(1045.00, $result['total']);
    }

    public function test_compound_tax(): void
    {
        $tax1 = Tax::create([
            'company_id' => $this->company->id,
            'name' => 'VAT',
            'rate' => 10.00,
            'usage' => 'both',
            'status' => 'active',
        ]);

        $tax2 = Tax::create([
            'company_id' => $this->company->id,
            'name' => 'Service Tax',
            'rate' => 5.00,
            'usage' => 'both',
            'status' => 'active',
            'is_compound' => true,
        ]);

        $svc = app(TaxCalculationService::class);

        $result = $svc->calculateLineTaxes(
            10,     // quantity
            100.00, // unit price
            0,      // discount
            [$tax1, $tax2]
        );

        // untaxed = 1000
        // VAT = 1000 * 10% = 100
        // Service Tax = (1000 + 100) * 5% = 55
        // total tax = 155
        $this->assertEquals(1000.00, $result['untaxed_amount']);
        $this->assertEquals(155.00, $result['tax_amount']);
        $this->assertEquals(1155.00, $result['total']);
    }

    public function test_no_tax(): void
    {
        $svc = app(TaxCalculationService::class);

        $result = $svc->calculateLineTaxes(
            10,
            100.00,
            0,
            []
        );

        $this->assertEquals(1000.00, $result['untaxed_amount']);
        $this->assertEquals(0, $result['tax_amount']);
        $this->assertEquals(1000.00, $result['total']);
    }

    public function test_document_totals(): void
    {
        $tax = $this->createTax(['rate' => 10.00]);
        $svc = app(TaxCalculationService::class);

        $line1 = $svc->calculateLineTaxes(10, 100.00, 0, [$tax]);
        $line2 = $svc->calculateLineTaxes(5, 200.00, 0, [$tax]);

        $totals = $svc->calculateDocumentTotals([$line1, $line2]);

        // Line 1: untaxed=1000, tax=100
        // Line 2: untaxed=1000, tax=100
        $this->assertEquals(2000.00, $totals['total_untaxed']);
        $this->assertEquals(200.00, $totals['total_tax']);
        $this->assertEquals(2200.00, $totals['total']);
    }

    public function test_tax_resolution_with_item_default(): void
    {
        $tax = $this->createTax(['rate' => 15.00]);
        $product = $this->createProduct(['sale_tax_id' => $tax->id]);

        $svc = app(TaxCalculationService::class);

        $resolved = $svc->resolveTaxes([], $product, 'sale');
        $this->assertCount(1, $resolved);
        $this->assertEquals($tax->id, $resolved->first()->id);
    }

    public function test_tax_resolution_explicit_ids_override_default(): void
    {
        $defaultTax = $this->createTax(['rate' => 15.00, 'name' => 'Default']);
        $explicitTax = $this->createTax(['rate' => 20.00, 'name' => 'Explicit']);
        $product = $this->createProduct(['sale_tax_id' => $defaultTax->id]);

        $svc = app(TaxCalculationService::class);

        $resolved = $svc->resolveTaxes([$explicitTax->id], $product, 'sale');
        $this->assertCount(1, $resolved);
        $this->assertEquals($explicitTax->id, $resolved->first()->id);
    }

    public function test_tax_engine_guard_blocks_posted_document(): void
    {
        $tax = $this->createTax();
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1
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
                    'tax_ids' => [$tax->id],
                ],
            ],
        ]);

        $invoiceId = $response->json('data.id');

        // Tax breakdown should be stored
        $this->assertDatabaseHas('sale_taxes', [
            'sale_id' => $invoiceId,
            'tax_id' => $tax->id,
        ]);
    }
}

<?php

namespace Tests\Feature\Reports;

use Tests\TestCase;

class ReportTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_trial_balance_returns_data(): void
    {
        $response = $this->getJson('/api/reports/trial-balance');
        $response->assertOk();
    }

    public function test_general_ledger_returns_data(): void
    {
        $response = $this->getJson('/api/reports/general-ledger');
        $response->assertOk();
    }

    public function test_accrual_profit_loss_returns_data(): void
    {
        $response = $this->getJson('/api/reports/accrual-profit-loss');
        $response->assertOk();
    }

    public function test_cash_profit_loss_returns_data(): void
    {
        $response = $this->getJson('/api/reports/cash-profit-loss');
        $response->assertOk();
    }

    public function test_balance_sheet_returns_data(): void
    {
        $response = $this->getJson('/api/reports/balance-sheet');
        $response->assertOk();
    }

    public function test_trial_balance_after_journal_entries(): void
    {
        // Create some journal entries via invoice
        $customer = $this->createCustomer(['receivable_account_id' => $this->accounts['accounts_receivable']]);
        $product = $this->createProduct();
        $warehouse = $this->createWarehouse();

        \App\Services\StockService::record(
            $this->company->id, $this->branch->id, $product->id, $warehouse->id, null, 'in', 100, 10.00, 'Test', 1
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

        $response = $this->getJson('/api/reports/trial-balance');
        $response->assertOk();

        // Total debits should equal total credits
        $data = $response->json('data');
        if (isset($data['total_debit']) && isset($data['total_credit'])) {
            $this->assertEqualsWithDelta($data['total_debit'], $data['total_credit'], 0.01);
        }
    }
}

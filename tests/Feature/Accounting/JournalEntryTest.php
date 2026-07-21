<?php

namespace Tests\Feature\Accounting;

use Tests\TestCase;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Services\JournalEntryService;

class JournalEntryTest extends TestCase
{

    protected function setUp(): void
    {
        parent::setUp();
        $this->setupCompany();
        $this->setupAccountConfiguration();
        $this->actingAsUser();
    }

    public function test_can_post_balanced_entry(): void
    {
        $cashAccountId = $this->accounts['cash'];
        $revenueAccountId = $this->accounts['default_sales_income'];

        $entry = JournalEntryService::post(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'general',
                'entry_date' => '2026-01-15',
                'description' => 'Test entry',
            ],
            [
                [
                    'account_id' => $cashAccountId,
                    'type' => 'debit',
                    'amount' => 100.00,
                    'description' => 'Cash received',
                ],
                [
                    'account_id' => $revenueAccountId,
                    'type' => 'credit',
                    'amount' => 100.00,
                    'description' => 'Revenue earned',
                ],
            ]
        );

        $this->assertNotNull($entry);
        $this->assertEquals('posted', $entry->status);
        $this->assertEquals(100.00, $entry->total_debit);
        $this->assertEquals(100.00, $entry->total_credit);
    }

    public function test_unbalanced_entry_throws_exception(): void
    {
        $this->expectException(\RuntimeException::class);

        JournalEntryService::post(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'general',
                'entry_date' => '2026-01-15',
                'description' => 'Unbalanced entry',
            ],
            [
                [
                    'account_id' => $this->accounts['cash'],
                    'type' => 'debit',
                    'amount' => 100.00,
                ],
                [
                    'account_id' => $this->accounts['default_sales_income'],
                    'type' => 'credit',
                    'amount' => 50.00,
                ],
            ]
        );
    }

    public function test_entry_creates_lines(): void
    {
        $entry = JournalEntryService::post(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'general',
                'entry_date' => '2026-01-15',
                'description' => 'Test with lines',
            ],
            [
                [
                    'account_id' => $this->accounts['cash'],
                    'type' => 'debit',
                    'amount' => 100.00,
                ],
                [
                    'account_id' => $this->accounts['default_sales_income'],
                    'type' => 'credit',
                    'amount' => 100.00,
                ],
            ]
        );

        $lines = JournalEntryLine::where('journal_entry_id', $entry->id)->get();
        $this->assertCount(2, $lines);
        $this->assertEquals('debit', $lines->first()->type);
        $this->assertEquals('credit', $lines->last()->type);
    }

    public function test_entry_reversal(): void
    {
        $entry = JournalEntryService::post(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'general',
                'entry_date' => '2026-01-15',
                'description' => 'To reverse',
            ],
            [
                [
                    'account_id' => $this->accounts['cash'],
                    'type' => 'debit',
                    'amount' => 100.00,
                ],
                [
                    'account_id' => $this->accounts['default_sales_income'],
                    'type' => 'credit',
                    'amount' => 100.00,
                ],
            ]
        );

        $reversal = JournalEntryService::reverse($entry, 'Testing reversal');

        $this->assertNotNull($reversal);
        $this->assertEquals('posted', $reversal->status);
        $this->assertEquals($entry->id, $reversal->reversal_of);

        // Original should be reversed
        $entry->refresh();
        $this->assertEquals('reversed', $entry->status);
    }

    public function test_simple_entry_post(): void
    {
        $entry = JournalEntryService::postSimple(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'expense',
                'entry_date' => '2026-01-15',
                'description' => 'Simple expense',
            ],
            [
                'account_id' => $this->accounts['expenses'] ?? $this->accounts['cogs'],
                'amount' => 50.00,
                'description' => 'Office supplies',
            ],
            [
                'account_id' => $this->accounts['cash'],
                'amount' => 50.00,
                'description' => 'Paid cash',
            ]
        );

        $this->assertNotNull($entry);
        $this->assertEquals('posted', $entry->status);
    }

    public function test_entry_with_no_accounting_period_throws(): void
    {
        $this->expectException(\RuntimeException::class);

        // Close the accounting period
        $this->accountingPeriod->update(['is_closed' => true]);

        JournalEntryService::post(
            [
                'branch_id' => $this->branch->id,
                'company_id' => $this->company->id,
                'journal_type' => 'general',
                'entry_date' => '2026-01-15',
                'description' => 'Should fail',
            ],
            [
                [
                    'account_id' => $this->accounts['cash'],
                    'type' => 'debit',
                    'amount' => 100.00,
                ],
                [
                    'account_id' => $this->accounts['default_sales_income'],
                    'type' => 'credit',
                    'amount' => 100.00,
                ],
            ]
        );
    }
}

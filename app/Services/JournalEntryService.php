<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Generic service for creating, posting and reversing journal entries.
 * Can be used by any module: Expense, Purchase, Payroll, Sales, etc.
 */
class JournalEntryService
{
    /**
     * Create and post a journal entry from raw data.
     *
     * @param array $entryData  Keys: branch_id, journal_type, reference_type, reference_id,
     *                          entry_date, description, currency, exchange_rate, created_by
     * @param array $lines      Array of lines with: account_id, type ('debit'|'credit'),
     *                          amount, description, partner_name (optional), line_order (optional)
     * @return JournalEntry
     */
    public static function post(array $entryData, array $lines): JournalEntry
    {
        return DB::transaction(function () use ($entryData, $lines) {
            $branchId = $entryData['branch_id'];
            $journalType = $entryData['journal_type'] ?? 'general';

            // Find or create journal for this branch + type
            // Journal currency = branch base currency (CoA always in base currency)
            $branch = Branch::find($branchId);
            $baseCurrencyCode = $branch?->baseCurrency?->code ?? 'USD';

            $journal = Journal::firstOrCreate(
                ['branch_id' => $branchId, 'type' => $journalType],
                [
                    'name'       => self::journalName($journalType),
                    'code'       => self::journalCode($journalType),
                    'currency'   => $baseCurrencyCode,
                    'is_active'  => true,
                    'sort_order' => 0,
                ]
            );

            $totalDebit = collect($lines)
                ->where('type', 'debit')
                ->sum(fn($l) => (float) ($l['amount'] ?? 0));

            $totalCredit = collect($lines)
                ->where('type', 'credit')
                ->sum(fn($l) => (float) ($l['amount'] ?? 0));

            if (round($totalDebit, 2) !== round($totalCredit, 2)) {
                throw new \RuntimeException(
                    "Journal entry is not balanced. Debit: {$totalDebit}, Credit: {$totalCredit}"
                );
            }

            $entry = JournalEntry::create([
                'branch_id'      => $branchId,
                'journal_id'     => $journal->id,
                'expense_id'     => $entryData['expense_id'] ?? null,
                'reference_type' => $entryData['reference_type'] ?? 'general',
                'reference_id'   => $entryData['reference_id'] ?? null,
                'entry_number'   => $entryData['entry_number'] ?? JournalEntry::generateEntryNumber($branchId),
                'entry_date'     => $entryData['entry_date'] ?? now()->toDateString(),
                'description'    => $entryData['description'] ?? '',
                'currency'       => $entryData['currency'] ?? 'USD',
                'exchange_rate'  => $entryData['exchange_rate'] ?? 1,
                'status'         => JournalEntry::STATUS_DRAFT,
                'total_debit'    => $totalDebit,
                'total_credit'   => $totalCredit,
                'created_by'     => $entryData['created_by'] ?? Auth::id(),
            ]);

            $exchangeRate = (float) ($entryData['exchange_rate'] ?? 1);

            foreach ($lines as $idx => $line) {
                $account = $line['account_id'] ? ChartOfAccount::find($line['account_id']) : null;
                $amount    = (float) ($line['amount'] ?? 0);
                $amountBase = round($amount * $exchangeRate, 2);

                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'branch_id'        => $branchId,
                    'account_id'       => $account?->id ?? ($line['account_id'] ?? null),
                    'account_code'     => $line['account_code'] ?? $account?->code ?? '0000',
                    'account_name'     => $line['account_name'] ?? $account?->name ?? 'Account',
                    'type'             => in_array($line['type'], ['debit', 'credit']) ? $line['type'] : 'debit',
                    'amount'           => $amount,
                    'amount_base'      => $amountBase,
                    'description'      => $line['description'] ?? '',
                    'partner_name'     => $line['partner_name'] ?? null,
                    'line_order'       => $line['line_order'] ?? ($idx + 1),
                ]);
            }

            // Post and update CoA balances
            $entry->post();

            return $entry->fresh()->load('lines');
        });
    }

    /**
     * Reverse an existing posted journal entry.
     *
     * @param JournalEntry $entry
     * @param string $reason
     * @return JournalEntry|null
     */
    public static function reverse(JournalEntry $entry, string $reason): ?JournalEntry
    {
        return $entry->reverse($reason);
    }

    /**
     * Quick helper to create a 2-line journal entry (single DR + single CR).
     *
     * @param array $data  Common entry data (branch_id, description, reference_type, reference_id, etc.)
     * @param array $debit  Keys: account_id, amount, description, partner_name
     * @param array $credit Keys: account_id, amount, description, partner_name
     * @return JournalEntry
     */
    public static function postSimple(array $data, array $debit, array $credit): JournalEntry
    {
        $lines = [
            array_merge($debit, ['type' => 'debit', 'line_order' => 1]),
            array_merge($credit, ['type' => 'credit', 'line_order' => 2]),
        ];

        return self::post($data, $lines);
    }

    /**
     * Create a journal entry specifically for an expense payment.
     * Called from Expense::markPaid() or any expense workflow.
     *
     * @param \App\Models\Expense $expense
     * @return JournalEntry
     */
    public static function postExpensePayment(\App\Models\Expense $expense): JournalEntry
    {
        $expenseAccount = $expense->expenseType?->expenseAccount;
        $paymentAccount = $expense->paymentAccount;

        // Look up currency code dynamically from the currencies table
        $currencyCode = 'USD';
        $currencyRecord = Currency::where('branch_id', $expense->branch_id)
            ->where(function ($q) use ($expense) {
                $q->where('name', $expense->currency)
                  ->orWhere('code', $expense->currency);
            })
            ->first();
        if ($currencyRecord) {
            $currencyCode = $currencyRecord->code;
        }

        /* ── Resolve exchange rate (Odoo convention) ──────────────────────────
         *  rate = how many base-currency units = 1 foreign-currency unit
         *  Example: base=AFN, foreign=USD, 1 USD = 70 AFN  →  rate = 70
         *  amount_base = amount * rate
         * ────────────────────────────────────────────────────────────────────── */
        $exchangeRate = 1;
        $branch       = Branch::find($expense->branch_id);
        $baseCurrency = $branch?->baseCurrency;

        if ($baseCurrency && $baseCurrency->code !== $currencyCode) {
            $currency = Currency::where('branch_id', $expense->branch_id)
                ->where('code', $currencyCode)
                ->first();

            if ($currency) {
                $rateRow = $currency->latestRate;
                if ($rateRow) {
                    // rate         = foreign units per 1 base unit (market rate, e.g. 63)
                    // inverse_rate = base units per 1 foreign unit (conversion factor, e.g. 0.016)
                    $exchangeRate = (float) $rateRow->inverse_rate;
                }
            }

            Log::info('Expense currency conversion', [
                'branch_id'      => $expense->branch_id,
                'base_currency'  => $baseCurrency?->code,
                'txn_currency'   => $currencyCode,
                'exchange_rate'  => $exchangeRate,
                'currency_found' => $currency ? true : false,
                'rate_found'     => isset($rateRow) && $rateRow ? true : false,
            ]);
        }

        return self::postSimple(
            [
                'branch_id'      => $expense->branch_id,
                'journal_type'   => 'expense',
                'expense_id'     => $expense->id,
                'reference_type' => 'expense',
                'reference_id'   => $expense->id,
                'entry_date'     => $expense->paid_at?->toDateString() ?? now()->toDateString(),
                'description'    => "Payment for expense: {$expense->reference_no} — {$expense->description}",
                'currency'       => $currencyCode,
                'exchange_rate'  => $exchangeRate,
            ],
            [
                'account_id'   => $expenseAccount?->id,
                'account_code' => $expenseAccount?->code ?? $expense->expenseType?->category?->slug ?? 'EXP',
                'account_name' => $expenseAccount?->name ?? $expense->expenseType?->name ?? 'Expense',
                'amount'       => $expense->total_amount,
                'description'  => $expense->description,
                'partner_name' => $expense->paid_to,
            ],
            [
                'account_id'   => $paymentAccount?->id,
                'account_code' => $paymentAccount?->code ?? 'BANK',
                'account_name' => $paymentAccount?->name ?? 'Payment Account',
                'amount'       => $expense->total_amount,
                'description'  => "Paid via {$expense->payment_method}" . ($expense->payment_reference ? " ref:{$expense->payment_reference}" : ''),
                'partner_name' => $expense->paid_to,
            ]
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static function journalName(string $type): string
    {
        return match ($type) {
            'expense'  => 'Expense Journal',
            'purchase' => 'Purchase Journal',
            'payroll'  => 'Payroll Journal',
            'sales'    => 'Sales Journal',
            'cash'     => 'Cash Journal',
            'bank'     => 'Bank Journal',
            default    => 'General Journal',
        };
    }

    private static function journalCode(string $type): string
    {
        return match ($type) {
            'expense'  => 'EXP',
            'purchase' => 'PUR',
            'payroll'  => 'PAY',
            'sales'    => 'SAL',
            'cash'     => 'CSH',
            'bank'     => 'BNK',
            default    => 'GEN',
        };
    }
}

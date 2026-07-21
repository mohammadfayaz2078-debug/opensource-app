<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class JournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_DRAFT    = 'draft';
    const STATUS_POSTED   = 'posted';
    const STATUS_REVERSED = 'reversed';

    protected $fillable = [
        'branch_id',
        'journal_id',
        'reference_type',
        'reference_id',
        'expense_id',
        'entry_number',
        'entry_date',
        'description',
        'currency',
        'exchange_rate',
        'status',
        'total_debit',
        'total_credit',
        'created_by',
        'posted_by',
        'posted_at',
        'reversed_by',
        'reversed_at',
        'reversal_reason',
        'reversal_of',
    ];

    protected $casts = [
        'entry_date'    => 'date',
        'posted_at'     => 'datetime',
        'reversed_at'   => 'datetime',
        'exchange_rate' => 'decimal:6',
        'total_debit'   => 'decimal:2',
        'total_credit'  => 'decimal:2',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function journal(): BelongsTo
    {
        return $this->belongsTo(Journal::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'journal_entry_id')
                    ->orderBy('line_order');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'reversal_of');
    }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null
            ? $query
            : $query->where('branch_id', $branchId);
    }

    public function scopePosted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_POSTED);
    }

    public function scopeByDateRange(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('entry_date', [$from, $to]);
    }

    public function post(?string $comment = null): bool
    {
        if ($this->status !== self::STATUS_DRAFT) {
            return false;
        }

        if (!$this->isBalanced()) {
            throw new \RuntimeException("Journal entry {$this->entry_number} is not balanced.");
        }

        $this->status    = self::STATUS_POSTED;
        $this->posted_by = Auth::id();
        $this->posted_at = now();
        $saved = $this->save();

        if ($saved) {
            foreach ($this->lines as $line) {
                if ($line->account_id) {
                    $account = ChartOfAccount::find($line->account_id);
                    if ($account) {
                        $amountBase = (float) ($line->amount_base ?? $line->amount);
                        $current    = (float) ($account->current_balance ?? 0);
                        $delta = match ([$account->nature ?? 'debit', $line->type]) {
                            ['debit', 'debit']   => $amountBase,
                            ['debit', 'credit']  => -$amountBase,
                            ['credit', 'debit']  => -$amountBase,
                            ['credit', 'credit'] => $amountBase,
                            default              => $amountBase,
                        };
                        $account->current_balance = $current + $delta;
                        $account->save();
                    }
                }
            }
        }

        return $saved;
    }

    public function reverse(string $reason): ?JournalEntry
    {
        if ($this->status !== self::STATUS_POSTED) {
            return null;
        }

        $reversalNumber = static::generateEntryNumber($this->branch_id);

        $reversal = static::create([
            'branch_id'      => $this->branch_id,
            'journal_id'     => $this->journal_id,
            'expense_id'     => $this->expense_id,
            'reference_type' => $this->reference_type,
            'reference_id'   => $this->reference_id,
            'entry_number'   => $reversalNumber,
            'entry_date'     => now()->toDateString(),
            'description'    => "Reversal of {$this->entry_number}: {$reason}",
            'currency'       => $this->currency,
            'exchange_rate'  => $this->exchange_rate,
            'status'         => self::STATUS_DRAFT,
            'total_debit'    => $this->total_credit,
            'total_credit'   => $this->total_debit,
            'created_by'     => Auth::id(),
            'reversal_of'    => $this->id,
        ]);

        foreach ($this->lines as $line) {
            $reversal->lines()->create([
                'branch_id'    => $line->branch_id,
                'account_id'   => $line->account_id,
                'account_code' => $line->account_code,
                'account_name' => $line->account_name,
                'type'         => $line->type === 'debit' ? 'credit' : 'debit',
                'amount'       => $line->amount,
                'amount_base'  => $line->amount_base,
                'description'  => "Reversal: {$line->description}",
                'partner_name' => $line->partner_name,
                'line_order'   => $line->line_order,
            ]);
        }

        $reversal->post();

        $this->update([
            'status'          => self::STATUS_REVERSED,
            'reversed_by'     => Auth::id(),
            'reversed_at'     => now(),
            'reversal_reason' => $reason,
        ]);

        return $reversal;
    }

    public function isBalanced(): bool
    {
        $debit  = $this->lines()->where('type', 'debit')->sum('amount');
        $credit = $this->lines()->where('type', 'credit')->sum('amount');
        return abs($debit - $credit) < 0.01;
    }

    public function isDraft(): bool    { return $this->status === self::STATUS_DRAFT; }
    public function isPosted(): bool   { return $this->status === self::STATUS_POSTED; }
    public function isReversed(): bool { return $this->status === self::STATUS_REVERSED; }

    public static function generateEntryNumber(int $branchId): string
    {
        $year  = date('Y');
        $count = static::where('branch_id', $branchId)
                       ->whereYear('created_at', $year)
                       ->withTrashed()
                       ->count() + 1;

        return sprintf('JE-%s-B%d-%05d', $year, $branchId, $count);
    }
}

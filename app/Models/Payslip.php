<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Payslip extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'branch_id',
        'employee_id',
        'contract_id',
        'month',
        'year',
        'base_salary',
        'currency_id',
        'exchange_rate',
        'amount_base',
        'payment_date',
        'payment_method',
        'amount_paid',
        'journal_entry_id',
        'reference_no',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'month'         => 'integer',
        'year'          => 'integer',
        'base_salary'   => 'decimal:2',
        'exchange_rate' => 'decimal:6',
        'amount_base'   => 'decimal:2',
        'amount_paid'   => 'decimal:2',
        'payment_date'  => 'date',
    ];

    // ── Relationships ──────────────────────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Scopes ───────────────────────────────────────────────────────────

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null ? $query : $query->where('branch_id', $branchId);
    }

    public function scopeForEmployee(Builder $query, int $employeeId): Builder
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeForYear(Builder $query, int $year): Builder
    {
        return $query->where('year', $year);
    }

    public function scopeForMonth(Builder $query, int $month): Builder
    {
        return $query->where('month', $month);
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->whereNotNull('payment_date');
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->whereNull('payment_date');
    }

    // ── Accessors ──────────────────────────────────────────────────────

    public function getIsPaidAttribute(): bool
    {
        return $this->payment_date !== null;
    }

    public function getIsFullyPaidAttribute(): bool
    {
        return (float) $this->amount_paid >= (float) $this->base_salary;
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0, (float) $this->base_salary - (float) $this->amount_paid);
    }

    public function getPaymentStatusAttribute(): string
    {
        if ((float) $this->amount_paid >= (float) $this->base_salary) {
            return 'paid';
        }
        if ((float) $this->amount_paid > 0) {
            return 'partial';
        }
        return 'pending';
    }
}

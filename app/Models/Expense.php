<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    // ── Status Constants ──────────────────────────────────────────────────────
    const STATUS_DRAFT     = 'draft';
    const STATUS_SUBMITTED = 'submitted';
    const STATUS_PAID      = 'paid';
    const STATUS_CANCELLED = 'cancelled';

    const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_PAID,
        self::STATUS_CANCELLED,
    ];

    const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'other'];

    protected $fillable = [
        // ── Original columns (DO NOT REMOVE — existing data uses these) ───
        'branch_id',
        'expense_type_id',
        'payment_account_id',
        'amount',
        'file',
        'currency',
        'description',
        'paid_to',
        'date',
        'created_by',
        // ── New columns added by migration ────────────────────────────────
        'status',
        'reference_no',
        'notes',
        'total_amount',
        'submitted_at',
        'submitted_by',
        'paid_at',
        'paid_by',
        'payment_method',
        'payment_reference',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'total_amount' => 'decimal:2',
        'date'         => 'date',
        'submitted_at' => 'datetime',
        'paid_at'      => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function expenseType(): BelongsTo
    {
        return $this->belongsTo(ExpenseType::class, 'expense_type_id');
    }

    public function category()
    {
        return $this->expenseType?->category;
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId === null
            ? $query
            : $query->where('branch_id', $branchId);
    }

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_SUBMITTED);
    }

    public function scopeByDateRange(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    public function scopeByType(Builder $query, int $typeId): Builder
    {
        return $query->where('expense_type_id', $typeId);
    }

    public function scopeByCategory(Builder $query, int $categoryId): Builder
    {
        return $query->whereHas('expenseType', fn ($q) =>
            $q->where('expense_category_id', $categoryId)
        );
    }

    public function scopeByCurrency(Builder $query, string $currency): Builder
    {
        return $query->where('currency', $currency);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('description', 'like', "%{$term}%")
              ->orWhere('paid_to', 'like', "%{$term}%")
              ->orWhere('reference_no', 'like', "%{$term}%");
        });
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            // Generate reference number
            if (empty($model->reference_no)) {
                $model->reference_no = static::generateReferenceNo($model->branch_id);
            }

            // Default status for new expenses
            if (empty($model->status)) {
                $model->status = self::STATUS_DRAFT;
            }

            // Set created_by if not set
            if (empty($model->created_by) && Auth::check()) {
                $model->created_by = Auth::id();
            }

            // Ensure total_amount is set
            if (empty($model->total_amount)) {
                $model->total_amount = $model->amount ?? 0;
            }
        });

        static::updating(function (self $model) {
            // Keep total_amount in sync
            if ($model->isDirty('amount')) {
                $model->total_amount = $model->amount ?? 0;
            }
        });
    }

    // ── Workflow Actions ──────────────────────────────────────────────────────

    /**
     * Submit expense for approval.
     * Draft → Submitted
     */
    public function submit(?string $comment = null): bool
    {
        if ($this->status !== self::STATUS_DRAFT) {
            return false;
        }

        $this->status       = self::STATUS_SUBMITTED;
        $this->submitted_at = now();
        $this->submitted_by = Auth::id();
        $saved = $this->save();

        if ($saved) {
            $this->logTransition(self::STATUS_DRAFT, self::STATUS_SUBMITTED, 'submit', $comment);
        }

        return $saved;
    }

    /**
     * Mark as paid and create journal entry.
     * Submitted → Paid
     */
    public function markPaid(
        string $paymentMethod,
        ?string $paymentReference = null,
        ?string $comment = null,
    ): bool {
        if (! in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED])) {
            return false;
        }

        $this->status             = self::STATUS_PAID;
        $this->paid_at            = now();
        $this->paid_by            = Auth::id();
        $this->payment_method     = $paymentMethod;
        $this->payment_reference  = $paymentReference;
        $saved = $this->save();

        if ($saved) {
            $this->logTransition(self::STATUS_SUBMITTED, self::STATUS_PAID, 'pay', $comment);
        }

        return $saved;
    }

    /**
     * Cancel expense.
     * Draft | Submitted → Cancelled
     */
    public function cancel(string $reason, ?string $comment = null): bool
    {
        $cancellable = [self::STATUS_DRAFT, self::STATUS_SUBMITTED];

        if (! in_array($this->status, $cancellable)) {
            return false;
        }

        $prevStatus                  = $this->status;
        $this->status                = self::STATUS_CANCELLED;
        $this->cancelled_at          = now();
        $this->cancelled_by          = Auth::id();
        $this->cancellation_reason   = $reason;
        $saved = $this->save();

        if ($saved) {
            $this->logTransition($prevStatus, self::STATUS_CANCELLED, 'cancel', $comment ?? $reason);
        }

        return $saved;
    }

    // ── Status Helpers ────────────────────────────────────────────────────────

    public function isDraft(): bool      { return $this->status === self::STATUS_DRAFT; }
    public function isSubmitted(): bool  { return $this->status === self::STATUS_SUBMITTED; }
    public function isPaid(): bool       { return $this->status === self::STATUS_PAID; }
    public function isCancelled(): bool  { return $this->status === self::STATUS_CANCELLED; }

    public function canBeEdited(): bool
    {
        return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED]);
    }

    public function canBeSubmitted(): bool  { return $this->isDraft(); }
    public function canBePaid(): bool       { return in_array($this->status, [self::STATUS_DRAFT, self::STATUS_SUBMITTED]); }
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [
            self::STATUS_DRAFT, self::STATUS_SUBMITTED,
        ]);
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_DRAFT     => 'gray',
            self::STATUS_SUBMITTED => 'blue',
            self::STATUS_PAID      => 'emerald',
            self::STATUS_CANCELLED => 'orange',
            default                => 'gray',
        };
    }

    // ── Private Helpers ───────────────────────────────────────────────────────

    private function logTransition(
        string $from,
        string $to,
        string $action,
        ?string $comment = null
    ): void {
        // We store transitions in journal_entries.description or a JSON meta
        // Since we only use 5 tables, we record this in journal_entries as an audit line
        // when there's no journal entry (e.g. submit/approve), we skip DB log — 
        // the expense row itself IS the audit trail via timestamps + user fields.
    }

    // ── Static Helpers ────────────────────────────────────────────────────────

    public static function generateReferenceNo(?int $branchId): string
    {
        $year  = date('Y');
        $month = date('m');

        $query = static::query()
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->withTrashed();

        if ($branchId !== null) {
            $query->where('branch_id', $branchId);
        }

        $count = $query->count() + 1;
        $prefix = $branchId !== null ? 'EXP' : 'EXP-ADM';

        return sprintf('%s-%s%s-%05d', $prefix, $year, $month, $count);
    }
}
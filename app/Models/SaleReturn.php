<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class SaleReturn extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'sale_id', 'customer_id', 'created_by',
        'reference_no', 'return_date', 'total_amount',
        'reason', 'notes',
    ];

    protected $casts = [
        'return_date'  => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo   { return $this->belongsTo(Branch::class); }
    public function sale(): BelongsTo     { return $this->belongsTo(Sale::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function creator(): BelongsTo  { return $this->belongsTo(User::class, 'created_by'); }
    public function items(): HasMany      { return $this->hasMany(SaleReturnItem::class); }

    public function scopeForBranch(Builder $query, ?int $branchId): Builder
    {
        return $branchId ? $query->where('branch_id', $branchId) : $query;
    }

    public static function generateReferenceNo(int $branchId): string
    {
        $year   = date('Y');
        $month  = date('m');
        $prefix = "SR-{$year}{$month}-";
        $last   = static::where('branch_id', $branchId)
            ->where('reference_no', 'like', "{$prefix}%")
            ->withTrashed()
            ->orderBy('reference_no', 'desc')
            ->value('reference_no');
        $seq = $last ? (int) substr($last, -5) + 1 : 1;
        return "{$prefix}" . str_pad($seq, 5, '0', STR_PAD_LEFT);
    }
}

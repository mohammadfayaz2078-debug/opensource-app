<?php

namespace App\Http\Controllers;

use App\Helpers\AuthHelper;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicationController extends Controller
{
    private function resolveCompanyId(Request $request): ?int
    {
        if (AuthHelper::isCompanyAdmin()) {
            return $request->filled('company_id') ? (int) $request->company_id : null;
        }

        $branchId = AuthHelper::getBranchId();
        return $branchId ? \App\Models\Branch::find($branchId)?->company_id : null;
    }

    public function index(Request $request): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        $query = Product::with('category')
            ->when($companyId, fn ($q) => $q->where('company_id', $companyId));

        if ($request->filled('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $products = $query->orderBy('name')->get()
            ->map(function ($product) {
                $product->likes_count = DB::table('product_likes')
                    ->where('product_id', $product->id)
                    ->count();
                $product->comments_count = count($product->comments ?? []);
                return $product;
            });

        return response()->json(['data' => $products]);
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        $companyId = $this->resolveCompanyId($request);

        // Tenant isolation: users may only toggle products within their own company.
        $product = Product::where('company_id', $companyId)->findOrFail($id);
        $product->update(['is_public' => !$product->is_public]);

        return response()->json([
            'data' => $product,
            'message' => $product->is_public ? 'Product is now public' : 'Product is now private',
        ]);
    }

    public function publicProducts(): JsonResponse
    {
        $products = Product::where('is_public', true)
            ->with('category')
            ->orderBy('name')
            ->get()
            ->map(function ($product) {
                $product->likes_count = DB::table('product_likes')
                    ->where('product_id', $product->id)
                    ->count();
                $product->comments_count = count($product->comments ?? []);
                $product->orders_count = \App\Models\OrderItem::where('product_id', $product->id)
                    ->count();
                return $product;
            });

        return response()->json(['data' => $products]);
    }

    public function publicShow(int $id): JsonResponse
    {
        $product = Product::where('is_public', true)
            ->with('category')
            ->findOrFail($id);

        $product->likes_count = DB::table('product_likes')
            ->where('product_id', $product->id)
            ->count();

        return response()->json(['data' => $product]);
    }
}

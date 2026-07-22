<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category');

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
        $product = Product::findOrFail($id);
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

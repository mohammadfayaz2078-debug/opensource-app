<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Gate;

class LanguageController extends Controller
{
    public function update(Request $request)
    {
        $request->validate([
            'language' => 'required|in:en,fa,ps'
        ]);

        $user = $request->user();

        $user->update([
            'language' => $request->language
        ]);

        return response()->json([
            'success' => true,
            'language' => $user->language
        ]);
    }
}

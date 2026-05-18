<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;


Route::post('/logout', [AuthController::class, 'logout']);


Route::view('/{any}', 'app')->where('any', '.*');
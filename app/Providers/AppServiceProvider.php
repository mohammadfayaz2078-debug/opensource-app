<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use App\Policies\PermissionPolicy;
use App\Models\Company;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function ($user, $ability, $arguments = []) {
            if ($user instanceof Company) {
                return true;
            }

            if ($user->role && $user->role->role_name === 'admin') {
                return true;
            }

            return null;
        });

        Gate::define('perm', function ($user, string $module, string $action) {
            return app(PermissionPolicy::class)->check($user, $module, $action);
        });

        if (Auth::check()) {
            App::setLocale(Auth::user()->language ?? 'en');
        } elseif (session()->has('locale')) {
            App::setLocale(session('locale'));
        }
    }
}
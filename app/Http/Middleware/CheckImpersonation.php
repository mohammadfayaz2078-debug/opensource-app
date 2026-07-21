<?php

namespace App\Http\Middleware;

use App\Models\Company;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckImpersonation
{
    /**
     * Handle an incoming request.
     * Adds impersonation headers/data to every response when user is being impersonated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if ($user && $user instanceof User) {
            $currentToken = $user->currentAccessToken();
            $tokenName = $currentToken->name ?? '';

            if (str_starts_with($tokenName, 'impersonated_by_company_')) {
                $companyId = (int) str_replace('impersonated_by_company_', '', $tokenName);
                $company = Company::find($companyId);

                // Add impersonation info to response headers
                $response->headers->set('X-Impersonating', 'true');
                $response->headers->set('X-Impersonated-User', $user->full_name);
                $response->headers->set('X-Impersonated-By', $company ? $company->company_name : 'Company Admin');
            }
        }

        return $response;
    }
}

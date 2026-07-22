<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        // Detect Vite dev server for local development
        $viteDev = app()->environment('local') && $request->isMethod('GET')
            ? 'http://127.0.0.1:5173'
            : null;

        // CSP - allow necessary sources
        $csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com" . ($viteDev ? " {$viteDev}" : ''),
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com" . ($viteDev ? " {$viteDev}" : ''),
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
            "img-src 'self' data: blob: http: https:",
            "connect-src 'self' http: https:" . ($viteDev ? " {$viteDev} ws://127.0.0.1:5173" : ''),
            "manifest-src 'self'",
            "worker-src 'self'",
            "frame-ancestors 'none'",
        ];
        $response->headers->set('Content-Security-Policy', implode('; ', $csp));

        return $response;
    }
}

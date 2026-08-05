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

        $viteDev = $this->resolveViteDevOrigin();
        $viteWebSocket = $viteDev ? preg_replace('/^http/', 'ws', $viteDev) : null;

        // CSP - allow necessary sources
        $csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com" . ($viteDev ? " {$viteDev}" : ''),
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com" . ($viteDev ? " {$viteDev}" : ''),
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
            "img-src 'self' data: blob: http: https:",
            "connect-src 'self' http: https:" . ($viteDev ? " {$viteDev} {$viteWebSocket}" : ''),
            "manifest-src 'self'",
            "worker-src 'self'",
            "frame-ancestors 'none'",
        ];
        $response->headers->set('Content-Security-Policy', implode('; ', $csp));

        return $response;
    }

    private function resolveViteDevOrigin(): ?string
    {
        if (!app()->environment('local')) {
            return null;
        }

        $hotFile = public_path('hot');
        if (!is_file($hotFile)) {
            return null;
        }

        $hotUrl = trim((string) file_get_contents($hotFile));
        $parts = parse_url($hotUrl);

        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        if (!in_array($parts['scheme'], ['http', 'https'], true)
            || !in_array($parts['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
            return null;
        }

        $host = $parts['host'] === '::1' ? '[::1]' : $parts['host'];
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';

        return $parts['scheme'] . '://' . $host . $port;
    }
}

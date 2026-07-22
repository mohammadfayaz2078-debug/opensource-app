<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'BazarNet') }}</title>

    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#007c89">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="BazarNet">
    <meta name="application-name" content="BazarNet">
    <meta name="description" content="Business management application for purchases, sales, inventory, and more.">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="msapplication-TileColor" content="#007c89">
    <meta name="msapplication-tap-highlight" content="no">
    <meta name="format-detection" content="telephone=no">
    <meta name="color-scheme" content="light dark">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="BazarNet">
    <meta property="og:description" content="Business management application for purchases, sales, inventory, and more.">
    <meta property="og:theme_color" content="#007c89">

    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.svg">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.svg">

    <!-- Apple Splash Screens -->
    <link rel="apple-touch-startup-image" href="/icons/icon-512x512.svg">

    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="/icons/icon-192x192.svg">
    <link rel="manifest" href="/build/manifest.webmanifest">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- Security headers that actually work in <meta> tags -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">

    <!-- Vite will automatically inject CSS and JS -->
    @viteReactRefresh
    @vite(['resources/js/main.jsx'])
</head>
<body>
    <noscript>
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;text-align:center;padding:2rem;">
            <div>
                <h1 style="font-size:1.5rem;margin-bottom:1rem;">BazarNet requires JavaScript</h1>
                <p style="color:#666;">Please enable JavaScript in your browser settings to use this application.</p>
            </div>
        </div>
    </noscript>
    <div id="root"></div>
</body>
</html>

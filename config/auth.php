<?php

return [

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        // 👤 Normal users (company users)
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        // 🏢 Company Admin
        'company' => [
            'driver' => 'session',
            'provider' => 'companies',
        ],

        // 👑 Super Admin
        'super_admin' => [
            'driver' => 'session',
            'provider' => 'super_admins',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => App\Models\User::class,
        ],

        'companies' => [
            'driver' => 'eloquent',
            'model' => App\Models\Company::class,
        ],

        'super_admins' => [
            'driver' => 'eloquent',
            'model' => App\Models\SuperAdmin::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
        ],
    ],
];
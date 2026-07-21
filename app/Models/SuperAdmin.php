<?php
// app/Models/SuperAdmin.php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class SuperAdmin extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'super_admins';
    
    protected $guard = 'super_admin';

    protected $fillable = [
        'name',
        'email',
        'password',
        'language',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];
    
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];
}
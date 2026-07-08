<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Return null so Laravel never tries to redirect to a "login" route.
     * Instead our global exception handler in bootstrap/app.php catches
     * the AuthenticationException and returns JSON 401.
     */
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}

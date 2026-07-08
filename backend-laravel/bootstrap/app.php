<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Override the default Authenticate middleware so unauthenticated
        // API requests get a JSON 401 instead of a redirect to route('login')
        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON for API routes
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Map HttpException status codes to JSON error responses
        $exceptions->render(function (
            \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface $e,
            Request $request
        ) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'error'   => $e->getMessage() ?: 'An error occurred',
                ], $e->getStatusCode());
            }
        });

        // Validation errors → 422
        $exceptions->render(function (
            \Illuminate\Validation\ValidationException $e,
            Request $request
        ) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Validation failed',
                    'details' => $e->errors(),
                ], 422);
            }
        });

        // JWT / auth exceptions → 401
        $exceptions->render(function (
            \Tymon\JWTAuth\Exceptions\JWTException $e,
            Request $request
        ) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'error'   => $e->getMessage() ?: 'Token error',
                ], 401);
            }
        });

        // Unauthenticated (no/invalid Bearer token) → 401
        $exceptions->render(function (
            \Illuminate\Auth\AuthenticationException $e,
            Request $request
        ) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Unauthenticated. Please provide a valid Bearer token.',
                ], 401);
            }
        });
    })->create();

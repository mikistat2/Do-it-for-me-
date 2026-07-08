$base = "http://localhost:8000/api"
$headers = @{ "Accept" = "application/json"; "Content-Type" = "application/json" }

function Test($label, $method, $path, $body = $null, $token = $null) {
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    else { $headers.Remove("Authorization") }
    try {
        $r = if ($body) {
            Invoke-WebRequest -Uri "$base$path" -Method $method -Body ($body | ConvertTo-Json) -Headers $headers -UseBasicParsing
        } else {
            Invoke-WebRequest -Uri "$base$path" -Method $method -Headers $headers -UseBasicParsing
        }
        Write-Host "PASS [$($r.StatusCode)] $label" -ForegroundColor Green
        return $r.Content | ConvertFrom-Json
    } catch {
        $stream = $_.Exception.Response.GetResponseStream()
        $content = ([System.IO.StreamReader]::new($stream)).ReadToEnd()
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "INFO [$code] $label => $content" -ForegroundColor Yellow
        return $content | ConvertFrom-Json -ErrorAction SilentlyContinue
    }
}

Write-Host "`n=== Laravel Backend Smoke Tests ===" -ForegroundColor Cyan

# 1. Health
Test "GET /health" GET "/health"

# 2. Validation error (422)
Test "POST /auth/register (bad payload)" POST "/auth/register" @{ email = "bad" }

# 3. Unauthenticated (401)
Test "GET /profile (no token)" GET "/profile"

# 4. Unauthenticated notifications
Test "GET /notifications (no token)" GET "/notifications"

# 5. Bad login (401)
Test "POST /auth/login (wrong creds)" POST "/auth/login" @{ email = "nobody@example.com"; password = "wrongpass" }

Write-Host "`nNote: /auth/register and /auth/login require a live PostgreSQL DB." -ForegroundColor Cyan
Write-Host "Set DB_PASSWORD in .env and run: php artisan migrate" -ForegroundColor Cyan

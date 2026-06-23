$ErrorActionPreference = "Stop"

$BaseUrl = "http://127.0.0.1:3000"

function Assert-True {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

$page = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 8
Assert-True ($page.StatusCode -eq 200) "Home page did not return HTTP 200."
Assert-True (-not $page.Content.Contains("center-panel")) "Home page is still rendering the old blocking login-check panel."
Assert-True ($page.Content.Contains("login-panel")) "Home page did not render the login panel."

$scriptMatches = [regex]::Matches($page.Content, '/_next/static/[^"<> ]+\.js')
Assert-True ($scriptMatches.Count -gt 0) "No Next.js client script tags were found."

foreach ($match in $scriptMatches | Select-Object -First 6) {
  $scriptPath = $match.Value
  $script = Invoke-WebRequest -Uri "$BaseUrl$scriptPath" -UseBasicParsing -TimeoutSec 8
  Assert-True ($script.StatusCode -eq 200) "Client script $scriptPath did not return HTTP 200."
  Assert-True (($script.Headers["Content-Type"] -join ";") -match "javascript") "Client script $scriptPath is not served as JavaScript."
}

$form = @{ email = "admin@example.com"; password = "ChangeMe123!" }
try {
  $login = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login?redirect=/canvas" -Method POST -Body $form -SessionVariable session -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
} catch {
  $login = $_.Exception.Response
}

Assert-True ([int]$login.StatusCode -eq 303) "Form login did not return HTTP 303 redirect."
Assert-True (($login.Headers["Location"] -join "") -eq "$BaseUrl/canvas") "Form login redirected to the wrong location."
Assert-True (-not (($login.Headers["Set-Cookie"] -join ";") -match "(^|; )Secure(;|$)")) "Local HTTP login cookie must not be Secure."

$me = Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -WebSession $session -UseBasicParsing -TimeoutSec 8
Assert-True ($me.Content.Contains('"role":"admin"')) "Session check did not return the admin user."

$canvas = Invoke-WebRequest -Uri "$BaseUrl/canvas" -WebSession $session -UseBasicParsing -TimeoutSec 8
Assert-True ($canvas.StatusCode -eq 200) "Canvas page did not return HTTP 200 after login."

Write-Host "OK: local AI canvas startup is healthy at $BaseUrl"

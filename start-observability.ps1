# Quick Start - Free Observability Stack
# Run this to start Loki + Grafana in 2 minutes

Write-Host "`n=== Starting Free Observability Stack ===" -ForegroundColor Green
Write-Host "This will start Loki (logs) and Grafana (dashboard)`n" -ForegroundColor Cyan

# Create directory
$observabilityDir = "$HOME\observability"
Write-Host "Creating directory: $observabilityDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $observabilityDir | Out-Null
Set-Location $observabilityDir

# Create docker-compose.yml
Write-Host "Creating docker-compose.yml..." -ForegroundColor Yellow
@"
version: '3.8'

networks:
  observability:
    driver: bridge

services:
  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - observability
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_SERVER_ROOT_URL=http://localhost:3001
    restart: unless-stopped
    networks:
      - observability
    depends_on:
      loki:
        condition: service_healthy

volumes:
  loki-data:
    driver: local
  grafana-data:
    driver: local
"@ | Out-File -FilePath docker-compose.yml -Encoding UTF8

# Start services
Write-Host "`nStarting Docker containers..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services
Write-Host "`nWaiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Test Loki
Write-Host "`nTesting Loki..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3100/ready" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Loki is ready!" -ForegroundColor Green
} catch {
    Write-Host "✗ Loki is not responding yet. Give it another minute." -ForegroundColor Red
    Write-Host "  You can check status with: docker logs loki" -ForegroundColor Yellow
}

# Test Grafana
Write-Host "`nTesting Grafana..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Grafana is ready!" -ForegroundColor Green
} catch {
    Write-Host "✗ Grafana is not responding yet. Give it another minute." -ForegroundColor Red
    Write-Host "  You can check status with: docker logs grafana" -ForegroundColor Yellow
}

# Send test log
Write-Host "`nSending test log to Loki..." -ForegroundColor Yellow
try {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() * 1000000
    $body = @{
        streams = @(
            @{
                stream = @{
                    service = "test"
                    level = "info"
                    source = "powershell"
                }
                values = @(
                    @($timestamp.ToString(), "Test log from PowerShell - $(Get-Date)")
                )
            }
        )
    } | ConvertTo-Json -Depth 10

    Invoke-RestMethod -Uri "http://localhost:3100/loki/api/v1/push" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 5

    Write-Host "✓ Test log sent successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to send test log: $($_.Exception.Message)" -ForegroundColor Red
}

# Print summary
Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "`nServices:" -ForegroundColor Cyan
Write-Host "  Grafana:  http://localhost:3001" -ForegroundColor White
Write-Host "  Loki:     http://localhost:3100" -ForegroundColor White
Write-Host "`nCredentials:" -ForegroundColor Cyan
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "  1. Open Grafana: http://localhost:3001" -ForegroundColor White
Write-Host "  2. Login with admin/admin123" -ForegroundColor White
Write-Host "  3. Add Loki data source:" -ForegroundColor White
Write-Host "     - Go to Connections → Data sources → Add data source" -ForegroundColor White
Write-Host "     - Select 'Loki'" -ForegroundColor White
Write-Host "     - URL: http://loki:3100" -ForegroundColor White
Write-Host "     - Click 'Save & test'" -ForegroundColor White
Write-Host "  4. Go to Explore and query: {service=`"test`"}" -ForegroundColor White
Write-Host "  5. You should see your test log!" -ForegroundColor White
Write-Host "`nConfiguration:" -ForegroundColor Cyan
Write-Host "  Directory: $observabilityDir" -ForegroundColor White
Write-Host "`nUseful Commands:" -ForegroundColor Cyan
Write-Host "  Check status:  docker ps" -ForegroundColor White
Write-Host "  View logs:     docker logs loki" -ForegroundColor White
Write-Host "  Stop services: docker-compose down" -ForegroundColor White
Write-Host "  Restart:       docker-compose restart" -ForegroundColor White
Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "  See OBSERVABILITY_QUICK_SETUP_GUIDE.md for detailed instructions" -ForegroundColor White
Write-Host ""

# Open Grafana in browser
Write-Host "Opening Grafana in your browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001"

Write-Host "`n✓ All done! Grafana should open in your browser." -ForegroundColor Green
Write-Host "If not, manually open: http://localhost:3001`n" -ForegroundColor Yellow




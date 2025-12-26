# package_for_devices.ps1
# Builds the frontend and packages the app (frontend build + backend) into mbc_package.zip
# Run from the repository root (Windows PowerShell)

Write-Output "Running packaging: will build frontend and create mbc_package.zip"

# Install frontend deps and build
if (Test-Path package-lock.json) {
  Write-Output "Using existing lockfile"
}

# Install node deps
Write-Output "Installing frontend dependencies (npm ci)..."
npm ci

Write-Output "Building frontend (npm run build)..."
npm run build

# Remove old zip if present
$zipPath = Join-Path (Get-Location) "mbc_package.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create zip including build/ folder, backend/ folder, requirements.txt, DEPLOYMENT_GUIDE.md, package.json
Write-Output "Creating ZIP: $zipPath"
Compress-Archive -Path build, backend, package.json, requirements.txt, DEPLOYMENT_GUIDE.md -DestinationPath $zipPath -Force

Write-Output "Package created: $zipPath"
Write-Output "Done. Copy mbc_package.zip to your testing device and follow DEPLOYMENT_GUIDE.md -> Testing & Packaging For Devices."
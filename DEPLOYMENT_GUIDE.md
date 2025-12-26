# MBC Deployment Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `mbc` (or your preferred name)
3. **Do NOT initialize with README** (we already have one)
4. Click "Create repository"

## Step 2: Link Local Repository to GitHub

After creating the repo, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/mbc.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally (one-time)
npm install -g vercel

# Deploy from project root
cd c:\Users\suman\Downloads\MBC
vercel
```

Follow the prompts:
- Link to existing project or create new
- Select `./` as root directory
- Build command: `npm run build`
- Output directory: `dist`

### Option B: Connect via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import GitHub repository
4. Select your `mbc` repository
5. Vercel will auto-detect settings
6. Click "Deploy"

## Step 4: Configure Environment Variables (if needed)

In Vercel Dashboard:
1. Go to project settings
2. Click "Environment Variables"
3. Add backend API URL if using external API:
   - `VITE_API_URL`: Your backend URL
   - `VITE_BACKEND_URL`: Backend API endpoint

## Frontend Build

The frontend is built with Vite and automatically builds when you push to GitHub.

Build command: `npm run build`
Output: `dist/`

## Backend Deployment (Optional)

For the Python backend, you have options:
- **Railway.app** - Simple Python deployment
- **Render.com** - Free tier available
- **PythonAnywhere** - Python-specific hosting
- **Heroku** (paid)

## Future Updates

After this initial setup, any changes you push to GitHub will automatically deploy to Vercel:

```bash
# Make changes locally
# Edit files as needed

# Commit changes
git add .
git commit -m "feat: description of changes"

# Push to GitHub (and Vercel auto-deploys)
git push
```

## Quick Command Reference

```bash
# Check git status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "feat: your message"

# Push to GitHub
git push

# View commit history
git log --oneline
```

---

**Your Live URL**: Will be provided after Vercel deployment
**GitHub URL**: https://github.com/YOUR_USERNAME/mbc

## TURN / coturn (WebRTC NAT traversal)

For production WebRTC calls across NATs and restrictive networks you should configure a TURN server (coturn is popular).

Quick notes:


```text
VITE_TURN_SERVERS='[{"urls":"turn:turn.example.com:3478","username":"turnuser","credential":"turnpass"}]'
```



```bash
# Install coturn
sudo apt update
sudo apt install coturn

# Edit /etc/turnserver.conf to set listening IPs, relay IPs and auth mechanism
# Example config snippets:
# listening-port=3478
# fingerprint
# lt-cred-mech
# realm=yourdomain.com
# use-auth-secret
# static-auth-secret=<your-secret>

# Start coturn as a service
sudo systemctl enable coturn
sudo systemctl start coturn
```


If you want, I can add a sample `docker-compose` coturn config and docs for generating long-term credentials.

## Testing & Packaging For Devices (microphone + camera)

If your local machine doesn't have a microphone or camera you can still prepare a distributable bundle to test on other devices that do. The steps below create a ZIP containing the frontend build artifacts and the backend source so a tester can run the frontend (served over HTTPS or via a tunnel) and the backend locally or on a LAN host.

Prerequisites (on the machine that will *build* the package):

- Node.js (18+ recommended) and `npm`.
- Python 3.11+ and `pip` to run the backend (or a container runtime if you prefer docker).
- `ngrok` or `localtunnel` (optional) to provide an HTTPS URL for devices on other networks.

High-level packaging steps (automated script included):

1. From the repo root run the PowerShell packaging script `package_for_devices.ps1` (see below). It will:
   - install frontend dependencies (`npm ci`),
   - build the frontend (`npm run build`) into the `build/` folder,
   - create a zip `mbc_package.zip` containing the `build/` folder, the `backend/` folder, `requirements.txt`, and the deployment docs.

PowerShell packaging command (from repo root):

```powershell
.\package_for_devices.ps1
```

What the tester needs to do on a device with camera/microphone:

1. Unzip `mbc_package.zip` to a folder on the device.
2. Install frontend static server (optional) or use the included instructions below:
   - Option A (quick static + secure tunnel): Serve the built frontend using a simple static server and expose it via an HTTPS tunnel (recommended for cross-device testing):

```powershell
# install a short-lived static server and ngrok (if not installed globally)
npx serve build -l 3000
# in a separate shell, run an HTTPS tunnel (if available):
# ngrok http 3000
```

Open the generated HTTPS ngrok URL (or the LAN address if you serve on the same Wi‑Fi network) in the device browser. The browser must show a secure origin (https or localhost) for `getUserMedia` to work on many platforms.

3. Start the backend (if needed for signalling) on a machine reachable by both devices (can be the same machine as the static server):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Notes and tips:

- Browsers require a secure origin for camera/microphone access. Use `https://` (via ngrok or a reverse proxy with TLS) or `http://localhost` for local testing.
- If devices are on the same LAN you can run `uvicorn` with `--host 0.0.0.0` and serve the frontend on the machine's LAN IP (e.g. `http://192.168.1.42:3000`) but most mobile browsers will still require HTTPS for camera access.
- The code includes a synthetic demo stream fallback (canvas + oscillator) so you can still exercise the UI on machines without real hardware — but for real microphone/camera testing use a device with those peripherals.
- For NAT traversal in production, configure `VITE_TURN_SERVERS` environment variable with your coturn/STUN/TURN servers (see earlier section).

If you want, I can (A) run the packaging script here to produce `mbc_package.zip` now, or (B) just add the script and leave packaging to you. Which do you prefer?

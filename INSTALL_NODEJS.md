# Installing Node.js

You're seeing "npm is not recognised" because Node.js isn't installed yet. Here's how to fix it:

---

## 🪟 Windows Installation

### Option 1: Official Installer (Recommended)

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Click the **LTS** version (Long Term Support)
   - Download the Windows Installer (.msi)

2. **Run the Installer:**
   - Double-click the downloaded .msi file
   - Click "Next" through the wizard
   - **Important:** Check "Automatically install the necessary tools" if asked
   - Click "Install"
   - Click "Finish"

3. **Restart PowerShell/Terminal:**
   - Close all terminal windows
   - Open a NEW PowerShell/Command Prompt

4. **Verify Installation:**
   ```powershell
   node --version
   # Should show: v18.x.x or v20.x.x
   
   npm --version
   # Should show: 9.x.x or 10.x.x
   ```

### Option 2: Using Chocolatey (if you have it)

```powershell
# Run as Administrator
choco install nodejs-lts
```

### Option 3: Using winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## 🐧 Linux Installation

### Ubuntu/Debian:

```bash
# Update package list
sudo apt update

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Fedora/RHEL/CentOS:

```bash
# Install Node.js 20.x
sudo dnf module install nodejs:20

# Verify
node --version
npm --version
```

### Arch Linux:

```bash
sudo pacman -S nodejs npm
```

---

## 🍎 macOS Installation

### Option 1: Official Installer

1. Go to: https://nodejs.org/
2. Download macOS Installer (.pkg)
3. Run the installer
4. Follow the prompts

### Option 2: Using Homebrew (Recommended)

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify
node --version
npm --version
```

---

## ✅ Verify Installation

After installing, **close and reopen your terminal**, then run:

```bash
# Check Node.js
node --version
# Expected: v18.x.x or v20.x.x

# Check npm
npm --version
# Expected: 9.x.x or 10.x.x

# Test they work
node -e "console.log('Node.js works!')"
npm --version
```

**If you see version numbers, you're ready!**

---

## 🔄 After Installing Node.js

Now you can continue with NexusCore setup:

```bash
# Navigate to your project
cd C:\git\nexusllm

# Install project dependencies
npm install

# Continue with setup...
```

---

## 🐛 Troubleshooting

### Still says "npm is not recognised" after installing?

**Fix 1: Restart Terminal**
- Close ALL terminal windows
- Open a NEW terminal
- Try again

**Fix 2: Check PATH (Windows)**
```powershell
# Check if Node.js is in PATH
$env:Path -split ';' | Select-String -Pattern 'nodejs'

# If empty, add it manually:
# 1. Open System Properties → Environment Variables
# 2. Edit PATH
# 3. Add: C:\Program Files\nodejs\
```

**Fix 3: Reinstall**
- Uninstall Node.js completely
- Restart computer
- Install again from nodejs.org

---

## 🎯 Which Version?

- **Recommended:** Node.js 20.x LTS (Long Term Support)
- **Minimum:** Node.js 18.x
- **Don't use:** Node.js 16.x or older (deprecated)

---

## 📦 Alternative: Node Version Manager

If you need to manage multiple Node.js versions:

**Windows:** Use nvm-windows
```powershell
# Download from: https://github.com/coreybutler/nvm-windows/releases
# Install, then:
nvm install 20
nvm use 20
```

**Mac/Linux:** Use nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

---

## ✨ Next Steps

Once Node.js is installed:

1. ✅ Verify: `node --version` and `npm --version` work
2. 📂 Go to project: `cd C:\git\nexusllm`
3. 📦 Install dependencies: `npm install`
4. 📖 Continue with: [START_HERE.md](START_HERE.md)


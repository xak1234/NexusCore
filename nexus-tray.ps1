# NexusLLM System Tray Application
# Provides easy start/stop control from Windows system tray

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create the application context
$appContext = New-Object System.Windows.Forms.ApplicationContext

# Create NotifyIcon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "NexusLLM Server"
$notifyIcon.Visible = $true

# Create icon from text (simple colored square)
$bitmap = New-Object System.Drawing.Bitmap 16, 16
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.FillRectangle([System.Drawing.Brushes]::DodgerBlue, 0, 0, 16, 16)
$graphics.DrawString("N", [System.Drawing.Font]::new("Arial", 10, [System.Drawing.FontStyle]::Bold), 
                     [System.Drawing.Brushes]::White, 1, 0)
$notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())

# Server state
$script:serverRunning = $false
$script:pythonJob = $null
$script:nodeJob = $null

# Create context menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Start Server menu item
$startItem = New-Object System.Windows.Forms.ToolStripMenuItem
$startItem.Text = "Start Server"
$startItem.Add_Click({
    if (-not $script:serverRunning) {
        $notifyIcon.ShowBalloonTip(3000, "NexusLLM", "Starting servers...", [System.Windows.Forms.ToolTipIcon]::Info)
        
        # Start servers
        $scriptPath = Split-Path -Parent $PSScriptRoot
        Set-Location $scriptPath
        
        # Start Python server
        $env:PORT = "8000"
        $env:HOST = "0.0.0.0"
        $script:pythonJob = Start-Job -ScriptBlock {
            Set-Location $using:scriptPath
            python -m python_server.main 2>&1
        }
        
        # Start Node.js server
        Start-Sleep -Seconds 3
        $script:nodeJob = Start-Job -ScriptBlock {
            Set-Location $using:scriptPath
            npm run dev:all 2>&1
        }
        
        $script:serverRunning = $true
        $startItem.Enabled = $false
        $stopItem.Enabled = $true
        
        # Wait and open browser
        Start-Sleep -Seconds 5
        Start-Process "http://localhost:3000"
        
        $notifyIcon.ShowBalloonTip(3000, "NexusLLM", "Server started! Opening browser...", [System.Windows.Forms.ToolTipIcon]::Info)
    }
})

# Stop Server menu item
$stopItem = New-Object System.Windows.Forms.ToolStripMenuItem
$stopItem.Text = "Stop Server"
$stopItem.Enabled = $false
$stopItem.Add_Click({
    if ($script:serverRunning) {
        $notifyIcon.ShowBalloonTip(3000, "NexusLLM", "Stopping servers...", [System.Windows.Forms.ToolTipIcon]::Info)
        
        # Stop jobs
        Stop-Job $script:pythonJob -ErrorAction SilentlyContinue
        Stop-Job $script:nodeJob -ErrorAction SilentlyContinue
        Remove-Job $script:pythonJob -ErrorAction SilentlyContinue
        Remove-Job $script:nodeJob -ErrorAction SilentlyContinue
        
        # Kill processes on ports
        @(8000, 8080, 3000) | ForEach-Object {
            $process = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue | 
                        Select-Object -ExpandProperty OwningProcess | 
                        Select-Object -Unique
            if ($process) {
                Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
            }
        }
        
        $script:serverRunning = $false
        $startItem.Enabled = $true
        $stopItem.Enabled = $false
        
        $notifyIcon.ShowBalloonTip(3000, "NexusLLM", "Server stopped.", [System.Windows.Forms.ToolTipIcon]::Info)
    }
})

# Open Dashboard menu item
$dashboardItem = New-Object System.Windows.Forms.ToolStripMenuItem
$dashboardItem.Text = "Open Dashboard"
$dashboardItem.Add_Click({
    Start-Process "http://localhost:3000"
})

# Separator
$separator = New-Object System.Windows.Forms.ToolStripSeparator

# Exit menu item
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem
$exitItem.Text = "Exit"
$exitItem.Add_Click({
    # Stop servers if running
    if ($script:serverRunning) {
        $stopItem.PerformClick()
        Start-Sleep -Seconds 2
    }
    
    $notifyIcon.Visible = $false
    $appContext.ExitThread()
})

# Add items to context menu
$contextMenu.Items.Add($startItem)
$contextMenu.Items.Add($stopItem)
$contextMenu.Items.Add($dashboardItem)
$contextMenu.Items.Add($separator)
$contextMenu.Items.Add($exitItem)

# Assign context menu
$notifyIcon.ContextMenuStrip = $contextMenu

# Handle double-click
$notifyIcon.Add_DoubleClick({
    if ($script:serverRunning) {
        Start-Process "http://localhost:3000"
    } else {
        $startItem.PerformClick()
    }
})

# Show initial tooltip
$notifyIcon.ShowBalloonTip(5000, "NexusLLM", "Right-click for options. Double-click to start/open.", [System.Windows.Forms.ToolTipIcon]::Info)

# Run the application
[System.Windows.Forms.Application]::Run($appContext)

# Cleanup
$notifyIcon.Dispose()

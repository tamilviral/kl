# Synchronize and generate all Android launcher and adaptive icons from icon-512.png
Add-Type -AssemblyName System.Drawing

$srcDir = $PSScriptRoot
if (-not $srcDir) { $srcDir = (Get-Location).Path }
$srcIcon = Join-Path $srcDir "icon-512.png"

if (-not (Test-Path $srcIcon)) {
    Write-Host "[ERROR] Source icon not found at: $srcIcon" -ForegroundColor Red
    exit 1
}

$targetDirs = @(
    (Join-Path $srcDir "android\app\src\main\res")
)

# Also sync to external Android Studio project if it exists
$studioRes = "C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult\app\src\main\res"
if (Test-Path $studioRes) {
    $targetDirs += $studioRes
}

function Resize-Image {
    param(
        [System.Drawing.Image]$sourceImage,
        [int]$targetWidth,
        [int]$targetHeight,
        [string]$outputPath,
        [bool]$isForeground = $false
    )
    
    $destBitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($destBitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($isForeground) {
        # Adaptive foreground safe area is 72dp inside 108dp (66.7%), centered
        $fgW = [int]($targetWidth * 0.72)
        $fgH = [int]($targetHeight * 0.72)
        $offsetX = [int](($targetWidth - $fgW) / 2)
        $offsetY = [int](($targetHeight - $fgH) / 2)
        $graphics.DrawImage($sourceImage, $offsetX, $offsetY, $fgW, $fgH)
    } else {
        $graphics.DrawImage($sourceImage, 0, 0, $targetWidth, $targetHeight)
    }

    $destBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $destBitmap.Dispose()
}

$sourceImg = [System.Drawing.Image]::FromFile($srcIcon)

$densities = @(
    @{ Name = "mipmap-mdpi";    Size = 48;  FgSize = 108 },
    @{ Name = "mipmap-hdpi";    Size = 72;  FgSize = 162 },
    @{ Name = "mipmap-xhdpi";   Size = 96;  FgSize = 216 },
    @{ Name = "mipmap-xxhdpi";  Size = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; FgSize = 432 }
)

foreach ($resDir in $targetDirs) {
    if (Test-Path $resDir) {
        Write-Host "Updating Android launcher icons in: $resDir"
        foreach ($d in $densities) {
            $folder = Join-Path $resDir $d.Name
            if (-not (Test-Path $folder)) {
                New-Item -ItemType Directory -Path $folder -Force | Out-Null
            }
            # Remove obsolete default robot webp files
            $oldWebp1 = Join-Path $folder "ic_launcher.webp"
            $oldWebp2 = Join-Path $folder "ic_launcher_round.webp"
            if (Test-Path $oldWebp1) { Remove-Item $oldWebp1 -Force }
            if (Test-Path $oldWebp2) { Remove-Item $oldWebp2 -Force }

            # Generate new PNG icons
            $iconPath = Join-Path $folder "ic_launcher.png"
            $roundPath = Join-Path $folder "ic_launcher_round.png"
            $fgPath = Join-Path $folder "ic_launcher_foreground.png"

            Resize-Image -sourceImage $sourceImg -targetWidth $d.Size -targetHeight $d.Size -outputPath $iconPath -isForeground $false
            Resize-Image -sourceImage $sourceImg -targetWidth $d.Size -targetHeight $d.Size -outputPath $roundPath -isForeground $false
            Resize-Image -sourceImage $sourceImg -targetWidth $d.FgSize -targetHeight $d.FgSize -outputPath $fgPath -isForeground $true
        }
    }
}

$sourceImg.Dispose()
Write-Host "[OK] All Android launcher icons generated successfully!" -ForegroundColor Green

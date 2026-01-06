$sizes = @(16, 32, 48, 128)
$svgPath = "$PSScriptRoot\icon.svg"
$outputDir = "$PSScriptRoot\icons"

# Create output directory if it doesn't exist
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Function to convert SVG to PNG using PowerShell
function Convert-SvgToPng {
    param (
        [string]$SvgPath,
        [int]$Width,
        [int]$Height,
        [string]$OutputPath
    )

    Add-Type -AssemblyName System.Drawing
    
    # Read the SVG content
    $svgContent = [System.IO.File]::ReadAllText($SvgPath)
    
    # Create a temporary HTML file to render the SVG
    $html = @"
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin: 0; padding: 0; }
            svg { width: ${Width}px; height: ${Height}px; }
        </style>
    </head>
    <body>
        $svgContent
    </body>
    </html>
"@

    $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"
    [System.IO.File]::WriteAllText($tempHtml, $html)
    
    # Use Internet Explorer to render the HTML
    $ie = New-Object -ComObject InternetExplorer.Application
    $ie.Navigate("file:///$tempHtml")
    while ($ie.Busy -eq $true) { Start-Sleep -Milliseconds 100 }
    
    # Create a bitmap and draw the content
    $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $ie.Document.body.DrawToDeviceTarget($graphics)
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $graphics.Dispose()
    $bitmap.Dispose()
    $ie.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ie) | Out-Null
    Remove-Item $tempHtml -Force
}

# Generate icons for each size
foreach ($size in $sizes) {
    $outputPath = "$outputDir\icon-${size}.png"
    Write-Host "Generating $outputPath..."
    Convert-SvgToPng -SvgPath $svgPath -Width $size -Height $size -OutputPath $outputPath
}

# Copy the 32x32 version as the default icon.png
Copy-Item "$outputDir\icon-32.png" "$outputDir\icon.png" -Force
Write-Host "Icons generated successfully in $outputDir"

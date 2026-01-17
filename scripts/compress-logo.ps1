Add-Type -AssemblyName System.Drawing

# Compress tireops logo
$img = [System.Drawing.Image]::FromFile('C:\Users\offic\Downloads\tireops logo.png')
$newWidth = 500
$newHeight = [int]($img.Height * ($newWidth / $img.Width))
$bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)
$bmp.Save('C:\Users\offic\Downloads\tireops-logo-small.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
$graphics.Dispose()
Write-Host "Compressed tireops logo"

# Compress shield logo
$img2 = [System.Drawing.Image]::FromFile('C:\Users\offic\Downloads\tire shield logo.png')
$newWidth2 = 400
$newHeight2 = [int]($img2.Height * ($newWidth2 / $img2.Width))
$bmp2 = New-Object System.Drawing.Bitmap($newWidth2, $newHeight2)
$graphics2 = [System.Drawing.Graphics]::FromImage($bmp2)
$graphics2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics2.DrawImage($img2, 0, 0, $newWidth2, $newHeight2)
$bmp2.Save('C:\Users\offic\Downloads\tire-shield-logo-small.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img2.Dispose()
$bmp2.Dispose()
$graphics2.Dispose()
Write-Host "Compressed shield logo"

# Show file sizes
Get-ChildItem 'C:\Users\offic\Downloads\*logo-small.png' | Select-Object Name, @{N='Size(KB)';E={[math]::Round($_.Length/1KB,2)}}

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile('C:\Users\offic\Downloads\tire-shield-logo-small.png')
$newWidth = 400
$newHeight = [int]($img.Height * ($newWidth / $img.Width))
$bmp = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)
$bmp.Save('C:\Users\offic\Downloads\tire-shield-compressed.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$bmp.Dispose()
$graphics.Dispose()

Get-ChildItem 'C:\Users\offic\Downloads\tire-shield-compressed.png' | Select-Object Name, @{N='Size(KB)';E={[math]::Round($_.Length/1KB,2)}}

# Read-only Windows release inspection; never opens the app or a personal profile.
param(
    [string]$OutputDirectory = 'outputs/desktop',
    [switch]$RequireSignature,
    [string]$ExpectedPublisher
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    $projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
    $package = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
    if (-not [IO.Path]::IsPathRooted($OutputDirectory)) {
        $OutputDirectory = Join-Path $projectRoot $OutputDirectory
    }
    $paths = @(
        (Join-Path $OutputDirectory "Little-Haven-$($package.version)-x64.exe"),
        (Join-Path $OutputDirectory "win-unpacked/$($package.build.productName).exe")
    )
    # The main PE has a numeric ProductVersion; FileVersion preserves the beta label.
    # electron-builder may append a numeric CI build number to FileVersion.
    $fileVersionPattern = '^' + [regex]::Escape($package.version) + '(?:\.\d+)?$'
    $problems = [Collections.Generic.List[string]]::new()
    $artifacts = @(foreach ($artifactPath in $paths) {
        $file = Get-Item -LiteralPath $artifactPath
        $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
        $publisher = if ($null -ne $signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
        $timestamped = $null -ne $signature.TimeStamperCertificate
        if ($file.VersionInfo.ProductName -ne $package.build.productName -or
            $file.VersionInfo.FileVersion -notmatch $fileVersionPattern) {
            $problems.Add("Unexpected product name/version: $($file.Name)")
        }
        if ($RequireSignature) {
            if ($signature.Status.ToString() -ne 'Valid') {
                $problems.Add("Valid Authenticode signature required: $($file.Name) ($($signature.Status))")
            }
            if (-not $timestamped) {
                $problems.Add("Signing timestamp required: $($file.Name)")
            }
        }
        if ($ExpectedPublisher -and $publisher -cne $ExpectedPublisher) {
            $problems.Add("Unexpected signing publisher: $($file.Name)")
        }
        [pscustomobject]@{
            Path = $file.FullName
            Bytes = $file.Length
            SHA256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
            ProductName = $file.VersionInfo.ProductName
            ProductVersion = $file.VersionInfo.ProductVersion
            FileVersion = $file.VersionInfo.FileVersion
            CompanyName = $file.VersionInfo.CompanyName
            Signature = $signature.Status.ToString()
            Publisher = $publisher
            Timestamped = $timestamped
        }
    })
    if ($RequireSignature) {
        $publishers = @($artifacts.Publisher | Where-Object { $_ } | Sort-Object -Unique)
        if ($publishers.Count -ne 1) {
            $problems.Add('The launcher and application must have the same signing publisher.')
        }
    }
    [pscustomobject]@{
        SignatureRequired = [bool]$RequireSignature
        Artifacts = $artifacts
        Problems = @($problems.ToArray())
    } | ConvertTo-Json -Depth 4
    if ($problems.Count -gt 0) {
        throw 'Windows artifact verification failed. See Problems above.'
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}

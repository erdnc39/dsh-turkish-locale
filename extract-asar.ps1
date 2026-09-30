param(
  [Parameter(Mandatory=$true)][string]$RelPath,
  [Parameter(Mandatory=$true)][string]$OutFile
)
# Extract a file from the DSH app.asar given its path relative to the asar root.
$ErrorActionPreference = 'Stop'
$asar = "C:\Users\erdinc\AppData\Local\Programs\DeepSeek Harness\resources\app.asar"
$headerFile = "C:\Users\erdinc\Documents\deepseek-harness\default-workspace\asar-header.json"
$header = Get-Content $headerFile -Raw | ConvertFrom-Json
$node = $header.files
foreach ($part in ($RelPath -split '/')) {
  if (-not $node.files -or -not $node.files.PSObject.Properties[$part]) {
    throw "Path component not found in asar: $part (in $RelPath)"
  }
  $node = $node.files.$part
}
if ($null -eq $node.offset) { throw "Not a file: $RelPath" }
$base = 16 + 3392052
$fs = [System.IO.File]::OpenRead($asar)
try {
  $null = $fs.Seek($base + [uint64]$node.offset, 'Begin')
  $buf = New-Object byte[] ([int]$node.size)
  $null = $fs.Read($buf, 0, $buf.Length)
  [System.IO.File]::WriteAllBytes($OutFile, $buf)
} finally { $fs.Close() }
"Wrote $OutFile ($($node.size) bytes)"

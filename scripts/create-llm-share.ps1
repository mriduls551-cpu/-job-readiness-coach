param()

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$destinationRoot = Join-Path $repoRoot 'output\llm-share-safe'

if (-not $destinationRoot.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Refusing to write outside the repository root.'
}

if (Test-Path -LiteralPath $destinationRoot) {
  Remove-Item -LiteralPath $destinationRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null

$includePaths = @(
  '__mocks__',
  'e2e',
  'scripts',
  'src',
  'supabase\migrations',
  'instrumentation-client.ts',
  'instrumentation.ts',
  'jest.config.cjs',
  'jest.config.ts',
  'jest.setup.ts',
  'middleware.ts',
  'next-env.d.ts',
  'next.config.js',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'tsconfig.e2e.json',
  'tsconfig.jest.json',
  'tsconfig.json',
  'tsconfig.test.json',
  'tsconfig.typecheck.json',
  'vercel.json'
)

function Copy-RepoFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourceFile
  )

  if (-not $SourceFile.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to copy a file outside the repository root: $SourceFile"
  }

  $repoPrefix = [Regex]::Escape($repoRoot.TrimEnd('\', '/'))
  $relativePath = [Regex]::Replace($SourceFile, "^${repoPrefix}[\\\\/]", '')
  $targetFile = Join-Path $destinationRoot $relativePath
  $targetDirectory = Split-Path -Parent $targetFile

  if (-not (Test-Path -LiteralPath $targetDirectory)) {
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  }

  Copy-Item -LiteralPath $SourceFile -Destination $targetFile -Force
}

foreach ($includePath in $includePaths) {
  $sourcePath = Join-Path $repoRoot $includePath

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    Write-Warning "Skipped missing path: $includePath"
    continue
  }

  $item = Get-Item -LiteralPath $sourcePath

  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $sourcePath -Recurse -File | ForEach-Object {
      if ($_.Name -like '.fuse_hidden*') {
        return
      }

      Copy-RepoFile -SourceFile $_.FullName
    }
    continue
  }

  if ($item.Name -like '.fuse_hidden*') {
    continue
  }

  Copy-RepoFile -SourceFile $item.FullName
}

$readme = @'
# LLM Share Copy

This folder is a generated, reduced-scope copy of the repository for third-party LLM tooling.

Excluded on purpose:
- `.git` history, author metadata, and remotes
- all `.env*` files, including ignored local secrets
- product strategy docs, PRDs, roadmaps, and founder notes
- QA screenshots, mockups, walkthroughs, and research artifacts
- local absolute paths and other workstation-specific references

Review the generated copy before sharing it with any external tool.
'@

Set-Content -LiteralPath (Join-Path $destinationRoot 'README.md') -Value $readme -NoNewline

$copiedFiles = Get-ChildItem -LiteralPath $destinationRoot -Recurse -File
Write-Host "Created share-safe copy at: $destinationRoot"
Write-Host "Files copied: $($copiedFiles.Count)"

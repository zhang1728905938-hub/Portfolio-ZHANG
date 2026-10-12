$ErrorActionPreference = 'Stop'
$imageDirectory = Join-Path $PSScriptRoot '../public/images'
New-Item -ItemType Directory -Force -Path $imageDirectory | Out-Null
$photos = @(
  @{ name = 'sculpted-light'; id = '1487958449943-2429e8be8625' },
  @{ name = 'quiet-monument'; id = '1511818966892-d7d671e672a2' },
  @{ name = 'urban-rhythm'; id = '1486718448742-163732cd1544' },
  @{ name = 'concrete-poetry'; id = '1486325212027-8081e485255e' },
  @{ name = 'light-well'; id = '1497366754035-f200968a6e72' },
  @{ name = 'civic-landscape'; id = '1518005020951-eccb494ad742' },
  @{ name = 'vertical-village'; id = '1449158743715-0a90ebb6d2d8' },
  @{ name = 'open-house'; id = '1600210492486-724fe5c67fb0' },
  @{ name = 'fluid-futures'; id = '1496307653780-42ee777d4833' },
  @{ name = 'parametric-field'; id = '1486406146926-c627a92ad1ab' },
  @{ name = 'material-studies'; id = '1600607687920-4e2a09cf159d' },
  @{ name = 'city-fragments'; id = '1479839672679-a46483c0e7c8' },
  @{ name = 'still-space'; id = '1497366811353-6870744d04b2' },
  @{ name = 'lines-of-light'; id = '1497366412874-3415097a27e7' }
)
foreach ($photo in $photos) {
  $target = Join-Path $imageDirectory ($photo.name + '.jpg')
  if (!(Test-Path -LiteralPath $target)) {
    $url = 'https://images.unsplash.com/photo-' + $photo.id + '?auto=format&fit=crop&w=1400&q=82'
    Invoke-WebRequest -Uri $url -OutFile $target
  }
  Write-Output ($photo.name + ': ' + (Get-Item -LiteralPath $target).Length + ' bytes')
}


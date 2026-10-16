#!/usr/bin/env python3
"""Build the existing plugin and self-contained preview from canonical sources."""
from pathlib import Path
import json,re,base64,shutil,zipfile
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/'datatour-bf26-config.json').read_text());VERSION=CONFIG['version']
PLUGIN=ROOT/'wordpress'/'datatour-bf26-compatible'
ASSETS=PLUGIN/'assets'/('v'+VERSION);ASSETS.mkdir(parents=True,exist_ok=True)
for name in ['datatour-bf26.html','datatour-bf26.css','datatour-bf26.js','datatour-bf26-config.json']:
 shutil.copyfile(ROOT/name,ASSETS/name)
for p in (ROOT/'assets').rglob('*'):
 if p.is_file():
  out=ASSETS/p.relative_to(ROOT/'assets');out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,out)
shutil.copyfile(PLUGIN/'assets'/'shell.css',ASSETS/'shell.css')
for module in ['leads','telegram']:
 shutil.copyfile(PLUGIN/(module+'.php'),PLUGIN/(module+'-v'+VERSION+'.php'))
shutil.copyfile(ROOT/'LUCIDE-LICENSE.txt',PLUGIN/'LUCIDE-LICENSE.txt')
config=json.loads((ROOT/'datatour-bf26-config.json').read_text())
config.pop('recipient',None);config['ajaxUrl']='/wp-admin/admin-ajax.php'
body=(ROOT/'datatour-bf26.html').read_text().replace('{{ajax_url}}','/wp-admin/admin-ajax.php')
# Preserve the standalone preview without remote image dependencies.
def embedded(name):
 p=ROOT/'assets'/name
 if not p.exists():return name
 mime='image/webp' if p.suffix=='.webp' else 'image/png' if p.suffix=='.png' else 'image/jpeg' if p.suffix in ['.jpg','.jpeg'] else 'image/svg+xml'
 return 'data:'+mime+';base64,'+base64.b64encode(p.read_bytes()).decode()
body=re.sub(r'\{\{asset_url\}\}/([A-Za-z0-9_./-]+)',lambda m:embedded(m.group(1)),body)
for i,n in enumerate(config.get('news',[]),1):body=body.replace('{{news_'+str(i)+'_url}}',n['url'])
for i in range(1,4):body=body.replace('{{news_'+str(i)+'_url}}','#dt-blog')
for key in ['reviews','payments','priority_hotels','datatour_choice_hotels','scenario_images','winter_destinations']:
 for entry in config.get(key,[]):
  if entry.get('image') and not entry['image'].startswith('http'):entry['image']=embedded(entry['image'])
html='<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Datatour — Чёрная пятница 2026</title><style>body{margin:0}\n'+(ROOT/'datatour-bf26.css').read_text()+'</style></head><body>'+body+'<script>window.DatatourBF26='+json.dumps(config,ensure_ascii=False).replace('</','<\\/')+';</script><script>'+(ROOT/'datatour-bf26.js').read_text()+'</script></body></html>\n'
(ROOT/'datatour-bf26-preview.html').write_text(html)
output=ROOT/'downloads'/'datatour-bf26-2026-10-14'/('datatour-bf26-production-'+VERSION+'.zip')
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(PLUGIN.rglob('*')):
  if p.is_file() and p.relative_to(PLUGIN).parts[0] != 'assets' and p.name not in ['leads.php','telegram.php'] and (not p.name.startswith(('leads-v','telegram-v')) or p.name in ['leads-v'+VERSION+'.php','telegram-v'+VERSION+'.php']):
   z.write(p,Path('datatour-bf26-compatible')/p.relative_to(PLUGIN))
 for p in sorted(ASSETS.rglob('*')):
  if p.is_file():z.write(p,Path('datatour-bf26-compatible')/p.relative_to(PLUGIN))
with zipfile.ZipFile(output) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
print('Built plugin ZIP:',output.name,'bytes:',output.stat().st_size)
print('Built self-contained preview and versioned assets:',ASSETS)

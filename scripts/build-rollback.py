#!/usr/bin/env python3
"""Prepare an inactive, checksum-guarded restore helper for the original live plugin.
The private snapshot is supplied explicitly; credentials and page/admin snapshots are never packaged.
"""
from pathlib import Path
import sys,json,hashlib,zipfile,base64
ROOT=Path(__file__).resolve().parents[1]
backup=Path(sys.argv[1]);version=json.loads((ROOT/'datatour-bf26-config.json').read_text())['version']
name='datatour-bf26-restore-original'
files={'templates/landing.php':backup/'templates/landing.php'}
for file in ['datatour-bf26.html','datatour-bf26.css','datatour-bf26.js','shell.css']:files['assets/'+file]=backup/file
original=(backup/'datatour-bf26.php').read_bytes()
manifest={'current_main':hashlib.sha256((ROOT/'wordpress/datatour-bf26-compatible/datatour-bf26.php').read_bytes()).hexdigest(),'original_main':hashlib.sha256(original).hexdigest(),'original_resources':{name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in files.items()}}
php='''<?php
/** Plugin Name: Datatour — Restore original page implementation
 * Description: Activation restores the checksummed pre-update landing plugin (demo forms). Activate only for rollback. Does not delete articles or change page URL/theme.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }
function dtbf26restore_original() {
 if (!current_user_can('activate_plugins')) { throw new Exception('Administrator activation required.'); }
 $m=json_decode(file_get_contents(__DIR__.'/manifest.json'),true);
 $base=realpath(WP_PLUGIN_DIR);$root=realpath(WP_PLUGIN_DIR.'/datatour-bf26-compatible');
 if (!$root || strpos($root.'/', $base.'/')!==0) { throw new Exception('Invalid plugin root.'); }
 $main=$root.'/datatour-bf26.php';$sha=hash_file('sha256',$main);
 if ($sha===$m['original_main']) { return; }
 if ($sha!==$m['current_main']) { throw new Exception('Plugin changed since snapshot; restore cancelled.'); }
 foreach ($m['original_resources'] as $file=>$expected) {
  if (!is_file($root.'/'.$file) || hash_file('sha256',$root.'/'.$file)!==$expected) { throw new Exception('Original resource changed; restore cancelled: '.$file); }
 }
 $saved=file_get_contents(__DIR__.'/original-data.php');
 $old=base64_decode(substr($saved,strlen("<?php exit; ?>\\n")),true);
 if ($old===false || hash('sha256',$old)!==$m['original_main']) { throw new Exception('Backup checksum failed.'); }
 $tmp=$main.'.dtbf26-restore';
 if (file_put_contents($tmp,$old)!==strlen($old) || hash_file('sha256',$tmp)!==$m['original_main']) { @unlink($tmp);throw new Exception('Restore staging failed.'); }
 @chmod($tmp,0644);
 if (!rename($tmp,$main)) { @unlink($tmp);throw new Exception('Atomic restore failed.'); }
 if (function_exists('opcache_invalidate')) { @opcache_invalidate($main,true); }
 wp_clear_scheduled_hook('dtbf26_cleanup_requests');
 update_option('dtbf26_deployment',array('status'=>'restored_original','time'=>time()),false);
 if (function_exists('wp_clean_plugins_cache')) { wp_clean_plugins_cache(true); }
}
register_activation_hook(__FILE__,'dtbf26restore_original');
'''
out=ROOT/'downloads/datatour-bf26-2026-10-14'/('datatour-bf26-rollback-from-'+version+'.zip')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 z.writestr(name+'/restore-original.php',php)
 z.writestr(name+'/manifest.json',json.dumps(manifest,indent=2))
 z.writestr(name+'/original-data.php',b'<?php exit; ?>\n'+base64.b64encode(original))
with zipfile.ZipFile(out) as z:assert z.testzip() is None
print('Prepared rollback ZIP:',out.name,'bytes:',out.stat().st_size)

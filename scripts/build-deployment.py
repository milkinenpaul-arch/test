#!/usr/bin/env python3
"""Create a narrowly scoped WordPress updater with checksum-verified rollback."""
from pathlib import Path
import sys,json,hashlib,zipfile,time,shutil
ROOT=Path(__file__).resolve().parents[1]
backup=Path(sys.argv[1]) if len(sys.argv)>1 else Path(Path('/workspace/scratch/bf26-refresh/backup-path.txt').read_text().strip())
VERSION=json.loads((ROOT/'datatour-bf26-config.json').read_text())['version']
PLUGIN=ROOT/'wordpress'/'datatour-bf26-compatible'
stamp=time.strftime('%Y%m%d%H%M%S');name='datatour-bf26-deploy-'+stamp
out=Path('/workspace/scratch/bf26-refresh')/name;out.mkdir()
if (backup/'sha256-live.json').exists():
 expected=json.loads((backup/'sha256-live.json').read_text())
else:
 expected={'datatour-bf26.php':hashlib.sha256((backup/'datatour-bf26.php').read_bytes()).hexdigest(),'templates/landing.php':hashlib.sha256((backup/'templates/landing.php').read_bytes()).hexdigest()}
 for f in ['datatour-bf26.html','datatour-bf26.css','datatour-bf26.js','shell.css']:
  expected['assets/'+f]=hashlib.sha256((backup/f).read_bytes()).hexdigest()
targets={}
for p in (PLUGIN/'assets'/('v'+VERSION)).rglob('*'):
 if p.is_file():targets[str(p.relative_to(PLUGIN))]=p
for f in ['leads-v'+VERSION+'.php','datatour-bf26.php']:
 targets[f]=PLUGIN/f
payload=out/'payload'
for f,p in targets.items():
 destination=payload/f;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,destination)
manifest={'deployment_id':name,'expected':expected,'files':{f:hashlib.sha256(p.read_bytes()).hexdigest() for f,p in targets.items()}}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
php='''<?php
/** Plugin Name: Datatour scoped update DEPLOYMENTID
 * Description: One-time checksum-verified update of the existing Datatour plugin; no theme, permalink or page-content changes.
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }
function dtbf26deploy_manifest() { return json_decode(file_get_contents(__DIR__ . '/manifest.json'), true); }
function dtbf26deploy_root() {
 $plugins = realpath(WP_PLUGIN_DIR); $root = realpath(WP_PLUGIN_DIR . '/datatour-bf26-compatible');
 if (!$root || strpos($root . '/', $plugins . '/') !== 0) { throw new Exception('Target plugin root is missing or outside the plugin directory.'); }
 return $root;
}
function dtbf26deploy_write($path, $data) {
 if (!is_dir(dirname($path)) && !wp_mkdir_p(dirname($path))) { throw new Exception('Cannot create versioned asset directory.'); }
 $tmp = $path . '.dtbf26-tmp';
 if (file_put_contents($tmp, $data) !== strlen($data)) { @unlink($tmp); throw new Exception('Incomplete staged write.'); }
 @chmod($tmp, 0644);
 if (!rename($tmp, $path)) { @unlink($tmp); throw new Exception('Cannot atomically replace target file.'); }
 if (function_exists('opcache_invalidate') && substr($path, -4) === '.php') { @opcache_invalidate($path, true); }
}
function dtbf26deploy_apply() {
 if (!current_user_can('activate_plugins')) { throw new Exception('Administrator plugin activation is required.'); }
 $m = dtbf26deploy_manifest(); $root = dtbf26deploy_root();
 $state = get_option('dtbf26_deployment');
 // Re-activation for rollback is safe only while every installed payload file and this helper's backup match.
 $same = is_file(__DIR__ . '/rollback-data.php');
 foreach ($m['files'] as $file => $sha) { if (!is_file($root . '/' . $file) || hash_file('sha256', $root . '/' . $file) !== $sha) { $same = false; } }
 if ($same) {
  $saved = file_get_contents(__DIR__ . '/rollback-data.php');
  $old = base64_decode(substr($saved, strlen("<?php exit; ?>\n")), true);
  if ($old === false || hash('sha256', $old) !== $m['expected']['datatour-bf26.php']) { throw new Exception('Rollback backup integrity failed.'); }
  update_option('dtbf26_deployment', array('id' => $m['deployment_id'], 'status' => 'applied', 'version' => 'VERSIONVALUE', 'php_version' => PHP_VERSION, 'time' => time()), false);
  return;
 }
 foreach ($m['expected'] as $file => $sha) {
  if (!is_file($root . '/' . $file) || hash_file('sha256', $root . '/' . $file) !== $sha) { throw new Exception('Existing plugin changed since backup: ' . $file . '. Update cancelled.'); }
 }
 foreach ($m['files'] as $file => $sha) {
  if (strpos($file, '..') !== false || substr($file, 0, 1) === '/' || hash_file('sha256', __DIR__ . '/payload/' . $file) !== $sha) { throw new Exception('Payload integrity check failed.'); }
 }
 $old = file_get_contents($root . '/datatour-bf26.php');
 // This PHP file refuses direct HTTP execution. It contains only the previous plugin code, never credentials or leads.
 dtbf26deploy_write(__DIR__ . '/rollback-data.php', "<?php exit; ?>\n" . base64_encode($old));
 $done = array();
 try {
  foreach ($m['files'] as $file => $sha) {
   if ($file === 'datatour-bf26.php') { continue; }
   if (is_file($root . '/' . $file) && hash_file('sha256', $root . '/' . $file) !== $sha) { throw new Exception('Versioned target already exists with different contents.'); }
   dtbf26deploy_write($root . '/' . $file, file_get_contents(__DIR__ . '/payload/' . $file));
   if (hash_file('sha256', $root . '/' . $file) !== $sha) { throw new Exception('Target integrity check failed.'); }
   $done[] = $file;
  }
  // Switch only after all versioned resources and the handler are ready.
  dtbf26deploy_write($root . '/datatour-bf26.php', file_get_contents(__DIR__ . '/payload/datatour-bf26.php'));
  if (hash_file('sha256', $root . '/datatour-bf26.php') !== $m['files']['datatour-bf26.php']) { throw new Exception('Main plugin verification failed.'); }
 } catch (Exception $e) {
  dtbf26deploy_write($root . '/datatour-bf26.php', $old);
  throw $e;
 }
 if (function_exists('wp_clean_plugins_cache')) { wp_clean_plugins_cache(true); }
 update_option('dtbf26_deployment', array('id' => $m['deployment_id'], 'status' => 'applied', 'version' => 'VERSIONVALUE', 'php_version' => PHP_VERSION, 'time' => time()), false);
}
register_activation_hook(__FILE__, 'dtbf26deploy_apply');
function dtbf26deploy_rollback() {
 if (!current_user_can('manage_options')) { wp_die('Administrator access required.'); }
 check_admin_referer('dtbf26_deploy_rollback');
 $m = dtbf26deploy_manifest(); $root = dtbf26deploy_root();
 foreach ($m['files'] as $file => $sha) { if (!is_file($root . '/' . $file) || hash_file('sha256', $root . '/' . $file) !== $sha) { wp_die('Current plugin was changed after this deployment. Rollback cancelled.'); } }
 $saved = file_get_contents(__DIR__ . '/rollback-data.php');
 $old = base64_decode(substr($saved, strlen("<?php exit; ?>\n")), true);
 if (hash('sha256', $old) !== $m['expected']['datatour-bf26.php']) { wp_die('Rollback backup integrity failed.'); }
 dtbf26deploy_write($root . '/datatour-bf26.php', $old);
 wp_clear_scheduled_hook('dtbf26_cleanup_requests');
 if (function_exists('wp_clean_plugins_cache')) { wp_clean_plugins_cache(true); }
 update_option('dtbf26_deployment', array('id' => $m['deployment_id'], 'status' => 'rolled_back', 'time' => time()), false);
 wp_safe_redirect(admin_url('plugins.php')); exit;
}
add_action('admin_post_dtbf26_deploy_rollback', 'dtbf26deploy_rollback');
add_action('wp_ajax_dtbf26_deployment_status', function () {
 if (!current_user_can('manage_options')) { wp_send_json_error(array('code' => 'forbidden'), 403); }
 $request = isset($_GET['requestId']) && is_scalar($_GET['requestId']) ? sanitize_text_field(wp_unslash($_GET['requestId'])) : '';
 $record = $request ? get_option('dtbf26_req_' . hash('sha256', $request), false) : false;
 wp_send_json_success(array('deployment' => get_option('dtbf26_deployment'), 'transport' => get_option('dtbf26_mail_transport'), 'request' => $record, 'php_mail_available' => function_exists('mail')));
});
add_action('admin_notices', function () {
 if (!current_user_can('manage_options')) { return; }
 $state = get_option('dtbf26_deployment'); $m = dtbf26deploy_manifest();
 if (!is_array($state) || $state['id'] !== $m['deployment_id']) { return; }
 echo '<div class="notice notice-info"><p>Datatour: ' . esc_html($state['status']) . '. Versioned assets are retained for rollback.</p>';
 if ($state['status'] === 'applied') { echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="dtbf26_deploy_rollback">'; wp_nonce_field('dtbf26_deploy_rollback'); echo '<button class="button">Roll back this Datatour update</button></form>'; }
 echo '</div>';
});
'''.replace('DEPLOYMENTID',stamp).replace('VERSIONVALUE',VERSION)
(out/'datatour-update.php').write_text(php)
archive=out.with_suffix('.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in out.rglob('*'):
  if p.is_file():z.write(p,Path(name)/p.relative_to(out))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None and len(z.namelist())==len(set(z.namelist()))
Path('/workspace/scratch/bf26-refresh/deployment-path.txt').write_text(str(archive))
print('Scoped updater:',archive.name,'payload files:',len(targets),'existing files checked:',len(expected))

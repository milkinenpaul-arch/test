<?php
/* Telegram contracts use dummy credentials and HTTP doubles; no real messages are sent. */
require __DIR__ . '/forms.php';
$GLOBALS['telegram_calls'] = array(); $GLOBALS['telegram_mode'] = 'ok';
function wp_remote_post($url, $args) {
    $GLOBALS['telegram_calls'][] = array($url, $args);
    expect($args['sslverify'] === true && $args['redirection'] === 0 && $args['timeout'] === 8, 'Unsafe Telegram transport settings');
    if ($GLOBALS['telegram_mode'] === 'network') { return new WP_Error; }
    if ($GLOBALS['telegram_mode'] === 'invalid-json') { return array('code' => 200, 'body' => 'not JSON'); }
    if ($GLOBALS['telegram_mode'] !== 'ok') { return array('code' => (int) $GLOBALS['telegram_mode'], 'body' => json_encode(array('ok' => false))); }
    if (substr($url, -6) === '/getMe') { return array('code' => 200, 'body' => json_encode(array('ok' => true, 'result' => array('is_bot' => true, 'username' => 'unit_test_bot')))); }
    expect(dtbf26compat_find_lead($_POST['requestId']) > 0, 'Telegram called before a durable lead exists');
    return array('code' => 200, 'body' => json_encode(array('ok' => true, 'result' => array('message_id' => 42))));
}
function wp_remote_retrieve_response_code($response) { return $response['code']; }
function wp_remote_retrieve_body($response) { return $response['body']; }
function esc_attr($value) { return esc_html($value); }
function wp_nonce_field($action) { echo '<input type="hidden" name="_wpnonce" value="valid-nonce">'; }
class TelegramRedirect extends Exception {}
function wp_safe_redirect($url) { throw new TelegramRedirect($url); }
function check_admin_referer($action) { if (empty($_POST['_wpnonce']) || $_POST['_wpnonce'] !== 'valid-nonce') { wp_die('CSRF', '', array('response' => 403)); } }
function tg_submit($suffix) {
    $GLOBALS['rates'] = array();
    return call_submit(payload(array('requestId' => 'telegram-unit-request-' . $suffix, 'name' => 'ТЕСТ', 'wishes' => 'Море & отдых')));
}
$tg_cases = 0;
$r = tg_submit('disabled'); $id = dtbf26compat_find_lead('telegram-unit-request-disabled');
expect($r->success && get_post_meta($id, '_dtbf26_telegram_state', true) === 'not_configured' && !$GLOBALS['telegram_calls'], 'Disabled Telegram affected lead acceptance'); $tg_cases++;
$dummy = '12345:unit-test-only-token';
update_option('dtbf26_telegram_credentials', array('token' => $dummy));
update_option('dtbf26_telegram_settings', array('enabled' => true, 'chat_id' => '123456789', 'username' => 'unit_test_bot'));
$r = tg_submit('success'); $id = dtbf26compat_find_lead('telegram-unit-request-success');
expect($r->success && get_post_meta($id, '_dtbf26_telegram_state', true) === 'sent' && get_post_meta($id, '_dtbf26_telegram_message_id', true) === 42, 'Successful Telegram send not recorded');
$request = $GLOBALS['telegram_calls'][0][1]['body'];
expect($request['chat_id'] === '123456789' && strpos($request['text'], 'Море & отдых') !== false && strpos($request['text'], 'admin.php?page=dtbf26-leads&lead=' . $id) !== false && !isset($request['parse_mode']), 'Incorrect recipient, fields, link or markup interpretation'); $tg_cases++;
$before = count($GLOBALS['telegram_calls']); dtbf26compat_notify_telegram($id); $r = tg_submit('success');
expect($r->success && !empty($r->data['duplicate']) && count($GLOBALS['telegram_calls']) === $before, 'Duplicate submission resent Telegram'); $tg_cases++;
foreach (array('403', '429', '500', 'network', 'invalid-json') as $mode) {
    $GLOBALS['telegram_mode'] = $mode; $GLOBALS['mail_ok'] = false;
    $r = tg_submit('failure-' . $mode); $id = dtbf26compat_find_lead('telegram-unit-request-failure-' . $mode);
    expect($r->success && $r->data['storageStatus'] === 'saved' && $r->data['emailStatus'] === 'failed' && get_post_meta($id, '_dtbf26_telegram_state', true) === 'failed', 'Telegram/email outage lost a lead: ' . $mode);
    expect(strpos(wp_json_encode($GLOBALS['meta'][$id]), $dummy) === false && strpos(wp_json_encode($r->data), $dummy) === false, 'Credentials leaked into metadata or response'); $tg_cases++;
}
$long = dtbf26compat_telegram_message(1, array('test' => true, 'fields' => array('Пожелания' => str_repeat('🌴', 6000))));
expect(strlen(iconv('UTF-8', 'UTF-16LE', $long)) / 2 <= 4096 && preg_match('//u', $long) && strpos($long, 'Полный текст') !== false && strpos($long, 'Открыть заявку') !== false, 'Long Unicode notification exceeds the Telegram limit or loses its link'); $tg_cases++;
$GLOBALS['telegram_mode'] = 'ok'; $GLOBALS['mail_ok'] = true; $GLOBALS['is_admin'] = true;
$_GET = array(); ob_start(); dtbf26compat_telegram_admin(); $html = ob_get_clean();
expect(strpos($html, $dummy) === false && strpos($html, 'name="bot_token" type="password" value=""') !== false && strpos($html, '123456789') !== false, 'Settings page exposes token or loses configured chat'); $tg_cases++;
$GLOBALS['is_admin'] = false;
foreach (array('dtbf26compat_telegram_admin', 'dtbf26compat_telegram_save') as $callback) {
    try { $callback(); throw new Exception('Unauthorized Telegram settings access'); } catch (AdminDenied $e) { expect($e->getCode() === 403, 'Wrong settings denial'); } $tg_cases++;
}
$GLOBALS['is_admin'] = true; $_POST = array('bot_token' => $dummy, 'chat_id' => '123456789', 'enabled' => '1');
try { dtbf26compat_telegram_save(); throw new Exception('Settings saved without CSRF nonce'); } catch (AdminDenied $e) { expect($e->getCode() === 403, 'Wrong CSRF denial'); } $tg_cases++;
foreach (array(array('token' => 'opaque-secret-binding', 'chat' => '123456789', 'notice' => 'invalid_token'), array('token' => $dummy, 'chat' => 'not-a-chat', 'notice' => 'invalid_chat'), array('token' => $dummy, 'chat' => '-100123456789', 'notice' => 'saved')) as $case) {
    $_POST = array('_wpnonce' => 'valid-nonce', 'bot_token' => $case['token'], 'chat_id' => $case['chat'], 'enabled' => '1');
    try { dtbf26compat_telegram_save(); throw new Exception('Settings handler returned'); } catch (TelegramRedirect $e) { expect(strpos($e->getMessage(), 'notice=' . $case['notice']) !== false, 'Wrong settings result'); } $tg_cases++;
}
expect(get_option('dtbf26_telegram_credentials') === array('token' => $dummy) && get_option('dtbf26_telegram_settings')['chat_id'] === '-100123456789', 'Valid settings were not persisted');
echo 'PASS: ' . $tg_cases . ' Telegram contracts; durable-first delivery, failures, duplicate protection, recipient, Unicode limit, no token disclosure, admin capability and CSRF. No real network or messages.' . PHP_EOL;

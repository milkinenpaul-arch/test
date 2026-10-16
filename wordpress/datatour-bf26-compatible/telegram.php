<?php
if (!defined('ABSPATH')) { exit; }
function dtbf26compat_telegram_token() {
    $token = defined('DTBF26_TELEGRAM_BOT_TOKEN') ? DTBF26_TELEGRAM_BOT_TOKEN : getenv('DATATOUR_TELEGRAM_BOT_TOKEN');
    if (!is_string($token) || !preg_match('/^\d+:[A-Za-z0-9_-]+$/D', $token)) { $stored = get_option('dtbf26_telegram_credentials', array()); $token = is_array($stored) && isset($stored['token']) ? $stored['token'] : ''; }
    return is_string($token) ? $token : '';
}
function dtbf26compat_telegram_request($token, $method, $body) {
    if (!preg_match('/^\d+:[A-Za-z0-9_-]+$/D', $token) || !in_array($method, array('getMe', 'sendMessage'), true)) { return array('ok' => false, 'code' => 'configuration'); }
    $response = wp_remote_post('https://api.telegram.org/bot' . $token . '/' . $method, array('timeout' => 8, 'redirection' => 0, 'sslverify' => true, 'body' => $body));
    // Never store WP_Error text, the response body or request URL: they can contain a bot token.
    if (is_wp_error($response)) { return array('ok' => false, 'code' => 'network'); }
    $http = (int) wp_remote_retrieve_response_code($response);
    $json = json_decode(wp_remote_retrieve_body($response), true);
    if ($http !== 200 || !is_array($json) || empty($json['ok'])) { return array('ok' => false, 'code' => 'http_' . $http); }
    if ($method === 'getMe') { return array('ok' => !empty($json['result']['is_bot']), 'username' => isset($json['result']['username']) ? sanitize_text_field($json['result']['username']) : ''); }
    if (empty($json['result']['message_id'])) { return array('ok' => false, 'code' => 'invalid_response'); }
    return array('ok' => true, 'message_id' => (int) $json['result']['message_id']);
}
function dtbf26compat_telegram_message($id, $data) {
    $text = (!empty($data['test']) ? "ТЕСТ — не заявка клиента\n" : '') . 'ДАТА ТУР · Заявка №' . (int) $id . "\n";
    foreach (array('Дата (Europe/Minsk)', 'Цель', 'Имя', 'Контакт', 'Email', 'Сезон', 'Направление', 'Период', 'Продолжительность', 'Взрослые', 'Дети', 'Возраст детей', 'Бюджет', 'Отель или сеть', 'Пожелания') as $key) {
        if (isset($data['fields'][$key]) && $data['fields'][$key] !== '') { $text .= $key . ': ' . $data['fields'][$key] . "\n"; }
    }
    // 1,700 Unicode characters fit Telegram's 4,096 UTF-16-unit limit even with emoji.
    preg_match('/^.{0,1700}/us', $text, $matches);
    $short = isset($matches[0]) ? $matches[0] : '';
    return $short . ($short !== $text ? "\n… Полный текст — в заявке.\n" : "\n") . 'Открыть заявку: ' . admin_url('admin.php?page=dtbf26-leads&lead=' . (int) $id);
}
function dtbf26compat_notify_telegram($id) {
    $lead = get_post($id);
    if (!$lead || $lead->post_type !== 'dtbf26_lead' || $lead->post_status !== 'private') { return; }
    $state = get_post_meta($id, '_dtbf26_telegram_state', true);
    if (in_array($state, array('sent', 'pending'), true)) { return; }
    $settings = get_option('dtbf26_telegram_settings', array());
    $token = dtbf26compat_telegram_token();
    if (empty($settings['enabled']) || empty($settings['chat_id']) || !preg_match('/^-?\d+$/D', (string) $settings['chat_id']) || !$token) { update_post_meta($id, '_dtbf26_telegram_state', 'not_configured'); return; }
    $data = json_decode($lead->post_content, true);
    if (!is_array($data) || empty($data['fields'])) { return; }
    update_post_meta($id, '_dtbf26_telegram_state', 'pending');
    $result = dtbf26compat_telegram_request($token, 'sendMessage', array('chat_id' => (string) $settings['chat_id'], 'text' => dtbf26compat_telegram_message($id, $data), 'disable_web_page_preview' => 'true'));
    update_post_meta($id, '_dtbf26_telegram_state', !empty($result['ok']) ? 'sent' : 'failed');
    update_post_meta($id, '_dtbf26_telegram_time', time());
    if (!empty($result['ok'])) { update_post_meta($id, '_dtbf26_telegram_message_id', $result['message_id']); }
    else { update_post_meta($id, '_dtbf26_telegram_error', $result['code']); }
}
function dtbf26compat_telegram_label($id) {
    $state = get_post_meta($id, '_dtbf26_telegram_state', true);
    $labels = array('sent' => 'Отправлено в Telegram', 'failed' => 'Отправка не подтверждена — заявка сохранена', 'pending' => 'Отправка начата; результат неизвестен', 'not_configured' => 'Уведомления не подключены');
    return isset($labels[$state]) ? $labels[$state] : 'Нет данных об отправке';
}
add_action('admin_menu', function () {
    add_submenu_page('dtbf26-leads', 'Telegram — Datatour', 'Telegram', 'manage_options', 'dtbf26-telegram', 'dtbf26compat_telegram_admin');
}, 20);
function dtbf26compat_telegram_admin() {
    if (!current_user_can('manage_options')) { wp_die('Доступ только для администратора.', '', array('response' => 403)); }
    nocache_headers();
    $settings = get_option('dtbf26_telegram_settings', array());
    $notices = array('saved' => 'Настройки сохранены.', 'invalid_token' => 'Введите токен бота из BotFather.', 'invalid_chat' => 'Укажите числовой ID чата.', 'api_failed' => 'Сайт не смог проверить токен через Telegram. Настройки не изменены.', 'storage_failed' => 'Не удалось сохранить настройки.', 'test_sent' => 'Telegram принял тестовое сообщение.', 'test_failed' => 'Telegram не принял тестовое сообщение. Проверьте токен, чат и доступ сайта к Telegram.');
    $notice = isset($_GET['notice']) && is_scalar($_GET['notice']) ? sanitize_text_field(wp_unslash($_GET['notice'])) : '';
    echo '<div class="wrap"><h1>Уведомления Telegram — Datatour</h1>';
    if (isset($notices[$notice])) { echo '<div class="notice notice-info"><p>' . esc_html($notices[$notice]) . '</p></div>'; }
    echo '<p>Сначала заявка сохраняется в WordPress, затем отправляется уведомление. Ошибка Telegram не отменяет сохранение.</p>';
    if (!empty($settings['username'])) { echo '<p>Бот: <strong>@' . esc_html($settings['username']) . '</strong></p>'; }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="dtbf26_telegram_save">';
    wp_nonce_field('dtbf26_telegram_save');
    echo '<table class="form-table"><tr><th scope="row"><label for="dtbf26-tg-enabled">Уведомления</label></th><td><label><input id="dtbf26-tg-enabled" name="enabled" type="checkbox" value="1"' . (!empty($settings['enabled']) ? ' checked' : '') . '> Отправлять новые заявки в Telegram</label></td></tr>';
    echo '<tr><th scope="row"><label for="dtbf26-tg-token">Токен бота</label></th><td><input id="dtbf26-tg-token" class="regular-text" name="bot_token" type="password" value="" autocomplete="new-password"><p class="description">' . (dtbf26compat_telegram_token() ? 'Токен сохранён. Оставьте поле пустым, чтобы сохранить текущий.' : 'Скопируйте токен из @BotFather.') . ' Значение не отображается в админке и не передаётся на публичную страницу.</p></td></tr>';
    echo '<tr><th scope="row"><label for="dtbf26-tg-chat">ID чата</label></th><td><input id="dtbf26-tg-chat" class="regular-text" name="chat_id" type="text" value="' . esc_attr(isset($settings['chat_id']) ? $settings['chat_id'] : '') . '"><p class="description">Для личного чата нажмите «Запустить» у бота; для группы добавьте бота и отправьте /start@имя_бота.</p></td></tr></table><p><button class="button button-primary" type="submit">Сохранить настройки</button></p></form>';
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '"><input type="hidden" name="action" value="dtbf26_telegram_test">';
    wp_nonce_field('dtbf26_telegram_test');
    echo '<p><button class="button" type="submit">Отправить тест в Telegram</button></p></form></div>';
}
function dtbf26compat_telegram_redirect($notice) {
    wp_safe_redirect(admin_url('admin.php?page=dtbf26-telegram&notice=' . rawurlencode($notice))); exit;
}
function dtbf26compat_telegram_save() {
    if (!current_user_can('manage_options')) { wp_die('Доступ только для администратора.', '', array('response' => 403)); }
    check_admin_referer('dtbf26_telegram_save');
    if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { wp_die('Используйте форму настроек.', '', array('response' => 405)); }
    $token = isset($_POST['bot_token']) && is_scalar($_POST['bot_token']) ? trim(wp_unslash((string) $_POST['bot_token'])) : '';
    if ($token === '') { $token = dtbf26compat_telegram_token(); }
    if (!preg_match('/^\d+:[A-Za-z0-9_-]+$/D', $token)) { dtbf26compat_telegram_redirect('invalid_token'); }
    $chat = isset($_POST['chat_id']) && is_scalar($_POST['chat_id']) ? trim(wp_unslash((string) $_POST['chat_id'])) : '';
    $enabled = isset($_POST['enabled']) && $_POST['enabled'] === '1';
    if (($enabled || $chat !== '') && !preg_match('/^-?\d+$/D', $chat)) { dtbf26compat_telegram_redirect('invalid_chat'); }
    $check = dtbf26compat_telegram_request($token, 'getMe', array());
    if (empty($check['ok'])) { dtbf26compat_telegram_redirect('api_failed'); }
    if (get_option('dtbf26_telegram_credentials', false) === false) { add_option('dtbf26_telegram_credentials', array('token' => $token), '', 'no'); }
    else { update_option('dtbf26_telegram_credentials', array('token' => $token), false); }
    if (get_option('dtbf26_telegram_credentials') !== array('token' => $token)) { dtbf26compat_telegram_redirect('storage_failed'); }
    $settings = array('enabled' => $enabled, 'chat_id' => $chat, 'username' => $check['username']);
    if (get_option('dtbf26_telegram_settings', false) === false) { add_option('dtbf26_telegram_settings', $settings, '', 'no'); }
    else { update_option('dtbf26_telegram_settings', $settings, false); }
    if (get_option('dtbf26_telegram_settings') !== $settings) { dtbf26compat_telegram_redirect('storage_failed'); }
    dtbf26compat_telegram_redirect('saved');
}
add_action('admin_post_dtbf26_telegram_save', 'dtbf26compat_telegram_save');
add_action('admin_post_dtbf26_telegram_test', function () {
    if (!current_user_can('manage_options')) { wp_die('Доступ только для администратора.', '', array('response' => 403)); }
    check_admin_referer('dtbf26_telegram_test');
    if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') { wp_die('Используйте форму настроек.', '', array('response' => 405)); }
    $settings = get_option('dtbf26_telegram_settings', array());
    if (empty($settings['enabled']) || empty($settings['chat_id'])) { dtbf26compat_telegram_redirect('test_failed'); }
    $result = dtbf26compat_telegram_request(dtbf26compat_telegram_token(), 'sendMessage', array('chat_id' => $settings['chat_id'], 'text' => 'ТЕСТ — проверка уведомлений ДАТА ТУР. Новые заявки сохраняются в WordPress: ' . admin_url('admin.php?page=dtbf26-leads'), 'disable_web_page_preview' => 'true'));
    dtbf26compat_telegram_redirect(!empty($result['ok']) ? 'test_sent' : 'test_failed');
});

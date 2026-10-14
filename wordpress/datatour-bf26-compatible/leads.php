<?php
if (!defined('ABSPATH')) { exit; }
function dtbf26compat_error($code, $message, $status) {
    wp_send_json_error(array('code' => $code, 'message' => $message), $status);
}
function dtbf26compat_context() {
    nocache_headers();
    $issued = time();
    $nonce = wp_create_nonce('dtbf26_submit');
    wp_send_json_success(array('nonce' => $nonce, 'issued' => $issued, 'token' => hash_hmac('sha256', $issued . '|' . $nonce, wp_salt('auth'))));
}
add_action('wp_ajax_dtbf26_form_context', 'dtbf26compat_context');
add_action('wp_ajax_nopriv_dtbf26_form_context', 'dtbf26compat_context');
function dtbf26compat_field($key, $length) {
    if (!isset($_POST[$key])) { return ''; }
    if (!is_scalar($_POST[$key])) { dtbf26compat_error('invalid_field', 'Проверьте поля формы.', 400); }
    $value = trim(wp_unslash((string) $_POST[$key]));
    if (strlen($value) > $length * 4) { dtbf26compat_error('field_too_long', 'Сократите слишком длинное поле.', 400); }
    $length_actual = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : preg_match_all('/./us', $value, $unused);
    if ($length_actual === false || $length_actual > $length) { dtbf26compat_error('field_too_long', 'Сократите слишком длинное поле.', 400); }
    return sanitize_text_field($value);
}
function dtbf26compat_valid_contact($value) {
    if (is_email($value)) { return true; }
    $digits = preg_replace('/\D/', '', $value);
    if (preg_match('/^\+?[\d\s()\-]{7,25}$/D', $value) && strlen($digits) >= 7 && strlen($digits) <= 15) { return true; }
    return (bool) preg_match('~^(?:@[A-Za-z0-9_]{3,32}|(?:https?://)?t\.me/[A-Za-z0-9_]{3,32})$~D', $value);
}
function dtbf26compat_submit() {
    nocache_headers();
    if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
        dtbf26compat_error('method_not_allowed', 'Используйте форму на странице.', 405);
    }
    if (!empty($_SERVER['HTTP_ORIGIN']) && parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST) !== parse_url(home_url(), PHP_URL_HOST)) {
        dtbf26compat_error('invalid_origin', 'Отправьте заявку с нашей страницы.', 403);
    }
    $nonce = dtbf26compat_field('nonce', 100);
    $issued_text = dtbf26compat_field('issued', 20);
    $token = dtbf26compat_field('token', 100);
    if (!ctype_digit($issued_text) || !wp_verify_nonce($nonce, 'dtbf26_submit')) {
        dtbf26compat_error('expired_context', 'Обновите страницу и повторите отправку.', 403);
    }
    $issued = (int) $issued_text;
    $expected = hash_hmac('sha256', $issued . '|' . $nonce, wp_salt('auth'));
    if (!hash_equals($expected, $token) || time() - $issued > 3600 || $issued > time() + 5) {
        dtbf26compat_error('expired_context', 'Обновите страницу и повторите отправку.', 403);
    }
    if (time() - $issued < 2 || dtbf26compat_field('website', 200) !== '') {
        dtbf26compat_error('spam_check', 'Проверьте данные и попробуйте ещё раз.', 400);
    }
    $contact = dtbf26compat_field('contact', 200);
    if (!dtbf26compat_valid_contact($contact)) {
        dtbf26compat_error('invalid_contact', 'Введите телефон с кодом страны, email или Telegram @username.', 400);
    }
    if (dtbf26compat_field('consent', 10) !== '1') {
        dtbf26compat_error('consent_required', 'Нужно согласие на обработку персональных данных.', 400);
    }
    $purpose = dtbf26compat_field('purpose', 30);
    $purposes = array('selection' => 'Подбор тура', 'hotel' => 'Расчёт отеля или сети', 'booking' => 'Запись на бронирование в дни акции');
    if (!isset($purposes[$purpose])) { dtbf26compat_error('invalid_purpose', 'Выберите цель обращения.', 400); }
    $season = dtbf26compat_field('season', 20);
    if (!in_array($season, array('summer', 'winter'), true)) { dtbf26compat_error('invalid_season', 'Выберите сезон отдыха.', 400); }
    $adults_text = dtbf26compat_field('adults', 3);
    $children_text = dtbf26compat_field('children', 3);
    if (!ctype_digit($adults_text) || !ctype_digit($children_text) || (int) $adults_text < 1 || (int) $adults_text > 10 || (int) $children_text > 6) {
        dtbf26compat_error('invalid_travelers', 'Проверьте состав туристов.', 400);
    }
    $children = (int) $children_text;
    $ages = dtbf26compat_field('ages', 200);
    if ($children > 0) {
        preg_match_all('/\d+/', $ages, $matches);
        $valid = (bool) preg_match('/^[0-9\s,;]+$/D', $ages) && count($matches[0]) === $children;
        foreach ($matches[0] as $age) { if ((int) $age > 17) { $valid = false; } }
        if (!$valid) { dtbf26compat_error('invalid_ages', 'Укажите возраст каждого ребёнка от 0 до 17 лет.', 400); }
    }
    $request_id = dtbf26compat_field('requestId', 64);
    if (!preg_match('/^[A-Za-z0-9\-]{20,64}$/D', $request_id)) { dtbf26compat_error('invalid_request', 'Обновите страницу и повторите отправку.', 400); }
    $config = dtbf26compat_config();
    if ($purpose === 'booking' && !empty($config['campaign']['end']) && time() >= strtotime($config['campaign']['end'])) {
        $purposes['booking'] = 'Подбор после завершения акции';
    }
    $scenario = dtbf26compat_field('scenario', 30);
    $budget_level = dtbf26compat_field('budgetLevel', 30);
    if (!in_array($scenario, array('all', 'family', 'couple', 'friends', 'discover', 'service'), true) || !in_array($budget_level, array('all', 'rational', 'comfort', 'premium'), true)) {
        dtbf26compat_error('invalid_selection', 'Проверьте выбранные ориентиры.', 400);
    }
    $hotel_id = dtbf26compat_field('hotelId', 60);
    $hotel_label = '';
    if ($hotel_id !== '') {
        foreach (isset($config['priority_hotels']) ? $config['priority_hotels'] : array() as $hotel) {
            if ($hotel['id'] === $hotel_id) { $hotel_label = $hotel['name']; break; }
        }
        if ($hotel_label === '') { dtbf26compat_error('invalid_hotel', 'Выберите отель из списка или укажите пожелания.', 400); }
    }
    $source = dtbf26compat_field('source', 60);
    $date = new DateTime('now', new DateTimeZone('Europe/Minsk'));
    $fields = array(
        'Цель' => $purposes[$purpose], 'Контакт' => $contact,
        'Сезон' => $season === 'summer' ? 'Турция, лето 2027' : 'Зимние направления',
        'Направление' => dtbf26compat_field('direction', 200),
        'Период' => dtbf26compat_field('period', 200),
        'Продолжительность' => dtbf26compat_field('duration', 200),
        'Взрослые' => $adults_text, 'Дети' => $children_text,
        'Возраст детей' => $children > 0 ? $ages : '',
        'Бюджет' => dtbf26compat_field('budgetAmount', 200),
        'Сценарий' => $scenario,
        'Уровень бюджета' => $budget_level,
        'Отель или сеть' => $hotel_label,
        'ID выбора' => $hotel_id,
        'Источник обращения' => $source,
        'Дата (Europe/Minsk)' => $date->format('Y-m-d H:i:s P'),
        'Согласие' => 'Да; политика https://datatour.by/politika-konfidencialnosti/',
        'ID заявки' => $request_id
    );
    $wishes = isset($_POST['wishes']) && is_scalar($_POST['wishes']) ? sanitize_textarea_field(wp_unslash((string) $_POST['wishes'])) : '';
    if (strlen($wishes) > 12000) { dtbf26compat_error('field_too_long', 'Сократите пожелания до 3 000 символов.', 400); }
    $fields['Пожелания'] = $wishes;
    foreach (array('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content') as $utm) {
        $value = dtbf26compat_field($utm, 200);
        if ($value !== '') { $fields[$utm] = $value; }
    }
    $key = 'dtbf26_req_' . hash('sha256', $request_id);
    $existing = get_option($key, false);
    if (is_array($existing)) {
        if ($existing['state'] === 'accepted') {
            wp_send_json_success(array('message' => 'Заявка уже принята. Менеджер свяжется с вами.', 'duplicate' => true, 'requestId' => $request_id));
        }
        if ($existing['state'] === 'pending') { dtbf26compat_error('in_progress', 'Заявка ещё обрабатывается. Проверьте статус немного позже.', 409); }
        dtbf26compat_error('mail_failed', 'Не удалось передать заявку. Попробуйте ещё раз или позвоните менеджеру.', 503);
    }
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $rate_key = 'dtbf26_rate_' . hash_hmac('sha256', $ip, wp_salt('auth'));
    $rate = (int) get_transient($rate_key);
    if ($rate >= 6) { dtbf26compat_error('rate_limit', 'Слишком много отправок. Попробуйте позже или позвоните менеджеру.', 429); }
    $record = array('state' => 'pending', 'created' => time(), 'expires' => time() + DAY_IN_SECONDS);
    if (!add_option($key, $record, '', 'no')) { dtbf26compat_error('in_progress', 'Заявка уже обрабатывается. Повторите проверку статуса позже.', 409); }
    set_transient($rate_key, $rate + 1, 15 * MINUTE_IN_SECONDS);
    $is_test = dtbf26compat_field('test', 10) === '1' && current_user_can('manage_options');
    $subject = ($is_test ? '[ТЕСТ — проверка формы, не заявка клиента] ' : '') . 'Datatour: ' . $purposes[$purpose];
    $body = ($is_test ? "ТЕСТОВАЯ ПРОВЕРКА. Не обрабатывать как заявку клиента.\n\n" : '');
    foreach ($fields as $label => $value) { if ($value !== '') { $body .= $label . ': ' . $value . "\n"; } }
    $headers = array('Content-Type: text/plain; charset=UTF-8');
    if (is_email($contact)) { $headers[] = 'Reply-To: ' . $contact; }
    $recipient = !empty($config['recipient']) && is_email($config['recipient']) ? $config['recipient'] : 'datatour78@mail.ru';
    $GLOBALS['dtbf26_mail_active'] = true;
    $accepted = wp_mail($recipient, $subject, $body, $headers);
    $GLOBALS['dtbf26_mail_active'] = false;
    $record['state'] = $accepted ? 'accepted' : 'failed';
    $record['test'] = $is_test;
    update_option($key, $record, false);
    if (!$accepted) { dtbf26compat_error('mail_failed', 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните менеджеру.', 503); }
    wp_send_json_success(array('message' => 'Спасибо! Заявка принята. Менеджер свяжется с вами.', 'requestId' => $request_id, 'deliveryStatus' => 'accepted_by_wp_mail'));
}
add_action('wp_ajax_dtbf26_submit', 'dtbf26compat_submit');
add_action('wp_ajax_nopriv_dtbf26_submit', 'dtbf26compat_submit');
add_action('phpmailer_init', function ($mailer) { if (empty($GLOBALS['dtbf26_mail_active'])) { return; } update_option('dtbf26_mail_transport', array('mailer' => $mailer->Mailer, 'smtp_auth' => (bool) $mailer->SMTPAuth), false); });
function dtbf26compat_cleanup() {
    global $wpdb;
    $prefix = $wpdb->esc_like('dtbf26_req_') . '%';
    $names = $wpdb->get_col($wpdb->prepare("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s LIMIT 1000", $prefix));
    foreach ($names as $name) { $record = get_option($name); if (is_array($record) && !empty($record['expires']) && $record['expires'] < time()) { delete_option($name); } }
}
add_action('dtbf26_cleanup_requests', 'dtbf26compat_cleanup');
add_action('init', function () { if (!wp_next_scheduled('dtbf26_cleanup_requests')) { wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', 'dtbf26_cleanup_requests'); } });

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
    $variant = dtbf26compat_field('formVariant', 20);
    $name = dtbf26compat_field('name', 100);
    $email = dtbf26compat_field('email', 200);
    if ($variant === 'quick') {
        $digits = preg_replace('/\D/', '', $contact);
        if (!preg_match('/^\+?[\d\s()\-]{7,25}$/D', $contact) || strlen($digits) < 7 || strlen($digits) > 15) {
            dtbf26compat_error('invalid_contact', 'Введите телефон с кодом страны.', 400);
        }
    }
    if ($email !== '' && !is_email($email)) { dtbf26compat_error('invalid_email', 'Проверьте адрес email.', 400); }
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
        $hotels = array_merge(isset($config['priority_hotels']) ? $config['priority_hotels'] : array(), isset($config['datatour_choice_hotels']) ? $config['datatour_choice_hotels'] : array());
        foreach ($hotels as $hotel) {
            if ($hotel['id'] === $hotel_id) { $hotel_label = $hotel['name']; break; }
        }
        if ($hotel_label === '') { dtbf26compat_error('invalid_hotel', 'Выберите отель из списка или укажите пожелания.', 400); }
    }
    $source = dtbf26compat_field('source', 60);
    $date = new DateTime('now', new DateTimeZone('Europe/Minsk'));
    $fields = array(
        'Цель' => $purposes[$purpose], 'Контакт' => $contact,
        'Имя' => $name, 'Email' => $email,
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
    $saved_id = dtbf26compat_find_lead($request_id);
    if ($saved_id) { dtbf26compat_lead_success($request_id, get_post_meta($saved_id, '_dtbf26_email_state', true), true); }
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
    $lead_id = dtbf26compat_save_lead($request_id, $fields, $is_test);
    if (!$lead_id) {
        delete_option($key);
        dtbf26compat_error('storage_failed', 'Не удалось сохранить заявку. Попробуйте ещё раз или позвоните менеджеру.', 503);
    }
    $record['state'] = 'accepted';
    $record['lead_id'] = $lead_id;
    $record['test'] = $is_test;
    update_option($key, $record, false);
    dtbf26compat_notify_telegram($lead_id);
    $subject = ($is_test ? '[ТЕСТ — проверка формы, не заявка клиента] ' : '') . 'Datatour: ' . $purposes[$purpose];
    $body = ($is_test ? "ТЕСТОВАЯ ПРОВЕРКА. Не обрабатывать как заявку клиента.\n\n" : '');
    foreach ($fields as $label => $value) { if ($value !== '') { $body .= $label . ': ' . $value . "\n"; } }
    $headers = array('Content-Type: text/plain; charset=UTF-8');
    if ($email !== '') { $headers[] = 'Reply-To: ' . $email; }
    elseif (is_email($contact)) { $headers[] = 'Reply-To: ' . $contact; }
    $recipient = !empty($config['recipient']) && is_email($config['recipient']) ? $config['recipient'] : 'datatour78@mail.ru';
    $GLOBALS['dtbf26_mail_active'] = true;
    $accepted = wp_mail($recipient, $subject, $body, $headers);
    $GLOBALS['dtbf26_mail_active'] = false;
    $email_status = $accepted ? 'accepted_by_wp_mail' : 'failed';
    update_post_meta($lead_id, '_dtbf26_email_state', $email_status);
    $record['email_status'] = $email_status;
    update_option($key, $record, false);
    dtbf26compat_lead_success($request_id, $email_status, false);
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

// Leads are private WordPress records; they are never exposed in the REST API or search.
add_action('init', function () {
    $caps = array();
    foreach (array('edit_post', 'read_post', 'delete_post', 'edit_posts', 'edit_others_posts', 'publish_posts', 'read_private_posts', 'delete_posts', 'delete_private_posts', 'delete_published_posts', 'delete_others_posts', 'edit_private_posts', 'edit_published_posts', 'create_posts', 'read') as $cap) { $caps[$cap] = 'manage_options'; }
    register_post_type('dtbf26_lead', array('label' => 'Заявки Datatour', 'public' => false, 'publicly_queryable' => false, 'exclude_from_search' => true, 'show_ui' => false, 'show_in_menu' => false, 'show_in_rest' => false, 'query_var' => false, 'rewrite' => false, 'can_export' => false, 'supports' => false, 'capabilities' => $caps, 'map_meta_cap' => false));
});
function dtbf26compat_find_lead($request_id) {
    $ids = get_posts(array('post_type' => 'dtbf26_lead', 'post_status' => 'private', 'name' => 'dtbf26-' . hash('sha256', $request_id), 'posts_per_page' => 1, 'fields' => 'ids'));
    return $ids ? (int) $ids[0] : 0;
}
function dtbf26compat_save_lead($request_id, $fields, $is_test) {
    $data = array('request_id' => $request_id, 'fields' => $fields, 'test' => $is_test);
    // Hex escaping also preserves ampersands through WordPress content filters for anonymous visitors.
    $json = wp_json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    if ($json === false) { return 0; }
    // Keep all submitted fields in one database row, rather than a sequence of meta writes.
    $id = wp_insert_post(array('post_type' => 'dtbf26_lead', 'post_status' => 'private', 'post_title' => ($is_test ? 'ТЕСТ — ' : '') . 'Заявка Datatour', 'post_name' => 'dtbf26-' . hash('sha256', $request_id), 'post_content' => wp_slash($json), 'comment_status' => 'closed', 'ping_status' => 'closed'), true);
    if (is_wp_error($id) || !$id) { return 0; }
    $stored = get_post($id);
    if (!$stored || json_decode($stored->post_content, true) !== $data) {
        wp_delete_post($id, true); // Remove only this incomplete insert, never an existing lead.
        return 0;
    }
    update_post_meta($id, '_dtbf26_email_state', 'pending');
    return (int) $id;
}
function dtbf26compat_lead_success($request_id, $email_status, $duplicate) {
    wp_send_json_success(array('message' => $duplicate ? 'Заявка уже принята. Менеджер свяжется с вами.' : 'Спасибо! Заявка принята. Менеджер свяжется с вами.', 'requestId' => $request_id, 'duplicate' => (bool) $duplicate, 'storageStatus' => 'saved', 'deliveryStatus' => 'saved_in_wordpress', 'emailStatus' => $email_status));
}
function dtbf26compat_mail_label($state) {
    $labels = array('accepted_by_wp_mail' => 'Передано серверу; доставка не подтверждена', 'failed' => 'Не отправлено', 'pending' => 'Отправка начата; результат неизвестен');
    return isset($labels[$state]) ? $labels[$state] : 'Нет данных об отправке';
}
add_action('admin_menu', function () {
    add_menu_page('Заявки Datatour', 'Заявки Datatour', 'manage_options', 'dtbf26-leads', 'dtbf26compat_leads_admin', 'dashicons-email-alt', 26);
});
function dtbf26compat_leads_admin() {
    if (!current_user_can('manage_options')) { wp_die('Доступ только для администратора.', '', array('response' => 403)); }
    nocache_headers();
    $base = admin_url('admin.php?page=dtbf26-leads');
    $id = isset($_GET['lead']) && is_scalar($_GET['lead']) ? absint($_GET['lead']) : 0;
    echo '<div class="wrap"><h1>Заявки Datatour</h1>';
    if ($id) {
        $lead = get_post($id);
        if (!$lead || $lead->post_type !== 'dtbf26_lead' || $lead->post_status !== 'private') { wp_die('Заявка не найдена.', '', array('response' => 404)); }
        $data = json_decode($lead->post_content, true);
        echo '<p><a href="' . esc_url($base) . '">← Все заявки</a></p><h2>Заявка №' . (int) $id . (!empty($data['test']) ? ' — ТЕСТ' : '') . '</h2>';
        echo '<p><strong>Сохранена в WordPress.</strong> Telegram: ' . esc_html(dtbf26compat_telegram_label($id)) . '. Email: ' . esc_html(dtbf26compat_mail_label(get_post_meta($id, '_dtbf26_email_state', true))) . '.</p>';
        echo '<table class="widefat striped"><tbody>';
        foreach (isset($data['fields']) ? $data['fields'] : array() as $label => $value) {
            if ($value === '') { continue; }
            echo '<tr><th scope="row" style="width:240px">' . esc_html($label) . '</th><td style="white-space:pre-wrap;overflow-wrap:anywhere">' . esc_html($value) . '</td></tr>';
        }
        echo '</tbody></table></div>';
        return;
    }
    echo '<p>Заявки сохраняются здесь независимо от отправки email. Статус «Передано серверу» не подтверждает получение письма.</p><p><a href="' . esc_url(admin_url('admin.php?page=dtbf26-telegram')) . '">Настроить уведомления Telegram</a></p>';
    $page = isset($_GET['lead_page']) && is_scalar($_GET['lead_page']) ? max(1, absint($_GET['lead_page'])) : 1;
    $query = new WP_Query(array('post_type' => 'dtbf26_lead', 'post_status' => 'private', 'posts_per_page' => 20, 'paged' => $page, 'orderby' => array('date' => 'DESC', 'ID' => 'DESC')));
    echo '<p>Всего заявок: <strong>' . (int) $query->found_posts . '</strong></p>';
    echo '<div style="overflow-x:auto"><table class="widefat striped"><thead><tr><th>Дата (Минск)</th><th>Контакт</th><th>Обращение</th><th>Telegram</th><th>Email-уведомление</th><th></th></tr></thead><tbody>';
    foreach ($query->posts as $lead) {
        $data = json_decode($lead->post_content, true);
        $fields = isset($data['fields']) ? $data['fields'] : array();
        $date = isset($fields['Дата (Europe/Minsk)']) ? $fields['Дата (Europe/Minsk)'] : $lead->post_date;
        $contact = isset($fields['Контакт']) ? $fields['Контакт'] : '';
        $name = isset($fields['Имя']) ? $fields['Имя'] : '';
        $purpose = isset($fields['Цель']) ? $fields['Цель'] : '';
        echo '<tr><td>' . esc_html($date) . (!empty($data['test']) ? '<br><strong>ТЕСТ</strong>' : '') . '</td><td>' . esc_html($name) . '<br>' . esc_html($contact) . '</td><td>' . esc_html($purpose) . '</td><td>' . esc_html(dtbf26compat_telegram_label($lead->ID)) . '</td><td>' . esc_html(dtbf26compat_mail_label(get_post_meta($lead->ID, '_dtbf26_email_state', true))) . '</td><td><a class="button" href="' . esc_url(add_query_arg('lead', $lead->ID, $base)) . '">Открыть</a></td></tr>';
    }
    if (!$query->posts) { echo '<tr><td colspan="6">Сохранённых заявок пока нет.</td></tr>'; }
    echo '</tbody></table></div>';
    if ($query->max_num_pages > 1) {
        echo '<p>Страница ' . (int) $page . ' из ' . (int) $query->max_num_pages . ' ';
        if ($page > 1) { echo '<a class="button" href="' . esc_url(add_query_arg('lead_page', $page - 1, $base)) . '">← Назад</a> '; }
        if ($page < $query->max_num_pages) { echo '<a class="button" href="' . esc_url(add_query_arg('lead_page', $page + 1, $base)) . '">Далее →</a>'; }
        echo '</p>';
    }
    echo '</div>';
}

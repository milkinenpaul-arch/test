<?php
/**
 * Plugin Name: Datatour BF2026 Landing — Compatible
 * Description: Datatour landing, page template and server-side lead processing.
 * Version: 1.1.4
 * Requires at least: 4.9
 * Requires PHP: 5.4
 * Text Domain: datatour-bf26
 */
if (!defined('ABSPATH')) { exit; }
define('DTBF26COMPAT_ASSET_DIR', __DIR__ . '/assets/v1.1.4');
define('DTBF26COMPAT_ASSET_URL', plugin_dir_url(__FILE__) . 'assets/v1.1.4');
function dtbf26compat_config() {
    static $config = null;
    if ($config === null) {
        $config = json_decode(file_get_contents(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26-config.json'), true);
        if (!is_array($config)) { $config = array(); }
    }
    return $config;
}
function dtbf26compat_is_landing() { return is_page('black-friday-2026'); }
function dtbf26compat_enqueue_assets() {
    if (!dtbf26compat_is_landing()) { return; }
    $base = DTBF26COMPAT_ASSET_URL . '/';
    foreach (array('shell' => 'shell.css', 'style' => 'datatour-bf26.css') as $handle => $file) {
        wp_enqueue_style('dtbf26-' . $handle, $base . $file, array(), '1.1.4-' . filemtime(DTBF26COMPAT_ASSET_DIR . '/' . $file));
    }
    wp_enqueue_script('dtbf26-script', $base . 'datatour-bf26.js', array(), '1.1.4-' . filemtime(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26.js'), true);
    $config = dtbf26compat_config();
    unset($config['recipient']);
    $config['ajaxUrl'] = admin_url('admin-ajax.php');
    foreach (array('reviews', 'payments') as $key) {
        if (!empty($config[$key])) {
            foreach ($config[$key] as &$entry) {
                if (!empty($entry['image']) && strpos($entry['image'], 'http') !== 0) {
                    $entry['image'] = $base . ltrim($entry['image'], '/');
                }
            }
            unset($entry);
        }
    }
    wp_localize_script('dtbf26-script', 'DatatourBF26', $config);
}
add_action('wp_enqueue_scripts', 'dtbf26compat_enqueue_assets', 30);
add_shortcode('datatour_bf26', function () {
    if (!dtbf26compat_is_landing()) { return ''; }
    $html = file_get_contents(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26.html');
    if ($html === false) { return ''; }
    $config = dtbf26compat_config();
    $replacements = array('{{asset_url}}' => esc_url(DTBF26COMPAT_ASSET_URL), '{{ajax_url}}' => esc_url(admin_url('admin-ajax.php')));
    for ($i = 1; $i <= 3; $i++) {
        $replacements['{{news_' . $i . '_url}}'] = isset($config['news'][$i - 1]['url']) ? esc_url($config['news'][$i - 1]['url']) : '#dt-blog';
    }
    if (empty($config['reviews'])) { $html = str_replace('id="dt-trust" data-block="8"', 'id="dt-trust" data-block="8" hidden', $html); }
    return strtr($html, $replacements);
});
add_filter('theme_page_templates', function ($templates) {
    $templates['datatour-bf26/landing.php'] = 'Datatour — отдельный лендинг';
    return $templates;
});
add_filter('template_include', function ($template) {
    if (dtbf26compat_is_landing() && get_page_template_slug(get_queried_object_id()) === 'datatour-bf26/landing.php') {
        return __DIR__ . '/templates/landing.php';
    }
    return $template;
});
require_once __DIR__ . '/leads-v1.1.4.php';

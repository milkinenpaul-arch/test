<?php
/**
 * Plugin Name: Datatour BF2026 Landing — Compatible
 * Description: Datatour landing, page template and server-side lead processing.
 * Version: 2.2.2
 * Requires at least: 4.9
 * Requires PHP: 5.4
 * Text Domain: datatour-bf26
 */
if (!defined('ABSPATH')) { exit; }
define('DTBF26COMPAT_ASSET_DIR', __DIR__ . '/assets/v2.2.2');
define('DTBF26COMPAT_ASSET_URL', plugin_dir_url(__FILE__) . 'assets/v2.2.2');
function dtbf26compat_config() {
    static $config = null;
    if ($config === null) {
        $config = json_decode(file_get_contents(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26-config.json'), true);
        if (!is_array($config)) { $config = array(); }
    }
    return $config;
}
function dtbf26compat_is_landing() { return is_page('black-friday-2026'); }
function dtbf26compat_article() {
    $config = dtbf26compat_config();
    foreach (isset($config['news']) ? $config['news'] : array() as $article) {
        if (!empty($article['id']) && (int) get_queried_object_id() === (int) $article['id'] && is_singular()) { return $article; }
    }
    return false;
}
function dtbf26compat_enqueue_assets() {
    $article = dtbf26compat_article();
    if (!dtbf26compat_is_landing() && !$article) { return; }
    $base = DTBF26COMPAT_ASSET_URL . '/';
    foreach (array('shell' => 'shell.css', 'style' => 'datatour-bf26.css') as $handle => $file) {
        wp_enqueue_style('dtbf26-' . $handle, $base . $file, array(), '2.2.2-' . filemtime(DTBF26COMPAT_ASSET_DIR . '/' . $file));
    }
    if ($article) {
        wp_enqueue_style('dtbf26-article', $base . 'article.css', array('dtbf26-style'), filemtime(DTBF26COMPAT_ASSET_DIR . '/article.css'));
        wp_enqueue_script('dtbf26-article', $base . 'article.js', array(), filemtime(DTBF26COMPAT_ASSET_DIR . '/article.js'), true);
        return;
    }
    wp_enqueue_script('dtbf26-script', $base . 'datatour-bf26.js', array(), '2.2.2-' . filemtime(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26.js'), true);
    $config = dtbf26compat_config();
    unset($config['recipient']);
    $config['ajaxUrl'] = admin_url('admin-ajax.php');
    foreach (array('reviews', 'payments', 'priority_hotels', 'scenario_images', 'winter_destinations') as $key) {
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
// WordPress 4.9 has no block renderer: remove this shortcode's block markers
// before wpautop so they do not leave a blank paragraph above the landing.
add_filter('the_content', function ($content) {
    if (dtbf26compat_is_landing() && strpos($content, '[datatour_bf26]') !== false) {
        $content = str_replace(array('<!-- wp:shortcode -->', '<!-- /wp:shortcode -->'), '', $content);
    }
    return $content;
}, 9);
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
    if (dtbf26compat_article()) { return DTBF26COMPAT_ASSET_DIR . '/article-template.php'; }
    if (dtbf26compat_is_landing() && get_page_template_slug(get_queried_object_id()) === 'datatour-bf26/landing.php') {
        return __DIR__ . '/templates/landing.php';
    }
    return $template;
});
require_once __DIR__ . '/leads-v2.2.2.php';

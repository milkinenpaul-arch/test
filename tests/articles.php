<?php
/* Integration contracts for scoped article routing. No WordPress writes or mail. */
define('ABSPATH', __DIR__);
$GLOBALS['filters'] = array();
$GLOBALS['scripts'] = array();
$GLOBALS['styles'] = array();
$GLOBALS['test_id'] = 0;
$GLOBALS['test_singular'] = false;
$GLOBALS['test_landing'] = false;
function add_action() {}
function add_shortcode() {}
function add_filter($name, $callback) { $GLOBALS['filters'][$name][] = $callback; }
function plugin_dir_url() { return 'https://sales.datatour.by/wp-content/plugins/datatour-bf26-compatible/'; }
function home_url($path = '') { return 'https://sales.datatour.by' . $path; }
function admin_url($path = '') { return 'https://sales.datatour.by/wp-admin/' . $path; }
function is_page() { return $GLOBALS['test_landing']; }
function is_singular() { return $GLOBALS['test_singular']; }
function get_queried_object_id() { return $GLOBALS['test_id']; }
function get_page_template_slug() { return 'datatour-bf26/landing.php'; }
function wp_enqueue_style($handle) { $GLOBALS['styles'][] = $handle; }
function wp_enqueue_script($handle) { $GLOBALS['scripts'][] = $handle; }
function wp_localize_script() { throw new Exception('Article unexpectedly initialized landing JS.'); }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function language_attributes() { echo 'lang="ru"'; }
function bloginfo() { echo 'UTF-8'; }
function body_class($class) { echo 'class="' . esc_attr($class) . '"'; }
function wp_head() {}
function wp_footer() {}
function have_posts() { return $GLOBALS['test_loop']++ === 0; }
function the_post() {}
function the_title() { echo 'Editorial title from WordPress'; }
function the_content() { echo '<h2>WordPress editor content</h2><p>Updated independently of JSON.</p>'; }
function expect_article($condition, $message) { if (!$condition) { throw new Exception($message); } }
function template_for($original) {
    foreach ($GLOBALS['filters']['template_include'] as $callback) { $original = call_user_func($callback, $original); }
    return $original;
}
require __DIR__ . '/../wordpress/datatour-bf26-compatible/datatour-bf26.php';
$original = '/unchanged-theme/single.php';
expect_article(template_for($original) === $original, 'Unrelated archive template changed.');
dtbf26compat_enqueue_assets();
expect_article(!$GLOBALS['styles'] && !$GLOBALS['scripts'], 'Landing assets leaked to an unrelated page.');
$GLOBALS['test_singular'] = true;
foreach (array(291, 292, 293) as $id) {
    $GLOBALS['test_id'] = $id;
    $template = template_for($original);
    expect_article($template === DTBF26COMPAT_ASSET_DIR . '/article-template.php', 'Known article has no scoped template.');
    expect_article(is_file($template), 'Packaged article template is missing.');
    $GLOBALS['styles'] = $GLOBALS['scripts'] = array();
    dtbf26compat_enqueue_assets();
    expect_article(in_array('dtbf26-article', $GLOBALS['styles'], true), 'Article styling missing.');
    expect_article($GLOBALS['scripts'] === array('dtbf26-article'), 'Article must use its own script without form initialization.');
    $GLOBALS['test_loop'] = 0;
    ob_start(); include $template; $markup = ob_get_clean();
    expect_article(strpos($markup, '<h1>Editorial title from WordPress</h1>') !== false, 'WordPress title was replaced with JSON.');
    expect_article(strpos($markup, '<h2>WordPress editor content</h2>') !== false, 'WordPress content was replaced with JSON.');
    expect_article(substr_count($markup, '<header ') === 1 && substr_count($markup, '<footer ') === 1, 'Shared header or footer missing or duplicated.');
    expect_article(strpos($markup, 'class="dt-article-cover"') !== false, 'Article cover missing.');
    expect_article(strpos($markup, 'href="https://sales.datatour.by/black-friday-2026/#dt-request"') !== false, 'Article CTA does not lead back to the form.');
    expect_article(strpos($markup, 'href="#dt-') === false, 'Header anchors are broken on the article URL.');
    expect_article(strpos($markup, 'id="dt-cookie-banner"') !== false && strpos($markup, 'id="dt-cookie-dialog"') !== false, 'Shared consent controls missing.');
}
$GLOBALS['test_id'] = 294;
expect_article(template_for($original) === $original, 'Unrelated post template changed.');
$GLOBALS['test_id'] = 291; $GLOBALS['test_singular'] = false;
expect_article(template_for($original) === $original, 'Non-singular query accidentally rendered an article.');
$GLOBALS['test_id'] = 287; $GLOBALS['test_landing'] = true;
expect_article(template_for($original) === dirname(__DIR__) . '/wordpress/datatour-bf26-compatible/templates/landing.php', 'Original landing template changed.');
echo 'PASS: three existing article IDs, scoped assets, editable WordPress content, shared header/footer/consent, CTA anchors and unrelated-page isolation. No writes or mail.' . PHP_EOL;

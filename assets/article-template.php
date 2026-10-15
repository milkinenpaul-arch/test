<?php
if (!defined('ABSPATH')) { exit; }
$article = dtbf26compat_article();
$landing = home_url('/black-friday-2026/');
$markup = file_get_contents(DTBF26COMPAT_ASSET_DIR . '/datatour-bf26.html');
$header = ''; $footer = ''; $cookies = '';
if (preg_match('~<header\b.*?</header>~s', $markup, $found)) { $header = $found[0]; }
if (preg_match('~<footer\b.*?</footer>~s', $markup, $found)) { $footer = $found[0]; }
if (preg_match('~<aside\b[^>]*\bid="dt-cookie-banner"[^>]*>.*?</aside>\s*<dialog\b[^>]*\bid="dt-cookie-dialog"[^>]*>.*?</dialog>~s', $markup, $found)) { $cookies = $found[0]; }
$footer = str_replace('href="#', 'href="' . esc_url($landing) . '#', $footer);
$header = str_replace('href="#', 'href="' . esc_url($landing) . '#', $header);
$header = str_replace('href="' . esc_url($landing) . '#dt-quick-form"', 'href="' . esc_url($landing) . '#dt-request"', $header);
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head><meta charset="<?php bloginfo('charset'); ?>"><meta name="viewport" content="width=device-width, initial-scale=1"><?php wp_head(); ?></head>
<body <?php body_class('dt-bf26-page dt-bf26-article-page'); ?>>
<?php if (function_exists('wp_body_open')) { wp_body_open(); } ?>
<div id="dt-bf26" lang="ru">
<?php echo $header; ?>
<main class="dt-article">
<div class="dt-wrap">
<a class="dt-article-back" href="<?php echo esc_url($landing); ?>">← К Чёрной пятнице Datatour</a>
<?php if (!empty($article['image'])) : ?>
<div class="dt-article-cover"><img src="<?php echo esc_url(DTBF26COMPAT_ASSET_URL . '/' . ltrim($article['image'], '/')); ?>" alt="<?php echo esc_attr(isset($article['imageAlt']) ? $article['imageAlt'] : ''); ?>" width="1200" height="640" decoding="async" fetchpriority="high"></div>
<?php endif; ?>
<article class="dt-article-body">
<span class="dt-eyebrow">Полезно перед бронированием</span>
<?php while (have_posts()) : the_post(); ?>
<h1><?php the_title(); ?></h1>
<div class="dt-article-content"><?php the_content(); ?></div>
<?php endwhile; ?>
<div class="dt-article-cta"><h2>Подберём отдых под ваши планы</h2><p>Расскажите о датах, составе туристов и пожеланиях. Менеджер подготовит варианты и проверит условия выбранного тура.</p><a class="dt-action" href="<?php echo esc_url($landing . '#dt-request'); ?>">Подобрать тур</a><a class="dt-article-back" href="<?php echo esc_url($landing); ?>">Вернуться на страницу акции →</a></div>
</article></div></main>
<?php echo $footer; echo $cookies; ?>
</div>
<?php wp_footer(); ?>
</body></html>

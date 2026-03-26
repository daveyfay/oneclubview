#!/usr/bin/env node
/**
 * Static Blog Generator for OneClubView
 *
 * Fetches all published blog posts from Supabase and generates
 * static HTML files with fully populated meta tags, structured data,
 * and content â so crawlers see everything without needing JS.
 *
 * Run: node build-blog.js
 * Output: public/blog/{slug}/index.html for each post
 *         public/blog/index.html (updated with static post listing)
 */

const fs = require('fs');
const path = require('path');

const API = 'https://uqihwazheypvmrcrqklg.supabase.co/functions/v1/blog';

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// âââ Post HTML template âââ
function postHtml(post) {
  const title = escapeHtml(post.title);
  const desc = escapeHtml(post.meta_description || '');
  const keywords = escapeHtml(post.meta_keywords || '');
  const url = `https://oneclubview.com/blog/${post.slug}`;
  const pubDate = formatDate(post.published_at);
  const author = escapeHtml(post.author || 'OneClubView');
  const tags = (post.tags || []);
  const emoji = post.hero_emoji || '\u{1F4D6}';
  const readMin = post.read_minutes || 5;

  const articleLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.meta_description || '',
    "author": { "@type": "Organization", "name": post.author || "OneClubView", "url": "https://oneclubview.com" },
    "publisher": { "@type": "Organization", "name": "OneClubView", "url": "https://oneclubview.com", "logo": { "@type": "ImageObject", "url": "https://oneclubview.com/og-image.png" } },
    "datePublished": post.published_at || '',
    "dateModified": post.updated_at || post.published_at || '',
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "image": "https://oneclubview.com/og-image.png",
    "articleSection": tags[0] || "Parenting",
    "keywords": post.meta_keywords || ''
  });

  let faqLd = '';
  if (post.faq_schema) {
    faqLd = `\n<script type="application/ld+json">${JSON.stringify(post.faq_schema)}</script>`;
  }

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oneclubview.com" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://oneclubview.com/blog/" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": url }
    ]
  });

  const tagsHtml = tags.map(t => `<span>${escapeHtml(t)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-GC3DLDCM38"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-GC3DLDCM38');</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | OneClubView Blog</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${keywords}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://oneclubview.com/og-image.png">
<meta property="og:site_name" content="OneClubView">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="https://oneclubview.com/og-image.png">
<script type="application/ld+json">${articleLd}</script>
<script type="application/ld+json">${breadcrumbLd}</script>${faqLd}
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--g:#1a2a3a;--acc:#e85d4a;--warm:#f8f6f3;--sn:'Plus Jakarta Sans',sans-serif;--sr:'Fraunces',Georgia,serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--sn);color:#333;background:var(--warm);line-height:1.7}
.nav{background:#fff;border-bottom:1px solid #e4e2de;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.nav a{font-family:var(--sr);font-size:18px;font-weight:800;color:var(--g);text-decoration:none}
.nav .cta{padding:8px 20px;border-radius:10px;background:var(--g);color:#fff;text-decoration:none;font-size:13px;font-weight:700}
hero{background:linear-gradient(135deg,#1a2a3a,#2d4a5f);padding:48px 24px 40px;color:#fff;text-align:center}
.hero .emoji{font-size:48px;margin-bottom:12px}
.hero h1{font-family:var(--sr);font-size:clamp(24px,5vw,36px);font-weight:800;margin-bottom:10px;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.2}
.hero .meta{font-size:13px;color:rgba(255,255,255,.45)}
.hero .tags{display:flex;gap:6px;justify-content:center;margin-top:12px;flex-wrap:wrap}
.hero .tags span{padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6)}
.content{max-width:680px;margin:0 auto;padding:40px 24px 60px}
.content h2{font-family:var(--sr);font-size:22px;font-weight:800;color:var(--g);margin:32px 0 12px}
.content h3{font-family:var(--sr);font-size:18px;font-weight:700;color:var(--g);margin:24px 0 8px}
.content p{font-size:15px;line-height:1.8;margin-bottom:16px;color:#444}
.content ul,.content ol{margin:0 0 16px 24px;font-size:15px;line-height:1.8;color:#444}
.content li{margin-bottom:6px}
.content a{color:var(--acc);font-weight:600}
.content strong{color:var(--g)}
.content blockquote{border-left:3px solid var(--acc);padding:12px 20px;margin:20px 0;background:#fff;border-radius:0 12px 12px 0;font-style:italic;color:#666}
.content .tip{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 20px;margin:20px 0;font-size:14px;color:#166534}
.content img{max-width:100%;border-radius:12px;margin:16px 0}
.cta-box{background:linear-gradient(135deg,#1a2a3a,#2d4a5f);border-radius:20px;padding:32px;text-align:center;color:#fff;margin:40px 0}
.cta-box h3{font-family:var(--sr);font-size:22px;margin-bottom:8px}
.cta-box p{color:rgba(255,255,255,.55);margin-bottom:16px;font-size:14px}
.cta-box a{display:inline-block;padding:14px 28px;background:var(--acc);color:#fff;border-radius:14px;font-weight:700;text-decoration:none;font-size:15px}
.back{display:inline-block;margin-bottom:24px;font-size:13px;color:#999;text-decoration:none;font-weight:600}
.back:hover{color:var(--acc)}
footer{background:var(--g);padding:24px;text-align:center}
footer a{font-family:var(--sr);color:#fff;text-decoration:none;font-size:16px;font-weight:700}
footer p{color:rgba(255,255,255,.3);font-size:11px;margin-top:8px}
</style>
</head>
<body>

<nav class="nav">
  <a href="/">OneClubView</a>
  <a href="/" class="cta">Try free</a>
</nav>

<div class="hero">
  <div class="emoji">${emoji}</div>
  <h1>${title}</h1>
  <div class="meta">${author} &middot; ${pubDate} &middot; ${readMin} min read</div>
  <div class="tags">${tagsHtml}</div>
</div>

<div class="content">
  <a href="/blog/" class="back">&larr; Back to all posts</a>
  ${post.content || ''}
  <div class="cta-box">
    <h3>Tired of the chaos?</h3>
    <p>All your kids' clubs, camps, fees, and schedules in one place. Both parents see the same thing.</p>
    <a href="/">Try OneClubView free</a>
  </div>
</div>

<footer>
  <a href="/">OneClubView</a>
  <p>&copy; 2026 OneClubView. All rights reserved.</p>
</footer>

</body>
</html>`;
}

// âââ Blog index HTML template âââ
function blogIndexHtml(posts) {
  const tagColors = {
    camps: ['#fef3e2', '#b8860b'], easter: ['#fef3e2', '#b8860b'], summer: ['#fef3e2', '#b8860b'],
    product: ['#eff6ff', '#1d4ed8'], calendar: ['#eff6ff', '#1d4ed8'],
    tips: ['#f0fdf4', '#166534'], clubs: ['#f0fdf4', '#166534'], organisation: ['#f0fdf4', '#166534'],
    ireland: ['#fef2f2', '#dc2626'], dublin: ['#fef2f2', '#dc2626'], scheduling: ['#fef2f2', '#dc2626'],
    default: ['#f5f3ef', '#666']
  };

  let cardsHtml = '';
  posts.forEach((p, i) => {
    const tag = (p.tags && p.tags[0]) || 'default';
    const colors = tagColors[tag] || tagColors.default;
    const label = i === 0 ? 'NEW' : tag.toUpperCase();
    const date = formatDate(p.published_at);
    const desc = escapeHtml(p.meta_description || '');
    const readMin = p.read_minutes || 5;
    cardsHtml += `  <a href="/blog/${p.slug}" class="card">
    <span class="tag" style="background:${colors[0]};color:${colors[1]}">${label}</span>
    <h2>${escapeHtml(p.title)}</h2>
    <p>${desc}</p>
    <span class="meta">${date} &middot; ${readMin} min read</span>
  </a>\n`;
  });

  // Build ItemList structured data for blog listing
  const itemListLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": posts.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `https://oneclubview.com/blog/${p.slug}`,
      "name": p.title
    }))
  });

  const breadcrumbLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oneclubview.com" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://oneclubview.com/blog/" }
    ]
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-GC3DLDCM38"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-GC3DLDCM38');</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog \u2014 Tips for Managing Kids' Activities | OneClubView</title>
<meta name="description" content="Practical advice for Irish parents managing kids' clubs, camps, fees, and schedules. From Easter camp guides to surviving the extracurricular chaos.">
<link rel="canonical" href="https://oneclubview.com/blog/">
<meta property="og:title" content="OneClubView Blog \u2014 Tips for Irish Parents">
<meta property="og:description" content="Practical advice for managing kids' clubs, camps, fees, and schedules.">
<meta property="og:url" content="https://oneclubview.com/blog/">
<meta property="og:type" content="website">
<meta property="og:image" content="https://oneclubview.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${itemListLd}</script>
<script type="application/ld+json">${breadcrumbLd}</script>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--g:#1a2a3a;--acc:#e85d4a;--warm:#f8f6f3;--sn:'Plus Jakarta Sans',sans-serif;--sr:'Fraunces',Georgia,serif}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--sn);color:#333;background:var(--warm);line-height:1.7}
.nav{background:#fff;border-bottom:1px solid #e4e2de;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.nav a{font-family:var(--sr);font-size:18px;font-weight:800;color:var(--g);text-decoration:none}
.nav .cta{padding:8px 20px;border-radius:10px;background:var(--g);color:#fff;text-decoration:none;font-size:13px;font-weight:700}
.hero{background:linear-gradient(135deg,#1a2a3a,#2d4a5f);padding:56px 24px 48px;color:#fff;text-align:center}
.hero h1{font-family:var(--sr);font-size:clamp(28px,5vw,42px);font-weight:800;margin-bottom:10px}
.hero p{font-size:16px;color:rgba(255,255,255,.55);max-width:460px;margin:0 auto}
.posts{max-width:720px;margin:0 auto;padding:40px 24px 80px}
.card{display:block;background:#fff;border:1px solid #e4e2de;border-radius:20px;padding:28px;margin-bottom:20px;text-decoration:none;transition:box-shadow .2s,transform .2s}
.card:hover{box-shadow:0 8px 30px rgba(0,0,0,.08);transform:translateY(-2px)}
.tag{display:inline-block;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:12px}
.card h2{font-family:var(--sr);font-size:22px;font-weight:800;color:var(--g);margin-bottom:8px;line-height:1.25}
.card p{font-size:14px;color:#666;margin-bottom:12px;line-height:1.6}
.meta{font-size:12px;color:#999}
.cta-box{background:linear-gradient(135deg,#1a2a3a,#2d4a5f);border-radius:20px;padding:32px;text-align:center;color:#fff;margin:40px 0}
.cta-box h3{font-family:var(--sr);font-size:22px;margin-bottom:8px}
.cta-box p{color:rgba(255,255,255,.55);margin-bottom:16px;font-size:14px}
.cta-box a{display:inline-block;padding:14px 28px;background:var(--acc);color:#fff;border-radius:14px;font-weight:700;text-decoration:none;font-size:15px}
footer{background:var(--g);padding:24px;text-align:center}
footer a{font-family:var(--sr);color:#fff;text-decoration:none;font-size:16px;font-weight:700}
footer p{color:rgba(255,255,255,.3);font-size:11px;margin-top:8px}
</style>
</head>
<body>

<nav class="nav">
  <a href="/">OneClubView</a>
  <a href="/" class="cta">Try free</a>
</nav>

<div class="hero">
  <h1>The OneClubView Blog</h1>
  <p>Practical advice for Irish parents juggling kids' clubs, camps, and everything in between</p>
</div>

<div class="posts" id="posts">
${cardsHtml}
  <div class="cta-box">
    <h3>Tired of the chaos?</h3>
    <p>All your kids' clubs, camps, fees, and schedules in one place. Both parents see the same thing.</p>
    <a href="/">Try OneClubView free</a>
  </div>
</div>

<footer>
  <a href="/">OneClubView</a>
  <p>&copy; 2026 OneClubView. All rights reserved.</p>
</footer>

</body>
</html>`;
}

// âââ Main âââ
async function main() {
  console.log('Fetching blog posts from Supabase...');
  const res = await fetch(API);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const posts = await res.json();
  console.log(`Found ${posts.length} posts`);

  // Generate individual post pages
  let generated = 0;
  for (const post of posts) {
    // Fetch full post content
    const postRes = await fetch(`${API}?slug=${encodeURIComponent(post.slug)}`);
    if (!postRes.ok) { console.warn(`  Skipping ${post.slug}: ${postRes.status}`); continue; }
    const fullPost = await postRes.json();
    if (fullPost.error) { console.warn(`  Skipping ${post.slug}: ${fullPost.error}`); continue; }

    const dir = path.join(__dirname, 'public', 'blog', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    const html = postHtml(fullPost);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`  Generated: /blog/${post.slug}/ (${(html.length / 1024).toFixed(1)} KB)`);
    generated++;
  }

  // Generate blog index with static content
  const indexHtml = blogIndexHtml(posts);
  fs.writeFileSync(path.join(__dirname, 'public', 'blog', 'index.html'), indexHtml);
  console.log(`  Generated: /blog/index.html (${(indexHtml.length / 1024).toFixed(1)} KB)`);

  // Update sitemap with any new posts
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    for (const post of posts) {
      const postUrl = `https://oneclubview.com/blog/${post.slug}`;
      if (!sitemap.includes(postUrl)) {
        const entry = `  <url><loc>${postUrl}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>\n</urlset>`;
        sitemap = sitemap.replace('</urlset>', entry);
        console.log(`  Added to sitemap: ${postUrl}`);
      }
    }
    fs.writeFileSync(sitemapPath, sitemap);
  }

  console.log(`\nDone! Generated ${generated} post pages + blog index.`);
}

main().catch(err => { console.error('Build failed:', err); process.exit(1); });

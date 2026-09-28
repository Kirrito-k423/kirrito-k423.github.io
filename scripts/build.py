"""Generate a zero-dependency static directory from projects.json."""
import json
from pathlib import Path
from html import escape as e
ROOT = Path(__file__).resolve().parent.parent
projects = json.loads((ROOT / 'projects.json').read_text())
cards = []
for i, p in enumerate(projects):
    url = 'https://kirrito-k423.github.io/' + p['path']
    tags = ''.join(f'<span>{e(tag)}</span>' for tag in p['tags'])
    search = ' '.join([p['name'], p['subtitle'], p['description'], *p['tags']])
    cards.append(f'''<article class="project {'featured' if i == 0 else ''}" data-category="{e(p['category'])}" data-search="{e(search, quote=True)}">
    <a class="preview" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="打开 {e(p['name'])}（新窗口）">
      <div class="browser-bar" aria-hidden="true"><span class="dots">● ● ●</span><span>{e(p['path'].rstrip('/'))}</span><span>↗</span></div>
      <img src="assets/previews/{p['id']}.webp" width="1440" height="960" alt="{e(p['name'])} 实际页面截图" {'fetchpriority="high"' if i == 0 else 'loading="lazy"'}>
      <span class="preview-action">打开网页 ↗</span>
    </a>
    <div class="project-body"><div class="project-eyebrow"><span>{e(p['label'])}</span><span>{i+1:02}</span></div>
    <h3><a href="{url}" target="_blank" rel="noopener noreferrer">{e(p['name'])}<span aria-hidden="true">↗</span></a></h3>
    <p class="subtitle">{e(p['subtitle'])}</p><p class="description">{e(p['description'])}</p>
    <div class="tags">{tags}</div><div class="card-footer"><span>{e(p['category'])}</span><a href="https://github.com/Kirrito-k423/{p['repo']}" target="_blank" rel="noopener noreferrer" aria-label="{e(p['name'])} GitHub 仓库（新窗口）">GitHub 仓库 ↗</a></div></div>
    </article>''')
page = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shaojie’s Web Lab · 实验与探索</title><meta name="description" content="谭邵杰的 Web 实验导航：MoE 通信可视化、Ascend 性能测量、民生数据观察、产品原型与在线简历。">
<meta name="theme-color" content="#f6f5f1"><meta property="og:title" content="Shaojie’s Web Lab · 实验与探索"><meta property="og:description" content="从一个想法，到一个可以打开的网页。探索技术、数据与生活中的小实验。"><meta property="og:type" content="website"><meta property="og:url" content="https://kirrito-k423.github.io/"><meta property="og:image" content="https://kirrito-k423.github.io/assets/previews/moe.webp">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/navigation.css"><script defer src="assets/navigation.js"></script></head>
<body><a class="skip" href="#projects">跳到项目导航</a><div class="page-shell">
<header class="site-header"><a class="brand" href="./" aria-label="Web Lab 首页"><span class="brand-mark">S<span>↗</span></span><span>SHAOJIE TAN<span class="brand-sub">WEB LAB / 实验导航</span></span></a><nav aria-label="主导航"><a class="active" href="#projects">探索项目</a><a href="https://kirrito-k423.github.io/ResumeOnline/zh/" target="_blank" rel="noopener noreferrer">关于我 ↗</a><a href="https://github.com/Kirrito-k423" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav></header>
<main><section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow"><span class="signal"></span> IDEAS, MADE EXPLORABLE</p><h1 id="hero-title">一些想法，<br>一些<span class="accent">可以打开的实验。</span></h1><p class="hero-description">把技术原理、数据观察和生活中的问题，<br class="desktop-break">做成可以看、可以点、可以探索的 Web 页面。</p><a class="hero-link" href="#projects">挑一个，开始探索 <span>↓</span></a></div><aside class="hero-note" aria-label="收录概览"><span class="note-label">THE COLLECTION</span><div class="collection-count">__COUNT__<span>个独立站点</span></div><p>从 AI 系统到日常生活，<br>每个页面，都是一次实践。</p><div class="note-bottom"><span>持续探索中</span><span class="small-orbit" aria-hidden="true">✳</span></div></aside></section>
<section id="projects" aria-labelledby="projects-title"><div class="section-heading"><div><span class="eyebrow">SELECTED PROJECTS</span><h2 id="projects-title">实验目录<span>/ 01—__COUNT__</span></h2></div><p>选择感兴趣的方向，进入独立站点。</p></div>
<div class="toolbar" hidden><div class="filters" role="group" aria-label="按项目分类筛选"><button type="button" class="selected" data-filter="全部" aria-pressed="true">全部 <span>__COUNT__</span></button><button type="button" data-filter="技术实验" aria-pressed="false">技术实验</button><button type="button" data-filter="数据观察" aria-pressed="false">数据观察</button><button type="button" data-filter="产品原型" aria-pressed="false">产品原型</button><button type="button" data-filter="关于我" aria-pressed="false">关于我</button></div><label class="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索项目、关键词…" aria-label="搜索项目、关键词"></label></div>
<p id="result-status" class="sr-only" role="status" aria-live="polite">显示 __TOTAL__ 个项目</p><div class="projects-grid">__CARDS__</div><div class="empty" hidden><h3>还没有匹配的项目</h3><p>试试其他关键词，或回到全部项目。</p><button type="button" id="reset">清除筛选</button></div>
</section><section class="closing"><span class="closing-mark" aria-hidden="true">↗</span><div><h2>保持好奇，继续动手。</h2><p>这里收录独立维护的 Web 项目。点击截图或标题即可在新窗口打开。</p></div><a href="https://github.com/Kirrito-k423" target="_blank" rel="noopener noreferrer">在 GitHub 看更多 ↗</a></section></main>
<footer><span>© 2026 Shaojie Tan <span class="footer-divider">/</span> Built for curiosity.</span><span>真实页面截图 · 2026.09.28 <a href="/archives/">旧博客归档 ↗</a></span></footer></div></body></html>'''
(ROOT / 'index.html').write_text(page.replace('__CARDS__', '\n'.join(cards)).replace('__COUNT__', f'{len(projects):02d}').replace('__TOTAL__', str(len(projects))))

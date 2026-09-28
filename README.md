# Shaojie’s Web Lab

GitHub Pages 实验站导航：https://kirrito-k423.github.io/

静态 HTML / CSS / JavaScript，无运行时依赖、第三方字体或 CDN。旧博客文章与 `/archives/` 保留。

## 更新项目

1. 编辑 `projects.json` 中的名称、简介、分类、标签与路径。
2. 在 `assets/previews/` 放置对应 `id.webp` 的真实网页截图（1440 × 960）。
3. 执行 `python3 scripts/build.py` 重新生成首页。
4. 本地执行 `python3 -m http.server 18765 --bind 127.0.0.1`，打开 http://127.0.0.1:18765/ 检查。

`master` 根目录由 GitHub Pages 自动发布。首页截图拍摄于 2026-09-28，仅展示各子站公开默认页面。简介依据当日实访；截图是静态预览，并非嵌入式子站。

## 验证

2026-09-28：五个线上子站均返回 HTTP 200，真实浏览器截图已压缩为 WebP（合计约 356 KB）。验证了分类计数、大小写不敏感搜索、空结果及重置、所有图片加载、375 / 390 / 768 / 1440 像素下无横向溢出，以及禁用 JavaScript 后仍可访问全部项目。

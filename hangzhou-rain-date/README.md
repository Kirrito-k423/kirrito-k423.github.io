# 湖滨雨天约会规划

发布路径：`https://kirrito-k423.github.io/hangzhou-rain-date/`

无构建依赖的静态 HTML/CSS/JS。默认不修改主站首页及目录。三个流程：桌游、拼豆、轻逛；支持见面时间、K-pop/晚饭开关、拼豆流程的Sony选项。URL hash保存方案，可复制文字行程或打印。

地图使用高德官方免Key iframe嵌入搜索，以及高德/百度官方URI查店和百度按地点名称步行导航。高德搜索中心来自公开龙翔桥POI（GCJ-02），不把商场中心标成店铺精确门牌。页面不请求定位、不含账号、无分析脚本与API密钥。

文档：
- https://lbs.amap.com/api/uri-api/guide/embedded-map/search-result
- https://lbs.amap.com/api/uri-api/guide/search/search
- https://lbsyun.baidu.com/faq/api?title=webapi%2Furi%2Fweb

步行、室外距离和费用均为规划估算，不是地图实时算路或实时团购。总距离逐段相加；时间用各站停留时长+预计转场逐段累计；购物/交通不计。地下连通口及商户铺位出发前查看现场导览。湖滨88近期换运营方，拼豆门店先确认营业和预约。第一回合和红姆电玩仅作为待核实的备选。

本地预览：`python3 -m http.server 18791 --bind 127.0.0.1`，访问 `/hangzhou-rain-date/`。

## 验证记录（2026-11-05）

- Node语法检查、HTML唯一ID、本地资源及HTTPS链接检查通过。
- 在DOM环境执行真实app.js，16种流程/开关组合的双人预算、站点显隐、分享URL恢复、室外段、地图链接、复制与重置检查通过。
- 真实桌面浏览器已观察到桌游/拼豆切换、预算/时间联动及官方高德商圈底图。高德嵌入检索在该环境遇到第三方安全脚本异常，默认展示稳定的商圈总览，保留店铺检索和高德/百度外部导航。
- 手机CSS已适配，但浏览器预览工具在切换视口时连续超时，未完成真实手机宽度及打印预览验证。

/* Geography is WGS-84. Road geometries come from the foot profile, not straight-line joins. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HubinCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const venues = {
    tea: { id: 'tea', name: '饮品碰头', short: '饮品碰头', icon: '☕', category: 'coffee', type: '饮品', anchor: 'in77b', floor: 'in77 B区 · 地下商业区', address: '就近选择有座位的店，最终店名与楼层提前发给对方。', duration: 20, cost: [40, 60], query: '杭州 湖滨银泰in77 B区 饮品', tip: '先坐一会，等彼此进入聊天的节奏。不用为了某家网红店排队。', rain: '同商场内找座位，入内后优先按地下商业导览走。', locationNote: '饮品店尚未指定，地图以B区建筑代表点展示。' },
    kpop: { id: 'kpop', name: '一直娱 POP研究所', short: '一直娱', icon: '♫', category: 'shop', type: 'K-pop', anchor: 'in77b', floor: 'in77 B区 B2', address: 'K-pop专辑与周边，具体铺位看商场导览。', duration: 25, cost: [0, 0], query: '杭州 一直娱POP研究所 湖滨银泰in77', tip: '从喜欢的音乐和演出聊起。不追星也可以听对方分享，两个人都不感兴趣就跳过。', rain: '与饮品碰头点在同一商场区域，楼内换层不绘制成道路。', locationNote: '店铺楼层参考公开资料；地图标在B区建筑代表点，不是店内精确坐标。' },
    anime: { id: 'anime', name: '三月兽', short: '三月兽', icon: '✳', category: 'shop', type: '二次元', anchor: 'in77c', floor: 'in77 C2区 B1', address: '延安路258号 · 动漫周边与手办', duration: 25, cost: [0, 0], query: '杭州 三月兽 湖滨银泰in77', tip: '从喜欢的角色，聊到动画、游戏和小时候。逛店不需要一定买东西。', rain: '跨in77各区可以优先寻找地下连通口，地图道路方案不保证全程有遮雨。', locationNote: '地图使用C2区建筑代表点。店铺铺位、营业情况出发前查店确认。' },
    board: { id: 'board', name: '猎人桌游', short: '猎人桌游', icon: '⚄', category: 'play', type: '轻桌游', anchor: 'gonglian', floor: '工联CC 6楼', address: '延安路292号 · 预约双人桌与新手讲解', duration: 70, cost: [100, 180], query: '杭州 猎人桌游 湖滨店 工联CC', tip: '预约时说“两个人、第一次来，想玩规则简单的双人游戏，需要讲解”。先确认最低消费和周末券。', rain: 'in77与工联CC可优先寻找地下商业连通口；现场开放情况以导览为准。', locationNote: '地图以工联CC建筑代表点展示；六楼换层时间另计。', source: 'https://www.sohu.com/a/905915914_121124835' },
    craft: { id: 'craft', name: '突突队长 · 拼豆', short: '突突队长', icon: '▦', category: 'play', type: '手工', anchor: 'hubin88', floor: '湖滨88商场内 · 铺位预约时确认', address: '平海路124号 · 选小图，留熨烫时间', duration: 75, cost: [60, 120], query: '杭州 突突队长 拼豆 湖滨88', tip: '选一个一小时左右能完成的小挂件，留10—15分钟熨烫、冷却。问清耗材和成品配件是否另收费。', rain: '去湖滨88按需要撑伞过街安排；下大雨时可以改选桌游。', locationNote: '地图使用湖滨88建筑代表点。商场近期变更运营方，先确认门店营业与楼层。', source: 'https://hznews.hangzhou.com.cn/jingji/content/2026-09/04/content_9298161.htm' },
    sony: { id: 'sony', name: 'Sony Store', short: 'Sony', icon: '⌘', category: 'shop', type: '主机 / 数码', anchor: 'hubin88', floor: '湖滨88 1—2层', address: '平海路124号 · 看主机、相机和耳机', duration: 20, cost: [0, 0], query: '杭州 Sony Store 湖滨88店', tip: '顺路看数码产品。能否试玩游戏、能试用哪些产品，现场问店员；这里不是按小时畅玩的游戏馆。', rain: '与拼豆在同一商场，可顺路换层看看。', locationNote: '地图使用湖滨88建筑代表点；与拼豆共用建筑位置。', source: 'https://www.playstation.com/zh-hans-cn/local/retailers-list/' },
    book: { id: 'book', name: '悦览树 · 新华书店', short: '悦览树', icon: '▤', category: 'book', type: '书店', anchor: 'book', floor: '解放路新华书店 1楼', address: '解放路225—227号 · 青年路口', duration: 35, cost: [0, 0], query: '杭州 悦览树 解放路新华书店', tip: '喜欢阅读可以加这一站，一起翻画册或旅行书。这站离核心商场稍远，不必为了打卡绕过去。', rain: '从in77到这里室外路段较长，雨大时建议取消。', locationNote: '坐标来自OSM的“悦览树（新华书店咖啡馆）”地点；当前营业情况需查店。', source: 'https://www.96225.com/smknet/service/merchant_searchMerInfo.action?ishit=1&mer.mermerchantid=bc3ffc6c4cffaf1b014d094be2160013' }
  };
  const presets = {
    board: { name: '少淋雨 · 轻桌游', ids: ['tea', 'kpop', 'anime', 'board'] },
    craft: { name: '留个纪念 · 拼豆', ids: ['tea', 'kpop', 'anime', 'craft'] },
    stroll: { name: '轻松一点 · 逛逛', ids: ['tea', 'kpop', 'anime'] },
    custom: { name: '自己选 · 随心走', ids: [] }
  };
  const defaults = { plan: 'board', start: '15:00', dinner: true, loop: true, ids: presets.board.ids.slice() };
  const uniqueIds = (items) => [...new Set(items.filter((id) => Object.hasOwn(venues, id)))].slice(0, 7);
  function parseState(hash) {
    const p = new URLSearchParams(hash.replace(/^#/, ''));
    const plan = Object.hasOwn(presets, p.get('plan')) ? p.get('plan') : 'board';
    let ids = p.has('stops') ? uniqueIds(p.get('stops').split(',')) : presets[plan].ids.slice();
    if (!p.has('stops')) {
      if (p.get('kpop') === '0') ids = ids.filter((id) => id !== 'kpop');
      if (plan === 'craft' && p.get('sony') === '1') ids.push('sony');
    }
    return { plan, start: /^(1[0-8]):[0-5]\d$|^19:00$/.test(p.get('start') || '') ? p.get('start') : '15:00', dinner: p.get('dinner') !== '0', loop: p.get('loop') !== '0', ids };
  }
  function serializeState(state) { return new URLSearchParams({ plan: state.plan, start: state.start, dinner: state.dinner ? '1' : '0', loop: state.loop ? '1' : '0', stops: uniqueIds(state.ids).join(',') }).toString(); }
  function clock(minutes) { return `${minutes >= 1440 ? '次日 ' : ''}${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  function duration(minutes) { return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}小时` : ''}${minutes % 60 ? `${minutes % 60}分` : ''}` || '0分'; }
  function distance(m) { return m >= 1000 ? `${(m / 1000).toFixed(2)}公里` : `${Math.round(m)}米`; }
  function money(range) { return range[1] === 0 ? '免费逛' : `¥${range[0]}–${range[1]}`; }
  function buildTrip(state, anchors, routes) {
    const ids = uniqueIds(state.ids);
    const startMinutes = Number(state.start.slice(0, 2)) * 60 + Number(state.start.slice(3));
    const visits = [{ id: 'station', name: '龙翔桥C口', anchor: 'station', duration: 0, cost: [0, 0] }, ...ids.map((id) => ({ ...venues[id] }))];
    if (state.loop && ids.length) visits.push({ id: 'return', name: '返回龙翔桥C口', anchor: 'station', duration: 0, cost: [0, 0] });
    const legs = [];
    let dinner = null;
    let at = startMinutes, meters = 0, unknown = 0;
    let cost = [0, 0];
    for (let i = 0; i < visits.length; i++) {
      const visit = visits[i];
      if (i > 0) {
        const previous = visits[i - 1];
        const sameBuilding = previous.anchor === visit.anchor;
        const route = sameBuilding ? null : routes[`${previous.anchor}>${visit.anchor}`];
        const legMinutes = sameBuilding ? 4 : route ? Math.ceil(route.duration / 60) + 2 : 0;
        const leg = { id: i - 1, from: previous, to: visit, sameBuilding, route: route || null, minutes: legMinutes, distance: route ? route.distance : 0, start: at, end: at + legMinutes };
        if (!sameBuilding && !route) unknown++;
        legs.push(leg);
        at += legMinutes;
        meters += leg.distance;
      }
      visit.arrival = at;
      at += visit.duration;
      visit.departure = at;
      cost = [cost[0] + visit.cost[0], cost[1] + visit.cost[1]];
      if (state.dinner && ids.length && visit.id === ids[ids.length - 1]) {
        dinner = { name: '晚饭预留 · 餐厅待选', arrival: at, departure: at + 60, duration: 60, cost: [180, 260] };
        at += 60;
        cost = [cost[0] + 180, cost[1] + 260];
      }
    }
    return { visits, legs, dinner, distance: meters, unknown, duration: at - startMinutes, start: startMinutes, end: at, cost, name: presets[state.plan].name, ids };
  }
  function haversine(a, b) {
    const rad = Math.PI / 180;
    const x = (b[1] - a[1]) * rad, y = (b[0] - a[0]) * rad;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(y / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function makeTrack(legs) {
    let total = 0;
    const edges = [];
    for (const leg of legs) {
      const points = leg.route?.geometry.coordinates || [];
      for (let i = 1; i < points.length; i++) {
        const length = haversine(points[i - 1], points[i]);
        if (length < .001) continue;
        edges.push({ a: points[i - 1], b: points[i], start: total, end: total + length, legId: leg.id });
        total += length;
      }
    }
    return { edges, total };
  }
  function positionOnTrack(track, meters) {
    if (!track.edges.length) return null;
    const d = Math.min(track.total, Math.max(0, meters));
    const edge = track.edges.find((e) => e.end >= d) || track.edges[track.edges.length - 1];
    const t = (d - edge.start) / (edge.end - edge.start);
    return { lng: edge.a[0] + (edge.b[0] - edge.a[0]) * t, lat: edge.a[1] + (edge.b[1] - edge.a[1]) * t, legId: edge.legId };
  }
  return { venues, presets, defaults, uniqueIds, parseState, serializeState, buildTrip, clock, duration, distance, money, haversine, makeTrack, positionOnTrack };
});

/* Plain, dependency-free planner. All displayed costs and walking distances are planning estimates. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const defaults = { plan: 'board', start: '15:00', kpop: true, dinner: true, sony: false };
  const plans = {
    board: { name: '少淋雨 · 轻桌游', activity: 'board', dinnerPlace: 'gonglian', advice: 'in77 ↔ 工联CC优先走地下连通口。只预约一小时左右的双人桌游，把余下时间留给聊天。' },
    craft: { name: '留个纪念 · 拼豆', activity: 'craft', dinnerPlace: 'hubin88', advice: 'C区 → D区先走地下，再撑伞去湖滨88；晚饭留在同楼。选小图，给熨烫留10—15分钟。' },
    stroll: { name: '轻松一点 · 只逛逛', activity: null, dinnerPlace: 'in77', advice: '这条路线不预订付费活动。感兴趣就多逛一会，想坐下来就先吃饭；跨区优先走地下通道。' }
  };
  const places = {
    station: { title: '龙翔桥 · 地下碰头', short: '龙翔桥', area: '地铁1号线 · 出闸后按商场导览走', query: '杭州 龙翔桥地铁站', duration: 0, cost: [0, 0], category: null, description: '先约好商场内的具体碰头点，发店名和楼层。', tip: '地铁出闸后先找in77商场连通口。不要只约“龙翔桥出口”，这里人多，出口也多。', caution: '连通口及出口开放情况以现场导览为准。', building: 'station' },
    meet: { title: '买杯饮品，先聊一会', short: '饮品碰头', area: 'in77 B区 · 地下商业区，就近选有座位的店', query: '杭州 湖滨银泰in77 B区', duration: 20, cost: [40, 60], category: '饮品', description: '先坐一小会，等彼此进入聊天的节奏。', tip: '饮品店当天就近选，不用为了某个网红店排队。碰头前把最终店名和楼层发给对方。', caution: '', building: 'in77b' },
    kpop: { title: '一直娱 POP研究所', short: '一直娱', area: 'in77 B区 B2 · K-pop专辑与周边', query: '杭州 一直娱POP研究所 湖滨银泰in77', duration: 25, cost: [0, 0], category: null, description: '聊喜欢的音乐、演出，或者让对方介绍喜欢的团。', tip: '不追星也可以听对方分享。两个人都没兴趣，就取消“逛K-pop店”，不用为了走完路线硬逛。', caution: '楼层依据公开资料，具体铺位看当日商场导览；购物另计。', building: 'in77b' },
    anime: { title: '三月兽 · 逛点可爱的小东西', short: '三月兽', area: 'in77 C区 B1 · 动漫周边与手办', query: '杭州 三月兽 湖滨银泰in77', duration: 25, cost: [0, 0], category: null, description: '从喜欢的角色，聊到动画、游戏和小时候。', tip: '一起看看喜欢的角色和小物件就好。逛店不需要一定买东西，也不用急着送礼物。', caution: '具体铺位以商场导览与地图搜索结果为准；购物另计。', building: 'in77c' },
    board: { title: '猎人桌游 · 玩点简单的', short: '轻桌游', area: '工联CC 6楼 · 延安路292号', query: '杭州 猎人桌游 湖滨店 工联CC', duration: 70, cost: [100, 180], category: '桌游', description: '请店员教一款容易上手的双人游戏，先玩一小时左右。', tip: '预约时说：“两个人、第一次来，想玩规则简单的双人游戏，需要讲解。”先确认座位、最低消费和周末团购条件。', caution: '预算是双人预留金额，非门店实时报价；留意是否按整场收费。', building: 'gonglian' },
    craft: { title: '突突队长 · 一起拼个小挂件', short: '拼豆手作', area: '湖滨88商场内 · 平海路124号，铺位预约时确认', query: '杭州 突突队长 拼豆 湖滨88', duration: 75, cost: [60, 120], category: '拼豆', description: '各选一个小图，边做边聊，成品带回家。', tip: '选一小时左右能拼完的图案，额外预留熨烫和冷却时间。预约时确认双人套餐、耗材及成品配件是否另收费。', caution: '湖滨88于2026年10月更换运营方，出发前确认门店营业、楼层与座位。', building: 'hubin88' },
    sony: { title: 'Sony Store · 顺路看看', short: 'Sony', area: '湖滨88 1—2层 · 平海路124号', query: '杭州 Sony Store 湖滨88店', duration: 20, cost: [0, 0], category: null, description: '看看主机、相机或耳机，轻松逛一小段。', tip: '这是零售与产品体验店。现场能否试玩游戏、试用哪些产品，直接问店员即可。', caution: '不是按小时畅玩的PS5 / Switch游戏馆，购物另计。', building: 'hubin88' }
  };
  const dinnerPlaces = {
    gonglian: { area: '工联CC同楼 · 按当日座位选餐厅', query: '杭州 工联CC 餐厅', building: 'gonglian' },
    hubin88: { area: '湖滨88同楼 · 按当日营业与座位选餐厅', query: '杭州 湖滨88 餐厅', building: 'hubin88' },
    in77: { area: 'in77 C区同楼 · 按当日座位选餐厅', query: '杭州 湖滨银泰in77 C区 餐厅', building: 'in77c' }
  };
  const alternatives = [
    ['悦览树 / 解放路新华书店', '解放路225—227号；室外步行较多，留作不下雨时的备选。', '杭州 悦览树 解放路新华书店'],
    ['Xcape 异时刻密室（湖滨店）', '平海路76号5楼；先确认非恐怖主题、两人能否开场或需要拼场。', '杭州 Xcape异时刻密室逃脱 湖滨店'],
    ['红姆电玩 · PS5 / Switch（湖滨店）', '商家发布过主机体验信息；现址和营业尚需确认，不计入推荐路线。', '杭州 红姆电玩 湖滨店'],
    ['第一回合（in77店）', '早期资料为D区B1，地下街区有过调改；先查现址再安排。', '杭州 第一回合 湖滨银泰in77店']
  ];
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function url(base, params) { return `${base}?${new URLSearchParams(params).toString()}`; }
  function amapSearch(query) { return url('https://uri.amap.com/search', { keyword: query, city: '杭州', view: 'map', src: 'shaojie.hubin-date', callnative: '0' }); }
  function baiduSearch(query) { return url('https://api.map.baidu.com/place/search', { query, region: '杭州', output: 'html', src: 'webapp.shaojie.hubindate' }); }
  function baiduWalk(from, to) { return url('https://api.map.baidu.com/direction', { origin: from, destination: to, mode: 'walking', region: '杭州', output: 'html', src: 'webapp.shaojie.hubindate' }); }
  let mapMode = 'overview';
  function embedMap(query) {
    // GCJ-02 search centre only, from Amap's public Longxiangqiao POI. No shop coordinates are fabricated.
    if (mapMode === 'search') return url('https://www.amap.com/ssr/embed/search', { keyword: query, lng: '120.164052', lat: '30.254642', city: '杭州', zoom: '16', platform: 'pc', src: 'shaojie.hubin-date' });
    return url('https://www.amap.com/ssr/embed/view', { lng: '120.164052', lat: '30.254642', zoom: '16', platform: 'pc', src: 'shaojie.hubin-date' });
  }
  function readSettings() {
    const params = new URLSearchParams(location.hash.slice(1));
    const result = { ...defaults };
    if (Object.hasOwn(plans, params.get('plan'))) result.plan = params.get('plan');
    if (/^(1[0-8]):[0-5]\d$|^19:00$/.test(params.get('start') || '')) result.start = params.get('start');
    ['kpop', 'dinner', 'sony'].forEach((key) => { if (params.has(key)) result[key] = params.get(key) !== '0'; });
    return result;
  }
  let settings = readSettings();
  let selectedId = 'meet';
  let current = null;
  let toastTimer;
  let mapTimer;
  const kmRange = (range) => `${(Math.floor(range[0] / 100) / 10).toFixed(1)}–${(Math.ceil(range[1] / 100) / 10).toFixed(1)} km`;
  const money = (range) => range[1] === 0 ? '免费逛' : `¥${range[0]}–${range[1]}`;
  function clock(minutes) { return `${minutes >= 1440 ? '次日 ' : ''}${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  function durationText(minutes) { const h = Math.floor(minutes / 60), m = minutes % 60; return `${h ? `${h}小时` : ''}${m ? `${m}分` : ''}` || '0分'; }
  function metersText(range) { return `${range[0]}–${range[1]}米`; }
  function addRange(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function leg(from, to) {
    const indoor = (walk, minutes, text) => ({ walk, minutes, outdoor: [0, 0], text });
    if (!from) return indoor([0, 0], 0, '旅程从这里开始');
    if (to.id === 'meet') return indoor([150, 250], 5, '沿地铁商场连通口进入B区');
    if (to.id === 'kpop') return indoor([50, 150], 3, 'B区地下同区内走，找B2导览');
    if (to.id === 'anime') return indoor(from.id === 'kpop' ? [250, 400] : [200, 350], 8, '沿地下通道去C区，注意切换到B1');
    if (to.id === 'board') return indoor([200, 350], 8, '地下通道到工联CC，再乘电梯到6楼');
    if (to.id === 'craft') return { walk: [400, 600], minutes: 12, outdoor: [200, 300], text: '先经地下往D区，再撑伞去湖滨88' };
    if (to.id === 'sony') return indoor([50, 150], 4, '湖滨88内换层，查看导览');
    if (to.id === 'dinner') return indoor([100, 200], 4, '同楼选餐厅，电梯或扶梯换层');
    if (to.id === 'return') {
      if (from.building === 'hubin88') return { walk: [400, 600], minutes: 12, outdoor: [200, 300], text: '撑伞回in77地下，再进龙翔桥站' };
      return indoor([150, 300], 6, '沿地下商场连通口返回龙翔桥站');
    }
    return indoor([0, 0], 0, '同楼内步行');
  }
  function buildPlan() {
    const plan = plans[settings.plan];
    const list = ['station', 'meet'];
    if (settings.kpop) list.push('kpop');
    list.push('anime');
    if (plan.activity) list.push(plan.activity);
    if (settings.plan === 'craft' && settings.sony) list.push('sony');
    const stops = list.map((id) => ({ ...places[id], id }));
    if (settings.dinner) stops.push({ id: 'dinner', title: '一起吃晚饭', short: '晚饭', ...dinnerPlaces[plan.dinnerPlace], duration: 60, cost: [180, 260], category: '晚饭', description: '挑一家能正常说话、当天不用久等的餐厅。', tip: '同楼就近选餐厅，先看看排队情况。坐下来接着聊，行程不用卡得太紧。', caution: '这是双人餐饮预算，未指定餐厅或套餐。' });
    stops.push({ ...places.station, id: 'return', title: '回到龙翔桥 · 轻松返程', short: '地铁返程', area: '地铁1号线 · 按进站导览返回站厅', tip: '一起走回地铁口，道别也自然。雨天不必再为了“下一站”绕远路。', description: '留一点余韵，轻松结束这一下午。' });
    const [hour, minute] = settings.start.split(':').map(Number);
    let time = hour * 60 + minute;
    let cost = [0, 0], walk = [0, 0], outdoor = [0, 0];
    const categories = [];
    stops.forEach((stop, index) => {
      stop.leg = leg(stops[index - 1], stop);
      time += stop.leg.minutes;
      stop.arrival = time;
      time += stop.duration;
      stop.departure = time;
      cost = addRange(cost, stop.cost);
      walk = addRange(walk, stop.leg.walk);
      outdoor = addRange(outdoor, stop.leg.outdoor);
      if (stop.category) categories.push({ name: stop.category, range: stop.cost });
    });
    return { plan, stops, cost, walk, outdoor, categories, start: hour * 60 + minute, end: time, duration: time - hour * 60 - minute };
  }
  function persistSettings() {
    const params = new URLSearchParams({ plan: settings.plan, start: settings.start, kpop: settings.kpop ? '1' : '0', dinner: settings.dinner ? '1' : '0', sony: settings.sony ? '1' : '0' });
    history.replaceState(null, '', `${location.pathname}${location.search}#${params}`);
  }
  function render() {
    current = buildPlan();
    if (!current.stops.some((s) => s.id === selectedId)) selectedId = 'meet';
    document.querySelectorAll('[data-plan]').forEach((button) => {
      const active = button.dataset.plan === settings.plan;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#start-time').value = settings.start;
    $('#include-kpop').checked = settings.kpop;
    $('#include-dinner').checked = settings.dinner;
    $('#include-sony').checked = settings.sony;
    $('#sony-option').hidden = settings.plan !== 'craft';
    $('#budget-total').textContent = money(current.cost);
    $('#duration-total').textContent = `约${durationText(current.duration)}`;
    $('#time-range').textContent = `${settings.start} — ${clock(current.end)} · 含转场，不含排队`;
    $('#walk-total').textContent = kmRange(current.walk);
    $('#outdoor-total').textContent = current.outdoor[1] ? `${metersText(current.outdoor)}` : '以室内为主';
    $('#outdoor-note').textContent = current.outdoor[1] ? '已含去程与返回地铁的室外段' : '地下连通口正常开放时';
    const costLabels = ['饮品', plans[settings.plan].activity ? (settings.plan === 'craft' ? '拼豆' : '桌游') : null, settings.dinner ? '晚饭' : null].filter(Boolean);
    $('#budget-total').nextElementSibling.textContent = `含${costLabels.join('、')} · 购物另计`;
    $('#route-advice').textContent = current.plan.advice + (current.end > 22 * 60 ? ' 预计结束较晚，建议提前见面或取消晚饭，并确认门店营业时段。' : '');
    $('#route-ribbon').innerHTML = current.stops.map((stop, index) => `<button class="ribbon-stop ${stop.id === selectedId ? 'selected' : ''} ${current.stops[index + 1]?.leg.outdoor[1] ? 'outdoor' : ''}" data-stop="${stop.id}" aria-label="查看第${index + 1}站：${escapeHtml(stop.title)}" aria-pressed="${stop.id === selectedId}"><span class="node">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(stop.short)}</strong><small>${clock(stop.arrival)}${stop.duration ? ` · ${stop.duration}分钟` : ''}</small></button>`).join('');
    $('#itinerary').innerHTML = current.stops.map((stop, index) => {
      const next = current.stops[index + 1];
      return `<li><div class="time-col">${clock(stop.arrival)}</div><div><article class="stop-card ${stop.id === selectedId ? 'selected' : ''}" data-card="${stop.id}"><div class="stop-top"><button class="stop-select" data-stop="${stop.id}" aria-pressed="${stop.id === selectedId}"><span class="stop-number">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(stop.title)}</h3></button><span class="cost">${stop.category ? money(stop.cost) : stop.duration ? '免费逛' : '—'}</span></div><p class="location">${escapeHtml(stop.area)}</p><p class="description">${escapeHtml(stop.description)}</p><div class="stop-bottom"><span class="duration-chip">${stop.duration ? `${stop.duration}分钟 · ${clock(stop.arrival)}—${clock(stop.departure)}` : index ? '这次约会，到这里刚刚好' : '地铁出闸后开始计时'}</span><a href="${escapeHtml(amapSearch(stop.query))}" target="_blank" rel="noopener noreferrer">高德查店 ↗</a></div></article>${next ? `<div class="walk-segment ${next.leg.outdoor[1] ? 'outdoor' : ''}"><strong>${next.leg.outdoor[1] ? '☂ 需撑伞' : '↳ 室内 / 地下'} · ${metersText(next.leg.walk)} · 约${next.leg.minutes}分钟</strong><br>${escapeHtml(next.leg.text)}</div>` : ''}</div></li>`;
    }).join('');
    const maxCost = Math.max(...current.categories.map((c) => c.range[1]), 1);
    $('#budget-bars').innerHTML = current.categories.map((item) => `<div class="budget-row"><span>${item.name}</span><div class="budget-track"><span style="width:${Math.round(item.range[1] / maxCost * 100)}%"></span></div><strong>${money(item.range)}</strong></div>`).join('');
    persistSettings();
    selectStop(selectedId);
  }
  function selectStop(id, scroll = false) {
    const index = current.stops.findIndex((s) => s.id === id);
    if (index < 0) return;
    selectedId = id;
    const stop = current.stops[index];
    document.querySelectorAll('[data-stop]').forEach((button) => {
      const active = button.dataset.stop === id;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-card]').forEach((card) => card.classList.toggle('selected', card.dataset.card === id));
    $('#map-title').textContent = stop.title;
    $('#map-address').textContent = stop.area;
    $('#selected-tip').textContent = stop.tip;
    $('#selected-caution').innerHTML = stop.caution ? `<p class="caution">${escapeHtml(stop.caution)}</p>` : '';
    $('#amap-link').href = amapSearch(stop.query);
    $('#baidu-link').href = baiduSearch(stop.query);
    const previous = current.stops[index - 1];
    $('#walk-link').hidden = !previous;
    if (previous) {
      $('#walk-link').href = baiduWalk(previous.query, stop.query);
      $('#walk-link').textContent = '百度步行 ↗';
      $('#walk-link').setAttribute('aria-label', `百度步行：${previous.short}到${stop.short}`);
    }
    const nextUrl = embedMap(stop.query);
    if ($('#amap-frame').getAttribute('src') !== nextUrl) {
      $('#map-wait').classList.remove('done');
      $('#map-wait').innerHTML = '<span class="loading-dot"></span>正在载入高德地图…';
      $('#amap-frame').src = nextUrl;
      $('#amap-frame').title = mapMode === 'search' ? `高德地图检索：${stop.title}` : '高德地图：湖滨商圈总览';
      clearTimeout(mapTimer);
      mapTimer = setTimeout(() => {
        $('#map-wait').innerHTML = '地图加载较慢，可点下方“高德查店”打开。';
      }, 15000);
    }
    if (scroll) {
      const target = matchMedia('(max-width: 760px)').matches ? $('.map-section') : $(`[data-card="${id}"]`);
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
    }
  }
  function toast(text) {
    clearTimeout(toastTimer);
    $('#toast').textContent = text;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800);
  }
  async function copy(text, message) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      toast(message);
    } catch {
      $('#copy-fallback').value = text;
      $('#copy-dialog').showModal();
      $('#copy-fallback').focus();
      $('#copy-fallback').select();
    }
  }
  function itineraryText() {
    return [`湖滨雨天约会｜${current.plan.name}`, `见面 ${settings.start}，预计 ${clock(current.end)} 结束（含预计转场，不含排队）`, `双人预算 ${money(current.cost)}，转场步行约 ${(current.walk[0] / 1000).toFixed(1)}—${(current.walk[1] / 1000).toFixed(1)}公里`, `室外：${current.outdoor[1] ? `约${metersText(current.outdoor)}` : '以室内为主，需地下连通口正常开放'}`, '', ...current.stops.map((stop, i) => `${i + 1}. ${clock(stop.arrival)} ${stop.title}${stop.duration ? `｜${stop.duration}分钟` : ''}\n   ${stop.area}${stop.leg.minutes ? `\n   转场约${metersText(stop.leg.walk)} / ${stop.leg.minutes}分钟` : ''}`), '', '距离和预算均为规划估算；活动提前约位，楼层及通道以现场导览为准。', location.href].join('\n');
  }
  $('.skip-link').addEventListener('click', (event) => { event.preventDefault(); $('#planner').focus(); $('#planner').scrollIntoView(); });
  document.querySelectorAll('[data-plan]').forEach((button) => button.addEventListener('click', () => { settings.plan = button.dataset.plan; selectedId = plans[settings.plan].activity || 'anime'; render(); }));
  [['#include-kpop', 'kpop'], ['#include-dinner', 'dinner'], ['#include-sony', 'sony']].forEach(([selector, key]) => $(selector).addEventListener('change', (event) => { settings[key] = event.target.checked; render(); }));
  $('#start-time').addEventListener('change', (event) => {
    if (!event.target.validity.valid || !/^(1[0-8]):[0-5]\d$|^19:00$/.test(event.target.value)) { event.target.value = settings.start; toast('建议选择10:00—19:00之间的见面时间'); return; }
    settings.start = event.target.value; render();
  });
  $('#route-ribbon').addEventListener('click', (event) => { const button = event.target.closest('[data-stop]'); if (button) selectStop(button.dataset.stop, true); });
  $('#itinerary').addEventListener('click', (event) => { if (event.target.closest('a')) return; const target = event.target.closest('[data-stop]') || event.target.closest('[data-card]'); if (target) selectStop(target.dataset.stop || target.dataset.card, true); });
  $('#reset-btn').addEventListener('click', () => { settings = { ...defaults }; selectedId = 'meet'; render(); toast('已恢复推荐路线'); });
  $('#share-btn').addEventListener('click', () => copy(location.href, '方案链接已复制，打开后保留你的选择'));
  $('#copy-btn').addEventListener('click', () => copy(itineraryText(), '完整行程已复制'));
  $('#print-btn').addEventListener('click', () => window.print());
  document.querySelectorAll('[data-map-mode]').forEach((button) => button.addEventListener('click', () => {
    mapMode = button.dataset.mapMode;
    document.querySelectorAll('[data-map-mode]').forEach((item) => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    selectStop(selectedId);
  }));
  $('#amap-frame').addEventListener('load', () => { clearTimeout(mapTimer); $('#map-wait').classList.add('done'); });
  window.addEventListener('hashchange', () => { settings = readSettings(); render(); });
  $('#alternative-list').innerHTML = alternatives.map(([name, note, query]) => `<li><a href="${escapeHtml(amapSearch(query))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)} ↗</a><br>${escapeHtml(note)}</li>`).join('');
  render();
})();

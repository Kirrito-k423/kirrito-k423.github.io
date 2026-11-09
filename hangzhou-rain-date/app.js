(() => {
  'use strict';
  const C = window.HubinCore;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const link = (base, params) => `${base}?${new URLSearchParams(params)}`;
  const amap = (q) => link('https://uri.amap.com/search', { keyword:q, city:'杭州', view:'map', callnative:'0', src:'shaojie.hubin-date' });
  const baidu = (q) => link('https://api.map.baidu.com/place/search', { query:q, region:'杭州', output:'html', src:'webapp.shaojie.hubindate' });
  const baiduWalk = (a,b) => link('https://api.map.baidu.com/direction', { origin:a, destination:b, mode:'walking', region:'杭州', output:'html', src:'webapp.shaojie.hubindate' });
  let state = C.parseState(location.hash);
  let anchors, routeData, contextData, map, trip;
  let category = 'all', focusedPlace = null, selectedLeg = null, currentPanel = null;
  let markerLayer, routeLayer, contextLayer, labelLayer, tileLayer;
  let lineStyles = [], preview = null, frame = null, walker = null, toastTimer;
  const selectedColor = '#226b58';
  const loadJSON = async (name) => { const r = await fetch(`./data/${name}`); if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`); return r.json(); };
  const isSmall = () => innerWidth <= 680;
  const at = (anchorId) => [anchors[anchorId].lat, anchors[anchorId].lng];
  const venueQuery = (visit) => C.venues[visit.id]?.query || (visit.anchor === 'station' ? '杭州 龙翔桥地铁站 C口' : `杭州 ${anchors[visit.anchor].name}`);

  function toast(text) {
    clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800);
  }
  function closePanel() {
    $('#detail-panel').hidden = true; document.body.classList.remove('panel-open');
    focusedPlace = null; selectedLeg = null; currentPanel = null;
    if (map) { drawMarkers(); highlightLeg(null); }
  }
  function openPanel(label, content, type) {
    $('#panel-eyebrow').textContent = label; $('#panel-content').innerHTML = content;
    $('#detail-panel').hidden = false; document.body.classList.add('panel-open'); currentPanel = type;
    $('#panel-content').scrollTop = 0; $('#map-instruction').hidden = true;
  }
  function locateFocused(anchorId) {
    if (!map) return;
    // Place the selected building clear of the drawer, using a viewport pixel offset.
    const targetPoint = map.latLngToContainerPoint(at(anchorId));
    const targetX = isSmall() ? innerWidth * .5 : innerWidth * .53;
    const targetY = isSmall() ? innerHeight * .33 : innerHeight * .42;
    map.panBy([targetPoint.x - targetX, targetPoint.y - targetY], { animate:!matchMedia('(prefers-reduced-motion: reduce)').matches, duration:.25 });
  }
  function openPlace(id, pan = true) {
    selectedLeg = null; focusedPlace = id;
    if (id === 'station') {
      openPanel('起点 / 返程点', `<span class="panel-tag">地铁1号线 · C口</span><h2>龙翔桥C口</h2><p class="panel-address">从这里出发，轻松逛一圈。</p><p>默认回到同一出口。C口坐标来自OSM的地铁出入口，商场地下连通口请以现场导览为准。</p><div class="button-row"><a class="secondary-button" href="${esc(amap('杭州 龙翔桥 C口'))}" target="_blank" rel="noopener noreferrer">高德查看 ↗</a><a class="secondary-button" href="${esc(baidu('杭州 龙翔桥 C口'))}" target="_blank" rel="noopener noreferrer">百度查看 ↗</a></div><div class="coordinates-note">地铁出入口点位：OpenStreetMap node/5027727108。这里不是实时定位，不会读取你的位置。</div>`, { type:'place', id });
      drawMarkers(); highlightLeg(null); if (pan) locateFocused('station'); return;
    }
    const v = C.venues[id]; if (!v) return;
    const chosen = state.ids.includes(id);
    const visit = trip.visits.find((p) => p.id === id);
    openPanel(`${v.type} / ${anchors[v.anchor].name}`, `<div class="venue-category"><span class="category-symbol">${v.icon}</span><span>${v.type} · ${chosen ? `已选第${state.ids.indexOf(id)+1}站` : '备选店铺'}</span></div><h2>${esc(v.name)}</h2><p class="panel-address">${esc(v.floor)}</p><p>${esc(v.address)}</p><div class="panel-stats"><div><strong>${v.duration}分钟</strong><span>${visit ? `${C.clock(visit.arrival)}—${C.clock(visit.departure)}` : '建议停留'}</span></div><div><strong>${C.money(v.cost)}</strong><span>双人预留 · 购物另计</span></div></div><button class="${chosen ? 'danger-button' : 'primary-button'}" data-toggle-place="${id}">${chosen ? '− 移出这次行程' : '＋ 加入行程，接在最后一站'}</button><div class="button-row"><a class="secondary-button" href="${esc(amap(v.query))}" target="_blank" rel="noopener noreferrer">高德查店 ↗</a><a class="secondary-button" href="${esc(baidu(v.query))}" target="_blank" rel="noopener noreferrer">百度查店 ↗</a></div><h3>这一站怎么安排</h3><p>${esc(v.tip)}</p><p class="rain-note">☂ ${esc(v.rain)}</p><div class="coordinates-note">${esc(v.locationNote)}</div>${v.source ? `<a class="inline-link" href="${esc(v.source)}" target="_blank" rel="noopener noreferrer">查看店铺资料 ↗</a>` : ''}`, { type:'place', id });
    drawMarkers(); highlightLeg(null); if (pan) locateFocused(v.anchor);
  }
  function stepText(step, index) {
    const road = step.name || '步行通道';
    const modifier = step.maneuver?.modifier || '';
    if (step.maneuver?.type === 'depart') return `从${road}附近出发`;
    if (step.maneuver?.type === 'arrive') return '到达目的地附近道路，入店看商场导览';
    const turns = { left:'左转', right:'右转', 'slight left':'向左前方', 'slight right':'向右前方', 'sharp left':'向左后方', 'sharp right':'向右后方', uturn:'掉头', straight:'继续直行' };
    return `${index === 0 ? '沿' : (turns[modifier] ? `${turns[modifier]}，沿` : '沿')}${road}行走`;
  }
  function openLeg(id, pan = true) {
    const leg = trip.legs.find((r) => r.id === Number(id)); if (!leg) return;
    focusedPlace = null; selectedLeg = leg.id;
    const footRoute = leg.route;
    const same = leg.sameBuilding;
    const names = footRoute ? [...new Set(footRoute.steps.map((s) => s.name).filter(Boolean))].join(' → ') : '';
    const fromQuery = venueQuery(leg.from), toQuery = venueQuery(leg.to);
    const extraSnap = footRoute ? Math.round(footRoute.waypoints.reduce((sum, p) => sum + p.distance, 0)) : 0;
    const rain = same ? '同一商场内的楼层与铺位变换，不绘制虚构的楼内路径。' : leg.from.anchor === 'book' || leg.to.anchor === 'book' ? '书店这段室外转场较长，雨大时可从行程中取消。' : leg.from.anchor === 'hubin88' || leg.to.anchor === 'hubin88' ? '湖滨88转场按需要撑伞安排，地图不保证全程有顶棚。' : 'in77与工联CC之间可优先找地下商业连通口；当前曲线是公开步行路网方案，不能据此认定全程避雨。';
    openPanel(`路线段 ${leg.id+1} / ${same ? '楼内换层' : '真实步行道路'}`, `<span class="panel-tag">${same ? '同一商场 · 无道路曲线' : 'OSRM foot · OSM步行路网'}</span><h2>${esc(leg.from.name)}<br><span style="color:var(--muted);font-weight:400">↓</span><br>${esc(leg.to.name)}</h2><div class="panel-stats"><div><strong>${same ? '同楼' : footRoute ? C.distance(leg.distance) : '待核实'}</strong><span>${same ? '地图不绘楼内路径' : '道路段距离，不含入店接驳'}</span></div><div><strong>${leg.minutes}分钟</strong><span>${C.clock(leg.start)}—${C.clock(leg.end)} · 含预计进出店</span></div></div>${footRoute ? `<button class="primary-button" data-play-leg="${leg.id}">▶ 只播放这一段走法</button>` : ''}<div class="button-row"><a class="secondary-button" href="${esc(baiduWalk(fromQuery,toQuery))}" target="_blank" rel="noopener noreferrer">百度步行导航 ↗</a><a class="secondary-button" href="${esc(amap(toQuery))}" target="_blank" rel="noopener noreferrer">高德看终点 ↗</a></div><p class="rain-note">☂ ${rain}</p>${footRoute ? `<h3>沿途道路</h3><p>${esc(names || '开放步行通道')}</p><div>${footRoute.steps.map((s,i) => `<div class="road-step"><span>${String(i+1).padStart(2,'0')}</span><div>${esc(stepText(s,i))}${s.distance > 0 ? `<small>${Math.round(s.distance)}米</small>` : ''}</div></div>`).join('')}</div><div class="coordinates-note">曲线由步行路线服务返回，共${footRoute.geometry.coordinates.length}个道路坐标点。建筑代表点已吸附到可步行路网，起终点入店接驳合计约${extraSnap}米，未算入上方道路距离。数据快照：2026.11.09，不是实时通行保证。</div>` : '<p>店内位置与上下楼路线请看商场导览，不能用建筑代表点推断店内路径。</p>'}`, {type:'leg',id:leg.id});
    drawMarkers(); highlightLeg(leg.id);
    if (pan && footRoute) fitGeometry(footRoute.geometry.coordinates, true);
  }
  function openJourney() {
    const sequence = trip.visits.map((visit,i) => {
      const venue = C.venues[visit.id];
      const index = state.ids.indexOf(visit.id);
      const meal = trip.dinner && visit.id === state.ids[state.ids.length-1] ? `<li class="journey-row"><span class="row-number">☕</span><button class="journey-title" data-open-settings><strong>晚饭预留 · 餐厅待选</strong><small>${C.clock(trip.dinner.arrival)} · 60分钟，不添加虚构地图点</small></button></li>` : '';
      return `<li class="journey-row"><span class="row-number">${String(i).padStart(2,'0')}</span><button class="journey-title" ${venue ? `data-open-place="${visit.id}"` : visit.anchor === 'station' ? 'data-open-place="station"' : 'data-open-settings'}><strong>${esc(visit.name)}</strong><small>${C.clock(visit.arrival)}${visit.duration ? ` · 停留${visit.duration}分钟` : ''}</small></button>${venue ? `<div class="order-buttons"><button data-order="up" data-id="${visit.id}" aria-label="上移${esc(visit.name)}" ${index===0?'disabled':''}>↑</button><button data-order="down" data-id="${visit.id}" aria-label="下移${esc(visit.name)}" ${index===state.ids.length-1?'disabled':''}>↓</button><button data-remove="${visit.id}" aria-label="移除${esc(visit.name)}">×</button></div>` : ''}</li>${meal}${trip.legs[i] ? `<li><button class="route-mini" data-open-leg="${trip.legs[i].id}">${trip.legs[i].sameBuilding ? '↳ 楼内换层' : `↳ ${C.distance(trip.legs[i].distance)}道路步行`} · 约${trip.legs[i].minutes}分钟　查看 →</button></li>` : ''}`;
    }).join('');
    openPanel('行程顺序 / 可调整', `<h2>这次，怎么逛</h2><p>在地图上点选店铺加入，按加入顺序连路。上下移动站点，路线会重新绘制。</p><ul class="journey-list">${sequence}</ul><button id="copy-itinerary" class="primary-button">复制这份文字行程</button><div class="button-row"><button id="clear-places" class="secondary-button">清空，自己选点</button><button data-open-settings class="secondary-button">时间 / 晚饭</button></div>`, {type:'journey'});
    focusedPlace = null; selectedLeg = null; drawMarkers(); highlightLeg(null);
  }
  function openSettings() {
    openPanel('行程设置 / 自动更新', `<h2>留一点弹性</h2><label class="setting-row">见面时间<input id="start-time" type="time" value="${state.start}" min="10:00" max="19:00" required></label><label class="setting-row">预留一顿晚饭<input id="include-dinner" type="checkbox" ${state.dinner?'checked':''}></label><label class="setting-row">最后回到龙翔桥C口<input id="include-loop" type="checkbox" ${state.loop?'checked':''}></label><p class="muted-note">晚饭预留双人¥180—260、60分钟。餐厅尚未选定，暂放末站附近，实际餐厅转场未计；店铺内换层另留时间。</p><h3>双人预算</h3>${[...trip.visits,...(trip.dinner?[trip.dinner]:[])].filter((v) => v.cost[1] > 0).map((v) => `<div class="cost-item"><span>${esc(v.name)}</span><strong>${C.money(v.cost)}</strong></div>`).join('')}<div class="panel-divider"></div><div class="cost-item"><strong>合计预留</strong><strong>${C.money(trip.cost)}</strong></div><p class="muted-note">费用为预留金额，不是实时报价；不含购物、交通和停车。活动先确认双人预约、教学、最低消费与周末团购条件。</p>${trip.end>22*60?'<p class="rain-note">预计结束晚于22:00，建议提前见面、减少站点，并确认门店营业时段。</p>':''}`, {type:'settings'});
  }
  function openHelp() {
    openPanel('地图说明 / 来源', `<span class="panel-tag">MAP FIRST · 2026.11.09</span><h2>点在地图上，<br>路也在地图上。</h2><h3>怎么用</h3><p>① 点店铺标记，加入或移出行程。<br>② 点一条路线，展开距离、道路与逐步走法。<br>③ 点“播放走法”，看圆点沿实际道路坐标移动。<br>④ “行程”里可上下调整顺序，分享链接会保留选择。</p><h3>点位与道路</h3><p>底图来自OpenStreetMap的真实道路、建筑与湖岸。商场内店铺共用建筑代表点，楼层在详情里标注；不假装拥有店内精确坐标。</p><p>有色实线是FOSSGIS/OSRM步行服务返回的道路曲线。短灰虚线仅表示建筑代表点到路网吸附点的接驳，不是已核实的楼内走法。相同商场内换层不画假路线。</p><p class="rain-note">步行路网不等于避雨路线。地下通道与入店路线以现场导览为准，商场开放和门店营业请出发前确认。</p><h3>地图与数据</h3><ul class="source-list"><li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors · ODbL</a>：建筑/道路/湖岸，2026.11.09快照。</li><li><a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM foot</a>：30组定向步行路线快照。</li><li><a href="https://m.winshang.com/news712947.html" target="_blank" rel="noopener noreferrer">in77地下连通资料</a>；具体通道现场确认。</li><li><a href="https://www.thepaper.cn/newsDetail_forward_34300062" target="_blank" rel="noopener noreferrer">湖滨88近期运营变更</a>；先确认手工门店营业。</li></ul><p class="muted-note">默认“简洁路网”直接加载本页数据。右侧▧可切换标准在线街道底图；网络不通时仍可看本地路网与已缓存道路路线。不获取实时定位，不含追踪脚本。</p>`, {type:'help'});
  }
  function update(panelRefresh = true) {
    stopPreview(); trip = C.buildTrip(state,anchors,routeData.routes);
    history.replaceState(null,'',`${location.pathname}${location.search}#${C.serializeState(state)}`);
    $('#plan-title').textContent = trip.name;
    $('#stop-count').textContent = state.ids.length;
    $('#walk-total').textContent = C.distance(trip.distance);
    $('#duration-total').textContent = C.duration(trip.duration);
    $('#time-range').textContent = `${state.start}—${C.clock(trip.end)}`;
    $('#budget-total').textContent = C.money(trip.cost);
    $('#play-button').disabled = !trip.legs.some((leg) => leg.route);
    $('#map-status').textContent = trip.unknown ? `${trip.unknown}段尚无道路数据` : '步行路网快照 · 商场内换层另计';
    document.querySelectorAll('[data-preset]').forEach((b) => { const active=b.dataset.preset===state.plan; b.classList.toggle('active',active); b.setAttribute('aria-pressed',String(active)); });
    drawRoutes(); drawMarkers();
    if (panelRefresh && currentPanel) {
      const panel = {...currentPanel};
      if (panel.type==='place') openPlace(panel.id,false);
      if (panel.type==='leg') { if(trip.legs.some((l)=>l.id===panel.id))openLeg(panel.id,false);else closePanel(); }
      if (panel.type==='journey') openJourney();
      if (panel.type==='settings') openSettings();
    }
  }
  function togglePlace(id) {
    if (!C.venues[id]) return;
    if (state.ids.includes(id)) state.ids = state.ids.filter((v) => v!==id);
    else state.ids.push(id);
    state.plan='custom'; update(false); openPlace(id,false);
  }
  function centerOf(feature) {
    let coords=feature.geometry.coordinates;
    if(feature.geometry.type==='Polygon')coords=coords[0];
    if(feature.geometry.type==='MultiPolygon')coords=coords[0][0];
    if(!coords?.length||typeof coords[0]?.[0]!=='number')return null;
    return [coords.reduce((a,p)=>a+p[1],0)/coords.length,coords.reduce((a,p)=>a+p[0],0)/coords.length];
  }
  function initContext() {
    const selectedBuildings = new Set(Object.values(anchors).map((a)=>a.osm));
    contextLayer = L.geoJSON(contextData, { pane:'context', interactive:false, style(feature) {
      const p=feature.properties;
      if(p.natural==='water')return {color:'#a6c7bf',weight:1,fillColor:'#d0e6dd',fillOpacity:1};
      if(p.leisure==='park')return {color:'#d9e3c9',weight:1,fillColor:'#e0e8d4',fillOpacity:1};
      if(p.building)return {color:selectedBuildings.has(p.osm_id)?'#bdccb1':'#d7dfcf',weight:1,fillColor:selectedBuildings.has(p.osm_id)?'#dbe5cf':'#e4e9dd',fillOpacity:1};
      const main=['primary','secondary','tertiary'].includes(p.highway);
      return {color:main?'#fffdf5':'#f9fbf4',weight:main?10:p.highway==='pedestrian'?7:3,opacity:1,lineCap:'round'};
    }}).addTo(map);
    labelLayer=L.layerGroup().addTo(map);
    let roadNames=new Set();
    contextData.features.forEach((f)=>{
      const p=f.properties,center=centerOf(f);if(!center||!p.name)return;
      if(p.natural==='water')return;
      let cls='minor';
      if(p.building){ if(!selectedBuildings.has(p.osm_id))return;cls='building'; }
      else if(p.highway){if(roadNames.has(p.name)||!['平海路','延安路','学士路','仁和路','东坡路','吴山路','解放路','青年路'].includes(p.name))return;roadNames.add(p.name);cls='road';}
      else return;
      L.marker(center,{interactive:false,keyboard:false,icon:L.divIcon({className:'map-label '+cls,html:esc(p.name.replace('湖滨银泰','').replace('杭州市','')),iconSize:[140,12],iconAnchor:[70,6]})}).addTo(labelLayer);
    });
    L.marker([30.2551,120.1557],{interactive:false,keyboard:false,icon:L.divIcon({className:'map-label lake',html:'西 湖',iconSize:[100,30],iconAnchor:[50,15]})}).addTo(labelLayer);
  }
  function drawMarkers() {
    if(!markerLayer)return;markerLayer.clearLayers();
    const groups={station:[]};
    Object.values(C.venues).forEach((v)=>{ if(category!=='all'&&v.category!==category&&!state.ids.includes(v.id))return;(groups[v.anchor] ||= []).push(v); });
    Object.entries(groups).forEach(([anchorId,list])=>{
      L.circleMarker(at(anchorId),{pane:'anchorDots',radius:4,color:'#fff',weight:2,fillColor:selectedColor,fillOpacity:1,interactive:false}).addTo(markerLayer);
      let chips=anchorId==='station'?`<button class="venue-chip selected ${focusedPlace==='station'?'focused':''}" data-map-place="station"><i>↗</i><span>龙翔桥C口<small>起点${state.loop?' / 返程点':''}</small></span></button>`:'';
      chips+=list.map((v)=>{const selected=state.ids.includes(v.id);return `<button class="venue-chip ${selected?'selected':''} ${focusedPlace===v.id?'focused':''}" data-map-place="${v.id}" aria-label="${esc(v.name)}，${selected?'已选，点击查看或移出':'点击查看并加入行程'}"><i>${selected?String(state.ids.indexOf(v.id)+1).padStart(2,'0'):v.icon}</i><span>${esc(v.short)}<small>${esc(v.type)} · ${v.duration}分钟</small></span></button>`;}).join('');
      const html=`<div class="venue-stack">${chips}</div>`;
      const marker=L.marker(at(anchorId),{pane:'merchantPins',keyboard:false,interactive:true,icon:L.divIcon({className:'venue-map-icon',html,iconSize:[0,0],iconAnchor:[0,0]})}).addTo(markerLayer);
      const node=marker.getElement();L.DomEvent.disableClickPropagation(node);L.DomEvent.disableScrollPropagation(node);
      node.querySelectorAll('[data-map-place]').forEach((button)=>button.addEventListener('click',(event)=>{event.stopPropagation();openPlace(button.dataset.mapPlace);}));
    });
  }
  function drawRoutes() {
    routeLayer.clearLayers();lineStyles=[];
    for(const leg of trip.legs){
      if(!leg.route)continue;
      const coordinates=leg.route.geometry.coordinates;
      const latlngs=coordinates.map((p)=>[p[1],p[0]]);
      L.polyline(latlngs,{pane:'tripLines',color:'#f9fcf4',weight:10,opacity:.95,interactive:false}).addTo(routeLayer);
      const line=L.polyline(latlngs,{pane:'tripLines',color:selectedColor,weight:4,opacity:.8,lineCap:'round',className:'route-line'}).addTo(routeLayer);
      const hit=L.polyline(latlngs,{pane:'tripHits',color:selectedColor,weight:21,opacity:0,bubblingMouseEvents:false}).addTo(routeLayer);
      hit.bindTooltip(`${esc(leg.from.name)} → ${esc(leg.to.name)} · ${Math.round(leg.distance)}米`,{sticky:true,className:'road-tooltip'});
      hit.on('click',()=>openLeg(leg.id));
      const element=hit.getElement();element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label',`第${leg.id+1}段步行路线：${leg.from.name}到${leg.to.name}，${Math.round(leg.distance)}米`);element.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLeg(leg.id);}});
      // Access connectors are deliberately dashed, and excluded from the road animation.
      [[leg.from.anchor,coordinates[0]],[leg.to.anchor,coordinates[coordinates.length-1]]].forEach(([id,p])=>{
        if(C.haversine([anchors[id].lng,anchors[id].lat],p)>4)L.polyline([at(id),[p[1],p[0]]],{pane:'tripLines',color:'#97a98c',weight:1.2,opacity:.75,dashArray:'3 5',interactive:false}).addTo(routeLayer);
      });
      const middle=coordinates[Math.floor(coordinates.length*.5)];
      L.circleMarker([middle[1],middle[0]],{pane:'tripLines',radius:2,color:selectedColor,weight:1,fillOpacity:1,interactive:false}).addTo(routeLayer);
      lineStyles.push({id:leg.id,line,hit});
    }
    highlightLeg(selectedLeg);
  }
  function highlightLeg(id) {for(const item of lineStyles)item.line.setStyle({color:item.id===id?'#bd704f':selectedColor,weight:item.id===id?6:4,opacity:id===null?.8:item.id===id?1:.28});}
  function fitGeometry(coords,withPanel=false) {
    if(!coords.length)return;
    const bounds=L.latLngBounds(coords.map((p)=>[p[1],p[0]]));
    map.fitBounds(bounds,{paddingTopLeft:isSmall()?[28,210]:[110,160],paddingBottomRight:isSmall()?[55,withPanel?innerHeight*.57:215]:[withPanel?415:95,160],maxZoom:18,animate:false});
  }
  function fitAll(selectedOnly=false) {
    const anchorIds=new Set(['station']);
    if(selectedOnly&&state.ids.length)state.ids.forEach((id)=>anchorIds.add(C.venues[id].anchor));
    else Object.values(C.venues).forEach((v)=>{if(category==='all'||v.category===category||state.ids.includes(v.id))anchorIds.add(v.anchor);});
    fitGeometry([...anchorIds].map((id)=>[anchors[id].lng,anchors[id].lat]),false);
  }
  function stopPreview() {
    if(frame)cancelAnimationFrame(frame);frame=null;preview=null;
    if(walker){walker.remove();walker=null;}
    $('#play-icon').textContent='▶';$('#play-label').textContent='播放走法';$('#preview-status').textContent='沿真实道路坐标加速预览';
  }
  function play(legs=trip.legs) {
    stopPreview();const track=C.makeTrack(legs);if(!track.total)return;
    const initial=C.positionOnTrack(track,0);
    walker=L.marker([initial.lat,initial.lng],{pane:'walker',keyboard:false,interactive:false,icon:L.divIcon({className:'walker-icon',html:'↟',iconSize:[27,27],iconAnchor:[13.5,13.5]})}).addTo(map);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    preview={track,start:performance.now(),duration:reduced?12000:24000,lastLeg:-1};
    $('#play-icon').textContent='■';$('#play-label').textContent='停止预览';
    function tick(now){
      if(!preview)return;
      const progress=Math.min(1,(now-preview.start)/preview.duration),position=C.positionOnTrack(track,progress*track.total);
      walker.setLatLng([position.lat,position.lng]);
      if(position.legId!==preview.lastLeg){preview.lastLeg=position.legId;const leg=trip.legs.find((l)=>l.id===position.legId);$('#preview-status').textContent=`${leg?.from.name} → ${leg?.to.name}`;highlightLeg(position.legId);}
      if(progress>=1){$('#play-icon').textContent='▶';$('#play-label').textContent='再走一遍';$('#preview-status').textContent='道路走法预览完成';preview=null;frame=null;highlightLeg(selectedLeg);return;}
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  async function copy(text,message){try{await navigator.clipboard.writeText(text);toast(message);}catch{$('#copy-fallback').value=text;$('#copy-dialog').showModal();$('#copy-fallback').focus();$('#copy-fallback').select();}}
  function itineraryText(){return [`湖滨约会地图｜${trip.name}`,`${state.start}出发，预计${C.clock(trip.end)}结束`,`${C.money(trip.cost)}双人预留，道路步行${C.distance(trip.distance)}`, ...trip.visits.flatMap((v,i)=>[`${i}. ${C.clock(v.arrival)} ${v.name}${v.duration?`（${v.duration}分钟）`:''}`,...(trip.dinner&&v.id===state.ids[state.ids.length-1]?[`   ${C.clock(trip.dinner.arrival)} 晚饭预留60分钟（餐厅待选，转场未计）`]:[])]),'路线是步行路网快照，商场内换层、餐厅实际转场与排队另计。',location.href].join('\n');}
  function toggleBasemap(){
    if(tileLayer){map.removeLayer(tileLayer);tileLayer=null;contextLayer.addTo(map);labelLayer.addTo(map);$('#base-button').setAttribute('aria-pressed','false');toast('已切回简洁路网');return;}
    contextLayer.remove();labelLayer.remove();let errors=0;
    tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,minZoom:14,keepBuffer:1,referrerPolicy:'strict-origin-when-cross-origin',attribution:'© OpenStreetMap contributors'}).addTo(map);
    tileLayer.on('tileerror',()=>{if(++errors===4&&tileLayer){map.removeLayer(tileLayer);tileLayer=null;contextLayer.addTo(map);labelLayer.addTo(map);$('#base-button').setAttribute('aria-pressed','false');toast('标准底图暂不可用，继续显示本地真实路网');}});
    $('#base-button').setAttribute('aria-pressed','true');toast('已切换标准在线街道底图');
  }
  async function init(){
    try{
      if(!window.L)throw new Error('地图绘制库未加载');
      [anchors,routeData,contextData]=await Promise.all([loadJSON('anchors.json'),loadJSON('walking-routes.json'),loadJSON('context.geojson')]);
      map=L.map('map',{zoomControl:false,attributionControl:false,minZoom:14,maxZoom:19,preferCanvas:false}).setView([30.2555,120.1595],17);
      map.createPane('context').style.zIndex=250;map.createPane('tripLines').style.zIndex=410;map.createPane('tripHits').style.zIndex=420;map.createPane('anchorDots').style.zIndex=430;map.createPane('merchantPins').style.zIndex=500;map.createPane('walker').style.zIndex=590;
      contextLayer=L.layerGroup();labelLayer=L.layerGroup();markerLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);
      initContext();L.control.scale({imperial:false,position:'bottomleft',maxWidth:90}).addTo(map);
      update(false);fitAll(false);
      map.on('click',()=>{if(currentPanel)closePanel();});
      map.on('zoomend',()=>{const show=map.getZoom()>=17;if(labelLayer)labelLayer.eachLayer((layer)=>{const node=layer.getElement?.();if(node)node.style.opacity=show?'1':'.65';});});
      window.addEventListener('resize',()=>map.invalidateSize({pan:false}));
      bindUI();
    }catch(error){$('#map-status').textContent='地图暂未载入，请刷新重试';$('#map-status').classList.add('error');console.error(error);}
  }
  function bindUI(){
    document.querySelectorAll('[data-preset]').forEach((button)=>button.addEventListener('click',()=>{state.plan=button.dataset.preset;state.ids=C.presets[state.plan].ids.slice();closePanel();update(false);fitAll(true);if(state.plan==='custom')toast('点击地图上的店铺，加入这次行程');}));
    document.querySelectorAll('[data-category]').forEach((button)=>button.addEventListener('click',()=>{category=button.dataset.category;document.querySelectorAll('[data-category]').forEach((b)=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});drawMarkers();fitAll(false);}));
    $('#close-panel').addEventListener('click',closePanel);$('#journey-button').addEventListener('click',openJourney);$('#settings-button').addEventListener('click',openSettings);$('#help-button').addEventListener('click',openHelp);
    $('#fit-button').addEventListener('click',()=>{closePanel();fitAll(false);});$('#zoom-in').addEventListener('click',()=>map.zoomIn());$('#zoom-out').addEventListener('click',()=>map.zoomOut());$('#base-button').addEventListener('click',toggleBasemap);
    $('#play-button').addEventListener('click',()=>{if(preview){stopPreview();highlightLeg(selectedLeg);}else play();});
    $('#share-button').addEventListener('click',()=>copy(location.href,'方案链接已复制，保留选点与顺序'));
    $('#dismiss-instruction').addEventListener('click',()=>$('#map-instruction').hidden=true);
    $('#panel-content').addEventListener('click',(event)=>{
      const target=event.target.closest('button');if(!target)return;
      if(target.hasAttribute('data-toggle-place'))togglePlace(target.dataset.togglePlace);
      else if(target.hasAttribute('data-open-place'))openPlace(target.dataset.openPlace);
      else if(target.hasAttribute('data-open-leg'))openLeg(target.dataset.openLeg);
      else if(target.hasAttribute('data-play-leg')){const leg=trip.legs.find((l)=>l.id===Number(target.dataset.playLeg));if(leg)play([leg]);}
      else if(target.hasAttribute('data-open-settings'))openSettings();
      else if(target.hasAttribute('data-order')){const i=state.ids.indexOf(target.dataset.id),j=i+(target.dataset.order==='up'?-1:1);if(j>=0&&j<state.ids.length){[state.ids[i],state.ids[j]]=[state.ids[j],state.ids[i]];state.plan='custom';update(false);openJourney();}}
      else if(target.hasAttribute('data-remove')){state.ids=state.ids.filter((id)=>id!==target.dataset.remove);state.plan='custom';update(false);openJourney();}
      else if(target.id==='copy-itinerary')copy(itineraryText(),'文字行程已复制');
      else if(target.id==='clear-places'){state.ids=[];state.plan='custom';closePanel();update(false);fitAll(false);toast('行程已清空，在地图上点选店铺');}
    });
    $('#panel-content').addEventListener('change',(event)=>{
      const target=event.target;
      if(target.id==='start-time'){if(!/^(1[0-8]):[0-5]\d$|^19:00$/.test(target.value)){target.value=state.start;toast('请选择10:00—19:00之间的时间');return;}state.start=target.value;}
      else if(target.id==='include-dinner')state.dinner=target.checked;
      else if(target.id==='include-loop')state.loop=target.checked;
      else return;update();
    });
    window.addEventListener('hashchange',()=>{state=C.parseState(location.hash);closePanel();update(false);fitAll(true);});
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closePanel();stopPreview();}});
  }
  init();
})();

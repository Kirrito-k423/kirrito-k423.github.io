const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../planner-core.js');
const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name)));
const anchors = load('anchors.json');
const data = load('walking-routes.json');

test('all supported building pairs have actual, correctly ordered foot route coordinates', () => {
  assert.equal(data.profile, 'foot');
  assert.equal(Object.keys(data.routes).length, 30);
  for (const [key, route] of Object.entries(data.routes)) {
    assert.equal(`${route.from}>${route.to}`, key);
    assert.ok(route.distance > 0 && route.duration > 0);
    assert.ok(route.geometry.coordinates.length > 2, key);
    assert.ok(C.haversine(route.geometry.coordinates[0], route.waypoints[0].location) < 2, key);
    assert.ok(C.haversine(route.geometry.coordinates.at(-1), route.waypoints[1].location) < 2, key);
    for (const [lng, lat] of route.geometry.coordinates) {
      assert.ok(lng > 120.15 && lng < 120.17 && lat > 30.25 && lat < 30.27, key);
    }
  }
});

test('same-building visits never create a fictitious road polyline', () => {
  const s = { ...C.defaults, plan: 'custom', ids: ['craft', 'sony'], dinner: false };
  const trip = C.buildTrip(s, anchors, data.routes);
  const between = trip.legs.find((leg) => leg.from.id === 'craft' && leg.to.id === 'sony');
  assert.equal(between.sameBuilding, true);
  assert.equal(between.route, null);
  assert.equal(between.distance, 0);
  assert.equal(between.minutes, 4);
});

test('venue selection, budget and old/new share state roundtrip', () => {
  const expectations = { board: [320, 500], craft: [280, 440], stroll: [220, 320] };
  for (const plan of Object.keys(expectations)) {
    const state = C.parseState(`#plan=${plan}&start=15:00`);
    const trip = C.buildTrip(state, anchors, data.routes);
    assert.deepEqual(trip.cost, expectations[plan]);
    assert.deepEqual(C.parseState('#' + C.serializeState(state)), state);
  }
  const legacy = C.parseState('#plan=craft&kpop=0&sony=1&dinner=0');
  assert.equal(legacy.ids.includes('kpop'), false);
  assert.equal(legacy.ids.includes('sony'), true);
  assert.equal(legacy.dinner, false);
  assert.deepEqual(C.parseState('#plan=custom&stops=book,__proto__,book,unknown').ids, ['book']);
});

test('all 128 venue subsets route every cross-building leg without gaps', () => {
  const ids = Object.keys(C.venues);
  for (let bits = 0; bits < 2 ** ids.length; bits++) {
    const selected = ids.filter((_, i) => bits & (1 << i));
    for (const dinner of [false, true]) {
      const trip = C.buildTrip({ ...C.defaults, plan:'custom', ids:selected, dinner }, anchors, data.routes);
      assert.equal(trip.unknown, 0);
      assert.equal(trip.distance, trip.legs.reduce((sum, leg) => sum + (leg.route?.distance || 0), 0));
      assert.ok(trip.visits.every((v) => v.arrival <= v.departure));
      assert.ok(trip.legs.every((leg) => leg.sameBuilding || leg.route));
      assert.equal(trip.duration, trip.end - trip.start);
    }
  }
});

test('animation follows the bends of a road, not a diagonal between destinations', () => {
  const points = [[120,30],[120.001,30],[120.001,30.001]];
  const track = C.makeTrack([{id:7,route:{geometry:{coordinates:points}}}]);
  assert.equal(track.edges.length, 2);
  for (let i = 0; i <= 50; i++) {
    const p = C.positionOnTrack(track, track.total * i / 50);
    assert.equal(p.legId, 7);
    assert.ok(Math.abs(p.lat-30) < 1e-9 || Math.abs(p.lng-120.001) < 1e-9);
  }
  assert.deepEqual(C.positionOnTrack(track, 0), {lng:120,lat:30,legId:7});
  assert.deepEqual(C.positionOnTrack(track, track.total), {lng:120.001,lat:30.001,legId:7});
});

test('an unspecified dinner changes the budget and time, never invents a map destination', () => {
  const without = C.buildTrip({...C.defaults,dinner:false},anchors,data.routes);
  const withMeal = C.buildTrip({...C.defaults,dinner:true},anchors,data.routes);
  assert.equal(withMeal.duration-without.duration,60);
  assert.deepEqual(withMeal.cost,[without.cost[0]+180,without.cost[1]+260]);
  assert.equal(withMeal.distance,without.distance);
  assert.deepEqual(withMeal.visits.map(v=>v.id),without.visits.map(v=>v.id));
  assert.equal(withMeal.dinner.duration,60);
});

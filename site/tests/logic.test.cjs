const test = require("node:test"), assert = require("node:assert");
const L = require("../js/v7/logic.js");

test("weekEvents filters, orders by score desc, unknown week", () => {
  const N = { a: { score: 0.2 }, b: { score: 0.9 }, c: { score: 0.5 }, d: {} };
  const NW = [{ k: "w8", keys: ["a", "b", "c", "d"] }];
  assert.deepEqual(L.weekEvents(N, NW, "w8", (k) => k !== "c"), ["b", "a", "d"]);
  assert.deepEqual(L.weekEvents(N, NW, "w99", () => true), []);
});
test("narrGroups", () => {
  const rows = [["a", "Şüpheliler"], ["b", "Şüpheliler"], ["c", "Çete"], ["d", ""]].map(([s, blame]) => ({ s, blame }));
  const g = L.narrGroups(rows, "blame");
  assert.deepEqual(g.map((x) => [x.value, x.outlets.length]), [["Şüpheliler", 2], ["Çete", 1], ["", 1]]);
});
test("orderOutlets nulls last", () => {
  const r = L.orderOutlets([{ s: "x" }, { s: "y" }, { s: "z" }], (s) => ({ x: null, y: 2, z: 1 })[s]);
  assert.deepEqual(r.map((o) => o.s), ["z", "y", "x"]);
});
test("dimShares", () => {
  const N = { a: { focus: ["frame", "hero"] }, b: { focus: ["frame"] } };
  const s = L.dimShares(N, ["a", "b"]);
  assert.equal(s.frame, 1); assert.equal(s.hero, 0.5); assert.equal(s.moral, 0);
});
test("blameByBloc", () => {
  const N = { a: { rows: [{ s: "l", blame: "X" }, { s: "n", blame: "X" }, { s: "r", blame: "" }] } };
  const bloc = (s) => ({ l: "left", n: "none", r: "right" })[s];
  assert.deepEqual(L.blameByBloc(N, ["a"], bloc), [{ value: "X", left: 1, mid: 0, right: 0, none: 1 }]);
});
test("yzText", () => {
  const f = { mechanisms: [{ role: "advocate", text: "Birinci. İkinci." }], alternatives: [{ role: "skeptic", text: "Şüphe bir. Şüphe iki." }] };
  assert.equal(L.yzText(f, { status: "rejected" }), null);
  assert.deepEqual(L.yzText(f, { status: "corrected", note: "not" }), { noticed: "not", why: "", editor: true });
  assert.deepEqual(L.yzText({ ...f, explain: { noticed: "n", why: "w" } }, null), { noticed: "n", why: "w", editor: false });
  assert.deepEqual(L.yzText(f, null), { noticed: "Birinci.", why: "Şüphe bir.", editor: false });
});
test("ilanSearch", () => {
  const items = [{ t: "İSTANBUL 3. İCRA DAİRESİ", d: "2026-01-02", s: "a", family: "f" }, { t: "Başka", d: "2026-03-01", s: "b", family: "g" }];
  assert.equal(L.ilanSearch(items, { text: "icra" }).length, 1);
  assert.deepEqual(L.ilanSearch(items, {}).map((i) => i.d), ["2026-03-01", "2026-01-02"]);
  assert.equal(L.ilanSearch(items, { from: "2026-02-01" }).length, 1);
  assert.equal(L.ilanSearch(items, { family: "f" }).length, 1);
});
test("redirectRoute", () => {
  assert.equal(L.redirectRoute("/yanlilik", { t: "kutuphane" }), "/yontem?s=kavramlar");
  assert.equal(L.redirectRoute("/yanlilik", {}), "/oruntu?q=dil");
  assert.equal(L.redirectRoute("/bulgular/x", {}), "/oruntu?q=secim");
  assert.equal(L.redirectRoute("/olaylar", {}), null);
  assert.equal(L.redirectRoute("/anlati", {}), null);
});
test("redirectRoute v8 table", () => {
  const R = L.redirectRoute;
  assert.equal(R("/kurumlar", { t: "genel" }), "/kurumlar?t=liste");
  assert.equal(R("/kurumlar", { t: "siralama" }), "/kurumlar?t=liste");
  assert.equal(R("/kurumlar", { t: "guven" }), "/kurumlar?t=kayit");
  assert.equal(R("/kurumlar", { t: "xyz" }), "/kurumlar?t=liste");
  assert.equal(R("/harita", {}), "/kurumlar?t=liste&v=harita");
  assert.equal(R("/karsilastir", {}), "/kurumlar?t=karsilastir");
  assert.equal(R("/olaylar", { t: "konular" }), "/olaylar?t=liste&f=konu");
  assert.equal(R("/olaylar", { t: "kapsama" }), "/yontem?s=kapsama");
  assert.equal(R("/olaylar", { t: "kor" }), null);
  assert.equal(R("/ilan", {}), "/olaylar?t=ilan");
  assert.equal(R("/yontem", { s: "9" }), null);
  assert.equal(R("/bulgular", {}), "/oruntu?q=secim");
  assert.equal(L.NAV_SUB["/yontem"], "Yöntem, sözlük ve sınırlar");
});
test("trFold", () => assert.equal(L.trFold("İSTANBUL IŞIK çğöü"), "istanbul isik cgou"));

test("pickWeek: existing-but-empty stays; unknown and v1 fall back to latest non-empty", () => {
  const { pickWeek } = require("../js/v7/logic.js");
  const NW = [{ k: "v1", keys: ["a"] }, { k: "w1", keys: ["b"] }, { k: "w2", keys: ["c"] }, { k: "w3", keys: [] }];
  const N = { a: {}, b: {}, c: {} }, ok = () => true;
  assert.deepStrictEqual(pickWeek(NW, N, ok, "w3"), { week: "w3", empty: true });
  assert.deepStrictEqual(pickWeek(NW, N, (k) => k !== "b", "w1"), { week: "w1", empty: true });
  assert.deepStrictEqual(pickWeek(NW, N, ok, "zzz"), { week: "w2", empty: false });
  assert.deepStrictEqual(pickWeek(NW, N, ok, "v1"), { week: "w2", empty: false });
  assert.deepStrictEqual(pickWeek(NW, N, ok, "w1"), { week: "w1", empty: false });
});

test("yontemAnchor maps old numeric anchors, passes new ids through", () => {
  const m = { 2: "veri", 3: "olay", 5: "olay", 4: "dil", 6: "anlati", 7: "dil", 11: "yz", 12: "yzicerik", v5: "veri", kutuphane: "kavramlar" };
  for (const k of Object.keys(m)) assert.equal(L.yontemAnchor(k), m[k]);
  assert.equal(L.yontemAnchor("turkiye"), "turkiye");
  assert.equal(L.yontemAnchor("kayit"), "kayit");
  assert.equal(L.yontemAnchor(undefined), "");
  assert.equal(L.yontemAnchor("constructor"), "constructor");
});

test("weeklySplits: window, both sides, >=6 outlets, exclude, order, empty", () => {
  const six = ["a", "b", "c", "d", "e", "f"];
  const ev = (i, f, p, s) => ({ i, f, p, s: s || six });
  const evs = [ev(1, "2026-11-05T09:00", 30), ev(2, "2026-11-04T09:00", 50), ev(3, "2026-10-29T23:59", 90), ev(4, "2026-11-01T09:00", 50, six.concat("g")),
    ev(5, "2026-11-02T09:00", 40, ["a", "b"]), ev(6, "2026-11-03T09:00", 99), ev(7, null, 99), ev(8, "2026-11-06T00:00", 99), ev(9, "2026-10-30T00:00", 10)];
  const cov = (e) => (e.i === 6 ? [0, 3, 3] : e.i === 4 || e.i === 1 || e.i === 2 || e.i === 9 || e.i === 5 ? [1, 2, 1] : [1, 0, 1]);
  const ids = (o) => L.weeklySplits(evs, "2026-11-05", Object.assign({ cov }, o)).map((e) => e.i);
  assert.deepEqual(ids(), [4, 2, 1, 9]);
  assert.deepEqual(ids({ exclude: [2] }), [4, 1, 9]);
  assert.deepEqual(L.weeklySplits([], "2026-11-05", { cov }), []);
  assert.deepEqual(L.weeklySplits(evs, "2026-11-05", { cov: () => [0, 1, 1] }), []);
});

test("whatDiffers rules", () => {
  assert.equal(L.whatDiffers({ p: 45 }), "Birinde belirgin biçimde daha sert bir dil var");
  assert.equal(L.whatDiffers({ p: 25 }), "Birinde daha yüklü bir dil var");
  assert.equal(L.whatDiffers({ p: 5 }), "Aynı olay, farklı sözcükler");
  assert.equal(L.whatDiffers({ p: 45 }, { rows: [{ blame: "A" }, { blame: "B" }] }), "Sorumlu tutulan farklı");
  assert.equal(L.whatDiffers({ p: 45 }, { rows: [{ blame: "A" }, { blame: "A" }] }), "Birinde belirgin biçimde daha sert bir dil var");
});
test("glossTerms wraps first occurrence outside tags only", () => {
  const h = L.glossTerms("Bu bir kör nokta olayı, ikinci kör nokta.");
  assert.equal((h.match(/data-gl="kör nokta"/g) || []).length, 1);
  assert.equal(L.glossTerms('<a title="kör nokta">x</a>'), '<a title="kör nokta">x</a>');
  assert.equal(L.glossTerms("düz metin"), "düz metin");
  assert.ok(Object.keys(L.GLOSSARY).length === 7 && L.GLOSSARY["φ"]);
});

test("outletKisaca: placed, band edges, unplaced, empty nb", () => {
  const base = { name: "Takvim", events: 50, total: 200, mean: 10, blocMean: 10, placed: true, nb: ["Sabah", "Sözcü"] };
  const k = (o) => L.outletKisaca(Object.assign({}, base, o));
  assert.deepEqual(k({}), ["Takvim bu dönemde 50 olayı verdi (olayların %25’i).", "Başlıkları kendi bloğunun ortalamasına yakın.", "Gündemi en çok Sabah ve Sözcü’ye benziyor."]);
  assert.ok(k({ mean: 11 })[1].includes("yakın"));
  assert.ok(k({ mean: 9 })[1].includes("yakın"));
  assert.ok(k({ mean: 11.01 })[1].includes("biraz daha yüklü"));
  assert.ok(k({ mean: 8.99 })[1].includes("daha sakin"));
  const u = k({ placed: false, nb: [] });
  assert.equal(u.length, 1);
  assert.equal(k({ blocMean: null }).length, 2);
  assert.equal(k({ mean: null }).length, 2);
  assert.equal(k({ nb: [] }).length, 2);
  assert.ok(!k({ total: 0 }).join(" ").match(/NaN|undefined/));
  assert.ok(k({ events: 24, total: 200 })[0].includes("%12’si"));
  assert.ok(k({ events: 40, total: 200 })[0].includes("%20’si"));
  assert.ok(k({ nb: ["Birgün", "Hürriyet"] })[2].endsWith("Birgün ve Hürriyet’e benziyor."));
  assert.ok(k({ nb: ["Sabah"] })[2].includes("Sabah’a benziyor"));
});
test("recentSplits: recency, opposite bloc only, <=5, min 5 outlets", () => {
  const bl = { a: "left", b: "left", c: "right", d: "right", m: "mid", z: "none" };
  const load = (e, s) => (e.v && e.v[s] != null ? e.v[s] : null);
  const opt = { bloc: (s) => bl[s], load };
  const ss = ["a", "b", "c", "d", "m"];
  const ev = (i, f, v, s) => ({ i, f, v, s: s || ss });
  const evs = [];
  for (let i = 1; i <= 8; i++) evs.push(ev(i, "2026-11-0" + i + "T10:00", { a: 10, b: 30, c: 12, d: 20 + i, m: 50 }));
  evs.push(ev(9, "2026-11-09T10:00", { a: 10, c: 11 }, ["a", "c", "d"]));
  const r = L.recentSplits(evs, "a", opt);
  assert.deepEqual(r.map((x) => x.e.i), [8, 7, 6, 5, 4]);
  assert.ok(r.every((x) => x.other === "d"));
  const rb = L.recentSplits([ev(1, "2026-11-01T10:00", { a: 10, b: 90, c: 12, d: 15, m: 80 })], "a", opt);
  assert.equal(rb[0].other, "d");
  assert.equal(L.recentSplits(evs, "m", opt)[0].other, "a");
  assert.deepEqual(L.recentSplits([ev(1, "2026-11-01T10:00", { a: 10 })], "a", opt), []);
  assert.deepEqual(L.recentSplits(evs, "z", opt), []);
});
test("kuDat reads acronyms and digits as spoken", () => {
  const k = (n) => L.outletKisaca({ name: "X", events: 1, total: 2, placed: false, nb: [n] })[1];
  assert.ok(k("NTV").endsWith("NTV’ye benziyor."));
  assert.ok(k("Halk TV").endsWith("Halk TV’ye benziyor."));
  assert.ok(k("Bloomberg HT").endsWith("Bloomberg HT’ye benziyor."));
  assert.ok(k("TELE1").endsWith("TELE1’e benziyor."));
  assert.ok(k("Star").endsWith("Star’a benziyor."));
});

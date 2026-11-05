const test = require("node:test"), assert = require("node:assert");
const L = require("../js/v7/logic.js");

test("weekEvents filters, orders by score desc, unknown week", () => {
  const N = { a: { score: 0.2 }, b: { score: 0.9 }, c: { score: 0.5 }, d: {} };
  const NW = [{ keys: ["a", "b", "c", "d"] }];
  assert.deepEqual(L.weekEvents(N, NW, 0, (k) => k !== "c"), ["b", "a", "d"]);
  assert.deepEqual(L.weekEvents(N, NW, 5, () => true), []);
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
  assert.equal(L.redirectRoute("/olaylar", { t: "kor" }), "/oruntu?q=secim");
  assert.equal(L.redirectRoute("/olaylar", {}), null);
  assert.equal(L.redirectRoute("/anlati", {}), null);
});
test("trFold", () => assert.equal(L.trFold("İSTANBUL IŞIK çğöü"), "istanbul isik cgou"));

/* v7 graphs: network views drawn with AntV G6 (vendor/g6.min.js, loaded on first use).
   A view puts <div class="g6-box" data-g6="kind" data-arg="..."> in its html; g6Mount() (called after
   every render) builds each box with G6K[kind]. Colours come from the page's CSS tokens at draw time, and
   every graph is rebuilt when the theme changes, so canvas marks follow light/dark like the SVG charts. */
var G6S = [], G6Q = null, G6K = {};
var G6_SRC = ["vendor/g6.min.js", "https://cdn.jsdelivr.net/npm/@antv/g6@5.0.51/dist/g6.min.js"];

function g6Load(cb) {
  if (window.G6) return cb();
  if (G6Q) return G6Q.push(cb);
  G6Q = [cb];
  var i = 0, next = function () {
    var s = document.createElement("script");
    s.src = G6_SRC[i++];
    s.onload = function () { var q = G6Q; G6Q = null; q.forEach(function (f) { f(); }); };
    s.onerror = function () { if (i < G6_SRC.length) next(); else { G6Q = null; [].forEach.call(document.querySelectorAll(".g6-box"), function (b) { b.classList.add("g6-fail"); }); } };
    document.head.appendChild(s);
  };
  next();
}

function g6Tok() {
  var cs = getComputedStyle(document.getElementById("view") || document.body), t = {};
  ["left", "right", "mid", "ink", "ink2", "muted", "line", "line2", "surface", "paper", "hot", "hl"].forEach(function (k) {
    t[k] = cs.getPropertyValue("--" + k).trim() || "#888";
  });
  t.font = cs.getPropertyValue("--ff-b").trim() || "sans-serif";
  t.dark = document.documentElement.getAttribute("data-theme") === "dark";
  return t;
}
function g6Bloc(t, s) { var b = bloc(s); return b === "left" ? t.left : b === "right" ? t.right : b === "none" ? t.line2 : t.mid; }
function g6Calm() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }

/* Build every unmounted box under root; drop graphs whose box left the page. */
function g6Mount(root) {
  G6S = G6S.filter(function (g) { if (document.body.contains(g.el)) return true; try { g.graph.destroy(); } catch (e) {} return false; });
  var boxes = [].filter.call((root || document).querySelectorAll(".g6-box"), function (b) { return !b._g6 && G6K[b.getAttribute("data-g6")]; });
  if (!boxes.length) return;
  boxes.forEach(function (b) { b._g6 = 1; });
  g6Load(function () { boxes.forEach(g6Build); });
}
function g6Build(el) {
  var old = G6S.filter(function (g) { return g.el === el; })[0];
  if (old) { try { old.graph.destroy(); } catch (e) {} G6S.splice(G6S.indexOf(old), 1); }
  el.innerHTML = "";
  var spec = G6K[el.getAttribute("data-g6")](el.getAttribute("data-arg") || "", g6Tok());
  if (!spec) { el.classList.add("g6-fail"); return; }
  var calm = g6Calm(), h = spec.height || (innerWidth < 640 ? 380 : 480);
  el.style.height = h + "px";
  if (spec.opts.width) el.style.width = spec.opts.width + "px";
  var graph = new G6.Graph(Object.assign({
    container: el, height: h, autoFit: "view", padding: 24, autoResize: true, animation: !calm,
    behaviors: ["drag-element", { type: "zoom-canvas", trigger: ["Control"] },
      { type: "hover-activate", degree: 1, state: "active", inactiveState: "inactive" }]
  }, spec.opts));
  graph.on("node:pointerenter", function (e) { var d = graph.getNodeData(e.target.id), ne = e.nativeEvent || {}; if (d && d.data.tip) tipOn({ clientX: ne.clientX, clientY: ne.clientY }, d.data.tip); });
  graph.on("node:pointermove", function (e) { var d = graph.getNodeData(e.target.id), ne = e.nativeEvent || {}; if (d && d.data.tip) tipOn({ clientX: ne.clientX, clientY: ne.clientY }, d.data.tip); });
  graph.on("node:pointerleave", tipOff);
  graph.on("afterlayout", function () { if (graph.getOptions().autoFit && !graph.destroyed) graph.fitView(); });
  graph.on("edge:pointerenter", function (e) { var d = graph.getEdgeData(e.target.id), ne = e.nativeEvent || {}; if (d && d.data.tip) tipOn({ clientX: ne.clientX, clientY: ne.clientY }, d.data.tip); });
  graph.on("edge:pointerleave", tipOff);
  graph.on("node:click", function (e) { var d = graph.getNodeData(e.target.id); tipOff(); if (d && d.data.go) location.hash = d.data.go.replace(/^#/, ""); });
  graph.render().then(function () { if (spec.after) spec.after(graph, calm, el); else if (graph.getOptions().autoFit) graph.fitView(); }).catch(function () {});
  G6S.push({ el: el, graph: graph });
}
/* Theme toggle repaints the canvas graphs. */
new MutationObserver(function () { G6S.forEach(function (g) { if (document.body.contains(g.el)) g6Build(g.el); }); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

/* Shared look: outlet nodes are discs in their placement colour, labelled underneath. */
function g6NodeStyle(t, o) {
  o = o || {};
  return {
    type: function (d) { return d.data.shape || "circle"; },
    style: {
      size: function (d) { return d.data.size || 18; },
      fill: function (d) { return d.data.c || t.mid; },
      stroke: function (d) { return d.data.ring || t.surface; },
      lineWidth: function (d) { return d.data.ring ? 2.5 : 1.5; },
      radius: 6,
      labelText: function (d) { return d.data.label || ""; },
      labelFill: function (d) { return d.data.labelFill || t.ink; },
      labelFontFamily: t.font, labelFontSize: o.fs || 11.5,
      labelFontWeight: function (d) { return d.data.bold ? 600 : 500; },
      labelPlacement: function (d) { return d.data.lp || "bottom"; },
      labelBackground: true, labelBackgroundFill: t.paper, labelBackgroundOpacity: .82, labelBackgroundRadius: 3,
      labelPadding: [0, 3], cursor: "pointer"
    },
    state: { active: { lineWidth: 3, stroke: t.ink, halo: true, haloStroke: t.hl, haloLineWidth: 10, haloStrokeOpacity: .45 },
      inactive: { opacity: .22 } }
  };
}
function g6EdgeStyle(t, o) {
  o = o || {};
  return {
    type: o.type || "line",
    style: {
      stroke: function (d) { return d.data.c || t.line2; },
      lineWidth: function (d) { return d.data.w || 1; },
      opacity: function (d) { return d.data.op != null ? d.data.op : .7; },
      endArrow: !!o.arrow, endArrowSize: 7,
      lineDash: function (d) { return d.data.dash ? [4, 4] : 0; },
      curveOffset: o.curve || 0
    },
    state: { active: { stroke: t.ink, opacity: 1 }, inactive: { opacity: .06 } }
  };
}
function g6Box(kind, arg, label, cls) {
  return '<div class="g6-wrap' + (cls ? " " + cls : "") + '"><div class="g6-box" data-g6="' + kind + '" data-arg="' + esc(arg || "") + '" role="img" aria-label="' + esc(label) +
    '"><p class="g6-wait">Ağ çiziliyor…</p></div><p class="g6-help">Bir düğümün üzerine gelin: bağlantıları öne çıkar. Düğümleri sürükleyebilirsiniz; yakınlaştırmak için Ctrl + tekerlek.</p></div>';
}
/* Two views of one finding: the network first, the original chart one click away. */
function g6Switch(id, netHtml, oldHtml, oldLabel) {
  return '<div class="or-ctl g6-sw" data-sw="' + id + '"><span class="or-cl">Görünüm</span><button type="button" class="chip" data-swv="ag" aria-pressed="true">Ağ</button>' +
    '<button type="button" class="chip" data-swv="eski" aria-pressed="false">' + oldLabel + "</button></div>" +
    '<div data-swp="' + id + ':ag">' + netHtml + '</div><div data-swp="' + id + ':eski" hidden>' + oldHtml + "</div>";
}
document.addEventListener("click", function (ev) {
  var b = ev.target.closest && ev.target.closest(".g6-sw [data-swv]"); if (!b) return;
  var sw = b.closest(".g6-sw"), id = sw.getAttribute("data-sw"), v = b.getAttribute("data-swv");
  [].forEach.call(sw.querySelectorAll("[data-swv]"), function (x) { x.setAttribute("aria-pressed", x === b); });
  [].forEach.call(document.querySelectorAll('[data-swp^="' + id + ':"]'), function (p) { p.hidden = p.getAttribute("data-swp") !== id + ":" + v; });
});

/* ---------------------------------------------------------------- agenda network (φ) */
var G6_PHI = .05;
function g6AgendaData(t, focus) {
  var A = ADV && ADV.agenda; if (!A) return null;
  var ord = A.order, mxs = Math.max.apply(null, ord.map(function (s) { return A.size[s] || 1; }));
  var keep = focus ? [focus].concat(ord.filter(function (s) { return s !== focus; })
    .sort(function (a, b) { return A.phi[focus][b] - A.phi[focus][a]; }).slice(0, 7)) : ord;
  var nodes = keep.map(function (s) {
    var nb = ord.filter(function (x) { return x !== s; }).sort(function (a, b) { return A.phi[s][b] - A.phi[s][a]; }).slice(0, 3);
    return { id: s, data: { label: srcName(s), c: g6Bloc(t, s), size: 14 + 26 * Math.sqrt((A.size[s] || 1) / mxs), go: "#/kurum?s=" + s,
      ring: s === focus ? t.ink : null, bold: s === focus,
      tip: "<span class='k'>" + esc(srcName(s)) + "</span>" + orN(A.size[s] || 0) + " olay<br>Gündemi en çok benzeyen: " +
        nb.map(function (x) { return esc(srcName(x)) + " (φ " + dec(A.phi[s][x], 2) + ")"; }).join(", ") + "<br>Tıklayın: kurum sayfası" } };
  });
  var edges = [];
  keep.forEach(function (a, i) { keep.forEach(function (b, j) {
    if (j <= i) return;
    var v = A.phi[a][b], hub = focus && (a === focus || b === focus);
    if (focus ? !hub : v < G6_PHI) return;
    edges.push({ source: a, target: b, data: { phi: v, w: Math.max(.6, 14 * Math.max(0, v)), op: v >= .15 ? .85 : .45,
      dash: v < G6_PHI, c: v >= .15 ? t.ink2 : t.line2,
      tip: "<span class='k'>" + esc(srcName(a)) + " ↔ " + esc(srcName(b)) + "</span>φ = " + dec(v, 2) + "<br>Birlikte verdikleri: " + orN(orShared(a, b)) + " olay" } });
  }); });
  return { nodes: nodes, edges: edges };
}
G6K.agenda = function (arg, t) {
  var data = g6AgendaData(t, arg || null); if (!data) return null;
  if (arg) { /* ego view: neighbours on a ring, closer when more similar */
    var A = ADV.agenda, nb = data.nodes.slice(1), ps = nb.map(function (n) { return A.phi[arg][n.id]; }), hi = Math.max.apply(null, ps), lo = Math.min.apply(null, ps);
    data.nodes[0].style = { x: 0, y: 0 };
    nb.forEach(function (n, i) { var a = -Math.PI / 2 + 2 * Math.PI * i / nb.length, r = 110 + 110 * (hi - ps[i]) / ((hi - lo) || 1);
      n.style = { x: r * Math.cos(a), y: r * Math.sin(a) }; n.data.lp = Math.cos(a) > .3 ? "right" : Math.cos(a) < -.3 ? "left" : Math.sin(a) < 0 ? "top" : "bottom"; });
  }
  return { height: arg ? 380 : null, opts: { data: data, node: g6NodeStyle(t), edge: g6EdgeStyle(t),
    layout: arg ? null :
      { type: "d3-force", animation: false, link: { distance: function (e) { return Math.max(70, 240 - 600 * Math.max(0, (e.data && e.data.phi) || 0)); }, strength: .5 },
        manyBody: { strength: -300 }, collide: { radius: 38 }, x: { strength: .09 }, y: { strength: .09 } } } };
};

/* ------------------------------------------------------- who reports after whom */
function g6FollowData() {
  if (ORD.follow) return ORD.follow;
  var H = 48 * 60, m = {}, first = {}, cov = {};
  orEvents().forEach(function (e) {
    if (e.s.length < 5) return;
    var seen = {}, f = [];
    e.a.map(function (i) { return ART[i]; }).filter(Boolean).sort(function (a, b) { return a.d.localeCompare(b.d); })
      .forEach(function (a) { if (!seen[a.s]) { seen[a.s] = 1; f.push(a); } });
    if (f.length < 2 || !SRC[f[0].s]) return;
    var t0 = Date.parse(f[0].d + ":00Z"), s0 = f[0].s;
    first[s0] = (first[s0] || 0) + 1;
    f.forEach(function (a) { cov[a.s] = (cov[a.s] || 0) + 1; });
    f.slice(1).forEach(function (a) {
      var lag = (Date.parse(a.d + ":00Z") - t0) / 6e4; if (lag > H || !SRC[a.s]) return;
      var k = s0 + ">" + a.s, x = m[k] = m[k] || { a: s0, b: a.s, n: 0, lags: [] }; x.n++; x.lags.push(lag);
    });
  });
  var all = Object.keys(m).map(function (k) { var x = m[k]; x.share = x.n / (cov[x.b] || 1); return x; });
  /* Keep each outlet's two strongest "followed" links and the 24 strongest overall. */
  var keep = {}, by = {};
  all.forEach(function (x) { (by[x.b] = by[x.b] || []).push(x); });
  Object.keys(by).forEach(function (b) { by[b].sort(function (p, q) { return q.n - p.n; }).slice(0, 2).forEach(function (x) { keep[x.a + ">" + x.b] = x; }); });
  all.sort(function (p, q) { return q.n - p.n; }).slice(0, 24).forEach(function (x) { keep[x.a + ">" + x.b] = x; });
  return ORD.follow = { edges: Object.keys(keep).map(function (k) { return keep[k]; }), first: first, cov: cov, all: all };
}
G6K.follow = function (arg, t) {
  var F = g6FollowData(), ids = {};
  F.edges = F.edges.filter(function (x) { return ACT5.indexOf(x.a) >= 0 && ACT5.indexOf(x.b) >= 0; });
  F.edges.forEach(function (x) { ids[x.a] = ids[x.b] = 1; });
  var ks = Object.keys(ids).sort(function (a, b) { return (SRC[a].lean == null ? 50 : SRC[a].lean) - (SRC[b].lean == null ? 50 : SRC[b].lean); });
  if (!ks.length) return null;
  var mf = Math.max.apply(null, ks.map(function (s) { return F.first[s] || 0; })) || 1, mx = Math.max.apply(null, F.edges.map(function (x) { return x.n; })) || 1;
  return { opts: {
    data: { nodes: ks.map(function (s) { return { id: s, data: { label: srcName(s), c: g6Bloc(t, s), size: 14 + 30 * Math.sqrt((F.first[s] || 0) / mf), go: "#/kurum?s=" + s,
      tip: "<span class='k'>" + esc(srcName(s)) + "</span>İlk veren olduğu olay: " + orN(F.first[s] || 0) + "<br>Verdiği olay (≥ 5 kurumlu): " + orN(F.cov[s] || 0) + "<br>Tıklayın: kurum sayfası" } }; }),
      edges: F.edges.map(function (x) { return { source: x.a, target: x.b, data: { w: .8 + 7 * x.n / mx, c: g6Bloc(t, x.a), op: .55,
        tip: "<span class='k'>" + esc(srcName(x.a)) + " → " + esc(srcName(x.b)) + "</span>" + orN(x.n) + " olayda önce " + esc(srcName(x.a)) + " verdi, " + esc(srcName(x.b)) +
          " sonra (ortanca " + dur5(median5(x.lags.slice())) + ")<br>" + esc(srcName(x.b)) + " olaylarının " + orP(x.share) + "’i" } }; }) },
    node: g6NodeStyle(t), edge: g6EdgeStyle(t, { type: "quadratic", arrow: true, curve: 26 }),
    layout: { type: "circular", ordering: null, radius: innerWidth < 640 ? 140 : 190 } } };
};

/* ------------------------------------------------------- one event: who followed the first headline */
G6K.spread = function (arg, t) {
  var e = EV[arg]; if (!e) return null;
  var seen = {}, f = [];
  e.a.map(function (i) { return ART[i]; }).filter(Boolean).sort(function (a, b) { return a.d.localeCompare(b.d); })
    .forEach(function (a) { if (!seen[a.s]) { seen[a.s] = 1; f.push(a); } });
  if (f.length < 2) return null;
  var t0 = Date.parse(f[0].d + ":00Z"), W = Math.max(560, Math.min(1080, innerWidth - 48)), Hh = innerWidth < 640 ? 340 : 400;
  var lag = function (a) { return (Date.parse(a.d + ":00Z") - t0) / 6e4; }, mlag = Math.max(60, lag(f[f.length - 1]));
  var X = function (m) { return 40 + (W - 80) * Math.sqrt(m / mlag); };
  var Y = function (s) { var v = SRC[s] && SRC[s].lean != null ? SRC[s].lean : 50; return 30 + (Hh - 60) * v / 100; };
  var used = [], nodes = f.map(function (a, i) {
    var x = X(lag(a)), y = Y(a.s);
    var y0 = y, k = 0, hit = function (yy) { return yy < 16 || yy > Hh - 34 || used.some(function (p) { return Math.abs(p[0] - x) < 70 && Math.abs(p[1] - yy) < 24; }); };
    while (hit(y) && k < 40) { k++; y = y0 + (k % 2 ? 1 : -1) * 24 * Math.ceil(k / 2); }
    used.push([x, y]);
    return { id: a.s, style: { x: x, y: y }, data: { label: srcName(a.s), c: g6Bloc(t, a.s), size: i ? 16 : 26, ring: i ? null : t.ink, bold: !i, go: "#/kurum?s=" + a.s, order: i,
      lp: x > W * .8 ? "left" : "bottom",
      tip: "<span class='k'>" + esc(srcName(a.s)) + "</span>" + (i ? dur5(Math.round(lag(a))) + " sonra" : "İlk başlık") + " · " + fmtDT(a.d) + "<br>“" + esc(clip(a.t, 110)) + "”<br>Yüklü dil " + a.v } };
  });
  var edges = nodes.slice(1).map(function (n) { return { source: f[0].s, target: n.id, data: { c: t.line2, op: .5, dash: true } }; });
  var ticks = [0, 15, 60, 180, 360, 720, 1440, 2880].filter(function (m) { return m <= mlag; });
  return { height: Hh, opts: { data: { nodes: nodes, edges: edges }, autoFit: null, autoResize: false, padding: 0, width: W,
    node: g6NodeStyle(t), edge: g6EdgeStyle(t, { type: "line" }), layout: null,
    behaviors: [{ type: "hover-activate", degree: 1, state: "active", inactiveState: "inactive" }] },
    after: function (graph, calm, el) {
      var ax = document.createElement("div"); ax.className = "g6-axis"; ax.style.width = W + "px";
      ax.innerHTML = ticks.map(function (m) { return '<span style="left:' + X(m) + 'px">' + (m ? dur5(m) : "ilk") + "</span>"; }).join("");
      el.insertAdjacentElement("afterend", ax);
      if (calm) return;
      /* Replay the order of publication: nodes fade in at their real relative times (compressed to ~3 s). */
      nodes.forEach(function (n) { graph.setElementVisibility(n.id, n.data.order ? "hidden" : "visible", false); });
      edges.forEach(function (x) { graph.setElementVisibility(graph.getEdgeData().filter(function (d) { return d.target === x.target; })[0].id, "hidden", false); });
      nodes.slice(1).forEach(function (n) {
        setTimeout(function () {
          if (graph.destroyed) return;
          var ed = graph.getEdgeData().filter(function (d) { return d.target === n.id; })[0];
          graph.setElementVisibility(n.id, "visible", false); if (ed) graph.setElementVisibility(ed.id, "visible", false);
        }, 300 + 2800 * Math.sqrt(lag(f[n.data.order]) / mlag));
      });
    } };
};

/* ------------------------------------------------------- narrative: outlets joined through the choices they made */
G6K.narr = function (key, t) {
  var n = D.N[key]; if (!n || !(n.rows || []).length) return null;
  var dims = v7Dims(n), col = v7Colors(n.rows, dims), nodes = [], edges = [], val = {};
  n.rows.forEach(function (r) {
    nodes.push({ id: "o:" + r.s, data: { label: srcName(r.s), c: g6Bloc(t, r.s), size: 18, go: "#/kurum?s=" + r.s,
      tip: "<span class='k'>" + esc(srcName(r.s)) + "</span>" + (r.hl ? "“" + esc(clip(r.hl, 120)) + "”<br>" : "") +
        dims.map(function (d) { var v = String(r[d] || "").trim(); return esc(NDL[d]) + ": " + (UNSET(v) || !v ? "—" : esc(v)); }).join("<br>") } });
    dims.forEach(function (d) {
      var v = String(r[d] || "").trim(); if (!v || UNSET(v)) return;
      var id = "v:" + d + ":" + v;
      if (!val[id]) { val[id] = { d: d, v: v, s: [] }; }
      val[id].s.push(r.s);
      edges.push({ source: "o:" + r.s, target: id, data: { c: col[d][v], op: .55, w: 1.6 } });
    });
  });
  Object.keys(val).forEach(function (id) {
    var x = val[id];
    nodes.push({ id: id, data: { shape: "rect", label: NDL[x.d] + ": " + clip(x.v, 34), c: col[x.d][x.v], size: [12 + 6 * x.s.length, 12 + 6 * x.s.length], lp: "bottom",
      labelFill: t.ink, tip: "<span class='k'>" + esc(NDL[x.d]) + "</span>“" + esc(x.v) + "”<br>" + x.s.length + " kurum: " + x.s.map(srcName).map(esc).join(", ") } });
  });
  return { height: innerWidth < 640 ? 440 : 560, opts: { data: { nodes: nodes, edges: edges }, node: g6NodeStyle(t, { fs: 11 }), edge: g6EdgeStyle(t),
    layout: { type: "d3-force", animation: false, link: { distance: 90, strength: .7 }, manyBody: { strength: -260 }, collide: { radius: 30 }, x: { strength: .07 }, y: { strength: .07 } } } };
};

/* ------------------------------------------------------- blame: outlets → the actor their headlines held responsible */
G6K.blame = function (arg, t) {
  var keys = orAnKeys("all"), rows = blameByBloc(D.N, keys, bloc).filter(function (r) { return !UNSET(r.value); }).slice(0, 10);
  if (!rows.length) return null;
  var who = orBlameOutlets(keys), nodes = [], edges = [], os = {};
  var tot = function (r) { return r.left + r.mid + r.right + r.none; }, mx = tot(rows[0]) || 1;
  rows.forEach(function (r) {
    var id = "a:" + r.value;
    nodes.push({ id: id, data: { shape: "rect", label: clip(r.value, 30), c: t.hot, size: [14 + 26 * Math.sqrt(tot(r) / mx), 14 + 26 * Math.sqrt(tot(r) / mx)], bold: true,
      tip: "<span class='k'>" + esc(r.value) + "</span>" + tot(r) + " kurum satırında sorumlu tutuldu<br>sol " + r.left + " · merkez " + r.mid + " · sağ " + r.right } });
    ["left", "mid", "right", "none"].forEach(function (b) {
      var o = (who[r.value] || {})[b] || {};
      Object.keys(o).forEach(function (s) { os[s] = (os[s] || 0) + o[s]; edges.push({ source: "o:" + s, target: id, data: { c: g6Bloc(t, s), w: .8 + .9 * o[s], op: .4,
        tip: "<span class='k'>" + esc(srcName(s)) + " → " + esc(r.value) + "</span>" + o[s] + " olayda" } }); });
    });
  });
  Object.keys(os).forEach(function (s) { nodes.push({ id: "o:" + s, data: { label: srcName(s), c: g6Bloc(t, s), size: 14 + 3 * Math.sqrt(os[s]), go: "#/kurum?s=" + s,
    tip: "<span class='k'>" + esc(srcName(s)) + "</span>Bu listedeki aktörleri " + os[s] + " kez sorumlu tuttu<br>Tıklayın: kurum sayfası" } }); });
  return { height: innerWidth < 640 ? 440 : 540, opts: { data: { nodes: nodes, edges: edges }, node: g6NodeStyle(t, { fs: 11 }), edge: g6EdgeStyle(t),
    layout: { type: "d3-force", animation: false, link: { distance: 130, strength: .4 }, manyBody: { strength: -420 }, collide: { radius: 36 }, x: { strength: .06 }, y: { strength: .06 } } } };
};

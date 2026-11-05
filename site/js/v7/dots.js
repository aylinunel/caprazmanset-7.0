/* v7 dot matrix: LED-halftone canvases redrawn every frame (no image, no video). Text is drawn small into an offscreen
   "field" (one pixel per dot), read back and turned into rows of quantised dots.
   dmMake: the page-header band, the section name in ink, drifting quietly behind each .phead.
   dmHeroMake: the homepage hero, the split card as one LED billboard (headline lane / black "ORTAK OLAN" band / headline lane). */
var DM_LIVE = [];

function dmHash(a, b) { var s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
function dmSmooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function dmMix(t, on, off, dur) { return dmSmooth(on, on + dur, t) * (1 - dmSmooth(off, off + dur, t)); }
function dmCalm() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
function dmColor(v) {
  var p = dmColor.p || (dmColor.p = document.body.appendChild(Object.assign(document.createElement("i"), { hidden: true, style: "transition:none!important;animation:none!important" })));
  p.style.color = ""; p.style.color = v; p.hidden = false; var c = getComputedStyle(p).color; p.hidden = true; return c;
}
var DM_FONT = '700 {px}px Inter, "Helvetica Neue", Arial, sans-serif';

/* Page-header band: one word, right-aligned, drifting and breathing a little. */
function dmMake(cv, mode, data) {
  if (mode === "hero") return dmHeroMake(cv, data);
  var S = { cv: cv, mode: mode, t0: performance.now(), alive: true, vis: true, last: 0 };
  var LOOP = 20, LEVELS = [0, .26, .52, .78, 1], F = document.createElement("canvas"), fc = F.getContext("2d", { willReadFrequently: true }), ctx = cv.getContext("2d");
  S.size = function () {
    var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return false;
    var DPR = Math.min(2, devicePixelRatio || 1), step = Math.max(4, W / 200), rowStep = step * 1.5, cols = Math.ceil(W / step), rows = Math.ceil(H / rowStep), seed = new Float32Array(cols * rows);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); F.width = cols; F.height = rows;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) seed[j * cols + i] = .55 * dmHash(i, j) + .45 * dmHash(j * 3.1, 7.7);
    S.g = { W: W, H: H, DPR: DPR, step: step, rowStep: rowStep, cols: cols, rows: rows, R: step * .48, seed: seed };
    S.ink = dmColor("var(--ink)");
    return true;
  };
  S.render = function (tt) {
    if (!S.g && !S.size()) return;
    var g = S.g, W = g.W, H = g.H, cols = g.cols, rows = g.rows, t = ((tt % LOOP) + LOOP) % LOOP, a = 2 * Math.PI * t / LOOP, tick = Math.floor(t * 7);
    var reach = (.012 * Math.sin(a) + .004 * Math.sin(2 * a + 1.3)) * W, sc = 1 + .025 * Math.sin(a + .9), px = Math.min(H * .62, W * .12);
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.fillStyle = "#fff"; fc.fillRect(0, 0, cols, rows);
    fc.setTransform(cols / W, 0, 0, rows / H, 0, 0); fc.translate(W, H / 2); fc.rotate(-.012 * Math.sin(a + 2.1)); fc.scale(sc, sc); fc.translate(-W - reach, -H / 2);
    fc.font = DM_FONT.replace("{px}", px); fc.fillStyle = "#2a2a2a"; fc.textAlign = "right"; fc.textBaseline = "alphabetic";
    fc.fillText(data.words.map(function (o) { return o.w; }).join(" "), W * .98, H / 2 + px * .36);
    var D = fc.getImageData(0, 0, cols, rows).data, P = new Path2D();
    ctx.setTransform(g.DPR, 0, 0, g.DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < rows; j++) {
      var shift = dmHash(j, tick) > .965 ? Math.round((dmHash(tick, j) - .5) * 8) : 0, yy = (j + .5) * g.rowStep;
      for (var i = 0; i < cols; i++) {
        var k = (j * cols + Math.max(0, Math.min(cols - 1, i - shift))) * 4, sd = g.seed[j * cols + i], v = Math.max(0, Math.min(1, (1 - D[k] / 255 - .16) / .42));
        if (!v) continue;
        v *= (.86 + .14 * Math.sin(t * 3.2 + sd * 40)) * dmSmooth(.25, .7, (i + .5) / cols);
        var lv = 0; for (var q = 4; q > 0; q--) if (v >= LEVELS[q] - .13) { lv = q; break; }
        if (!lv) continue;
        var r = g.R * (lv === 1 ? .38 : LEVELS[lv]), x = (i + .5) * g.step; P.moveTo(x + r, yy); P.arc(x, yy, r, 0, 6.283);
      }
    }
    ctx.globalAlpha = .22; ctx.fillStyle = S.ink; ctx.fill(P); ctx.globalAlpha = 1;
  };
  return S;
}

/* Hero: the homepage split card as ONE LED billboard on the full-bleed canvas. Lane A = left outlet's headline, band = tilted black
   "ORTAK OLAN" strip with the shared words knocked out, lane B = right outlet's headline. Ink dots; the differing words are set 1.6x larger
   in red (left) / blue (right). Each lane dissolves dot by dot into its headline without the differing words, then re-forms. */
var DM_HF = '{wt} {px}px Inter, "Helvetica Neue", Arial, sans-serif';
var DM_LANES = { land: { a: .475, band: .655, b: .84, bh: .13 }, port: { a: .47, band: .63, b: .80, bh: .16 } };
function dmHeroMake(cv, data) {
  var S = { cv: cv, mode: "hero", t0: performance.now(), alive: true, vis: true, last: 0 };
  var LOOP = 20, LEVELS = [0, .26, .52, .78, 1], TILT = -3 * Math.PI / 180;
  var mk = function () { var f = document.createElement("canvas"); return { f: f, c: f.getContext("2d", { willReadFrequently: true }) }; };
  var FA = mk(), FB = mk(), FM = mk(), FD = mk(), ctx = cv.getContext("2d"), mc = mk().c;
  var font = function (wt, px) { return DM_HF.replace("{wt}", wt).replace("{px}", px); };
  /* Lay a headline out as runs along one baseline; differing words are 1.6x larger unless `plain` (pose B drops them). */
  var runs = function (words, base, plain) {
    var x = 0, out = [];
    words.forEach(function (o) {
      if (plain && o.hi) return;
      var fs = o.hi ? base * 1.6 : base, wt = o.hi ? 800 : 700;
      mc.font = font(wt, fs); var wd = mc.measureText(o.w).width;
      out.push({ w: o.w, hi: o.hi, fs: fs, wt: wt, x: x, wd: wd }); x += wd + base * .3;
    });
    return { r: out, tw: Math.max(0, x - base * .3) };
  };
  S.size = function () {
    var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return false;
    var DPR = Math.min(2, devicePixelRatio || 1), step = Math.max(3.6, W / 300), rowStep = step * 1.25, portrait = H > W;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    var cols = Math.ceil(W / step), rows = Math.ceil(H / rowStep), seed = new Float32Array(cols * rows), Y = DM_LANES[portrait ? "port" : "land"];
    var base = Math.max(H * (portrait ? .052 : .055), 7.5 * rowStep / .73);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) seed[j * cols + i] = .55 * dmHash(i, j) + .45 * dmHash(j * 3.1, 7.7);
    [FA, FB, FM, FD].forEach(function (x) { x.f.width = cols; x.f.height = rows; });
    S.g = { W: W, H: H, DPR: DPR, step: step, rowStep: rowStep, cols: cols, rows: rows, R: step * .46, seed: seed, portrait: portrait, base: base, Y: Y,
      A: { a: runs(data.a, base, false), b: runs(data.a, base, true) }, B: { a: runs(data.b, base, false), b: runs(data.b, base, true) } };
    S.col = { ink: dmColor("var(--ink)"), l: dmColor("var(--left)"), r: dmColor("var(--right)") };
    var host = cv.parentNode; if (host && host.style) { host.style.setProperty("--ya", Y.a * 100 + "%"); host.style.setProperty("--yb", Y.b * 100 + "%"); host.style.setProperty("--lo", (portrait ? 6.6 : 7.6) + "%");
      host.style.setProperty("--ym", (Y.band - Y.bh / 2 + Math.tan(-TILT) * W / 2 / H - .03) * 100 + "%"); host.classList.toggle("dm-port", portrait); }
    return true;
  };
  /* One lane into field c: pose = "a" | "b"; only = true draws just the differing words (colour mask). */
  var lane = function (c, g, left, pose, only, t) {
    var L = (left ? g.A : g.B)[pose], W = g.W, H = g.H, a = 2 * Math.PI * t / LOOP, ph = left ? 0 : Math.PI, cy = H * (left ? g.Y.a : g.Y.b);
    var tw = (left ? g.A : g.B).a.tw, room = W * .94, ox;
    if (tw > room) { var k = .5 - .5 * Math.cos(a); ox = left ? W * .03 + (room - tw) * k : W * .97 - tw + (tw - room) * k; }
    else { var dr = (.035 * Math.sin(a + ph) + .012 * Math.sin(2 * a + 1.3 + ph)) * W; ox = left ? W * .03 + dr : W * .97 - tw + dr; }
    var sc = 1 + .025 * Math.sin(a + .9 + ph), rot = (left ? 1 : -1) * .01 * Math.sin(a + 2.1 + ph), pvx = left ? 0 : W;
    c.setTransform(g.cols / W, 0, 0, g.rows / H, 0, 0); c.translate(pvx, cy); c.rotate(rot); c.scale(sc, sc); c.translate(-pvx, -cy);
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    L.r.forEach(function (o) {
      if (only && !o.hi) return;
      var cap = o.fs * .73, bs = cy + g.base * .73 / 2, x = ox + o.x;
      c.font = font(o.wt, o.fs);
      if (only) { c.fillStyle = "#000"; c.fillText(o.w, x, bs); return; }
      var gr = c.createLinearGradient(0, bs - cap, 0, bs); gr.addColorStop(0, "#6e6e6e"); gr.addColorStop(1, "#2e2e2e");
      c.shadowColor = "#b8b8b8"; c.shadowBlur = g.base * .3 * g.cols / W; c.fillStyle = "#b8b8b8"; c.fillText(o.w, x, bs);
      c.shadowColor = "transparent"; c.shadowBlur = 0; c.fillStyle = gr; c.fillText(o.w, x, bs);
    });
  };
  /* The black band: label + shared words knocked out in Inter 800, >= 7 dot rows of cap height, shared words on ONE line (dropped from the end + "…"). */
  var band = function (c, g, t) {
    var W = g.W, H = g.H, cy = H * g.Y.band, bh = H * g.Y.bh, drift = .006 * W * Math.sin(2 * Math.PI * t / LOOP), lab = g.portrait ? "" : "ORTAK OLAN";
    c.setTransform(g.cols / W, 0, 0, g.rows / H, 0, 0); c.translate(W / 2, H / 2); c.rotate(TILT); c.translate(-W / 2 + drift, -H / 2);
    var gr = c.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2); gr.addColorStop(0, "#1c1c1c"); gr.addColorStop(1, "#303030");
    c.fillStyle = gr; c.fillRect(-W * .3, cy - bh / 2, W * 1.6, bh);
    var fs = Math.max(7.4 * g.rowStep / .73, bh * .42), wds = data.shared.slice(), room = W * .92, wl, gap = fs * .9, txt = wds.join(" ");
    c.textBaseline = "alphabetic"; c.fillStyle = "#fff"; c.font = font(800, fs);
    wl = lab ? c.measureText(lab).width + gap : 0;
    while (wds.length > 1 && wl + c.measureText(txt).width > room) { wds.pop(); txt = wds.join(" ") + "…"; }
    var x = W / 2 - (wl + c.measureText(txt).width) / 2, base = cy + fs * .73 / 2;
    if (lab) { c.fillText(lab, x, base); x += wl; }
    c.fillText(txt, x, base);
  };
  S.render = function (tt) {
    if (!S.g && !S.size()) return;
    var g = S.g, t = ((tt % LOOP) + LOOP) % LOOP, cols = g.cols, rows = g.rows, W = g.W, H = g.H;
    [FA, FB, FM, FD].forEach(function (x) { x.c.setTransform(1, 0, 0, 1, 0, 0); x.c.fillStyle = "#fff"; x.c.fillRect(0, 0, cols, rows); });
    lane(FA.c, g, true, "a", false, t); lane(FA.c, g, false, "a", false, t); lane(FB.c, g, true, "b", false, t); lane(FB.c, g, false, "b", false, t);
    lane(FM.c, g, true, "a", true, t); lane(FM.c, g, false, "a", true, t); band(FD.c, g, t);
    var DA = FA.c.getImageData(0, 0, cols, rows).data, DB = FB.c.getImageData(0, 0, cols, rows).data, DM = FM.c.getImageData(0, 0, cols, rows).data, DD = FD.c.getImageData(0, 0, cols, rows).data;
    var mL = dmMix(t, 6.2, 14.6, 1.6), mR = dmMix(t, 2.4, 10.4, 1.6), tick = Math.floor(t * 7), ybound = H * g.Y.band;
    ctx.setTransform(g.DPR, 0, 0, g.DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    var P = { k: new Path2D(), l: new Path2D(), r: new Path2D() };
    for (var j = 0; j < rows; j++) {
      var shift = dmHash(j, tick) > .965 ? Math.round((dmHash(tick, j) - .5) * 8) : 0, yy = (j + .5) * g.rowStep, isA = yy < ybound, m = isA ? mL : mR;
      var ey = (yy / H - .23) / .18;
      for (var i = 0; i < cols; i++) {
        var o = (j * cols + i) * 4, vb = Math.max(0, Math.min(1, (1 - DD[o] / 255 - .1) / .6)), v = 0, hi = false;
        var sd = g.seed[j * cols + i], k = (j * cols + Math.max(0, Math.min(cols - 1, i - shift))) * 4, useB = sd < m;
        v = Math.max(0, Math.min(1, (1 - (useB ? DB : DA)[k] / 255 - .1) / .6));
        if (v) {
          if (m > .001 && m < .999 && Math.abs(sd - m) < .12) { v *= Math.abs(sd - m) / .12; if (dmHash(i + tick, j) <= .3) v *= .3; }
          v *= .9 + .1 * Math.sin(t * 3.2 + sd * 40);
          var ex = ((i + .5) / cols - .5) / .22; v *= dmSmooth(.85, 1.25, Math.sqrt(ex * ex + ey * ey));
          hi = !useB && DM[k] < 128;
        }
        v = Math.max(v, vb);
        var lv = 0; for (var q = 4; q > 0; q--) if (v >= LEVELS[q] - .13) { lv = q; break; }
        if (!lv) continue;
        var r = g.R * (lv === 1 ? .38 : LEVELS[lv]), x = (i + .5) * g.step, p = hi && v > vb ? (isA ? P.l : P.r) : P.k;
        p.moveTo(x + r, yy); p.arc(x, yy, r, 0, 6.283);
      }
    }
    ctx.fillStyle = S.col.ink; ctx.fill(P.k); ctx.fillStyle = S.col.l; ctx.fill(P.l); ctx.fillStyle = S.col.r; ctx.fill(P.r);
  };
  return S;
}


var DM_DATA = {};
function dmMount(root) {
  DM_LIVE = DM_LIVE.filter(function (S) { var on = document.body.contains(S.cv); S.alive = on; return on; });
  [].forEach.call((root || document).querySelectorAll("canvas[data-dm]"), function (cv) {
    if (cv._dm) return;
    var d = DM_DATA[cv.getAttribute("data-dk")]; if (!d) return;
    var S = cv._dm = dmMake(cv, cv.getAttribute("data-dm"), d);
    DM_LIVE.push(S);
    if (S.mode === "hero") window.__render = S.render;
    var loop = S.loop = function () {
      if (!S.alive || !S.vis || S.raf || dmCalm()) return;
      S.raf = requestAnimationFrame(function (now) { S.raf = 0; if (now - (S.last || 0) >= 33) { S.last = now; S.render((now - S.t0) / 1000); } if (!dmCalm()) loop(); });
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { S.vis = es[0].isIntersecting; if (S.vis) loop(); }).observe(cv);
    var go = function () { S.g = null; S.size(); S.render(dmCalm() ? 1 : 0); loop(); };
    var sample = "İŞĞÜÖÇışğüöç";
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load("700 40px Inter", sample), document.fonts.load("800 40px Inter", sample)]).then(go, go); else requestAnimationFrame(go);
  });
}
if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { DM_LIVE.forEach(function (S) { S.g = null; S.render(dmCalm() ? 1 : (performance.now() - S.t0) / 1000); }); });
addEventListener("resize", function () { DM_LIVE.forEach(function (S) { S.g = null; S.render(dmCalm() ? 1 : (performance.now() - S.t0) / 1000); }); });
new MutationObserver(function () { DM_LIVE.forEach(function (S) { S.g = null; S.render(dmCalm() ? 1 : (performance.now() - S.t0) / 1000); }); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

function dmWords(text, marks) {
  var hi = (marks || []).join(" ").split(/\s+/).filter(Boolean);
  return String(text || "").split(/\s+/).filter(Boolean).map(function (w) { return { w: w, hi: hi.indexOf(w.replace(/[.,:;!?'"“”‘’()]+$/g, "")) >= 0 || hi.indexOf(w) >= 0 }; });
}

/* Page headers: the section name as a quiet drifting band on the right. */
function dmHeads(root) {
  [].forEach.call((root || document).querySelectorAll(".phead"), function (h) {
    if (h.querySelector("canvas[data-dm]")) return;
    var eb = h.querySelector(".eyebrow"), h1 = h.querySelector("h1"), txt = ((eb && eb.textContent) || (h1 && h1.textContent) || "").trim().split(/\s+/).slice(0, 2).join(" ");
    if (!txt) return;
    var key = "band:" + txt; DM_DATA[key] = { words: dmWords(txt.toLocaleUpperCase("tr")), shared: [] };
    var cv = document.createElement("canvas"); cv.className = "dm-band"; cv.setAttribute("data-dm", "band"); cv.setAttribute("data-dk", key); cv.setAttribute("aria-hidden", "true");
    h.insertBefore(cv, h.firstChild);
  });
}

/* Homepage hero: the lead event's split card as one LED billboard under the site's claim. */
function dmHero(e) {
  var pair = e && (SPLITPAIR[e.i] || defaultPair(e)), a = pair && artOf(e, pair[0]), b = pair && artOf(e, pair[1]);
  var wall = "", labels = "";
  if (a && b) {
    var cmp = compareHeads(a, b), lab = function (art) { return esc(srcName(art.s).toLocaleUpperCase("tr")) + " · " + esc(SIDE[bloc(art.s)].toLocaleUpperCase("tr")) + (SRC[art.s] && SRC[art.s].lean != null ? " " + SRC[art.s].lean : ""); };
    DM_DATA.hero = { a: dmWords(a.t, cmp.markA), b: dmWords(b.t, cmp.markB), shared: String(cmp.shared.join(" ")).toLocaleUpperCase("tr").split(/\s+/).filter(Boolean) };
    wall = '<canvas data-dm="hero" data-dk="hero" aria-hidden="true"></canvas>' +
      '<p class="visually-hidden">' + esc(srcName(a.s)) + ": " + esc(a.t) + ". " + esc(srcName(b.s)) + ": " + esc(b.t) + ". Ortak olan: " + esc(cmp.shared.join(" ")) + ".</p>";
    labels = '<p class="dm-lab l" aria-hidden="true"><i style="background:var(--left)"></i>' + lab(a) + '</p><p class="dm-lab m" aria-hidden="true">ORTAK OLAN</p><p class="dm-lab r" aria-hidden="true"><i style="background:var(--right)"></i>' + lab(b) + "</p>";
  }
  var tops = Object.keys(STAT).filter(function (s) { return SRC[s] && (V2.activeSet || []).indexOf(s) >= 0; })
    .sort(function (x, y) { return STAT[y].n - STAT[x].n; }).slice(0, 8);
  var glyph = '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">' + [4, 10, 16].map(function (y, r) { return [4, 10, 16].map(function (x, c) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (2.4 - .55 * Math.abs(c - r)) + '" fill="currentColor"/>'; }).join(""); }).join("") + "</svg>";
  return '<section class="dm-hero' + (wall ? "" : " empty") + '" aria-label="Çapraz Manşet">' + wall +
    '<div class="dm-copy"><h1><span>Aynı olay,</span> farklı manşet.</h1>' +
    "<p>Türk medyasının aynı olayı nasıl farklı anlattığını yan yana koyuyoruz. Hüküm vermiyoruz; farkı ölçüyoruz.</p>" +
    '<span class="dm-cta"><a href="#/anlati">Anlatı haritasını aç</a></span></div>' + labels +
    '<div class="dm-logos" aria-label="En çok başlık toplanan kurumlar">' + tops.map(function (s) {
      return '<a href="#/kurum?s=' + s + '">' + glyph + esc(srcName(s)) + "</a>"; }).join("") + "</div></section>";
}

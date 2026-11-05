/* v7 dot matrix: LED-halftone canvases redrawn every frame (no image, no video). Text is drawn small into an offscreen
   "field" (one pixel per dot), read back and turned into rows of quantised dots.
   dmMake: the page-header band, the section name in ink, drifting quietly behind each .phead.
   (The homepage hero is the fog split card in fog.js.) */
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


var DM_DATA = {};
function dmMount(root) {
  DM_LIVE = DM_LIVE.filter(function (S) { var on = document.body.contains(S.cv); S.alive = on; return on; });
  [].forEach.call((root || document).querySelectorAll("canvas[data-dm]"), function (cv) {
    if (cv._dm) return;
    var d = DM_DATA[cv.getAttribute("data-dk")]; if (!d) return;
    var S = cv._dm = dmMake(cv, cv.getAttribute("data-dm"), d);
    DM_LIVE.push(S);
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

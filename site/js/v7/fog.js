/* v7 fog hero: the lead event's split card as the moving layer of a Lumen-Roof style hero. Clicking the other outlet sinks the card into
   a WebGL2 fog, swaps the headline at the deepest point and lets it rise again; sky, fog and UI shift from warm red-grey to cool blue-grey.
   fogHero(e) builds the markup; fogMount(root) starts the clock on .fh. State lives in CSS variables on the .fh element (--k --k2 --dip --sink). */
var FOG_SINK = 240, FOG_RISE = 820, FOG_DEPTH = .27;
var FOG_FS = "#version 300 es\nprecision highp float;\n" +
  "uniform vec2 R;uniform float T,S,K,D;out vec4 O;\n" +
  "float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n" +
  "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}\n" +
  "float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);p=mat2(.8,.6,-.6,.8)*p+5.3;for(int i=0;i<5;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}\n" +
  "void main(){\n" +
  "  vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;\n" +
  "  float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);\n" +
  "  float t=T*.05;\n" +
  "  vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(-t*.8,t)+7.));\n" +
  "  float d=fbm(p*1.9+w*1.7+vec2(t*1.6,-t*1.1+S*.5));\n" +
  "  float e=fbm(p*.9-w+vec2(-t,t*.5)+3.);\n" +
  "  float low=smoothstep(.70,1.04,uv.y+(d-.5)*.34);\n" +
  "  float side=smoothstep(.2,.0,uv.x+(e-.5)*.28)+smoothstep(.8,1.,uv.x+(e-.5)*.28);\n" +
  "  side*=smoothstep(.25,.6,uv.y)*.2;\n" +
  "  float wisps=smoothstep(.5,.78,d)*smoothstep(.22,.5,uv.y)*smoothstep(.86,.6,uv.y)*.18;\n" +
  "  float rest=clamp(low+side+wisps,0.,1.);\n" +
  "  float front=1.02-S*.68;\n" +
  "  float rise=smoothstep(front-.02,front+.26,uv.y+(d-.5)*.5);\n" +
  "  float haze=S*(.3+.46*d);\n" +
  "  float a=clamp(max(rest,max(rise*.97,haze)),0.,1.);\n" +
  "  vec3 lA=mix(vec3(.96,.90,.88),vec3(.30,.20,.21),D),lB=mix(vec3(.80,.72,.71),vec3(.14,.09,.10),D);\n" +
  "  vec3 rA=mix(vec3(.88,.91,.97),vec3(.20,.25,.36),D),rB=mix(vec3(.70,.75,.85),vec3(.08,.11,.18),D);\n" +
  "  vec3 c=mix(mix(lB,lA,d*1.15),mix(rB,rA,d*1.1),K);\n" +
  "  O=vec4(c*a,a);\n" +
  "}";

function fogDark() {
  var t = document.documentElement.getAttribute("data-theme");
  return t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
}
function fogSmooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

function fogHero(e) {
  var pair = e && (SPLITPAIR[e.i] || defaultPair(e)), a = pair && artOf(e, pair[0]), b = pair && artOf(e, pair[1]);
  var sets = "", btns = "", cap = "", band = "";
  if (a && b) {
    var cmp = compareHeads(a, b), shared = cmp.shared.join(" ");
    var one = function (art, marks, cls, on) {
      var bl = bloc(art.s), w = SIDE[bl], c = bl === "left" ? "var(--left)" : bl === "right" ? "var(--right)" : "var(--mid)", ln = SRC[art.s] && SRC[art.s].lean;
      return '<div class="fh-set ' + cls + (on ? " is-on" : "") + '" style="--lean:' + c + '"><p class="fh-lab">' + esc(srcName(art.s).toLocaleUpperCase("tr")) + " · " +
        esc(w.toLocaleUpperCase("tr")) + (ln != null ? " " + ln : "") + '</p><p class="fh-h">' + markText(art.t, marks) + "</p></div>";
    };
    var btn = function (art, on) {
      var ln = SRC[art.s] && SRC[art.s].lean;
      return '<button type="button" aria-pressed="' + (on ? "true" : "false") + '"><b>' + esc(srcName(art.s)) + " · " + esc(SIDE[bloc(art.s)]) + "</b><small>yerleşim " + (ln != null ? ln : "—") + "</small></button>";
    };
    sets = one(a, cmp.markA, "l", true) + one(b, cmp.markB, "r", false);
    band = '<div class="fh-band" aria-hidden="true"><span class="fh-bl">ORTAK OLAN</span><span class="fh-bw">' + (shared ? esc(shared) : "ortak kelime yok") + "</span></div>";
    btns = '<div class="fh-toggle" role="group" aria-label="Hangi kurumun başlığı">' + btn(a, true) + btn(b, false) + "</div>";
    cap = shared ? '<p class="fh-cap">Ortak olan: ' + esc(shared) + "</p>" : "";
  }
  return '<section class="fh' + (sets ? "" : " empty") + '" aria-label="Çapraz Manşet">' +
    '<div class="fh-sky" aria-hidden="true"><i class="fh-sk l"></i><i class="fh-sk r"></i></div>' +
    (sets ? '<div class="fh-home"><div class="fh-card">' + sets + band + "</div></div>" : "") +
    '<div class="fh-tilt" aria-hidden="true"></div><canvas class="fh-fog" aria-hidden="true"></canvas>' +
    '<div class="fh-ui"><h1><span class="l1">Aynı olay,</span> <span class="y">farklı manşet.</span></h1>' +
    "<p class=\"fh-sub\">Türk medyasının aynı olayı nasıl farklı anlattığını yan yana koyuyoruz. Hüküm vermiyoruz; farkı ölçüyoruz.</p>" +
    '<div class="fh-dock">' + btns + cap + '<a class="fh-cta" href="#bu-hafta">Bu haftanın ayrışmalarını gör ↓</a></div></div></section>';
}

function fogMount(root) {
  var el = (root || document).querySelector(".fh");
  if (!el || el._fh) return;
  var cv = el.querySelector(".fh-fog"), bt = [].slice.call(el.querySelectorAll(".fh-toggle button")), sets = [el.querySelector(".fh-set.l"), el.querySelector(".fh-set.r")];
  var S = el._fh = { k: 0, target: 0, from: 0, start: 0, queued: null, swapped: true, animating: false, vis: true, last: 0, raf: 0, dark: fogDark() ? 1 : 0, still: 0 };
  var gl = null, U = {};
  try { gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (x) { gl = null; }
  if (gl) {
    var sh = function (t, src) { var o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { gl = null; } return o; };
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}"));
    if (gl) gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FOG_FS));
    if (gl) { gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) gl = null; }
    if (gl) { gl.useProgram(pr); ["R", "T", "S", "K", "D"].forEach(function (u) { U[u] = gl.getUniformLocation(pr, u); }); }
  }
  if (!gl) cv.classList.add("fh-fog-css");
  var size = function () {
    if (!gl) return;
    var cw = el.clientWidth || 1, ch = el.clientHeight || 1, w = Math.round(Math.min(cw, 960)), h = Math.max(1, Math.round(w * ch / cw));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
  };
  var set = function (n, v) { el.style.setProperty(n, v); };
  var show = function (n) { if (sets[0]) sets[0].classList.toggle("is-on", !n); if (sets[1]) sets[1].classList.toggle("is-on", !!n); };
  var draw = function (now, s) {
    if (!gl) return;
    gl.uniform2f(U.R, cv.width, cv.height); gl.uniform1f(U.T, now / 1000); gl.uniform1f(U.S, s); gl.uniform1f(U.K, S.k); gl.uniform1f(U.D, S.dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  /* The reference clock: sink, swap at the deepest point, rise; k (sky, fog) and k2 (type) follow on smoothsteps. */
  var frame = function (now) {
    var d = now - S.start, y = 0, s = 0, dip = 0, k2 = S.k;
    if (S.animating) {
      if (d < FOG_SINK) { var x0 = d / FOG_SINK; y = x0 * x0 * (3 - 2 * x0) * FOG_DEPTH; }
      else {
        if (!S.swapped) { S.swapped = true; show(S.target); }
        var x1 = Math.min(1, Math.max(0, (d - FOG_SINK) / FOG_RISE)); y = Math.pow(1 - x1, 3.4) * FOG_DEPTH;
      }
      s = fogSmooth(0, FOG_SINK * .92, d) * (1 - fogSmooth(FOG_SINK + 70, FOG_SINK + FOG_RISE * .92, d));
      dip = fogSmooth(30, 190, d) * (1 - fogSmooth(330, 720, d));
      S.k = S.from + (S.target - S.from) * fogSmooth(120, 520, d);
      k2 = S.from + (S.target - S.from) * fogSmooth(340, 760, d);
      if (d >= FOG_SINK + FOG_RISE) {
        S.animating = false; S.k = k2 = S.target; y = s = dip = 0;
        if (S.queued !== null && S.queued !== S.target) { var q = S.queued; S.queued = null; begin(q, now); } else S.queued = null;
      }
    }
    set("--sink", (y * innerHeight).toFixed(1) + "px"); set("--k", S.k.toFixed(3)); set("--k2", k2.toFixed(3)); set("--dip", dip.toFixed(3)); set("--surge", s.toFixed(3));
    draw(now, s);
  };
  var begin = function (n, now) { S.target = n; S.from = S.k; S.start = now; S.swapped = false; S.animating = true; };
  var alive = function () { return document.body.contains(el); };
  var loop = function () {
    if (S.raf || !S.vis || !alive() || dmCalm()) return;
    S.raf = requestAnimationFrame(function (now) {
      S.raf = 0; if (!alive()) return;
      if (now - S.last >= 32) { S.last = now; frame(now); }
      loop();
    });
  };
  var still = function () { S.dark = fogDark() ? 1 : 0; size(); frame(performance.now()); };
  var pick = function (n) {
    if (n === S.target && S.queued === null) return;
    bt.forEach(function (b, i) { b.setAttribute("aria-pressed", i === n ? "true" : "false"); });
    if (dmCalm()) { S.target = n; S.k = n; S.animating = false; S.queued = null; show(n); still(); return; }
    if (S.animating) S.queued = n; else begin(n, performance.now());
    loop();
  };
  bt.forEach(function (b, i) { b.addEventListener("click", function () { pick(i); }); });
  var cta = el.querySelector(".fh-cta");
  if (cta) cta.addEventListener("click", function (ev) {
    var t = document.getElementById("bu-hafta"); if (!t) return;
    ev.preventDefault(); t.scrollIntoView({ behavior: dmCalm() ? "auto" : "smooth", block: "start" });
  });
  /* Off-screen: stop. Theme change: re-read the colours (the CSS side follows the tokens by itself). */
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { S.vis = es[0].isIntersecting; if (S.vis) loop(); }).observe(el);
  var retheme = function () { if (!alive()) return; S.dark = fogDark() ? 1 : 0; if (dmCalm() || !S.vis) still(); };
  new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  var mq = matchMedia("(prefers-color-scheme: dark)"); if (mq.addEventListener) mq.addEventListener("change", retheme);
  addEventListener("resize", function () { if (alive()) { size(); if (dmCalm()) frame(performance.now()); } });
  set("--k", "0"); set("--k2", "0"); set("--dip", "0"); set("--sink", "0px"); set("--surge", "0");
  size(); frame(performance.now()); loop();
}

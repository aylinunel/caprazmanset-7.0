/* v7 Anlatı: the homepage. A map of how outlets told one event: rows = outlets, columns = narrative dimensions. */
var V7_PURPOSE = "Çapraz Manşet, Türk medyasının aynı olayı nasıl farklı anlattığını yan yana gösterir: kim neyi seçti, kimi sorumlu tuttu, hangi sözcüğü kullandı.";
var V7_READ = ["Her satır bir kurum; soldan sağa, kayıt defterindeki yerleşim sırasıyla.",
  "Aynı renk, aynı seçim: iki kurum aynı aktörü sorumlu tutuyorsa hücreleri aynı renktedir.",
  "Bir sütun başlığına tıklayın: kurumlar o boyuttaki seçimlerine göre gruplanır."];

function v7Weeks() {
  return NW.filter(function (w) { return w.k !== "v1"; }).map(function (w) {
    return { k: w.k, l: w.l, coded: w.coded, keys: weekEvents(D.N, NW, w.k, narrOk) };
  });
}

function v7Dims(n) {
  var f = (n.focus && n.focus.length ? n.focus : ["frame", "blame", "sol"]);
  return NORD.filter(function (d) { return f.indexOf(d) >= 0; });
}

/* Colour of each value within a dimension: most common value first. */
function v7Colors(rows, dims) {
  var col = {};
  dims.forEach(function (d) {
    var c = {};
    rows.forEach(function (r) { var v = String(r[d] || "").trim(); if (v && !UNSET(v)) c[v] = (c[v] || 0) + 1; });
    col[d] = {};
    Object.keys(c).sort(function (a, b) { return c[b] - c[a] || trCmp(a, b); })
      .forEach(function (v, i) { col[d][v] = NPAL[i % NPAL.length]; });
  });
  return col;
}

function v7Lean(s) { return SRC[s] && SRC[s].lean != null ? SRC[s].lean : null; }

function v7Cell(r, d, col, active) {
  var v = String(r[d] || "").trim();
  if (!v || UNSET(v)) return '<td class="v7-e"><span class="v7-none">başlıkta yok</span></td>';
  return '<td><span class="v7-pill' + (active === d ? " v7-on" : "") + '" role="note" aria-label="' + esc(srcName(r.s) + ": " + NDL[d] + " — " + v) + '" tabindex="0" data-d="' + d + '" data-v="' + esc(v) +
    '" style="--c:' + col[d][v] + '">' + esc(v) + "</span></td>";
}

function v7Row(r, dims, col, opts) {
  var open = (opts.open || []).indexOf(r.s) >= 0, b = bloc(r.s), lv = v7Lean(r.s);
  return '<tr class="v7-row ' + b + '"><th scope="row" class="v7-o" style="--c:' + (lv == null ? "var(--line2)" : lean(lv)) + '">' +
    '<button type="button" class="v7-out" data-s="' + esc(r.s) + '" aria-expanded="' + open + '">' + esc(srcName(r.s)) + "</button></th>" +
    dims.map(function (d) { return v7Cell(r, d, col, opts.active); }).join("") + "</tr>" +
    '<tr class="v7-hlr"' + (open ? "" : " hidden") + '><td colspan="' + (dims.length + 1) + '"><q class="v7-hl">' +
    (r.hl ? esc(r.hl) : "<i>Başlık metni kaydedilmemiş</i>") + "</q></td></tr>";
}

/* The map for one narrative entry. opts: {active: dim to group by, open: [outlet slugs with headline shown]} */
function narrMap(key, opts) {
  opts = opts || {};
  var n = D.N[key];
  if (!n || !(n.rows || []).length) return '<p class="v7-note">Bu olay için kurum satırı yok.</p>';
  var dims = v7Dims(n), col = v7Colors(n.rows, dims), act = dims.indexOf(opts.active) >= 0 ? opts.active : null;
  var o = { active: act, open: opts.open };
  var head = '<tr><th scope="col" class="v7-o">Kurum</th>' + dims.map(function (d) {
    return '<th scope="col" data-dim="' + d + '"><button type="button" class="v7-dh" aria-pressed="' + (act === d) + '">' + esc(NDL[d]) +
      (act === d ? " ✕" : "") + "</button></th>";
  }).join("") + "</tr>";
  var body;
  if (act) {
    var by = {};
    n.rows.forEach(function (r) { by[r.s] = r; });
    body = narrGroups(n.rows, act).map(function (g) {
      var rs = orderOutlets(g.outlets.map(function (s) { return by[s]; }), v7Lean);
      return '<tr class="v7-group"><th scope="colgroup" colspan="' + (dims.length + 1) + '"><span class="v7-gh"><b>' +
        (g.value && !UNSET(g.value) ? esc(g.value) : "başlıkta yok") + "</b> · " + g.outlets.length + " kurum</span></th></tr>" +
        rs.map(function (r) { return v7Row(r, dims, col, o); }).join("");
    }).join("");
  } else {
    body = orderOutlets(n.rows, v7Lean).map(function (r) { return v7Row(r, dims, col, o); }).join("");
  }
  return '<div class="v7-scroll"><table class="v7-map" data-key="' + esc(key) + '"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
    '<p class="v7-leg"><span class="left">sola yerleşik</span><span class="mid">merkez</span><span class="right">sağa yerleşik</span></p>';
}

var V7_BL = { left: "sol", mid: "merkez", right: "sağ", none: "yerleşimsiz" };
function v7Vals(n, d) {
  var m = {};
  n.rows.forEach(function (r) {
    var v = String(r[d] || "").trim(); if (UNSET(v)) return;
    var o = m[v] = m[v] || { v: v, n: 0, b: { left: 0, mid: 0, right: 0, none: 0 }, s: [] };
    o.n++; o.b[bloc(r.s)]++; o.s.push(r.s);
  });
  return Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return y.n - x.n; });
}
function v7BlocTxt(b) {
  return ["left", "mid", "right", "none"].filter(function (k) { return b[k]; })
    .map(function (k) { return b[k] + " " + V7_BL[k]; }).join(", ");
}
/* Main-body context: the coded summary (YZ when agent-made), where outlets split, and the two furthest stories. */
function v7Body(n, e) {
  var ai = n.status === "agent_coded", q = n.q || {}, dims = v7Dims(n), tot = n.rows.length;
  var rows = [["Ne oldu", q.happened], ["Ortak nokta", q.agree], ["Ayrışan nokta", q.differ], ["Okuyucu için ne değişiyor", q.care]]
    .filter(function (x) { return x[1]; });
  var inner = rows.map(function (x) { return "<h3>" + x[0] + "</h3><p>" + esc(x[1]) + "</p>"; }).join("");
  var h = '<section class="v7-ctx">' + (ai ? yzBlock(inner, "Kısaca") : "<h2>Kısaca</h2>" + inner) + "</section>";
  var split = dims.map(function (d) {
    var vs = v7Vals(n, d), filled = vs.reduce(function (a, x) { return a + x.n; }, 0);
    if (vs.length < 2) return "";
    var li = vs.slice(0, 4).map(function (x) {
      return "<li><b>“" + esc(x.v) + "”</b> — " + x.n + " kurum <span class=\"v7-cnt\">(" + v7BlocTxt(x.b) + ")</span><br><span class=\"v7-note\">" +
        x.s.map(srcName).map(esc).join(", ") + "</span></li>";
    }).join("");
    var gap = tot - filled;
    return "<div class=\"v7-dim\"><h3>" + esc(NDL[d] || d) + " <span class=\"v7-cnt\">" + vs.length + " farklı yanıt</span></h3><ul>" + li + "</ul>" +
      (gap ? '<p class="v7-note">' + gap + " kurumun başlığı bu konuda bir şey söylemiyor.</p>" : "") + "</div>";
  }).join("");
  if (split) h += '<section class="v7-ctx"><h2>Kurumlar nerede ayrışıyor</h2><p class="v7-note">Her boyutta aynı olay için seçilen farklı yanıtlar; okuyucunun önce gördüğü şeyi bu seçimler belirler.</p><div class="v7-dims">' + split + "</div></section>";
  var best = null;
  for (var i = 0; i < n.rows.length; i++) for (var j = i + 1; j < n.rows.length; j++) {
    var A = n.rows[i], B = n.rows[j], c = dims.filter(function (d) { var x = String(A[d] || "").trim(), y = String(B[d] || "").trim(); return !UNSET(x) && !UNSET(y) && x !== y; }).length;
    if (!best || c > best.c) best = { c: c, a: A, b: B };
  }
  if (best && best.c >= 2) {
    var card = function (r) {
      return '<div class="v7-far1"><p class="v7-cnt">' + esc(srcName(r.s)) + " · " + V7_BL[bloc(r.s)] + '</p><p class="v7-hl">“' + esc(r.hl || "") + "”</p><dl>" +
        dims.map(function (d) { var v = String(r[d] || "").trim(); return UNSET(v) ? "" : "<dt>" + esc(NDL[d] || d) + "</dt><dd>" + esc(v) + "</dd>"; }).join("") + "</dl></div>";
    };
    h += '<section class="v7-ctx"><h2>En uzak iki anlatı</h2><p class="v7-note">' + best.c + " boyutta farklı seçim yapan iki kurum. Aynı olay, iki ayrı hikâye.</p>" +
      '<div class="v7-far">' + card(best.a) + card(best.b) + "</div></section>";
  }
  if (e) h += '<p><a class="lnk" href="#/olay?e=' + e.i + '">Olayın bütün başlıkları →</a></p>';
  return h;
}

function v7WeekBar(weeks, cur) {
  return '<div class="v7-weeks" role="group" aria-label="Hafta">' + weeks.map(function (w) {
    return '<button type="button" class="chip" data-w="' + w.k + '" aria-pressed="' + (w.k === cur) + '"' + (w.keys.length ? "" : " disabled") + ">" +
      esc(w.l) + ' <span class="v7-cnt">' + w.keys.length + "</span></button>";
  }).join("") + "</div>";
}

function pgAnlati(q) {
  q = q || {};
  var weeks = v7Weeks(), full = weeks.filter(function (w) { return w.keys.length; });
  var purpose = '<p class="v7-purpose">' + esc(V7_PURPOSE) + "</p>";
  if (!full.length) return '<div class="wrap page v7-an">' + purpose + '<h1 class="v7-emptyh">Bu hafta için gösterilecek olay yok.</h1></div>';
  var latest = full[full.length - 1];
  var byN = q.n && D.N[q.n] ? full.filter(function (w) { return w.k === D.N[q.n].w; })[0] : null;
  var pk = pickWeek(NW, D.N, narrOk, byN ? byN.k : q.w);
  var wk = weeks.filter(function (w) { return w.k === pk.week; })[0];
  if (pk.empty) {
    var coded = (NW.filter(function (w) { return w.k === wk.k; })[0] || { keys: [] }).keys.length;
    return '<div class="wrap page v7-an">' + purpose + '<h1 class="v7-emptyh">Bu hafta için gösterilecek olay yok.</h1><p class="v7-note">' +
      (coded ? "Bu haftanın kodlanmış olaylarının hepsi editör incelemesinde kaldırıldı." : "Bu hafta için kodlanmış olay yok.") + "</p>" +
      v7WeekBar(weeks, wk.k) + "</div>";
  }
  var key = q.n && wk.keys.indexOf(q.n) >= 0 ? q.n : wk.keys[0], n = D.N[key], e = EV[n.ev], tab = q.v === "tablo", net = q.v === "ag";
  V7VIEW = tab ? "tablo" : net ? "ag" : "";
  var title = narrName(key, 140), ai = n.status === "agent_coded";
  var h = '<div class="wrap page v7-an"><p class="v7-purpose">' + esc(V7_PURPOSE) + "</p><h1>" + esc(title) + "</h1>";
  h += v7WeekBar(weeks, wk.k);
  h += '<div class="v7-events" role="group" aria-label="Olay">' + wk.keys.map(function (k) {
    return '<button type="button" class="chip" data-w="' + wk.k + '" data-n="' + k + '" aria-pressed="' + (k === key) + '">' + esc(narrName(k, 44)) + "</button>";
  }).join("") + "</div>";
  h += '<div class="v7-body"><div class="v7-mapbox"><p class="v7-meta">' + (ai ? yzBadge() + " Başlıklardan yapay zekâ ile kodlandı. " : "Başlıklardan elle kodlandı. ") +
    '<a class="lnk" href="#/yontem">Yöntem</a></p>' + v7ViewBar(wk.k, key, tab) +
    (tab ? '<div id="v7-map" data-key="' + esc(key) + '">' + narrMap(key) + "</div>" : net ? g6Box("narr", key, "Kurumlar ve seçtikleri anlatılar ağı") +
      '<p class="v7-note">Daireler kurum, kareler bir boyuttaki seçim (çerçeve, sorumlu, çözüm…). Aynı kareye bağlanan kurumlar aynı seçimi yaptı; çok seçimi paylaşan kurumlar birbirine yakın durur. Kare büyüklüğü seçimi yapan kurum sayısı.</p>' +
      '<p class="v7-leg"><span class="left">sola yerleşik</span><span class="mid">merkez</span><span class="right">sağa yerleşik</span></p>' :
      '<div class="v7-scroll"><div id="v7-flow" data-key="' + esc(key) + '"></div></div><p class="v7-note">Her çizgi bir kurum; rengi kurumun yerleşimini gösterir. ' +
      "Aynı kutudan geçen çizgiler aynı seçimi yapmıştır. Bir çizginin üzerine gelince kurumun seçimleri görünür.</p>" +
      '<p class="v7-leg"><span class="left">sola yerleşik</span><span class="mid">merkez</span><span class="right">sağa yerleşik</span></p>') +
    "</div></div>" + v7Body(n, e);
  h += '<section class="v7-readbox"><h2>Nasıl okunur</h2><ol class="v7-read">' + V7_READ.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></section>";
  var top = latest.keys.map(function (k) { return EV[D.N[k].ev]; }).filter(Boolean)
    .sort(function (a, b) { return b.s.length - a.s.length; }).slice(0, 3);
  h += '<section class="v7-weekstrip"><h2>Bu hafta <span class="v7-cnt">' + esc(latest.l) + "</span></h2><div class=\"v7-wk\">" + top.map(function (x) {
    return '<a class="v7-wc" href="#/olay?e=' + x.i + '"><b>' + esc(storyLabel(x, 90)) + "</b><span>" + x.s.length + " kurum</span></a>";
  }).join("") + "</div></section>";
  return h + "</div>";
}

var V7VIEW = "";
/* Graph is the primary view; the table is one click away for reading every outlet's choice. */
function v7ViewBar(w, key, tab) {
  var u = "#/anlati?w=" + w + "&n=" + encodeURIComponent(key);
  return '<div class="v7-view" role="group" aria-label="Görünüm"><a class="chip" href="' + u + '" aria-pressed="' + (V7VIEW === "") + '">Akış</a>' +
    '<a class="chip" href="' + u + '&v=ag" aria-pressed="' + (V7VIEW === "ag") + '">Ağ</a>' +
    '<a class="chip" href="' + u + '&v=tablo" aria-pressed="' + tab + '">Tablo</a></div>';
}
function wireAnlati(root) {
  if (!root) return;
  var fl = root.querySelector("#v7-flow");
  if (fl && !fl.firstChild) {
    var nf = D.N[fl.getAttribute("data-key")], keep = NFOC;
    NFOC = nf.focus; fl.appendChild(narrativeFlow(nf.rows)); NFOC = keep;
  }
  var box = root.querySelector("#v7-map");
  var openList = function () { return [].map.call(box.querySelectorAll(".v7-out[aria-expanded=true]"), function (b) { return b.getAttribute("data-s"); }); };
  var same = function (el) {
    [].forEach.call(root.querySelectorAll(".v7-same"), function (x) { x.classList.remove("v7-same"); });
    if (!el) return;
    [].forEach.call(root.querySelectorAll(".v7-pill"), function (x) {
      if (x.getAttribute("data-d") === el.getAttribute("data-d") && x.getAttribute("data-v") === el.getAttribute("data-v")) x.classList.add("v7-same");
    });
  };
  root.addEventListener("click", function (ev) {
    var t = ev.target, b;
    if ((b = t.closest("[data-w]"))) {
      if (b.disabled) return;
      var nn = b.getAttribute("data-n");
      location.hash = "#/anlati?w=" + b.getAttribute("data-w") + (nn ? "&n=" + encodeURIComponent(nn) : "") + (V7VIEW ? "&v=" + V7VIEW : "");
    } else if ((b = t.closest("th[data-dim]")) && box) {
      var d = b.getAttribute("data-dim"), cur = box.getAttribute("data-active");
      var next = cur === d ? "" : d, open = openList();
      box.setAttribute("data-active", next);
      box.innerHTML = narrMap(box.getAttribute("data-key"), { active: next, open: open });
      var nb = box.querySelector('th[data-dim="' + d + '"] button'); if (nb) nb.focus();
    } else if ((b = t.closest(".v7-out"))) {
      var on = b.getAttribute("aria-expanded") !== "true", hr = b.closest("tr").nextElementSibling;
      b.setAttribute("aria-expanded", on);
      if (hr) hr.hidden = !on;
    }
  });
  var over = function (ev) { var p = ev.target.closest && ev.target.closest(".v7-pill"); if (p) same(p); };
  var out = function (ev) { if (ev.target.closest && ev.target.closest(".v7-pill")) same(null); };
  root.addEventListener("mouseover", over); root.addEventListener("focusin", over);
  root.addEventListener("mouseout", out); root.addEventListener("focusout", out);
}

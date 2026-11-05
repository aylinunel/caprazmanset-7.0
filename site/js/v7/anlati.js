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
  return '<td><span class="v7-pill' + (active === d ? " v7-on" : "") + '" role="button" aria-label="' + esc(srcName(r.s) + ": " + NDL[d] + " — " + v) + '" tabindex="0" data-d="' + d + '" data-v="' + esc(v) +
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

function v7Side(n, e) {
  var ai = n.status === "agent_coded", q = n.q || {};
  var rows = [["Ne oldu", q.happened], ["Ortak nokta", q.agree], ["Ayrışan nokta", q.differ]].filter(function (x) { return x[1]; });
  var inner = rows.map(function (x) { return "<h3>" + x[0] + "</h3><p>" + esc(x[1]) + "</p>"; }).join("");
  var link = e ? '<p><a class="lnk" href="#/olay?e=' + e.i + '">Olayın bütün başlıkları →</a></p>' : "";
  return '<aside class="v7-side">' + (ai ? yzBlock(inner, "Kısaca") : inner) + link + "</aside>";
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
  var key = q.n && wk.keys.indexOf(q.n) >= 0 ? q.n : wk.keys[0], n = D.N[key], e = EV[n.ev];
  var title = narrName(key, 140), ai = n.status === "agent_coded";
  var h = '<div class="wrap page v7-an"><p class="v7-purpose">' + esc(V7_PURPOSE) + "</p><h1>" + esc(title) + "</h1>";
  h += v7WeekBar(weeks, wk.k);
  h += '<div class="v7-events" role="group" aria-label="Olay">' + wk.keys.map(function (k) {
    return '<button type="button" class="chip" data-w="' + wk.k + '" data-n="' + k + '" aria-pressed="' + (k === key) + '">' + esc(narrName(k, 44)) + "</button>";
  }).join("") + "</div>";
  h += '<div class="v7-body"><div class="v7-mapbox"><p class="v7-meta">' + (ai ? yzBadge() + " Başlıklardan yapay zekâ ile kodlandı. " : "Başlıklardan elle kodlandı. ") +
    '<a class="lnk" href="#/yontem">Yöntem</a></p><div id="v7-map" data-key="' + esc(key) + '">' + narrMap(key) + "</div></div>" + v7Side(n, e) + "</div>";
  h += '<section class="v7-readbox"><h2>Nasıl okunur</h2><ol class="v7-read">' + V7_READ.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol></section>";
  var top = latest.keys.map(function (k) { return EV[D.N[k].ev]; }).filter(Boolean)
    .sort(function (a, b) { return b.s.length - a.s.length; }).slice(0, 3);
  h += '<section class="v7-weekstrip"><h2>Bu hafta <span class="v7-cnt">' + esc(latest.l) + "</span></h2><div class=\"v7-wk\">" + top.map(function (x) {
    return '<a class="v7-wc" href="#/olay?e=' + x.i + '"><b>' + esc(storyLabel(x, 90)) + "</b><span>" + x.s.length + " kurum</span></a>";
  }).join("") + "</div></section>";
  return h + "</div>";
}

function wireAnlati(root) {
  if (!root) return;
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
      location.hash = "#/anlati?w=" + b.getAttribute("data-w") + (nn ? "&n=" + encodeURIComponent(nn) : "");
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

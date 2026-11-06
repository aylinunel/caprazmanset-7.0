/* v7 Resmî ilan bul: search over the official notices the classifier set aside from the news. */
var ILAN = { q: { text: "", family: "", src: "", from: "", to: "" }, n: 50, items: null };
var ILAN_FAM = [["", "Tümü"], ["court", "Mahkeme"], ["enforcement", "İcra"], ["public", "Kamu"], ["other", "Diğer"]];
function ilanItems() {
  if (ILAN.items) return ILAN.items;
  var by = CM3.notices(D).byArt;
  return ILAN.items = Object.keys(by).map(function (id) {
    var a = ART[id]; if (!a) return null;
    var k = CM3.noticeKind(a.t);
    return { t: a.t, s: a.s, d: a.d, u: a.u, kind: k.kind, family: k.family };
  }).filter(Boolean);
}
function ilanResults() {
  var all = ilanItems(), q = ILAN.q, hit = ilanSearch(all, { text: q.text, family: q.family, src: q.src, from: q.from, to: q.to ? q.to + "T24" : "" });
  if (!hit.length) return '<p class="v7-ilan-empty">Bu aramayla eşleşen ilan bizim derlemimizde yok. Resmî ilanların tamamı için ilan.gov.tr adresine bakabilirsiniz.</p>';
  return '<p class="xsmall" aria-live="polite">' + orN(hit.length) + " ilan bulundu.</p><ul class=\"v7-ilan-list\">" + hit.slice(0, ILAN.n).map(function (i) {
    return '<li class="v7-ilan-row"><a class="hlnk" href="' + esc(i.u || "#") + '" target="_blank" rel="noopener">' + esc(i.t) + '</a><span class="xsmall">' +
      esc(srcName(i.s)) + " · " + fmtDT(i.d) + "</span></li>";
  }).join("") + "</ul>" + (hit.length > ILAN.n ? '<button type="button" class="chip" id="ilanmore">Daha fazla göster (' + orN(hit.length - ILAN.n) + ")</button>" : "");
}
function pgIlan() {
  var all = ilanItems(), last = all.reduce(function (m, i) { return i.d > m ? i.d : m; }, ""),
    wk = last ? new Date(Date.parse(last + ":00Z") - 7 * 864e5).toISOString().slice(0, 16) : "",
    week = all.filter(function (i) { return i.d >= wk; }).length, q = ILAN.q;
  var srcs = {}; all.forEach(function (i) { srcs[i.s] = 1; });
  return '<div class="wrap page v7-ilan"><div class="phead"><h1>Resmî ilan bul</h1>' +
    '<p class="lede">Resmî ilan; mahkeme, icra dairesi ya da bir kamu kurumunun yasa gereği gazetede yayımlattığı bildirimdir. Haber olmadığı için olay tespitinden ayrı tutulur. ' +
    "Burada, topladığımız başlıklar arasında ilan olarak ayrılanlar aranır: toplam <b>" + orN(all.length) + "</b>, son bir haftada <b>" + orN(week) + "</b>.</p></div>" + v3ilanOverview() +
    '<form class="v7-ilan-f" onsubmit="return false"><label for="ilanq">Başlıkta ara</label><input type="search" id="ilanq" value="' + esc(q.text) + '" autocomplete="off">' +
    '<div class="v7-ilan-chips" role="group" aria-label="İlan türü">' + ILAN_FAM.map(function (f) {
      return '<button type="button" class="chip" data-fam="' + f[0] + '" aria-pressed="' + (q.family === f[0]) + '">' + f[1] + "</button>"; }).join("") + "</div>" +
    '<div class="v7-ilan-r"><label>Başlangıç<input type="date" id="ilanfrom" value="' + esc(q.from) + '"></label><label>Bitiş<input type="date" id="ilanto" value="' + esc(q.to) + '"></label>' +
    '<label>Kurum<select id="ilansrc"><option value="">Tümü</option>' + Object.keys(srcs).sort(function (a, b) { return trCmp(srcName(a), srcName(b)); }).map(function (s) {
      return '<option value="' + esc(s) + '"' + (q.src === s ? " selected" : "") + ">" + esc(srcName(s)) + "</option>"; }).join("") + "</select></label></div></form>" +
    '<div id="ilanres">' + ilanResults() + "</div></div>";
}
function wireIlan() {
  var root = document.getElementById("view"), res = document.getElementById("ilanres"); if (!root || !res) return;
  var redo = function () { var r = document.getElementById("ilanres"); if (!r) return; ILAN.n = 50; r.innerHTML = ilanResults(); };
  var bind = function (id, k) { var el = document.getElementById(id); if (el) el.addEventListener("input", function () { ILAN.q[k] = el.value; redo(); }); };
  bind("ilanq", "text"); bind("ilanfrom", "from"); bind("ilanto", "to"); bind("ilansrc", "src");
  if (root._ilan) return; root._ilan = 1;
  root.addEventListener("click", function (ev) {
    var res = document.getElementById("ilanres"); if (!res) return;
    var f = ev.target.closest && ev.target.closest("[data-fam]"), m = ev.target.closest && ev.target.closest("#ilanmore");
    if (f) { ILAN.q.family = f.getAttribute("data-fam"); [].forEach.call(root.querySelectorAll("[data-fam]"), function (x) { x.setAttribute("aria-pressed", x === f); }); redo(); }
    if (m) { ILAN.n += 50; res.innerHTML = ilanResults(); }
  });
}

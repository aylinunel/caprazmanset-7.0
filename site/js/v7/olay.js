/* v7 Olay: the single event page. Header, narrative map, split card + all headlines, cognitive review, timing, outlets. */

function olayHead(e) {
  var bs = e.bs ? bsBadge(e, true) : '<span class="xsmall">Kör nokta kuralını karşılamıyor. <a class="lnk" href="#/yontem?s=5">Kural</a></span>';
  return '<div class="xcrumb"><a href="#/olaylar">Olaylar</a> › ' + tpChips(e, 4) + "</div>" +
    '<h1 class="xh1">' + esc(e.t) + "</h1>" +
    '<div class="xmeta" style="margin-top:10px"><span class="xdt">' + fmtDT(e.f) + " – " + fmtDT(e.l) + "</span><span>" + e.n + " başlık · " +
    v3newsOutletCount(e) + " kurum</span>" + bs + "</div>" + bbar(e, true);
}

function olayHeadlines(e) {
  var arts = e.a.map(function (i) { return ART[i]; });
  return '<section class="sec"><div class="xsec-h"><h2>Bütün başlıklar</h2></div>' +
    '<div class="xtabs" id="atabs">' + [["all", "Hepsi"], ["left", "Sol"], ["mid", "Merkez"], ["right", "Sağ"]].map(function (t) {
      var n = t[0] === "all" ? arts.length : arts.filter(function (a) { return sideOf(a.s) === t[0]; }).length;
      return '<button class="xtab' + (t[0] === ARTSIDE ? " on" : "") + '" data-as="' + t[0] + '"' + (n ? "" : " disabled") + ">" + t[1] + ' <span class="num">' + n + "</span></button>";
    }).join("") + '<select id="asort" aria-label="Sırala" style="margin-left:auto"><option value="time">Zamana göre</option>' +
    '<option value="lean">Yerleşime göre (sol → sağ)</option><option value="load">Yüklü dile göre</option></select></div>' +
    ledeButton5() + '<div id="alist"></div>' + fixLink("olay", e.i, e.t) + "</section>";
}

function olayFinding(f, x) {
  var t = yzText(f, rev7(x.event + "__" + f.id));
  if (!t) return "";
  var qs = (f.evidence || []).slice(0, 3).map(function (q) {
    return "<li>“" + esc(q.q) + "”" + ((q.o || []).length ? " — " + q.o.map(function (o) { return esc(srcName(o)); }).join(", ") : "") + "</li>";
  }).join("");
  return '<div class="v7-yzf"><h4><a class="lnk" href="#/yontem?s=kavramlar&k=' + encodeURIComponent(bg7k(f.id)) + '">' + esc(f.name) + "</a></h4>" +
    (t.noticed ? "<p><b>" + (t.editor ? "Editör notu" : "Ne fark etti") + ".</b> " + esc(t.noticed) + "</p>" : "") +
    (qs ? "<ul>" + qs + "</ul>" : "") +
    (t.why ? "<p><b>Neden kesin değil.</b> " + esc(t.why) + "</p>" : "") + "</div>";
}

function olayReview(e) {
  var x = bg7ev(e.i);
  if (!x || x.status !== "review_complete") return "";
  var h = bg7Live(x).map(function (f) { return olayFinding(f, x); }).join("");
  return h ? yzBlock(h, "Bilişsel inceleme") : "";
}

function olayTiming(e) {
  var arts = e.a.map(function (i) { return ART[i]; }).sort(function (a, b) { return a.d.localeCompare(b.d); });
  var first = {}, firsts = [];
  arts.forEach(function (a) { if (!first[a.s]) { first[a.s] = a; firsts.push(a); } });
  var h = "";
  if (firsts.length) {
    var t0 = Date.parse(firsts[0].d + ":00Z"), lags = firsts.slice(1).map(function (a) { return Math.round((Date.parse(a.d + ":00Z") - t0) / 60000); });
    h += "<p>İlk başlığı <b>" + esc(srcName(firsts[0].s)) + "</b> verdi (" + fmtDT(firsts[0].d) + ")" +
      (lags.length ? "; diğer kurumların ilk başlığı medyan " + dur5(median5(lags)) + " sonra geldi." : ".") + "</p>";
  }
  var gap = firsts.filter(function (a) { return a.lv != null && a.v - a.lv >= 15; }).sort(function (a, b) { return (b.v - b.lv) - (a.v - a.lv); })[0];
  if (gap) h += "<p>Başlığı spotundan en çok yüklü kurum: <b>" + esc(srcName(gap.s)) + "</b> (" + (gap.v - gap.lv) + " puan fark).</p>";
  return h ? '<section class="sec v7-time"><h2>Zamanlama</h2>' + h + "</section>" : "";
}

function olayOutlets(e) {
  return '<section class="sec"><h2>Veren kurumlar</h2><p class="v7-outlets">' + e.s.map(function (s) {
    return '<a class="lnk" href="#/kurum?s=' + s + '">' + esc(srcName(s)) + "</a>";
  }).join(" · ") + "</p></section>";
}

function pgOlay7(q) {
  var e = EV[q.e];
  if (!e) return '<div class="wrap page"><div class="phead"><h1>Olay bulunamadı</h1><p class="lede"><a class="lnk" href="#/olaylar">Olay listesine dön</a></p></div></div>';
  logStory(e.i);
  var nk = NBYEV[e.i], map = nk && narrOk(nk) && D.N[nk] ?
    '<section class="sec"><div id="v7-map" data-key="' + esc(nk) + '">' + narrMap(nk) + "</div></section>" : "";
  return '<div class="wrap page xstory">' + olayHead(e) + map +
    splitBlock(e) + olayHeadlines(e) + olayReview(e) + olayTiming(e) + olayOutlets(e) + "</div>";
}

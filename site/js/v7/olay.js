/* v7 Olay: the single event page. Header, narrative map, split card + all headlines, cognitive review, timing, outlets. */

function olayHead(e) {
  var c = covOf(e), side = e.bs === "left" ? "Sol" : "Sağ";
  var bs = e.bs ? '<span class="xbs ' + e.bs + '">' + side + " kurumların çoğu bu olayı vermedi</span>" : "";
  return '<div class="xcrumb"><a href="#/olaylar">Olaylar</a> › ' + tpChips(e, 4) + "</div>" +
    '<h1 class="xh1">' + esc(e.t) + "</h1>" +
    '<div class="xmeta" style="margin-top:10px"><span>' + e.s.length + " kurum verdi · " + c[0] + " sol, " + c[1] + " merkez, " + c[2] + " sağ" + (e.s.length > c[0] + c[1] + c[2] ? ", " + (e.s.length - c[0] - c[1] - c[2]) + " yerleşimsiz" : "") + " · " +
    '<span class="xdt">' + fmtDT(e.f) + " – " + fmtDT(e.l) + "</span></span>" + bs + "</div>" + bbar(e, true);
}

/* "Kısaca": the coded summary (YZ badge when agent-coded), else one generated line. */
function olayKisaca(e) {
  var nk = NBYEV[e.i], n = nk && narrOk(nk) && D.N[nk], q = (n && n.q) || {};
  var rows = [["Ne oldu", q.happened], ["Ortak nokta", q.agree], ["Ayrışan nokta", q.differ]].filter(function (x) { return x[1]; });
  if (rows.length) {
    var inner = rows.map(function (x) { return "<h3>" + x[0] + "</h3><p>" + esc(x[1]) + "</p>"; }).join("");
    return '<section class="sec v7-kisaca">' + (n.status === "agent_coded" ? '<div class="yz"><h2>Kısaca ' + yzBadge() + "</h2>" + inner + "</div>" : "<h2>Kısaca</h2>" + inner) + "</section>";
  }
  var pair = SPLITPAIR[e.i] || defaultPair(e), a = pair && artOf(e, pair[0]), b = pair && artOf(e, pair[1]);
  if (!a || !b) return '<section class="sec v7-kisaca"><h2>Kısaca</h2><p>' + e.s.length + " kurum bu olayı verdi.</p></section>";
  var sh = compareHeads(a, b).shared.slice(0, 3), far = a.v >= b.v ? a : b;
  return '<section class="sec v7-kisaca"><h2>Kısaca</h2><p>' + (sh.length ? "Kurumların çoğu “" + esc(sh.join(" ")) + "” dedi; en" : "En") +
    " farklı başlık " + esc(srcName(far.s)) + " kurumundan.</p></section>";
}

function olayDeep(key, title, body) {
  return '<details class="v7-deep" data-deep="' + key + '"><summary>' + title + "</summary>" + body + "</details>";
}
/* Deep rows build their content on first open. */
document.addEventListener("toggle", function (ev) {
  var d = ev.target;
  if (!d.matches || !d.matches("details.v7-deep") || !d.open || d.getAttribute("data-built")) return;
  d.setAttribute("data-built", "1");
  var e = EV[(location.hash.match(/[?&]e=([^&]+)/) || [])[1]];
  if (!e) return;
  if (d.getAttribute("data-deep") === "narr") {
    var box = d.querySelector("#v7-map"); if (box) box.innerHTML = narrMap(box.getAttribute("data-key"));
  } else if (d.getAttribute("data-deep") === "echo") d.insertAdjacentHTML("beforeend", v3echo(e));
  else d.insertAdjacentHTML("beforeend", olayReview(e));
}, true);

function olayHeadlines(e) {
  var arts = e.a.map(function (i) { return ART[i]; });
  return '<section class="sec"><div class="xsec-h"><h2>Bütün başlıklar</h2></div>' +
    '<div class="xtabs" id="atabs">' + [["all", "Hepsi"], ["left", "Sol"], ["mid", "Merkez"], ["right", "Sağ"]].map(function (t) {
      var n = t[0] === "all" ? arts.length : arts.filter(function (a) { return sideOf(a.s) === t[0]; }).length;
      return '<button class="xtab' + (t[0] === ARTSIDE ? " on" : "") + '" data-as="' + t[0] + '"' + (n ? "" : " disabled") + ">" + t[1] + ' <span class="num">' + n + "</span></button>";
    }).join("") + '<select id="asort" aria-label="Sırala" style="margin-left:auto"><option value="lean">Yerleşime göre (sol → sağ)</option>' +
    '<option value="time">Zamana göre</option><option value="load">Yüklü dile göre</option></select></div>' +
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
  if (firsts.length >= 3) h += '<div class="v7-scroll g6-spread">' + g6Box("spread", e.i, "Kurumların bu olaydaki ilk başlıklarının zaman sırası") + "</div>" +
    legendHTML([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" }], "Yayılım") +
    '<p class="v7-note">Soldan sağa: ilk başlıktan sonra geçen süre (karekök ölçek, ilk saatler geniş). Yukarıdan aşağıya: kurumun yerleşimi, sol üstte. Her düğüm kurumun bu olaydaki ilk başlığıdır.</p>';
  return h ? '<section class="sec v7-time"><h2>Kim önce verdi</h2>' + h + "</section>" : "";
}

function olayOutlets(e) {
  var ss = e.s.slice().sort(function (x, y) { return (SRC[x] && SRC[x].lean != null ? SRC[x].lean : 999) - (SRC[y] && SRC[y].lean != null ? SRC[y].lean : 999); });
  return '<section class="sec v7-outsec"><h2>Veren kurumlar</h2><p class="v7-outlets">' + ss.map(function (s) {
    return '<a class="lnk" href="#/kurum?s=' + s + '"><i class="v7-ld ' + bloc(s) + '"></i>' + esc(srcName(s)) + "</a>";
  }).join(" ") + "</p></section>";
}

function pgOlay7(q) {
  var e = EV[q.e];
  if (!e) return '<div class="wrap page"><div class="phead"><h1>Olay bulunamadı</h1><p class="lede"><a class="lnk" href="#/olaylar">Olay listesine dön</a></p></div></div>';
  logStory(e.i);
  var nk = NBYEV[e.i], x = bg7ev(e.i), deep = "";
  if (nk && narrOk(nk) && D.N[nk]) deep += olayDeep("narr", "Anlatı ayrıntısı", '<div id="v7-map" data-key="' + esc(nk) + '"></div>');
  if (x && x.status === "review_complete" && bg7Live(x).length) deep += olayDeep("yz", "Yapay zekâ ne fark etti? (YZ)", "");
  if (v3on("echoChain") && (CM3.clusters(D).byEvent[e.i] || []).length) deep += olayDeep("echo", "Benzer başlıklar", "");
  return '<div class="wrap page xstory">' + olayHead(e) + olayKisaca(e) + splitBlock(e) + olayHeadlines(e) + olayTiming(e) + deep + olayOutlets(e) + "</div>";
}

/* Coverage-bar labels: full text, else just the percentage, else none; measured, never clipped. */
function olayFitBar() {
  var fit = function () {
    [].forEach.call(document.querySelectorAll(".xbar.big i"), function (i) {
      var sp = i.querySelector("span"); if (!sp) return;
      var full = sp.getAttribute("data-full") || sp.textContent; sp.setAttribute("data-full", full);
      var pct = full.slice(full.indexOf("%"));
      sp.style.display = ""; sp.textContent = full;
      if (sp.offsetWidth > i.clientWidth) sp.textContent = pct;
      if (sp.offsetWidth > i.clientWidth) sp.style.display = "none";
    });
  };
  fit();
  if (!olayFitBar.on) { olayFitBar.on = 1; window.addEventListener("resize", function () { if (document.querySelector(".xbar.big")) fit(); }); }
}

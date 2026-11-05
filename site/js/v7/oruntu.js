/* v7 Örüntüler: four question pages. Every number in a "Bu ne anlama geliyor" text is computed from the data. */
var OR_PAGES = {
  secim: ["Kim neyi haber yapıyor", "Yelpazenin farklı yerlerindeki kurumlar aynı olayları mı haber yapıyor?"],
  dil: ["Nasıl anlatıyor", "Aynı olayı veren kurumlar onu ne kadar farklı sözcüklerle anlatıyor?"],
  anlati: ["Kimi sorumlu tutuyor", "Kodlanmış olaylarda kurumlar hangi boyutlarda ve kimi sorumlu göstererek ayrışıyor?"],
  hiz: ["Kim önce veriyor", "Bir olayı kim ilk veriyor, başlık haberin kendi spotundan daha mı sert?"]
};
var ORD = {};

/* ---- small shared helpers ---- */
function orP(x) { return "%" + dec(100 * x, 1); }
function orN(n) { return (+n).toLocaleString("tr"); }
function orHow(lines, sec) {
  return "<ul class=\"or-how\">" + lines.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul>" +
    '<p><a class="lnk" href="#/yontem?s=' + sec + '">Yöntem bölümünün tamamı →</a></p>';
}
/* data-tip carries tooltip html; aria-label carries its plain text so the chart is not mouse-only. */
function orTip(html) {
  return ' data-tip="' + esc(html) + '" aria-label="' + esc(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) + '"';
}
function orEvents() { return D.E.filter(function (e) { return !v3isIlanEvent(e); }); }
function orMini(e) {
  var c = covOf(e), t = c[0] + c[1] + c[2] || 1;
  return '<span class="or-cv" aria-hidden="true">' + [["left", c[0]], ["mid", c[1]], ["right", c[2]]].map(function (x) {
    return x[1] ? '<i style="flex:' + x[1] + ";background:var(--" + x[0] + ')"></i>' : "";
  }).join("") + "</span>";
}
function orEvRow(e, extra) {
  return '<li class="or-li" data-go="#/olay?e=' + e.i + '"><a class="lnk" href="#/olay?e=' + e.i + '">' + esc(storyLabel(e, 84)) + "</a>" +
    '<span class="or-meta">' + (extra ? extra + " · " : "") + e.s.length + " kurum " + orMini(e) + "</span></li>";
}
function orEvList(list, extra) {
  return '<ul class="or-list">' + list.map(function (e) { return orEvRow(e, extra ? extra(e) : ""); }).join("") + "</ul>";
}
/* Horizontal bars, html so they can be sorted and clicked. rows: {label, v, disp, c, tip, go} */
function orBars(rows, max) {
  max = max || Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
  return '<div class="or-bars">' + rows.map(function (r) {
    return '<div class="or-bar"' + (r.go ? ' data-go="' + r.go + '" tabindex="0" role="link"' : "") + (r.tip ? orTip(r.tip) : "") + '><span class="or-bl">' + esc(r.label) +
      '</span><span class="or-bt"><i style="width:' + Math.max(1, 100 * r.v / max) + "%;background:" + (r.c || "var(--ink2)") + '"></i></span><b>' + r.disp + "</b></div>";
  }).join("") + "</div>";
}
function orEnd(list) {
  return '<section class="or-ex"><h2>Örnek olaylar</h2><p class="or-exs">Bu sayfadaki örüntülerden üçünü gösteren olaylar.</p><div class="xcards">' + cards(list) + "</div></section>";
}
function orPage(q, finds, ex) {
  var t = OR_PAGES[q];
  return '<div class="wrap page or"><div class="phead"><div class="eyebrow">Örüntüler</div><h1>' + t[0] + '</h1><p class="lede">' + esc(t[1]) + "</p></div>" +
    finds.map(findingBlock).join("") + (ex && ex.length ? orEnd(ex) : "") + "</div>";
}

/* ======================================================= secim */
function orMantelText(r, p, subject) {
  return p < .05 ? subject + " ilişkili (r = " + dec(r, 2) + ", p = " + dec(p, 3) + "); ilişki istatistiksel olarak anlamlı."
    : subject + " anlamlı biçimde ilişkili değil (r = " + dec(r, 2) + ", p = " + dec(p, 3) + "); bu, farkın olmadığını değil, saptanamadığını gösterir.";
}

/* Events binned by the share of left-placed outlets among the placed outlets that reported them. */
function orCoverage() {
  var ev = orEvents(), bins = [], i;
  for (i = 0; i < 10; i++) bins.push({ lo: i * 10, hi: i * 10 + 10, ev: [] });
  var zl = 0, zr = 0, shares = [];
  ev.forEach(function (e) {
    var c = covOf(e), t = c[0] + c[1] + c[2];
    if (!t) return;
    var sh = c[0] / t; shares.push(sh);
    if (!c[0]) zl++;
    if (!c[2]) zr++;
    bins[Math.min(9, Math.floor(sh * 10))].ev.push(e);
  });
  shares.sort(function (a, b) { return a - b; });
  bins.forEach(function (b) { b.ev.sort(function (x, y) { return y.s.length - x.s.length; }); });
  return { bins: bins, n: shares.length, zl: zl, zr: zr, med: shares.length ? shares[Math.floor((shares.length - 1) / 2)] : 0 };
}
function orCovDetail(b, tot) {
  if (!b) return '<p class="or-hint">Bir sütuna dokunun ya da tıklayın: o aralıktaki en çok kurumun verdiği olaylar burada listelenir.</p>';
  return "<p><b>Sol payı %" + b.lo + "–" + b.hi + "</b> olan " + orN(b.ev.length) + " olay (" + orP(b.ev.length / (tot || 1)) + "). En çok kurumun verdiği " +
    Math.min(8, b.ev.length) + ":</p>" + (b.ev.length ? orEvList(b.ev.slice(0, 8)) : '<p class="or-hint">Bu aralıkta olay yok.</p>');
}
function orFindCoverage() {
  var C = ORD.cov = orCoverage(), act = V2.active || {}, tot = (act.left || 0) + (act.mid || 0) + (act.right || 0) || 1;
  var mx = Math.max.apply(null, C.bins.map(function (b) { return b.ev.length; })) || 1;
  var cols = '<div class="or-cols" style="--n:10">' + C.bins.map(function (b, i) {
    return '<button type="button" class="or-col" data-bin="' + i + '" aria-pressed="false"' +
      orTip("<span class='k'>Sol payı %" + b.lo + "–" + b.hi + "</span>" + orN(b.ev.length) + " olay<br>" + orP(b.ev.length / (C.n || 1)) + " · tıklayın") +
      '><b>' + orN(b.ev.length) + '</b><i style="height:' + Math.max(2, 120 * b.ev.length / mx) + 'px"></i></button>';
  }).join("") + '</div><div class="or-axis" style="--n:10">' + C.bins.map(function (b) { return "<span>" + b.lo + "</span>"; }).join("") +
    '</div><p class="or-axt">Olayı veren, yerleşimi bilinen kurumlar içinde sola yerleşik olanların payı (%)</p><div class="or-panel" id="or-cov-d" aria-live="polite">' + orCovDetail(null) + "</div>";
  return { id: "secim-kapsama",
    claim: "<b>" + orN(C.n) + "</b> olayın <b>" + orN(C.zl) + "</b> tanesini sola yerleşik hiçbir kurum vermedi; sağa yerleşik hiçbir kurumun vermediği olay sayısı <b>" + orN(C.zr) + "</b>.",
    viz: cols,
    means: "Kayıt defterindeki etkin kurumların " + orP((act.left || 0) / tot) + "’si sola, " + orP((act.right || 0) / tot) + "’si sağa yerleşik; olayların ortanca sol payı " + orP(C.med) + ". " +
      "Sol payının düşük çıkması kısmen bu dağılımdan gelir: sol kurum sayısı az olduğu için, olay seçiminde bir fark olmasa da çoğu olayda sol payı düşük kalır. " +
      "Bu şerit tek başına bir kurumun neyi seçtiğini göstermez; taraf sayısına göre düzeltilmiş okuma bir sonraki bulguda.",
    how: orHow(["Birim: en az " + (D.meta.params && D.meta.params.event_min_outlets || 5) + " kurumun verdiği olay (resmî ilan olayları hariç), n = " + orN(C.n) + ".",
      "Sol payı = olayı veren sola yerleşik kurum sayısı / yerleşimi bilinen kurum sayısı. Yerleşim kayıt defterinden gelir ve doğrulanmamıştır: 45’in altı sol, 55’in üstü sağ.",
      "Sütun genişliği %10; son sütun %100’ü içerir."], 5) };
}

function orFindBlind() {
  var act = V2.active || {}, ev = orEvents(), big = 0, raw = 0;
  ev.forEach(function (e) { if (e.s.length < 4) return; big++; var c = evCoverage(e); if (!c.left || !c.right) raw++; });
  var bs = ev.filter(function (e) { return e.bs; }), side = function (s) { return bs.filter(function (e) { return e.bs === s; }).sort(function (a, b) { return b.s.length - a.s.length; }); };
  var L = side("left"), R = side("right");
  var col = function (title, list, cls) {
    return '<div class="or-bc ' + cls + '"><h4>' + title + ' <span class="or-cnt">' + list.length + "</span></h4>" +
      (list.length ? orEvList(list.slice(0, 4)) : '<p class="or-hint">Bu tarafta kör nokta yok.</p>') + "</div>";
  };
  ORD.bs = { L: L, R: R };
  return { id: "secim-kor",
    claim: "Taraf sayısına göre düzeltilmiş kural <b>" + bs.length + "</b> olayı kör nokta sayıyor: <b>" + L.length + "</b> olayı sol, <b>" + R.length + "</b> olayı sağ kurumlar belirgin biçimde az verdi.",
    viz: '<div class="or-two">' + col("Solun az verdiği olaylar", L, "left") + col("Sağın az verdiği olaylar", R, "right") + "</div>" +
      '<p class="or-hint">Her taraf için en çok kurumun verdiği dört olay; satıra tıklayınca olay sayfası açılır.</p>',
    means: "Düzeltmesiz sayımda (bir tarafın hiç vermediği olaylar) " + orN(raw) + " olay çıkıyor; düzeltilmiş sayı " + bs.length + ". Aradaki " + orN(Math.max(0, raw - bs.length)) +
      " olay, tarafların kurum sayısının eşit olmamasından geliyor: etkin kurumların " + (act.left || 0) + " tanesi solda, " + (act.right || 0) + " tanesi sağda. " +
      "Kör nokta bir suçlama değildir; bir olayın bir tarafta az görünmesi editoryal tercihten, akış eksikliğinden ya da olayın yerel olmasından doğabilir.",
    how: orHow(["Kural Ground News formülünün bu kayıt defterine uyarlanmasıdır: her taraf kendi etkin kurum sayısına bölünür ve şansla açıklanabilen durumlar binom testiyle (p &lt; 0,10) çıkarılır.",
      "Birim: resmî ilan olayları hariç " + orN(ev.length) + " olay; ham sayım için en az 4 kurumun verdiği " + orN(big) + " olay.",
      "Etkin kurum: dönemin en az " + WIN.half + " gününü kapsayan kurum."], 5) };
}

function orShared(a, b) {
  if (!ORD.shared) {
    var ord = ADV.agenda.order, idx = {}, m = {};
    ord.forEach(function (s, i) { idx[s] = i; m[s] = {}; ord.forEach(function (t) { m[s][t] = 0; }); });
    D.E.forEach(function (e) {
      var in_ = e.s.filter(function (s) { return idx[s] != null; });
      in_.forEach(function (s) { in_.forEach(function (t) { if (s !== t) m[s][t]++; }); });
    });
    ORD.shared = m;
  }
  return ORD.shared[a] ? ORD.shared[a][b] : 0;
}
function orFindAgenda() {
  var A = ADV.agenda, ord = A.order, pairs = [];
  ord.forEach(function (a, i) { ord.forEach(function (b, j) { if (j > i) pairs.push([a, b, A.phi[a][b]]); }); });
  pairs.sort(function (x, y) { return y[2] - x[2]; });
  var hi = pairs[0], lo = pairs[pairs.length - 1];
  var viz = fig("adv-a", "gündem benzerliği (φ) · kümeleme sırasına göre", {
    legend: legendHTML([{ c: "var(--seq4)", t: "φ ≥ 0,15 · çok benzer" }, { c: "var(--seq3)", t: "0,05 – 0,15" },
      { c: "var(--seq2)", t: "şanstan farksız" }, { c: "var(--seq1)", t: "φ < −0,05 · farklı" }]) }) +
    '<p class="or-hint">Bir kareye gelin: iki kurumun benzerliği ve birlikte verdikleri olay sayısı görünür.</p>';
  return { id: "secim-gundem",
    claim: "Gündemi en çok örtüşen kurum çifti <b>" + esc(srcName(hi[0])) + " – " + esc(srcName(hi[1])) + "</b> (φ = " + dec(hi[2], 2) + "), en az örtüşen <b>" + esc(srcName(lo[0])) + " – " + esc(srcName(lo[1])) + "</b> (φ = " + dec(lo[2], 2) + ").",
    viz: viz,
    means: orMantelText(A.mantel_r, A.mantel_p, "Kurumların olay seçimi benzerliği, kayıt defterindeki yerleşim farkıyla") +
      (A.mantel_p < .05 ? (A.mantel_r > 0 ? " Yelpazede birbirinden uzak kurumların seçtiği olaylar biraz daha az örtüşüyor." : " Yelpazede uzak kurumlar beklenenden çok aynı olayları seçiyor.") : "") +
      " Bu, kurumların neden aynı olayları seçtiğini açıklamaz; yalnızca seçimin yerleşimle hizalanıp hizalanmadığını gösterir.",
    how: orHow(["Her kurum verdiği olayların kümesiyle temsil edilir; kurum çiftlerinin phi korelasyonu hesaplanır (kurum büyüklüğüne duyarsızdır) ve ortalama bağlantıyla kümelenir.",
      "Yerleşim farkıyla ilişki: Mantel testi, 9.999 permütasyon. Birim: en az 150 olaya giren ya da en az 1.000 siyasi başlığı olan " + ord.length + " kurum.",
      "Hücredeki ortak olay sayısı bütün olaylar (resmî ilanlar dâhil) üzerinden sayılır; φ’nin hesapladığı küme ile aynıdır."], 7) };
}

/* Mean topic profile of each bloc's outlets (equal weight per outlet). */
function orTopicBlocs() {
  var T = ADV.topics, out = { left: [], mid: [], right: [] }, cnt = { left: 0, mid: 0, right: 0 };
  T.outlets.forEach(function (o) { var b = bloc(o); if (cnt[b] == null) return; cnt[b]++; T.prof[o].forEach(function (v, i) { out[b][i] = (out[b][i] || 0) + v; }); });
  Object.keys(out).forEach(function (b) { out[b] = out[b].map(function (v) { return cnt[b] ? v / cnt[b] : 0; }); });
  return { share: out, n: cnt };
}
function orFindTopics() {
  var T = ADV.topics, B = orTopicBlocs(), th = T.themes, blocs = ["left", "mid", "right"].filter(function (b) { return B.n[b]; });
  var order = th.map(function (t, i) { return i; }).sort(function (a, b) { return T.pool[b] - T.pool[a]; });
  var diff = th.map(function (t, i) { return { i: i, d: B.share.right[i] - B.share.left[i] }; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
  var mx = Math.max.apply(null, blocs.map(function (b) { return Math.max.apply(null, B.share[b]); })) || 1;
  var rows = order.map(function (i) {
    return '<div class="or-tr"><span class="or-bl">' + esc(th[i].l) + "</span>" + blocs.map(function (b) {
      var v = B.share[b][i], r = v / (T.pool[i] || 1);
      return '<span class="or-tc"' + orTip("<span class='k'>" + esc(th[i].l) + " · " + SIDE[b] + " bloğu</span>Başlıkların " + orP(v) + "’si<br>Tüm kurumların ortalaması " + orP(T.pool[i]) + " · " + dec(r, 2) + " katı") +
        '><i style="width:' + Math.max(1, 100 * v / mx) + "%;background:var(--" + b + ')"></i><b>' + Math.round(100 * v) + "</b></span>";
    }).join("") + "</div>";
  }).join("");
  var viz = '<div class="or-topics" style="--c:' + blocs.length + '">' + rows + "</div>" +
    legendHTML(blocs.map(function (b) { return { c: "var(--" + b + ")", t: SIDE[b] + " bloğunun " + B.n[b] + " kurumu" }; }), "Blok");
  return { id: "secim-konu",
    claim: "Bloklar arasındaki en büyük konu farkı <b>" + esc(th[diff.i].l) + "</b> temasında: sağ bloğun başlıklarının " + orP(B.share.right[diff.i]) + "’i, sol bloğunkilerin " + orP(B.share.left[diff.i]) + "’i bu temada.",
    viz: viz,
    means: orMantelText(T.mantel_r, T.mantel_p, "Kurumların konu karışımı farkı, yerleşim farkıyla") +
      " Tema payları kurum başına eşit ağırlıkla ortalandığı için, çok başlık yazan bir kurum bloğunun görünümünü tek başına belirlemez. " +
      "Bir temada fark olması, o kurumların başka konulardan kaçındığı anlamına gelmez; yalnızca başlık karışımının farklı olduğunu gösterir.",
    how: orHow(["" + th.length + " tema: siyasi başlıklara " + T.N.toLocaleString("tr") + " başlık üzerinde Dirichlet çok terimli karışım (GSDMM) uygulandı; her konu, sözcükleri en çok örtüşen referans temaya bağlandı.",
      "Blok değeri = o bloktaki kurumların tema paylarının ortalaması. Hücredeki sayı yüzdedir; çubuklar bütün hücreler arasında aynı ölçektedir.",
      "Konu–yerleşim ilişkisi: Mantel testi (9.999 permütasyon). Yerleşim sağlanmış veridir."], 7) };
}

function orFindWeekly() {
  var ev = orEvents(), nW = wk7(DAYS[DAYS.length - 1]) + 1, W = [], i;
  for (i = 0; i < nW; i++) W.push({ ev: 0, l: 0, r: 0, days: 0 });
  DAYS.forEach(function (d) { W[wk7(d + "T00:00")].days++; });
  ev.forEach(function (e) { var w = W[wk7(e.f)]; if (!w) return; w.ev++; if (e.bs === "left") w.l++; if (e.bs === "right") w.r++; });
  var mx = Math.max.apply(null, W.map(function (w) { return Math.max(w.l, w.r); })) || 1;
  var lab = function (k) { return fmtD(new Date(Date.parse(DAYS[0] + "T00:00Z") + k * 7 * 864e5).toISOString().slice(0, 10) + "T00:00"); };
  var viz = '<div class="or-wk" style="--n:' + nW + '">' + W.map(function (w, k) {
    return '<div class="or-wc" tabindex="0"' + orTip("<span class='k'>" + lab(k) + " haftası" + (w.days < 7 ? " (" + w.days + " gün)" : "") + "</span>" + orN(w.ev) + " olay<br>Solun az verdiği: " + w.l + " · Sağın az verdiği: " + w.r) +
      '><span class="or-wb"><i style="height:' + (100 * w.l / mx) + '%;background:var(--left)"></i><i style="height:' + (100 * w.r / mx) + '%;background:var(--right)"></i></span><span class="or-wn">' + (w.l + w.r) + "</span><span class=\"or-wd\">" + lab(k) + "</span></div>";
  }).join("") + "</div>" + legendHTML([{ c: "var(--left)", t: "solun az verdiği olay" }, { c: "var(--right)", t: "sağın az verdiği olay" }], "Sütun çifti");
  var tot = W.reduce(function (t, w) { return t + w.l + w.r; }, 0);
  var peak = W.map(function (w, k) { return { k: k, n: w.l + w.r }; }).sort(function (a, b) { return b.n - a.n; })[0];
  var low = W.filter(function (w) { return w.days >= 7; }).map(function (w) { return w.l + w.r; });
  return { id: "secim-hafta",
    claim: "Haftalık kör nokta sayısı en çok <b>" + peak.n + "</b> (" + lab(peak.k) + " haftası); " + nW + " haftanın toplamı <b>" + tot + "</b> olay.",
    viz: viz,
    means: "Tam haftalarda sayı " + (low.length ? Math.min.apply(null, low) + " ile " + Math.max.apply(null, low) + " arasında değişiyor" : "hesaplanamadı") + ". " +
      "Haftalar arası fark, o haftanın olay sayısıyla birlikte oynayabilir; bu yüzden bir haftanın yüksek çıkması tek başına bir eğilim kanıtı değildir. " +
      "Son hafta kısmi olabilir (gün sayısı sütun ipucunda yazar).",
    how: orHow(["Birim: olayın ilk başlığının düştüğü hafta (pencerenin ilk gününden başlayan 7 günlük dilimler). Resmî ilan olayları hariç.",
      "Kör nokta: önceki bulgudaki kural (taraf başına normalize, binom testi)."], 5) };
}

function orExamples(q) {
  var ev = orEvents().filter(function (e) { return e.s.length >= 5; }), top = function (f) { return ev.filter(f).sort(function (a, b) { return b.s.length - a.s.length; })[0]; };
  var pick = [];
  var add = function (e) { if (e && pick.indexOf(e) < 0) pick.push(e); };
  if (q === "secim") { add(ORD.bs.L[0]); add(ORD.bs.R[0]); add(top(function () { return true; })); }
  else if (q === "dil") { ev.slice().sort(function (a, b) { return b.p - a.p || b.s.length - a.s.length; }).slice(0, 3).forEach(add); }
  else if (q === "anlati") { v7Weeks().forEach(function (w) { w.keys.forEach(function (k) { var e = EV[D.N[k].ev]; if (e) ORD.nx = (ORD.nx || []).concat([[e, D.N[k].score || 0]]); }); });
    (ORD.nx || []).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).forEach(function (x) { add(x[0]); }); ORD.nx = null; }
  else { ev.filter(function (e) { return e.s.length >= 12; }).slice().sort(function (a, b) { return b.s.length - a.s.length; }).slice(0, 3).forEach(add); }
  var fill = ev.slice().sort(function (a, b) { return b.s.length - a.s.length; });
  for (var i = 0; pick.length < 3 && i < fill.length; i++) add(fill[i]);
  return pick.slice(0, 3);
}

function orSecim() {
  var fs = [orFindCoverage(), orFindBlind(), orFindAgenda(), orFindTopics(), orFindWeekly()];
  return orPage("secim", fs, orExamples("secim"));
}

function pgOruntu(q) {
  var k = OR_PAGES[q && q.q] ? q.q : "secim";
  if (k === "secim") return orSecim();
  return '<div class="wrap page"><div class="phead"><h1>' + OR_PAGES[k][0] + '</h1><p class="lede">Hazırlanıyor.</p></div></div>';
}

/* ---- after-render wiring ---- */
function orWire(root) {
  if (root._or) return; root._or = 1;
  var at = function (ev) { return ev.target.closest && ev.target.closest("[data-tip]"); };
  root.addEventListener("pointerover", function (ev) { var t = at(ev); if (t) tipOn(ev, t.getAttribute("data-tip")); });
  root.addEventListener("pointermove", function (ev) { var t = at(ev); if (t) tipOn(ev, t.getAttribute("data-tip")); });
  root.addEventListener("pointerout", function (ev) { if (at(ev)) tipOff(); });
  root.addEventListener("focusin", function (ev) { var t = at(ev); if (t) { var r = t.getBoundingClientRect(); tipOn({ clientX: r.left + r.width / 2, clientY: r.top }, t.getAttribute("data-tip")); } });
  root.addEventListener("focusout", function (ev) { if (at(ev)) tipOff(); });
}
function orPut(id, node) { var t = document.getElementById(id); if (t && node) t.appendChild(node); }

function wireOruntu(q) {
  var root = document.getElementById("view"); if (!root) return;
  orWire(root); wireGo(root);
  q = OR_PAGES[q] ? q : "secim";
  if (q === "secim") {
    orPut("adv-a", advHeat());
    var d = root.querySelector("#or-cov-d");
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".or-col"); if (!b || !d) return;
      var on = b.getAttribute("aria-pressed") !== "true";
      [].forEach.call(root.querySelectorAll(".or-col"), function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", on);
      d.innerHTML = orCovDetail(on ? ORD.cov.bins[+b.getAttribute("data-bin")] : null, ORD.cov.n);
      wireGo(d);
    });
  }
}

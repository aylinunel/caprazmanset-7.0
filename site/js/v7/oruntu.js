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
/* Plain-language helpers for finding claims: whole-number percentages and Turkish suffixes after numbers and names. */
function orPc(x) { return "%" + Math.round(100 * x); }
/* "’sı" (possessive), kind "i" → "’sını" (accusative), "de" → "’sında" (locative), as Turkish reads the number n. */
function orSuf(n, kind) {
  var p = CM3.trSuffix(n);
  return "’" + p + (kind === "i" ? "n" + p.slice(-1) : kind === "de" ? (/[ıu]$/.test(p) ? "nda" : "nde") : "");
}
function orPcS(x, kind) { var n = Math.round(100 * x); return "%" + n + orSuf(n, kind); }
function orNS(n, kind) { return orN(n) + orSuf(n, kind); }
/* Locative after an outlet name: "Star’da", "Yeni Şafak’ta", "NTV’de". */
function orLoc(name) {
  var w = String(name).trim().split(/\s+/).pop(), low = w.toLocaleLowerCase("tr");
  if (/[0-9]$/.test(low)) low = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"][+low.slice(-1)];
  else if (w.length <= 4 && w === w.toLocaleUpperCase("tr") && LETTER5[low.slice(-1)]) low = LETTER5[low.slice(-1)];
  var v = (low.match(/[aıoueiöü]/g) || ["e"]).pop();
  return "’" + (/[fstkçşhp]$/.test(low) ? "t" : "d") + (/[aıou]/.test(v) ? "a" : "e");
}
/* Caption verb: "dokunun" on touch screens, "gelin" with a pointer. */
function orGo() { return orTap() === "dokunun" ? "Tekrar dokunun" : "Tıklayın"; }
function orTap() { return typeof matchMedia === "function" && matchMedia("(hover: none)").matches ? "dokunun" : "gelin"; }
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
  var zl = 0, zr = 0, shares = [], pts = [];
  ev.forEach(function (e) {
    var c = covOf(e), t = c[0] + c[1] + c[2];
    if (!t) return;
    var sh = c[0] / t; shares.push(sh); pts.push({ e: e, v: 100 * sh });
    if (!c[0]) zl++;
    if (!c[2]) zr++;
    bins[Math.min(9, Math.floor(sh * 10))].ev.push(e);
  });
  shares.sort(function (a, b) { return a - b; });
  bins.forEach(function (b) { b.ev.sort(function (x, y) { return y.s.length - x.s.length; }); });
  return { bins: bins, pts: pts, n: shares.length, zl: zl, zr: zr, med: shares.length ? shares[Math.floor((shares.length - 1) / 2)] : 0 };
}
function orCovDetail(b, tot) {
  if (!b) return '<p class="or-hint">Bir sütuna dokunun ya da tıklayın: o aralıktaki en çok kurumun verdiği olaylar burada listelenir.</p>';
  return "<p><b>Sol payı %" + b.lo + "–" + b.hi + "</b> olan " + orN(b.ev.length) + " olay (" + orP(b.ev.length / (tot || 1)) + "). En çok kurumun verdiği " +
    Math.min(8, b.ev.length) + ":</p>" + (b.ev.length ? orEvList(b.ev.slice(0, 8)) : '<p class="or-hint">Bu aralıkta olay yok.</p>');
}
/* Clickable column chart: sets the bins/detail renderer under ORD.cols[set]; the click handler is in wireOruntu. */
function orCols(set, bins, o) {
  ORD.cols = ORD.cols || {}; ORD.cols[set] = { bins: bins, detail: o.detail };
  var mx = Math.max.apply(null, bins.map(function (b) { return b.ev.length; })) || 1, tot = o.n || 1;
  return '<div class="or-cols" style="--n:' + bins.length + '">' + bins.map(function (b, i) {
    return '<button type="button" class="or-col" data-set="' + set + '" data-bin="' + i + '" aria-pressed="false"' +
      orTip("<span class='k'>" + o.label(b) + "</span>" + orN(b.ev.length) + " olay<br>" + orP(b.ev.length / tot) + " · " + orGo().toLowerCase()) +
      '><b>' + orN(b.ev.length) + '</b><i style="height:' + Math.max(2, 120 * b.ev.length / mx) + 'px"></i></button>';
  }).join("") + '</div><div class="or-axis" style="--n:' + bins.length + '">' + bins.map(function (b) { return "<span>" + b.lo + "</span>"; }).join("") +
    '</div><p class="or-axt">' + o.axis + '</p><div class="or-panel" id="or-d-' + set + '" aria-live="polite">' + o.detail(null) + "</div>";
}
function orFindCoverage() {
  var C = ORD.cov = orCoverage(), act = V2.active || {}, tot = (act.left || 0) + (act.mid || 0) + (act.right || 0) || 1;
  var exp = 100 * (act.left || 0) / tot;
  var cols = vzDist("cov", C.pts.map(function (p) { return p.v; }), { min: 0, max: 100, bins: 40, fmt: function (v) { return "%" + v; },
    label: "Olayların sol payı dağılımı", axis: "Olayı veren, yerleşimi bilinen kurumlar içinde sola yerleşik olanların payı (%). Bir aralık seçmek için sürükleyin ya da tıklayın.",
    ref: { v: exp, label: "kurum oranı %" + Math.round(exp) },
    presets: [[0, 1, "%0 · hiç sol yok"], [1, 25, "%1–25"], [25, 50, "%25–50"], [50, 100.01, "%50 ve üstü"]],
    detail: function (a, b) {
      if (a == null) return '<p class="or-hint">Grafikte bir aralık seçin ya da üstteki düğmelerden birine basın: o aralıktaki en çok kurumun verdiği olaylar burada listelenir.</p>';
      var ev = C.pts.filter(function (p) { return p.v >= a && (p.v < b || (b >= 100 && p.v <= 100)); }).map(function (p) { return p.e; }).sort(function (x, y) { return y.s.length - x.s.length; });
      return "<p><b>" + (a === 0 && b <= 1 ? "Hiç sola yerleşik kurumun vermediği" : "Sol payı %" + Math.round(a) + "–" + Math.min(100, Math.round(b)) + " olan") + "</b> " + orN(ev.length) + " olay (" + orP(ev.length / (C.n || 1)) + "). En çok kurumun verdiği " + Math.min(8, ev.length) + ":</p>" +
        (ev.length ? orEvList(ev.slice(0, 8)) : '<p class="or-hint">Bu aralıkta olay yok.</p>'); } });
  var tb = []; for (var i = 0; i < 10; i++) tb.push([i * 10, i * 10 + 10, 0]);
  C.pts.forEach(function (p) { tb[Math.min(9, Math.floor(p.v / 10))][2]++; });
  return { id: "secim-kapsama",
    claim: "<b>" + orN(C.n) + "</b> olayın <b>" + orNS(C.zl, "i") + "</b> (" + orPc(C.zl / (C.n || 1)) + ") solda yer alan hiçbir kurum vermedi; sağdaki hiçbir kurumun vermediği olay yalnızca <b>" + orN(C.zr) + "</b>.",
    viz: cols,
    read: "Soldan sağa: olayı veren kurumlar içinde solda yer alanların payı; yükselti o paydaki olay sayısı. Turuncu çizgi, solun bütün kurumlar içindeki payı.",
    means: "Bu, solun bu olayları görmezden geldiği anlamına gelmez. İzlediğimiz etkin kurumların yalnızca " + orPcS((act.left || 0) / tot) + " solda, " + orPcS((act.right || 0) / tot) + " sağda: " +
      "sol kurum sayısı az olduğu için, olay seçiminde hiç fark olmasa da çoğu olayda solun payı düşük kalır. Olay seçiminde fark olmasaydı olaylar turuncu çizginin çevresinde toplanırdı. " +
      "Bu şerit tek başına bir kurumun neyi seçtiğini göstermez; taraf sayısına göre düzeltilmiş okuma bir sonraki bulguda.",
    table: vzTable(["Sol payı", "Olay", "Olayların payı"], tb.map(function (b) { return ["%" + b[0] + "–" + b[1], orN(b[2]), orP(b[2] / (C.n || 1))]; })),
    how: orHow(["Olayların ortanca sol payı " + orP(C.med) + "; etkin kurumların " + orP((act.left || 0) / tot) + " kadarı sola, " + orP((act.right || 0) / tot) + " kadarı sağa yerleşik.",
      "Birim: en az " + (D.meta.params && D.meta.params.event_min_outlets || 5) + " kurumun verdiği olay (resmî ilan olayları hariç), n = " + orN(C.n) + ".",
      "Sol payı = olayı veren sola yerleşik kurum sayısı / yerleşimi bilinen kurum sayısı. Yerleşim kayıt defterinden gelir ve doğrulanmamıştır: 45’in altı sol, 55’in üstü sağ.",
      "Alan, 2,5 puanlık dilimlerdeki olay sayısıdır; gri bant ortadaki %50’yi, siyah çizgi ortancayı gösterir."], "olay") };
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
    claim: "<b>" + bs.length + "</b> olay bir tarafın kör noktasında kaldı: <b>" + orNS(L.length, "i") + "</b> sol kurumlar, <b>" + orNS(R.length, "i") + "</b> sağ kurumlar kendi sayılarına göre belirgin biçimde az verdi.",
    viz: '<div class="or-two">' + col("Solun az verdiği olaylar", L, "left") + col("Sağın az verdiği olaylar", R, "right") + "</div>",
    read: "Her sütunda o tarafın az verdiği, en çok kurumun haber yaptığı dört olay; satıra " + (orTap() === "dokunun" ? "dokunun" : "tıklayın") + ", olay açılır.",
    example: (L.concat(R).sort(function (a, b) { return b.s.length - a.s.length; })[0] || {}).i || null,
    table: vzTable(["Az veren taraf", "Olay", "Veren kurum"], L.map(function (e) { return ["Sol", storyLabel(e, 90), e.s.length]; }).concat(R.map(function (e) { return ["Sağ", storyLabel(e, 90), e.s.length]; }))),
    means: "Düzeltmesiz sayımda (bir tarafın hiç vermediği olaylar) " + orN(raw) + " olay çıkıyor; düzeltilmiş sayı " + bs.length + ". Aradaki " + orN(Math.max(0, raw - bs.length)) +
      " olay, tarafların kurum sayısının eşit olmamasından geliyor: etkin kurumların " + (act.left || 0) + " tanesi solda, " + (act.right || 0) + " tanesi sağda. " +
      "Kör nokta bir suçlama değildir; bir olayın bir tarafta az görünmesi editoryal tercihten, akış eksikliğinden ya da olayın yerel olmasından doğabilir.",
    how: orHow(["Kural Ground News formülünün bu kayıt defterine uyarlanmasıdır: her taraf kendi etkin kurum sayısına bölünür ve şansla açıklanabilen durumlar binom testiyle (p &lt; 0,10) çıkarılır.",
      "Birim: resmî ilan olayları hariç " + orN(ev.length) + " olay; ham sayım için en az 4 kurumun verdiği " + orN(big) + " olay.",
      "Etkin kurum: dönemin en az " + WIN.half + " gününü kapsayan kurum."], "olay") };
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
  var net = g6Box("agenda", "", "Kurumların gündem benzerliği ağı: φ ≥ 0,05 olan çiftler bağlı") +
    legendHTML([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" },
      { line: 1, c: "var(--ink2)", t: "kalın çizgi · φ ≥ 0,15" }, { line: 1, c: "var(--line2)", t: "ince · 0,05 – 0,15" }], "Ağ") +
    '<p class="or-hint">Düğüm büyüklüğü kurumun verdiği olay sayısı; birlikte çok olay seçen kurumlar birbirine çekilir. ' + (orTap() === "dokunun" ? "Dokununca" : "Tıklayınca") + ' kurum sayfası açılır.</p>';
  var viz = fig("adv-a", "gündem benzerliği (φ) · kümeleme sırasına göre", {
    legend: legendHTML([{ c: "var(--seq4)", t: "φ ≥ 0,15 · çok benzer" }, { c: "var(--seq3)", t: "0,05 – 0,15" },
      { c: "var(--seq2)", t: "şanstan farksız" }, { c: "var(--seq1)", t: "φ < −0,05 · farklı" }]) }) +
    '<p class="or-hint">Bir kareye ' + orTap() + ': iki kurumun benzerliği ve birlikte verdikleri olay sayısı görünür.</p>';
  viz = g6Switch("gundem", net, viz, "Matris");
  return { id: "secim-gundem",
    claim: "Haber yaptıkları olaylar en çok <b>" + esc(srcName(hi[0])) + "</b> ile <b>" + esc(srcName(hi[1])) + "</b> arasında örtüşüyor, en az <b>" + esc(srcName(lo[0])) + "</b> ile <b>" + esc(srcName(lo[1])) + "</b> arasında.",
    viz: viz,
    read: "Her nokta bir kurum; birlikte çok olay seçen kurumlar birbirine yakın durur ve kalın çizgiyle bağlanır. Bir noktaya " + orTap() + ": en benzer üç kurum.",
    means: (A.mantel_p < .05 ? (A.mantel_r > 0 ? "Yelpazede birbirinden uzak kurumların seçtiği olaylar biraz daha az örtüşüyor." : "Yelpazede birbirinden uzak kurumlar beklenenden çok aynı olayları seçiyor.")
      : "Yelpazede birbirine yakın kurumların daha çok aynı olayları seçtiğine dair bir iz bulamadık; bu, böyle bir fark olmadığını değil, ölçümün onu yakalayamadığını gösterir.") +
      " Bu, kurumların neden aynı olayları seçtiğini açıklamaz; yalnızca seçimin yerleşimle hizalanıp hizalanmadığını gösterir.",
    table: vzTable(["Kurum A", "Kurum B", "Gündem benzerliği (φ)", "Ortak olay"], pairs.map(function (p) { return [srcName(p[0]), srcName(p[1]), dec(p[2], 2), orN(orShared(p[0], p[1]))]; })),
    how: orHow(["En çok örtüşen çift φ = " + dec(hi[2], 2) + ", en az örtüşen φ = " + dec(lo[2], 2) + ". " + orMantelText(A.mantel_r, A.mantel_p, "Kurumların olay seçimi benzerliği, kayıt defterindeki yerleşim farkıyla"),"Her kurum verdiği olayların kümesiyle temsil edilir; kurum çiftlerinin phi korelasyonu hesaplanır (kurum büyüklüğüne duyarsızdır) ve ortalama bağlantıyla kümelenir.",
      "Yerleşim farkıyla ilişki: Mantel testi, 9.999 permütasyon. Birim: en az 150 olaya giren ya da en az 1.000 siyasi başlığı olan " + ord.length + " kurum.",
      "Hücredeki ortak olay sayısı bütün olaylar (resmî ilanlar dâhil) üzerinden sayılır; φ’nin hesapladığı küme ile aynıdır."], "dil") };
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
  var gap = function (i) { var vs = blocs.map(function (b) { return B.share[b][i]; }); return Math.max.apply(null, vs) - Math.min.apply(null, vs); };
  var viz = vzKey(blocs.map(function (b) { return { c: "var(--" + b + ")", t: SIDE[b] + " bloğu (" + B.n[b] + " kurum)" }; }).concat([{ kind: "t", t: "bütün kurumlar" }])) +
    vzRows(order.slice().sort(function (a, b) { return gap(b) - gap(a); }).map(function (i) {
      return { k: "t" + i, label: th[i].l, ref: 100 * T.pool[i], span: "pts", val: dec(100 * gap(i), 1) + " puan",
        pts: blocs.map(function (b) { return { v: 100 * B.share[b][i], c: "var(--" + b + ")" }; }),
        tip: "<span class='k'>" + esc(th[i].l) + "</span>" + blocs.map(function (b) { return SIDE[b] + " bloğu: " + orP(B.share[b][i]); }).join("<br>") +
          "<br>Bütün kurumlar: " + orP(T.pool[i]) + "<br>En uç iki blok arası " + dec(100 * gap(i), 1) + " puan" };
    }), { min: 0, max: Math.ceil(100 * mx * 1.08 / 5) * 5, fmt: function (v) { return "%" + v; }, lw: 190, vw: 78,
      axis: "Temanın bloktaki başlıklar içindeki payı. Satırlar blokların en çok ayrıştığı temadan en az ayrıştığına sıralı; sağdaki sayı en uç iki blok arasındaki fark." });
  return { id: "secim-konu",
    claim: "Sol ve sağ en çok <b>" + esc(th[diff.i].l) + "</b> konusunda ayrışıyor: sağ blok başlıklarının <b>" + orPcS(B.share.right[diff.i]) + "</b>, sol bloğunkilerin <b>" + orPcS(B.share.left[diff.i]) + "</b> bu konuda.",
    viz: viz,
    read: "Her satır bir konu; renkli noktalar blokların payı, siyah çentik bütün kurumlar. Üstteki konularda bloklar en çok ayrışıyor.",
    table: vzTable(["Konu"].concat(blocs.map(function (b) { return SIDE[b] + " bloğu"; }), ["Bütün kurumlar", "Uç bloklar arası fark (puan)"]),
      order.slice().sort(function (a, b) { return gap(b) - gap(a); }).map(function (i) {
        return [th[i].l].concat(blocs.map(function (b) { return orP(B.share[b][i]); }), [orP(T.pool[i]), dec(100 * gap(i), 1)]); })),
    means: (T.mantel_p < .05 ? "Kurumların konu karışımı, yelpazedeki yerleriyle birlikte değişiyor. " : "Kurumların konu karışımı ile yelpazedeki yerleri arasında belirgin bir bağ bulamadık; bu, bağ olmadığını değil, ölçümün yakalayamadığını gösterir. ") +
      "Tema payları kurum başına eşit ağırlıkla ortalandığı için, çok başlık yazan bir kurum bloğunun görünümünü tek başına belirlemez. " +
      "Bir temada fark olması, o kurumların başka konulardan kaçındığı anlamına gelmez; yalnızca başlık karışımının farklı olduğunu gösterir.",
    how: orHow(["" + th.length + " tema: siyasi başlıklara " + T.N.toLocaleString("tr") + " başlık üzerinde Dirichlet çok terimli karışım (GSDMM) uygulandı; her konu, sözcükleri en çok örtüşen referans temaya bağlandı.",
      "Blok değeri = o bloktaki kurumların tema paylarının ortalaması. Hücredeki sayı yüzdedir; çubuklar bütün hücreler arasında aynı ölçektedir.",
      "Konu–yerleşim ilişkisi: Mantel testi (9.999 permütasyon). " + orMantelText(T.mantel_r, T.mantel_p, "Kurumların konu karışımı farkı, yerleşim farkıyla") + " Yerleşim sağlanmış veridir."], "dil") };
}

function orFindWeekly() {
  var ev = orEvents(), nW = wk7(DAYS[DAYS.length - 1]) + 1, W = [], i;
  for (i = 0; i < nW; i++) W.push({ ev: 0, l: 0, r: 0, days: 0 });
  DAYS.forEach(function (d) { W[wk7(d + "T00:00")].days++; });
  ev.forEach(function (e) { var w = W[wk7(e.f)]; if (!w) return; w.ev++; if (e.bs === "left") w.l++; if (e.bs === "right") w.r++; });
  var mx = Math.max.apply(null, W.map(function (w) { return Math.max(w.l, w.r); })) || 1;
  var lab = function (k) { return fmtD(new Date(Date.parse(DAYS[0] + "T00:00Z") + k * 7 * 864e5).toISOString().slice(0, 10) + "T00:00"); };
  var viz = vzLine("hafta", W.map(function (w, k) { return lab(k); }), [
      { k: "l", label: "Solun az verdiği olay", vals: W.map(function (w) { return w.l; }), c: "var(--left)" },
      { k: "r", label: "Sağın az verdiği olay", vals: W.map(function (w) { return w.r; }), c: "var(--right)" }],
    { label: "Haftalık kör nokta sayısı, sol ve sağ", tipX: function (k) { return lab(k) + " haftası" + (W[k].days < 7 ? " (" + W[k].days + " gün)" : "") + " · " + orN(W[k].ev) + " olay"; },
      band: W[nW - 1].days < 7 ? [nW - 2, nW - 1, "kısmi"] : null }) +
    '<p class="or-hint">Klavyeyle: çizgiye odaklanıp ok tuşlarını kullanın.</p>';
  var tot = W.reduce(function (t, w) { return t + w.l + w.r; }, 0);
  var peak = W.map(function (w, k) { return { k: k, n: w.l + w.r }; }).sort(function (a, b) { return b.n - a.n; })[0];
  var low = W.filter(function (w) { return w.days >= 7; }).map(function (w) { return w.l + w.r; });
  return { id: "secim-hafta",
    claim: "Kör noktalar en çok <b>" + lab(peak.k) + "</b> haftasında çıktı: <b>" + peak.n + "</b> olay. " + nW + " haftanın toplamı <b>" + tot + "</b>.",
    viz: viz,
    read: "Her çizgi bir taraf; yükseldikçe o hafta o tarafın az verdiği olay artıyor. Çizgiye " + orTap() + ": haftanın olay sayısı.",
    table: vzTable(["Hafta", "Gün", "Olay", "Solun az verdiği", "Sağın az verdiği"], W.map(function (w, k) { return [lab(k), w.days, orN(w.ev), w.l, w.r]; })),
    means: "Tam haftalarda sayı " + (low.length ? Math.min.apply(null, low) + " ile " + Math.max.apply(null, low) + " arasında değişiyor" : "hesaplanamadı") + ". " +
      "Haftalar arası fark, o haftanın olay sayısıyla birlikte oynayabilir; bu yüzden bir haftanın yüksek çıkması tek başına bir eğilim kanıtı değildir. " +
      "Son hafta kısmi olabilir (gün sayısı sütun ipucunda yazar).",
    how: orHow(["Birim: olayın ilk başlığının düştüğü hafta (pencerenin ilk gününden başlayan 7 günlük dilimler). Resmî ilan olayları hariç.",
      "Kör nokta: önceki bulgudaki kural (taraf başına normalize, binom testi)."], "olay") };
}

/* ======================================================= dil */
function orFindRange() {
  var ev = orEvents(), bins = [], i;
  for (i = 0; i < 10; i++) bins.push({ lo: i * 10, hi: i * 10 + 10, ev: [] });
  ev.forEach(function (e) { bins[Math.min(9, Math.floor((e.p || 0) / 10))].ev.push(e); });
  bins.forEach(function (b) { b.ev.sort(function (x, y) { return y.p - x.p || y.s.length - x.s.length; }); });
  var n = ev.length, low = bins[0].ev.length, hi4 = bins.slice(4).reduce(function (t, b) { return t + b.ev.length; }, 0);
  var ps = ev.map(function (e) { return e.p || 0; }).sort(function (a, b) { return a - b; }), med = ps[Math.floor((ps.length - 1) / 2)];
  var widest = ev.slice().sort(function (a, b) { return b.p - a.p; })[0];
  ORD.widest = ev.filter(function (e) { return e.s.length >= 8 && defaultPair(e); }).sort(function (a, b) { return b.p - a.p; }).slice(0, 3);
  var cols = vzDist("rng", ev.map(function (e) { return e.p || 0; }), { min: 0, max: 100, bins: 50,
    label: "Olayların yüklü dil aralığı dağılımı", axis: "Aynı olaydaki en yüklü ve en sakin başlığın puanı arasındaki fark. Bir aralık seçmek için sürükleyin ya da tıklayın.",
    presets: [[0, 10, "0–9"], [10, 20, "10–19"], [20, 40, "20–39"], [40, 101, "40 ve üstü"]],
    detail: function (a, b) {
      if (a == null) return '<p class="or-hint">Grafikte bir aralık seçin ya da bir düğmeye basın: o aralıktaki en geniş farklı olaylar listelenir.</p>';
      var es = ev.filter(function (e) { var p = e.p || 0; return p >= a && p < b; }).sort(function (x, y) { return y.p - x.p || y.s.length - x.s.length; });
      return "<p><b>Aralık " + Math.round(a) + "–" + Math.min(100, Math.round(b)) + " puan</b> olan " + orN(es.length) + " olay. En geniş " + Math.min(8, es.length) + ":</p>" +
        (es.length ? orEvList(es.slice(0, 8), function (e) { return "aralık " + e.p; }) : '<p class="or-hint">Bu aralıkta olay yok.</p>'); } });
  return { id: "dil-aralik",
    claim: "Olayların <b>" + orPcS(low / n, "de") + "</b> kurumların başlıkları benzer tonda; <b>" + orN(hi4) + "</b> olayda en sakin ve en yüklü başlık arasında 40 puan ya da daha fazla fark var.",
    viz: cols,
    read: "Soldan sağa: aynı olaydaki en sakin ve en yüklü başlığın puan farkı; yükselti o farktaki olay sayısı.",
    example: widest ? widest.i : null,
    table: vzTable(["Puan farkı", "Olay", "Olayların payı"], bins.map(function (b) { return [b.lo + "–" + (b.hi === 100 ? 100 : b.hi - 1), orN(b.ev.length), orP(b.ev.length / (n || 1))]; })),
    means: "Aynı olay çoğunlukla benzer sözcüklerle anlatılıyor: tipik bir olayda en yüklü ve en sakin başlık arasındaki fark " + med + " puan. En geniş fark " + widest.p + " puan (örnek olay aşağıda). " +
      "Geniş aralık, bir kurumun diğerlerinden çok sert bir sözcük seçtiği anlamına gelir; hangi kurumun hangi yönde ayrıştığı bu grafikten okunmaz. " +
      "Ayrışan olayları tek tek açmak için bir sütuna tıklayın.",
    how: orHow(["‘Benzer ton’: olaydaki en yüklü ve en sakin başlık arasındaki fark 10 puanın altında (" + orN(low) + " olay, " + orP(low / n) + "). En geniş fark " + widest.p + " puan.",
      "Her başlık kural tabanlı puanlayıcıyla 0–100 puanlanır (Yöntem › yüklü dil). Aralık = olaydaki en yüksek puan − en düşük puan.",
      "Birim: resmî ilan olayları hariç " + orN(n) + " olay. Alan 2 puanlık dilimlerdeki olay sayısıdır."], "dil") };
}

function orLangRows(metric) {
  var out = [];
  ACT5.forEach(function (s) {
    var p = polOf(s); if (p.length < 20 || !SRC[s]) return;
    var sum = 0, hot = 0; p.forEach(function (a) { sum += a.v; if (a.v >= 25) hot++; });
    out.push({ s: s, n: p.length, mean: sum / p.length, share: hot / p.length, lean: SRC[s].lean == null ? 50 : SRC[s].lean, sum: sum, hot: hot });
  });
  return out;
}
function orLangBlocs(rows) {
  var o = {};
  rows.forEach(function (r) { var b = bloc(r.s); if (b === "none") return; var x = o[b] = o[b] || { n: 0, sum: 0, hot: 0, outlets: 0 }; x.n += r.n; x.sum += r.sum; x.hot += r.hot; x.outlets++; });
  return o;
}
function orLangHtml() {
  var st = ORD.lang, rows = ORD.langRows.slice(), key = st.metric === "share" ? "share" : "mean";
  if (st.sort === "name") rows.sort(function (a, b) { return trCmp(srcName(a.s), srcName(b.s)); });
  else if (st.sort === "lean") rows.sort(function (a, b) { return a.lean - b.lean; });
  else rows.sort(function (a, b) { return b[key] - a[key]; });
  var fmt = function (v) { return key === "share" ? orP(v) : dec(v, 1); };
  var bl = orLangBlocs(ORD.langRows);
  var bv = function (b) { return bl[b] ? (key === "share" ? bl[b].hot / bl[b].n : bl[b].sum / bl[b].n) : null; };
  var mul = key === "share" ? 100 : 1, f2 = function (v) { return key === "share" ? "%" + dec(v, 0) : dec(v, 0); };
  var tn = 0, ts = 0, th = 0; ORD.langRows.forEach(function (r) { tn += r.n; ts += r.sum; th += r.hot; });
  var allv = key === "share" ? th / (tn || 1) : ts / (tn || 1);
  if (st.sort === "dev") rows.sort(function (a, b) { return (b[key] - bv(bloc(b.s))) - (a[key] - bv(bloc(a.s))); });
  var bk = ["left", "mid", "right"].filter(function (b) { return bl[b]; });
  var chip = function (a, v, t, on) { return '<button type="button" class="chip" data-' + a + '="' + v + '" aria-pressed="' + on + '">' + t + "</button>"; };
  var hiV = Math.max.apply(null, rows.map(function (r) { return r[key]; })) * mul;
  var vr = [{ k: "blok", label: "Blok ortalamaları", span: "pts", val: dec(mul * (Math.max.apply(null, bk.map(bv)) - Math.min.apply(null, bk.map(bv))), 1) + " fark",
    pts: bk.map(function (b) { return { v: mul * bv(b), c: "var(--" + b + ")", big: true }; }),
    tip: "<span class='k'>Blok ortalamaları</span>" + bk.map(function (b) { return SIDE[b] + ": " + fmt(bv(b)) + " (" + bl[b].outlets + " kurum, " + orN(bl[b].n) + " başlık)"; }).join("<br>") }]
    .concat(rows.map(function (r) {
      var b = bloc(r.s), d = r[key] - (bv(b) || 0);
      return { k: r.s, label: srcName(r.s), sw: lean(r.lean), go: "#/kurum?s=" + r.s, ref: bv(b) == null ? null : mul * bv(b), span: "ref", val: fmt(r[key]),
        pts: [{ v: mul * r[key], c: lean(r.lean) }],
        tip: "<span class='k'>" + esc(srcName(r.s)) + "</span>" + orN(r.n) + " siyasi başlık<br>Ortalama puan " + dec(r.mean, 1) + " · yüklü başlık payı " + orP(r.share) +
          (bv(b) != null ? "<br>Kendi bloğunun ortalamasından " + (d >= 0 ? "+" : "−") + fmt(Math.abs(d)).replace("%", "") + (key === "share" ? " puan" : "") : "") + "<br>" + orGo() + ": kurum sayfası" };
    }));
  return '<div class="or-ctl"><span class="or-cl">Ölçü</span>' + chip("lm", "mean", "Ortalama puan", key === "mean") + chip("lm", "share", "Yüklü başlık payı", key === "share") +
    '<span class="or-cl">Sıra</span>' + chip("ls", "val", "Değere göre", st.sort === "val") + chip("ls", "dev", "Bloğundan sapmaya göre", st.sort === "dev") + chip("ls", "lean", "Yerleşime göre", st.sort === "lean") + chip("ls", "name", "Ada göre", st.sort === "name") + "</div>" +
    vzKey([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" }, { kind: "t", t: "kurumun kendi bloğunun ortalaması" }, { kind: "al", t: "bütün siyasi başlıklar" }]) +
    vzRows(vr, { min: Math.max(0, Math.floor(Math.min.apply(null, rows.map(function (r) { return r[key]; })) * mul * .85)), max: Math.ceil(hiV * 1.08), fmt: f2, refAll: { v: mul * allv, label: "tümü " + fmt(allv) }, lw: 170, vw: 64,
      axis: "Çizgi, kurumun değerini kendi bloğunun ortalamasına bağlar: uzun çizgi, kurumun bloğundan ayrıştığını gösterir." });
}
function orFindLoaded() {
  ORD.lang = ORD.lang || { metric: "mean", sort: "val" };
  var rows = ORD.langRows = orLangRows(), bl = orLangBlocs(rows);
  var by = rows.slice().sort(function (a, b) { return b.mean - a.mean; }), hi = by[0], lo = by[by.length - 1];
  var bm = function (b) { return bl[b] ? bl[b].sum / bl[b].n : null; };
  var bv = ["left", "mid", "right"].map(bm).filter(function (v) { return v != null; });
  return { id: "dil-yuklu",
    claim: "Siyasi başlıklarda en yüklü dili <b>" + esc(srcName(hi.s)) + "</b> (ortalama " + dec(hi.mean, 1) + "), en sakinini <b>" + esc(srcName(lo.s)) + "</b> (" + dec(lo.mean, 1) +
      ") kullanıyor" + (bv.length ? "; sol, merkez ve sağ blokların ortalaması " + dec(Math.min.apply(null, bv), 1) + " ile " + dec(Math.max.apply(null, bv), 1) + " arasında." : "."),
    viz: '<div id="or-lang">' + orLangHtml() + "</div>",
    read: "Her nokta bir kurum; sağa gittikçe daha yüklü dil. Çizgi kurumu kendi bloğunun ortalamasına bağlar.",
    table: vzTable(["Kurum", "Blok", "Siyasi başlık", "Ortalama puan", "Yüklü başlık payı", "Bloğunun ortalaması"], by.map(function (r) {
      var b = bloc(r.s); return [srcName(r.s), SIDE[b] || "yerleşimsiz", orN(r.n), dec(r.mean, 1), orP(r.share), bm(b) == null ? "—" : dec(bm(b), 1)]; })),
    means: "Kurumlar arasındaki fark " + dec(hi.mean - lo.mean, 1) + " puan; blok ortalamaları arasındaki en büyük fark " + dec(Math.max(bm("left"), bm("mid"), bm("right")) - Math.min(bm("left"), bm("mid"), bm("right")), 1) + " puan. " +
      "Puan, sözcük kurallarının saptadığı yüklü ifade yoğunluğudur; bir kurumun yazdığı konular farklı olduğundan (savaş ya da yargı haberi daha çok yüklü sözcük içerir) fark yalnızca üslup farkı değildir. " +
      "Ölçüyü ve sırayı değiştirerek aynı verinin başka okumalarına bakabilirsiniz.",
    how: orHow(["Başlıklar kural tabanlı puanlayıcıyla puanlanır; ‘yüklü başlık’ = puan 25 ve üzeri (tek yüklü unsur bandı ve üstü).",
      "Blok ortalamaları: " + ["left", "mid", "right"].filter(function (x) { return bl[x]; }).map(function (x) { return SIDE[x].toLocaleLowerCase("tr") + " " + dec(bm(x), 1); }).join(", ") + ".",
      "Birim: en az 20 siyasi başlığı olan etkin kurumlar (" + rows.length + " kurum). Blok değeri başlık sayısıyla ağırlıklıdır.", "Yerleşim kayıt defterinden gelir, doğrulanmamıştır."], "dil") };
}

function orTop20Rows(f) {
  var st = deviceStats(), rules = Object.keys(st).filter(function (k) { return st[k].n; }).sort(function (a, b) { return st[b].n - st[a].n; });
  var S = bg7Stats(), ai = Object.keys(S).filter(function (k) { return S[k].unc + S[k].sup; })
    .sort(function (a, b) { return (S[b].unc + S[b].sup) - (S[a].unc + S[a].sup); }).slice(0, Math.max(0, 20 - rules.length));
  var top = function (k) { var c = {}; D.A.forEach(function (a) { if (a.k.indexOf(k) >= 0) c[a.s] = (c[a.s] || 0) + 1; });
    var s0 = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0]; return s0 ? srcName(s0) : "—"; };
  var cnt = {};
  (bg7() ? bg7().events : []).forEach(function (x) { if (x.status !== "review_complete") return;
    bg7Live(x).forEach(function (f) { var k = bg7k(f.id), c = cnt[k] = cnt[k] || {};
      (f.evidence || []).forEach(function (q) { orQuoteOutlets(x, q).forEach(function (o) { c[o] = (c[o] || 0) + 1; }); }); }); });
  var topAI = function (k) { var c = cnt[k] || {}, o = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0]; return o ? srcName(o) : "—"; };
  var name = function (k) { return (BREG[k] || BIA[k] || {}).en || (S[k] && S[k].name) || k; };
  var out = [];
  if (f !== "yz") rules.forEach(function (k) { out.push('<tr data-bias7="' + esc(k) + '" class="or-tr1"><td><b>' + esc(name(k)) + "</b></td><td>Kural</td><td class=\"r num\">" + orN(st[k].n) + " başlık</td><td>" + esc(top(k)) + "</td></tr>"); });
  if (f !== "kural") ai.forEach(function (k) { out.push('<tr data-bias7="' + esc(k) + '" class="yz-row or-tr1"><td>' + esc(name(k)) + "</td><td>" + yzBadge() + '</td><td class="r num">' + (S[k].unc + S[k].sup) + " olay</td><td>" + esc(topAI(k)) + "</td></tr>"); });
  return { html: out.join(""), nr: rules.length, na: ai.length };
}
function orTop20Html(f) {
  var r = orTop20Rows(f);
  return '<div class="scroller panel"><table><thead><tr><th>Yapı</th><th>Kaynak</th><th class="r">Sayı</th><th>En çok görülen kurum</th></tr></thead><tbody>' + r.html + "</tbody></table></div>";
}
function orFindTop20() {
  var all = orTop20Rows(), chip = function (v, t, on) { return '<button type="button" class="chip" data-tf="' + v + '" aria-pressed="' + on + '">' + t + "</button>"; };
  var st = deviceStats(), top = Object.keys(st).sort(function (a, b) { return st[b].n - st[a].n; })[0];
  var nm = function (k) { var x = BREG[k] || BIA[k] || {}; return x.tr && x.en ? x.tr + " (" + x.en + ")" : x.en || k; };
  return { id: "dil-yapilar",
    claim: (top ? "Sözcük kurallarının en sık bulduğu yapı <b>" + esc(nm(top)) + "</b>: <b>" + orN(st[top].n) + "</b> başlıkta. " : "") +
      "Listedeki " + (all.nr + all.na) + " yapının " + orNS(all.nr) + " sözcük kurallarıyla, " + orNS(all.na) + " yapay zekâ incelemesiyle bulundu.",
    viz: '<div class="or-ctl"><span class="or-cl">Kaynak</span>' + chip("hepsi", "Hepsi", true) + chip("kural", "Kural", false) + chip("yz", "YZ " + yzBadge(), false) +
      '</div><div id="or-t20">' + orTop20Html("hepsi") + "</div>",
    read: "Her satır bir yapı; sayı kural satırlarında başlık, YZ satırlarında olay. Bir satıra " + (orTap() === "dokunun" ? "dokunun" : "tıklayın") + ": tanım, örnekler ve ilgili olaylar.",
    means: "Kural satırlarının sayısı başlık, YZ satırlarının sayısı olay birimindedir; iki sayı doğrudan karşılaştırılamaz. " +
      "Kural saptaması aynı metinde her zaman aynı sonucu verir ama yalnızca yüzeydeki ifadeleri görür; YZ satırları bir okumadır ve insan incelemesinden geçmemiş olabilir. Bir yapının sık çıkması, o yapıyı kullanan başlığın hatalı ya da kasıtlı olduğunu göstermez.",
    how: orHow(["Kural yapıları: başlık sayısı, resmî ilan dışı tüm başlıklar. YZ kavramları: incelenen olaylarda öne çıkan kavramlar, olay sayısı; editörün reddettikleri sayılmaz.",
      "Liste 20 satırla sınırlıdır: önce kural yapıları, kalan yer YZ kavramlarına verilir."], "dil") };
}

function orFindWords() {
  var list = ORD.widest || [];
  var viz = list.map(function (e) {
    return '<div class="or-sp"><p class="eyebrow"><a class="lnk" href="#/olay?e=' + e.i + '">' + esc(storyLabel(e, 90)) + "</a> · " + e.s.length + " kurum · aralık " + e.p + " puan</p>" + splitCard(e) + "</div>";
  }).join("");
  var e0 = list[0];
  return { id: "dil-sozcuk",
    claim: e0 ? "Sekiz ya da daha çok kurumun verdiği olaylar içinde başlıkların tonu en çok “" + esc(storyLabel(e0, 80)) + "” olayında ayrıştı (" + e0.s.length + " kurum)." : "Karşılaştırılacak olay yok.",
    viz: viz || '<p class="or-hint">Bu ölçütte olay yok.</p>',
    read: "Her kartta yelpazenin en solundaki ve en sağındaki kurumun başlığı; sarı sözcükler ikisinde farklı olanlar.",
    example: e0 ? e0.i : null,
    table: list.length ? vzTable(["Olay", "Kurum", "Puan aralığı"], list.map(function (e) { return [storyLabel(e, 90), e.s.length, e.p]; })) : "",
    means: "Sarı işaretli sözcükler, iki uçtaki başlığın birbirinden ayrışan kısmıdır; ortak sözcükler işaretsiz kalır. " +
      "Yelpazenin en solundaki ve en sağındaki kurumun başlığı yan yana konur; bu ikisi diğer kurumları temsil etmez ve fark çoğu zaman tek bir sıfat ya da fiilden gelir. " +
      "Olayın bütün başlıklarını görmek için olay sayfasına gidin.",
    how: orHow([(e0 ? "Üstteki olayda en sakin ve en yüklü başlık arasında " + e0.p + " puan var. " : "") + "Seçim: en az 8 kurumun verdiği, puan aralığı en geniş " + list.length + " olay; çift = yerleşimi bilinen en sol ve en sağ kurumun başlığı.", "Sözcük işareti: iki başlık arasında ortak olmayan sözcükler (köke indirgenmiş eşleşme)."], "dil") };
}

function orFindStyle() {
  var P = ADV.pca, pcSig = P.p1 < .05, side = P.rho1 > 0 ? "sağa" : "sola";
  return { id: "dil-uslup",
    claim: pcSig ? "Kurumların başlık yazma biçimi yelpazedeki yerleriyle örtüşüyor: <b>" + side + " yerleşik</b> kurumlar çerçeveleme yapılarını daha sık kullananlar tarafında toplanıyor."
      : "Kurumların başlık yazma biçimi ile yelpazedeki yerleri arasında belirgin bir örtüşme görülmedi.",
    viz: fig("adv-b", "1. bileşen × 2. bileşen · nokta rengi yerleşim", { legend: legendHTML([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" }]) }) +
      '<p class="or-hint">Bir noktaya ' + orTap() + ': kurum, yerleşimi ve siyasi başlık sayısı görünür.</p>',
    read: "Her nokta bir kurum; sağa gittikçe başlıklarında çerçeveleme yapıları daha sık. Renk kurumun yerleşimi.",
    table: vzTable(["Kurum", "Blok", "1. bileşen", "2. bileşen"], Object.keys(P.pts).sort(function (a, b) { return P.pts[b][0] - P.pts[a][0]; }).map(function (k) {
      return [srcName(k), SIDE[bloc(k)] || "—", dec(P.pts[k][0], 2), dec(P.pts[k][1], 2)]; })),
    means: (pcSig ? "Başlıkların yazılış biçimi kurumun yelpazedeki yeriyle birlikte değişiyor. " : "Bir ilişki görülmemesi, ilişkinin olmadığını değil, saptanamadığını gösterir. ") +
      "Eksenin en çok beslendiği yapılar: " + P.load1.slice(0, 3).map(function (x) { return esc((BIA[x[0]] || {}).en || x[0]); }).join(", ") + ". " +
      "Bu bir kurumun yazı biçiminin özetidir, hangi yazının doğru olduğu hakkında bir şey söylemez; yalnızca " + Object.keys(P.pts).length + " kurum var, bu yüzden resim kolayca fazla okunur.",
    how: orHow(["Yazma biçiminin ana ekseni (1. bileşen) kurumlar arasındaki farkların " + orPcS(P["var"][0], "i") + " açıklıyor; yerleşimle ρ = " + dec(P.rho1, 2) + " (p = " + dec(P.p1, 3) + ").",
      "Her kurumun siyasi başlıklarında " + P.nkeys + " çerçeveleme yapısının sıklığı standartlaştırıldı ve temel bileşenler analizi (PCA) uygulandı.",
      "Yerleşimle ilişki: Spearman ρ, permütasyon testi. Yerleşim sağlanmış veridir."], "dil") };
}

/* Evidence quotes carry no outlet in the bundle (q.o is empty), so a quote is matched to the event headlines that contain it. */
function orQuoteOutlets(x, q) {
  if (q.o && q.o.length) return q.o;
  var t = trFold(q.q || ""), e = EV[x.event], out = [];
  if (!t || !e) return out;
  e.a.forEach(function (i) { var a = ART[i]; if (a && trFold(a.t).indexOf(t) >= 0 && out.indexOf(a.s) < 0) out.push(a.s); });
  return out;
}
function orBlocAI() {
  var B = bg7(); if (!B) return null;
  var cov = { left: 0, mid: 0, right: 0 }, hit = { left: 0, mid: 0, right: 0 }, byC = {}, nEv = 0;
  B.events.forEach(function (x) {
    if (x.status !== "review_complete" || !EV[x.event]) return; nEv++;
    var c = {}; EV[x.event].s.forEach(function (s) { c[bloc(s)] = 1; });
    var cited = {}; bg7Live(x).forEach(function (f) {
      var h = {}; (f.evidence || []).forEach(function (q) { orQuoteOutlets(x, q).forEach(function (o) { h[bloc(o)] = 1; cited[bloc(o)] = 1; }); });
      var r = byC[f.name] = byC[f.name] || { n: 0, cov: { left: 0, mid: 0, right: 0 }, hit: { left: 0, mid: 0, right: 0 } };
      r.n++; Object.keys(cov).forEach(function (b) { if (c[b]) { r.cov[b]++; if (h[b]) r.hit[b]++; } });
    });
    Object.keys(cov).forEach(function (b) { if (c[b]) { cov[b]++; if (cited[b]) hit[b]++; } });
  });
  return { cov: cov, hit: hit, byC: byC, nEv: nEv };
}
function orFindAI() {
  var R = orBlocAI();
  if (!R) return { id: "dil-yz", claim: "YZ incelemesi verisi bu yapıda yok " + yzBadge() + ".", viz: yzBlock("<p>Veri yok.</p>", "Yapay zekâ incelemesi"), means: "İnceleme sonuçları yüklenmediği için bu bulgu hesaplanamadı.", how: orHow(["İnceleme verisi yok."], "yz") };
  var blocs = ["left", "mid", "right"].filter(function (b) { return R.cov[b]; }), rate = function (b) { return R.cov[b] ? R.hit[b] / R.cov[b] : 0; };
  var bars = vzRows(blocs.map(function (b) { var ci = vzWilson(R.hit[b], R.cov[b]);
      return { k: b, label: SIDE[b] + " bloğu", val: orP(rate(b)), pts: [{ v: 100 * rate(b), lo: 100 * ci[0], hi: 100 * ci[1], c: "var(--" + b + ")", big: true }],
        tip: "<span class='k'>" + SIDE[b] + " bloğu</span>" + R.hit[b] + " / " + R.cov[b] + " olay · " + orP(rate(b)) + "<br>%95 aralık " + orP(ci[0]) + " – " + orP(ci[1]) }; }),
    { min: 0, max: 100, fmt: function (v) { return "%" + v; }, lw: 120, vw: 60, axis: "Nokta oran, yatay çizgi %95 güven aralığı: az olaylı blokta aralık geniştir; aralıkları örtüşen bloklar arasındaki fark şansla açıklanabilir." });
  var cs = Object.keys(R.byC).sort(function (a, b) { return R.byC[b].n - R.byC[a].n; }).slice(0, 6);
  var tbl = '<div class="scroller"><table><thead><tr><th>Kavram</th>' + blocs.map(function (b) { return '<th class="r">' + SIDE[b] + "</th>"; }).join("") + "</tr></thead><tbody>" + cs.map(function (k) {
    var r = R.byC[k]; return "<tr><td>" + esc(k) + "</td>" + blocs.map(function (b) { return '<td class="r">' + (r.cov[b] ? Math.round(100 * r.hit[b] / r.cov[b]) + "% · " + r.cov[b] : "—") + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>" +
    '<p class="or-hint">Hücre: alıntılanma oranı · bloğun o kavramda yer aldığı olay sayısı.</p>';
  var top = blocs.slice().sort(function (a, b) { return rate(b) - rate(a); });
  var inner = "<p><b>Ne fark etti:</b> yapay zekâ, bazı olaylarda başlıkların aynı olguyu farklı çerçevelerle anlattığını okudu ve her kavram için başlıklardan alıntı yaptı. Aşağıdaki oran, bir bloğun en az bir başlığının alıntılandığı olayların payıdır.</p>" +
    bars + "<p><b>Neden kesin değil:</b> alıntı, başlığın diğer kurumlardan farklı yazıldığını gösterir; farkın nedenini ya da kasıt olup olmadığını göstermez. İnsan incelemesinden geçmemiş bir okumadır ve kurum bazında oranlar burada verilmez." + "</p>" + tbl;
  return { id: "dil-yz",
    claim: "Yapay zekânın incelediği <b>" + orN(R.nEv) + "</b> olayda, en az bir başlığı alıntılanan olayların payı: " +
      top.map(function (b) { return SIDE[b].toLocaleLowerCase("tr") + " blokta <b>" + orPc(rate(b)) + "</b>"; }).join(", ") + " " + yzBadge() + ".",
    viz: yzBlock(inner, "Yapay zekâ incelemesi"),
    read: "Her nokta bir blok; sağa gittikçe o bloğun başlıkları daha sık alıntılanmış. Yatay çizgi, sayının ne kadar oynayabileceğini gösterir.",
    table: vzTable(["Blok", "Alıntılanan olay", "Bloğun yer aldığı olay", "Oran", "%95 aralık"], blocs.map(function (b) { var ci = vzWilson(R.hit[b], R.cov[b]);
      return [SIDE[b], R.hit[b], R.cov[b], orP(rate(b)), orP(ci[0]) + " – " + orP(ci[1])]; })),
    means: "Oranlar en yüksekten en düşüğe " + top.map(function (b) { return SIDE[b].toLocaleLowerCase("tr"); }).join(", ") + " blok; fark " + dec(100 * (rate(top[0]) - rate(top[top.length - 1])), 1) + " puan. " +
      "Bir blokta oranın yüksek olması o bloğun başlıklarının daha sık farklı yazıldığını gösterebilir, ama blokların kurum sayıları farklıdır ve çok kurumlu blokta alıntılanma şansı daha yüksektir. Bu bir yanlılık hükmü değildir.",
    how: orHow(["Oranlar: " + top.map(function (b) { return SIDE[b].toLocaleLowerCase("tr") + " " + orP(rate(b)) + " (" + R.hit[b] + " / " + R.cov[b] + ")"; }).join(", ") + "; çizgiler %95 Wilson aralığıdır.",
      "Kaynak: en çok kurumun verdiği olaylarda YZ incelemesi; editörün reddettiği sonuçlar sayılmaz. Birim: incelenen " + orN(R.nEv) + " olay.",
      "Oran = bloktan en az bir başlığı kanıt olarak alıntılanan olay / bloğun yer aldığı incelenen olay. Kurum bazında oranlar Kurumlar sayfasındadır."], "yz") };
}

function orDil() {
  var fs = [orFindRange(), orFindLoaded(), orFindTop20(), orFindWords(), orFindStyle(), orFindAI()];
  return orPage("dil", fs, orExamples("dil"));
}

/* ======================================================= anlati */
function orAnKeys(sel) {
  var ws = v7Weeks();
  if (sel === "hand") ws = ws.filter(function (w) { return w.coded !== "agent"; });
  else if (sel === "ai") ws = ws.filter(function (w) { return w.coded === "agent"; });
  else if (sel !== "all") ws = ws.filter(function (w) { return w.k === sel; });
  return ws.reduce(function (a, w) { return a.concat(w.keys); }, []);
}
function orAnBars(sel) {
  var keys = orAnKeys(sel), sh = dimShares(D.N, keys), n = keys.length;
  var ai = keys.filter(function (k) { return D.N[k].status === "agent_coded"; }).length;
  var allK = orAnKeys("all"), all = dimShares(D.N, allK), cmp = sel !== "all";
  var ord = NORD.slice().sort(function (a, b) { return all[b] - all[a]; });
  return '<p class="or-meta2">' + orN(n) + " olay" + (ai ? " · bunların " + ai + " tanesi YZ ile kodlandı " + yzBadge() : "") + "</p>" +
    vzKey([{ c: "var(--ink)", t: "seçilen olaylarda pay" }, { kind: "ci", t: "%95 aralık" }].concat(cmp ? [{ kind: "t", t: "bütün kodlanan olaylar" }] : [])) +
    vzRows(ord.map(function (d) {
      var c = Math.round(sh[d] * n), ci = vzWilson(c, n);
      return { k: d, label: NDL[d], val: orP(sh[d]), ref: cmp ? 100 * all[d] : null, span: cmp ? "ref" : false,
        pts: [{ v: 100 * sh[d], lo: 100 * ci[0], hi: 100 * ci[1], c: "var(--ink)" }], go: sel !== "all" && sel !== "hand" && sel !== "ai" ? "#/anlati?w=" + sel : "",
        tip: "<span class='k'>" + esc(NDL[d]) + "</span>" + c + " / " + n + " olayda odak boyutu · " + orP(sh[d]) + "<br>%95 aralık " + orP(ci[0]) + " – " + orP(ci[1]) + (cmp ? "<br>Bütün kodlanan olaylarda " + orP(all[d]) : "") };
    }), { min: 0, max: 100, fmt: function (v) { return "%" + v; }, lw: 170, vw: 60,
      axis: cmp ? "Siyah çentik bütün kodlanan olaylardaki pay; nokta çentikten uzaksa bu seçim genel resimden ayrışıyor (aralık çentiği kesmiyorsa fark şansla açıklanamayacak kadar büyük)." : "Nokta pay, yatay çizgi %95 güven aralığı. Bir hafta seçince o haftanın payı bütün olaylarla karşılaştırılır." });
}
function orFindDims() {
  var ws = v7Weeks().filter(function (w) { return w.keys.length; }), all = orAnKeys("all"), sh = dimShares(D.N, all), n = all.length;
  var ord = NORD.slice().sort(function (a, b) { return sh[b] - sh[a]; });
  var chip = function (v, t, on) { return '<button type="button" class="chip" data-an="' + v + '" aria-pressed="' + on + '">' + t + "</button>"; };
  var nAi = orAnKeys("ai").length, c0 = Math.round(sh[ord[0]] * n), cl = ord[ord.length - 1];
  var viz = '<div class="or-ctl"><span class="or-cl">Hafta</span>' + chip("all", "Hepsi", true) + chip("hand", "Elle kodlanan", false) + chip("ai", "YZ ile kodlanan " + yzBadge(), false) +
    ws.map(function (w) { return chip(w.k, esc(w.l), false); }).join("") + '</div><div id="or-an">' + orAnBars("all") + "</div>";
  return { id: "anlati-boyut",
    claim: "Kodlanan <b>" + orN(n) + "</b> olayın " + (c0 === n ? "hepsinde" : "<b>" + orNS(c0, "de") + "</b>") + " kurumlar “" + esc(NDL[ord[0]]) + "” boyutunda ayrıştı; “" + esc(NDL[cl]) + "” boyutunda ayrıştıkları olay yalnızca <b>" + orN(Math.round(sh[cl] * n)) + "</b>.",
    viz: viz,
    read: "Her satır bir boyut; nokta, kurumların o boyutta ayrıştığı olayların payı. Üstten bir hafta seçince o hafta bütün olaylarla karşılaştırılır.",
    table: vzTable(["Boyut", "Olay", "Pay", "%95 aralık"], ord.map(function (d) { var c = Math.round(sh[d] * n), ci = vzWilson(c, n); return [NDL[d], c + " / " + n, orP(sh[d]), orP(ci[0]) + " – " + orP(ci[1])]; })),
    means: "Odak boyutu, kurumların o olayda en çok ayrıştığı boyuttur; yüksek pay, o boyutta ayrışmanın sık olduğunu gösterir, ayrışmanın iyi ya da kötü olduğunu değil. " +
      "Payların içine YZ ile kodlanan " + orN(nAi) + " olay da giriyor " + yzBadge() + "; elle ve YZ ile kodlanan olayları ayrı görmek için üstteki seçimleri kullanın. " +
      "Olayların çoğu en çok kurumun verdiği olaylardan seçildiği için bu paylar bütün haberlerin değil, öne çıkan olayların resmidir.",
    how: orHow(["En sık odak boyutu " + esc(NDL[ord[0]]) + " (" + orP(sh[ord[0]]) + "), en seyreği " + esc(NDL[cl]) + " (" + orP(sh[cl]) + ").",
      "Birim: editörce reddedilmemiş kodlanmış olaylar (n = " + orN(n) + "). Pay = bir boyutun odak boyutu olarak işaretlendiği olay sayısı / seçilen olay sayısı.",
      "Dokuz boyutlu kodlama; ilk altı hafta elle, sonrası yapay zekâ ile kodlandı (Yöntem › anlatı kodlaması)."], "anlati") };
}

function orBlameOutlets(keys) {
  var m = {};
  keys.forEach(function (k) { ((D.N[k] && D.N[k].rows) || []).forEach(function (r) {
    var v = String(r.blame == null ? "" : r.blame).trim(); if (!v || UNSET(v)) return;
    var b = bloc(r.s), c = ((m[v] = m[v] || {})[b] = m[v][b] || {}); c[r.s] = (c[r.s] || 0) + 1; }); });
  return m;
}
function orFindBlame() {
  var keys = orAnKeys("all"), rows = blameByBloc(D.N, keys, bloc).filter(function (r) { return !UNSET(r.value); }), who = orBlameOutlets(keys);
  var tot = function (r) { return r.left + r.mid + r.right + r.none; }, top = rows.slice(0, 10), mx = top.length ? tot(top[0]) : 1;
  var all = 0, withB = 0; keys.forEach(function (k) { ((D.N[k] && D.N[k].rows) || []).forEach(function (r) { all++; if (String(r.blame || "").trim() && !UNSET(r.blame)) withB++; }); });
  var viz0 = '<div class="or-bars">' + top.map(function (r) {
    var w = who[r.value] || {}, tip = "<span class='k'>" + esc(r.value) + "</span>" + ["left", "mid", "right"].map(function (b) {
      var o = w[b] || {}, names = Object.keys(o).sort(function (a, c) { return o[c] - o[a]; }).map(function (s) { return esc(srcName(s)) + (o[s] > 1 ? " ×" + o[s] : ""); });
      return SIDE[b] + " (" + r[b] + "): " + (names.join(", ") || "—"); }).join("<br>");
    return '<div class="or-bar or-st" tabindex="0"' + orTip(tip) + '><span class="or-bl">' + esc(r.value) + '</span><span class="or-bt or-stk" style="width:' + (100 * tot(r) / mx) + '%">' +
      ["left", "mid", "right"].map(function (b) { return r[b] ? '<i style="flex:' + r[b] + ";background:var(--" + b + ')"></i>' : ""; }).join("") + "</span><b>" + tot(r) + "</b></div>";
  }).join("") + "</div>" + legendHTML([{ c: "var(--left)", t: "sola yerleşik kurum" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik kurum" }], "Renk") +
    '<p class="or-hint">Bir çubuğa ' + orTap() + ': hangi kurumların başlığında bu aktörün sorumlu tutulduğu görünür.</p>';
  var act = V2.active || {}, viz = vzKey([{ c: "var(--left)", t: "sol" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağ" }]) +
    vzRows(top.map(function (r) {
      return { k: r.value, label: r.value, span: "pts", val: tot(r) + " satır",
        pts: ["left", "mid", "right"].filter(function (b) { return act[b]; }).map(function (b) { return { v: 100 * r[b] / act[b], c: "var(--" + b + ")" }; }),
        tip: "<span class='k'>" + esc(r.value) + "</span>" + ["left", "mid", "right"].map(function (b) { return SIDE[b] + ": " + r[b] + " satır" + (act[b] ? " · etkin kurum başına " + dec(r[b] / act[b], 2) : ""); }).join("<br>") };
    }), { min: 0, fmt: function (v) { return dec(v / 100, 1); }, lw: 190, vw: 70,
      axis: "Etkin kurum başına sorumlu tutma sayısı: blokların kurum sayısı farklı olduğu için ham sayı yerine kurum başına değer. Uzun çizgi bloklar arasında ayrışmayı gösterir." });
  viz = g6Switch("sorumlu", g6Box("blame", "", "Kurumlardan sorumlu tutulan aktörlere giden ağ") +
    legendHTML([{ c: "var(--hot)", t: "sorumlu tutulan aktör (kare)" }, { c: "var(--left)", t: "sola yerleşik kurum" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik kurum" }], "Ağ") +
    '<p class="or-hint">Her çizgi bir kurumun başlığında o aktörü sorumlu tuttuğu olaylar; kalınlık olay sayısı. Aynı aktöre bağlanan kurumlar bir araya toplanır.</p>', viz, "Kurum başına");
  var t0 = top[0] || { value: "—", left: 0, mid: 0, right: 0, none: 0 };
  return { id: "anlati-sorumlu",
    claim: "Başlıklarda en sık sorumlu tutulan taraf “" + esc(t0.value) + "”: <b>" + tot(t0) + "</b> kurum başlığında; yerleşimli olanların " + orNS(t0.right) + " sağdaki, " + orNS(t0.mid) + " merkezdeki, " + orNS(t0.left) + " soldaki kurumlardan.",
    viz: viz,
    read: "Her çizgi bir kurumdan, başlığında sorumlu tuttuğu aktöre gider; kalın çizgi daha çok olay. Bir düğüme " + orTap() + ": bağlantıları öne çıkar.",
    table: (function () { var out = []; top.forEach(function (r) { var w = who[r.value] || {};
        ["left", "mid", "right", "none"].forEach(function (b) { var o = w[b] || {}; Object.keys(o).forEach(function (s) { out.push([srcName(s), r.value, o[s], SIDE[b]]); }); }); });
      return vzTable(["Kurum", "Sorumlu tutulan", "Olay", "Kurumun bloğu"], out); })(),
    means: "Kodlanan kurum satırlarının " + orP(withB / (all || 1)) + "’inde başlık birini sorumlu tutuyor; geri kalanı sorumluluk atfetmiyor. " +
      "Bu grafik kimin gerçekten sorumlu olduğunu değil, hangi kurumların başlığında kimin sorumlu gösterildiğini sayar. Blok sayıları kurum sayısına bağlıdır (sağ blokta daha çok kurum var), bu yüzden bloklar arası sayı farkı tek başına bir tercih göstermez.",
    how: orHow(["Birim: " + orN(keys.length) + " kodlanmış olayın kurum satırları; değer = ‘Sorumlu tutulan’ boyutuna yazılan ifade, boş ve ‘belirtilmiyor’ değerleri sayılmaz.",
      "En sık " + top.length + " değer gösterilir. Blok: kayıt defterindeki yerleşim (doğrulanmamış). “" + esc(t0.value) + "”: sol " + t0.left + ", merkez " + t0.mid + ", sağ " + t0.right + ", yerleşimsiz " + t0.none + " satır."], "anlati") };
}

function orFindTrend() {
  var ws = v7Weeks().filter(function (w) { return w.keys.length; });
  var head = "<tr><th></th>" + ws.map(function (w) { return "<th>" + esc(w.l) + (w.coded === "agent" ? " " + yzBadge() : "") + "</th>"; }).join("") + "</tr>";
  var shs = ws.map(function (w) { return dimShares(D.N, w.keys); });
  var body = NORD.map(function (d) {
    return "<tr><th scope=\"row\">" + esc(NDL[d]) + "</th>" + ws.map(function (w, i) {
      var v = shs[i][d], c = Math.round(v * w.keys.length);
      return '<td class="or-hm" style="--v:' + Math.round(v * 100) + '%" tabindex="0"' + orTip("<span class='k'>" + esc(NDL[d]) + " · " + esc(w.l) + "</span>" + c + " / " + w.keys.length + " olay · " + orP(v) + (w.coded === "agent" ? "<br>YZ ile kodlandı" : "<br>Elle kodlandı")) + ">" + Math.round(v * 100) + "</td>"; }).join("") + "</tr>"; }).join("");
  var sz = ws.map(function (w) { return w.keys.length; }), ai = ws.filter(function (w) { return w.coded === "agent"; }).length;
  var mv = NORD.map(function (d) { var xs = shs.map(function (s) { return s[d]; }); return { d: d, r: Math.max.apply(null, xs) - Math.min.apply(null, xs) }; }).sort(function (a, b) { return b.r - a.r; })[0];
  return { id: "anlati-hafta",
    claim: "<b>" + ws.length + "</b> haftada en çok oynayan boyut “" + esc(NDL[mv.d]) + "”: kurumların bu boyutta ayrıştığı olayların payı, en düşük ve en yüksek hafta arasında <b>" + dec(100 * mv.r, 0) + "</b> puan değişti.",
    viz: '<div class="scroller"><table class="or-tbl"><thead>' + head + "</thead><tbody>" + body + '</tbody></table></div><p class="or-hint">Hücre: haftanın kodlanmış olaylarında o boyutun odak olduğu olayların yüzdesi; koyu hücre yüksek paydır. ' +
      '<a class="lnk" href="#/anlati">Haftanın anlatı haritasını aç →</a></p>',
    read: "Her satır bir boyut, her sütun bir hafta; koyu hücre, o hafta kurumların o boyutta sık ayrıştığını gösterir.",
    means: "Haftalık olay sayısı " + Math.min.apply(null, sz) + " ile " + Math.max.apply(null, sz) + " arasında; " + ai + " hafta yapay zekâ ile kodlandı " + yzBadge() + ", kalanı elle. " +
      "Kodlama yöntemi değiştiği için bu iki grup arasındaki sıçramalar gerçek bir değişimden olduğu kadar kodlama farkından da gelebilir; haftalar arası eğilim olarak okunmamalıdır. Her hafta o haftanın en çok kurumun verdiği olaylarından seçildi.",
    how: orHow(["Birim: hafta başına editörce reddedilmemiş kodlanmış olaylar. Hücre = odak boyutu olarak işaretlenen olay / haftanın olayları.", "YZ rozeti taşıyan haftalar yapay zekâ ile kodlandı; elle kodlananlarda her kurumun en çok paylaşılan başlığı okundu."], "anlati") };
}

function orAnlati() {
  return orPage("anlati", [orFindDims(), orFindBlame(), orFindTrend()], orExamples("anlati"));
}

/* ======================================================= hiz */
function orFindLead() {
  var LL = (V5.leadLag || {}).outlets || {}, ks = ACT5.filter(function (s) { return LL[s] && LL[s].firstShare != null && LL[s].medLag != null; });
  var xs = ks.map(function (s) { return LL[s].firstShare * 100; }), ys = ks.map(function (s) { return LL[s].medLag; });
  var xm = Math.ceil(Math.max.apply(null, xs) / 5) * 5, ym = Math.ceil(Math.max.apply(null, ys) / 60) * 60, med = function (a) { return median5(a.slice()); };
  var mx = med(xs), my = med(ys);
  var dots = ks.map(function (s) {
    var o = LL[s], l = 100 * (o.firstShare * 100) / xm, t = 100 - 100 * o.medLag / ym;
    return '<a class="or-dot" href="#/kurum?s=' + s + '" data-go="#/kurum?s=' + s + '" style="left:' + l + "%;top:" + t + "%;--c:" + lean(SRC[s] ? SRC[s].lean : null) + '"' +
      orTip("<span class='k'>" + esc(srcName(s)) + "</span>İlk veren olduğu olay payı " + pc5(o.firstShare) + " (" + orN(o.first) + " / " + orN(o.events) + ")<br>Ortanca gecikme " + dur5(o.medLag) + "<br>" + orGo() + ": kurum sayfası") + '><span>' + esc(srcName(s)) + "</span></a>";
  }).join("");
  var viz = '<div class="or-sc"><div class="or-scp"><i class="or-mx" style="left:' + (100 * mx / xm) + '%"></i><i class="or-my" style="top:' + (100 - 100 * my / ym) + '%"></i>' + dots +
    '</div><span class="or-sx">İlk veren olduğu olayların payı (%) → ' + xm + '</span><span class="or-sy">↑ ortanca gecikme ' + dur5(ym) + "</span></div>" +
    legendHTML([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" }, { dash: 1, t: "kurumların ortancası" }]) +
    '<p class="or-hint">Bir noktaya ' + orTap() + ': kurumun ilk yayınlama payı ve gecikmesi; ' + (orTap() === "dokunun" ? "tekrar dokununca" : "tıklayınca") + ' kurum sayfası açılır.</p>';
  var fast = ks.slice().sort(function (a, b) { return LL[b].firstShare - LL[a].firstShare; })[0];
  var cor = (function () { var r = function (a) { var o = a.map(function (v, i) { return [v, i]; }).sort(function (p, q) { return p[0] - q[0]; }), x = []; o.forEach(function (p, i) { x[p[1]] = i; }); return x; };
    var a = r(xs), b = r(ys), n = a.length, d = 0; for (var i = 0; i < n; i++) d += Math.pow(a[i] - b[i], 2); return 1 - 6 * d / (n * (n * n - 1)); })();
  return { id: "hiz-ilk",
    claim: "Olayları en sık ilk veren kurum <b>" + esc(srcName(fast)) + "</b>: verdiği olayların <b>" + orPcS(LL[fast].firstShare, "de") + "</b> ilk oydu; tipik bir kurumda bu oran %" + Math.round(mx) + ".",
    viz: viz,
    read: "Her nokta bir kurum; sağa gittikçe daha sık ilk veren, yukarı çıktıkça ilk olmadığında daha geç yetişen.",
    table: vzTable(["Kurum", "İlk verdiği olay", "Verdiği olay", "İlk veren payı", "Ortanca gecikme"], ks.slice().sort(function (a, b) { return LL[b].firstShare - LL[a].firstShare; }).map(function (s) {
      var o = LL[s]; return [srcName(s), orN(o.first), orN(o.events), pc5(o.firstShare), dur5(o.medLag)]; })),
    means: "İlk olmadığında tipik bir kurum ilk haberden " + dur5(my) + " sonra yetişiyor. " + (cor < -.3 ? "Sık ilk veren kurumlar, ilk olmadıklarında da genellikle çabuk yetişiyor." : cor > .3 ? "Sık ilk veren kurumlar, ilk olmadıklarında daha geç yetişiyor." : "Sık ilk veren olmak ile geç yetişmek arasında belirgin bir bağ yok.") + " " +
      "Bir kurumun çok olayı ilk vermesi daha hızlı olduğunu da, daha çok haber yayımladığını da gösterebilir; ölçü yalnızca aynı olaydaki sıralamaya bakar. Gecikme, kurumun ilk olmadığı olaylarda ilk habere göre ölçülür.",
    how: orHow(["En yüksek ilk veren payı " + esc(srcName(fast)) + " " + pc5(LL[fast].firstShare) + "; kurumların ortanca ilk veren payı %" + dec(mx, 1) + ", ortanca gecikme " + dur5(my) + ". İlk veren payı ile gecikme arasındaki sıra korelasyonu " + dec(cor, 2) + ".",
      "Her olayda kurumun ilk başlığının saati; ilk yayınlayan kurum ve diğerlerinin ilk habere göre gecikmesi. Birim: olay başına kurum, " + (V5.leadLag.horizonHours || 48) + " saatlik pencere içinde.",
      "Etkin kurumlar (" + ks.length + "), yalnızca kendi haberlerinin payı; ham sayılar karşılaştırılmaz."], "veri") };
}
function orFindBlocLag() {
  var B = (V5.leadLag || {}).blocs || {}, rows = [["left>right", "Sol → sağ"], ["right>left", "Sağ → sol"], ["left>mid", "Sol → merkez"], ["right>mid", "Sağ → merkez"]].filter(function (r) { return B[r[0]]; });
  var tip = function (k, t) { return "<span class='k'>" + t + "</span>" + orN(B[k].n) + " olay<br>Karşı taraftan en az biri verdi: " + pc5(B[k].coveredShare) + "<br>Ortanca gecikme " + dur5(B[k].medLag); };
  var src = function (k) { return "var(--" + k.split(">")[0] + ")"; };
  var viz = '<p class="or-hint">Okuma: “Sol → sağ”: olayı ilk veren kurum sola yerleşik; satır, bu olayları sağdan en az bir kurumun da verdiği payı ve gecikmeyi gösterir. Nokta rengi olayı açan blok.</p><h4 class="or-h4">Karşı bloktan en az bir kurumun verdiği olay payı</h4>' +
    vzRows(rows.map(function (r) { var b = B[r[0]], ci = vzWilson(Math.round(b.coveredShare * b.n), b.n);
      return { k: r[0], label: r[1], val: pc5(b.coveredShare), pts: [{ v: 100 * b.coveredShare, lo: 100 * ci[0], hi: 100 * ci[1], c: src(r[0]), big: true }], tip: tip(r[0], r[1]) + "<br>%95 aralık " + orP(ci[0]) + " – " + orP(ci[1]) }; }),
      { min: 0, max: 100, fmt: function (v) { return "%" + v; }, lw: 130, vw: 64 }) +
    '<h4 class="or-h4">Ortanca gecikme</h4>' +
    vzRows(rows.map(function (r) { return { k: r[0] + "l", label: r[1], val: dur5(B[r[0]].medLag), span: "zero", pts: [{ v: B[r[0]].medLag, c: src(r[0]), big: true }], tip: tip(r[0], r[1]) }; }),
      { min: 0, max: Math.ceil(Math.max.apply(null, rows.map(function (r) { return B[r[0]].medLag; })) / 60) * 60,
        ticks: (function () { var m = Math.ceil(Math.max.apply(null, rows.map(function (r) { return B[r[0]].medLag; })) / 60) * 60, t = []; for (var v = 0; v <= m; v += 60) t.push(v); return t; })(),
        fmt: function (v) { return v ? v / 60 + " sa" : "0"; }, lw: 130, vw: 64, axis: "Pay satırlarındaki yatay çizgi %95 güven aralığıdır; olay sayısı az olan yönde aralık geniştir." });
  var lr = B["left>right"], rl = B["right>left"];
  return { id: "hiz-blok",
    claim: lr && rl ? "Soldaki bir kurumun ilk verdiği olayların <b>" + orPcS(lr.coveredShare, "i") + "</b> sağdan en az bir kurum da verdi; sağın ilk verdiklerinin <b>" + orPcS(rl.coveredShare, "i") + "</b> soldan biri verdi." : "Blok geçişi verisi yok.",
    viz: viz,
    read: "Her satır bir yön; üstte karşı bloktan en az bir kurumun da verdiği olayların payı, altta karşı bloğun ne kadar sonra yetiştiği.",
    table: vzTable(["Yön", "Olay", "Karşı bloktan verilen", "%95 aralık", "Ortanca gecikme"], rows.map(function (r) { var b = B[r[0]], ci = vzWilson(Math.round(b.coveredShare * b.n), b.n);
      return [r[1], orN(b.n), pc5(b.coveredShare), orP(ci[0]) + " – " + orP(ci[1]), dur5(b.medLag)]; })),
    means: lr && rl ? "Karşı blok soldan açılan olaylara tipik olarak " + dur5(lr.medLag) + ", sağdan açılanlara " + dur5(rl.medLag) + " sonra yetişti. Sağ blokta çok daha fazla kurum olduğu için bir olayın sağdan en az bir kurum tarafından verilme şansı kendiliğinden yüksektir (sol açılan " + orN(lr.n) + ", sağ açılan " + orN(rl.n) + " olay). Pay farkı bir yayın tercihinden çok kurum sayısı farkını yansıtabilir; gecikme ise karşı bloğun ilk kurumunun ne kadar sonra yetiştiğini gösterir." : "Blok verisi bulunamadı.",
    how: orHow([lr && rl ? "Sol → sağ: " + pc5(lr.coveredShare) + ", ortanca " + dur5(lr.medLag) + "; sağ → sol: " + pc5(rl.coveredShare) + ", ortanca " + dur5(rl.medLag) + "." : "Blok verisi yok.", "Blok geçişi: bir bloktan bir kurumun ilk verdiği olayı, öbür bloktan en az bir kurumun pencere içinde vermesi. Gecikme ortancadır.", "Bloklar kayıt defterindeki yerleşimdendir ve doğrulanmamıştır."], "veri") };
}
function orFindGap() {
  var GP = V5.gap || {}, O = GP.outlets || {}, ks = ACT5.filter(function (s) { return O[s] && O[s].hotter != null; }).sort(function (a, b) { return O[b].hotter - O[a].hotter; });
  var th = GP.threshold || 15, top = (GP.top || []).slice(0, 6).filter(function (x) { return ART[x.i]; });
  var mx = Math.max.apply(null, ks.map(function (s) { return O[s].hotter; })) * 1.05;
  var viz = vzKey([{ c: "var(--ink)", t: "başlık spottan yüklü" }, { kind: "o", c: "var(--ink)", t: "spot başlıktan yüklü" }]) +
    vzRows(ks.slice().sort(function (a, b) { return (O[b].hotter - O[b].cooler) - (O[a].hotter - O[a].cooler); }).map(function (s) {
    var net = O[s].hotter - O[s].cooler;
    return { k: s, label: srcName(s), sw: lean(SRC[s] ? SRC[s].lean : null), go: "#/kurum?s=" + s, span: "pts", val: (net >= 0 ? "+" : "−") + dec(100 * Math.abs(net), 1),
      pts: [{ v: 100 * O[s].cooler, c: "var(--ink)", hollow: true }, { v: 100 * O[s].hotter, c: "var(--ink)" }],
      tip: "<span class='k'>" + esc(srcName(s)) + "</span>Başlığı spotundan en az " + th + " puan yüklü: " + pc5(O[s].hotter) + "<br>Spotu başlığından en az " + th + " puan yüklü: " + pc5(O[s].cooler) + "<br>Fark " + (net >= 0 ? "+" : "−") + dec(100 * Math.abs(net), 1) + " puan · " + orN(O[s].n) + " spotlu haber" };
  }), { min: 0, max: Math.ceil(100 * Math.max(mx, Math.max.apply(null, ks.map(function (s) { return O[s].cooler; }))) / 5) * 5, fmt: function (v) { return "%" + v; }, lw: 150, vw: 56,
    axis: "Satırlar farka göre sıralı (sağdaki sayı, iki pay arasındaki fark, puan). Dolu nokta sağdaysa kurumun başlıkları spotlarından daha sert." }) + (top.length ? '<h4 class="or-h4">En büyük farklar</h4><div class="xcmp-list">' + top.map(function (x) { var a = ART[x.i];
    return '<section class="xcmp-i"><p class="eyebrow">' + esc(srcName(a.s)) + " · " + fmtDT(a.d) + " · başlık " + a.v + ", spot " + a.lv + '</p><p><a class="hlnk" href="' + esc(a.u) + '" target="_blank" rel="noopener">' + esc(a.t) + '</a></p><p class="xsmall">' + esc(x.l) + "</p></section>"; }).join("") + "</div>" : "");
  var neg = ks.filter(function (s) { return O[s].mean < 0; }).length, hi = ks[0], lo = ks[ks.length - 1];
  return { id: "hiz-spot",
    claim: "Başlığı, haberin kendi spotundan belirgin biçimde daha yüklü olan haberler <b>" + esc(srcName(hi)) + "</b>" + orLoc(srcName(hi)) + " " + orPc(O[hi].hotter) + ", <b>" + esc(srcName(lo)) + "</b>" + orLoc(srcName(lo)) + " " +
      (O[lo].hotter < .005 ? "%1’in altında" : orPc(O[lo].hotter)) + ".",
    viz: viz,
    read: "Her satır bir kurum; dolu nokta başlığı spottan yüklü haberlerin payı, boş nokta spotu başlıktan yüklü olanların.",
    table: vzTable(["Kurum", "Spotlu haber", "Başlık spottan yüklü", "Spot başlıktan yüklü", "Fark (puan)"], ks.map(function (s) { var net = O[s].hotter - O[s].cooler;
      return [srcName(s), orN(O[s].n), pc5(O[s].hotter), pc5(O[s].cooler), (net >= 0 ? "+" : "−") + dec(100 * Math.abs(net), 1)]; })),
    means: "Aynı kural kümesi başlığa ve spota ayrı uygulandı. Spotlar başlıktan uzun olduğu için çoğu zaman daha çok kural tetikler; ortalama fark bu yüzden " + neg + " / " + ks.length + " kurumda negatif. " +
      "Bu pay, başlığın kendi haberinden daha sert bir dil kurduğu haberleri sayar; haberin yanlış olduğunu ya da başlığın kasıtlı olduğunu göstermez.",
    how: orHow([esc(srcName(hi)) + " " + pc5(O[hi].hotter) + ", " + esc(srcName(lo)) + " " + pc5(O[lo].hotter) + ".", "Başlık puanı − aynı haberin spot puanı; ≥ " + th + " puan ‘başlık spotundan yüklü’ sayıldı. Spotu olmayan ya da başlıkla aynı olan haberler dışarıda.", "Birim: etkin kurumların spotlu haberleri (kurum başına n bilgisi ipucunda). Pay kurumun kendi haberleri üzerindendir."], "veri") };
}
function orFindFollow() {
  var F = g6FollowData(), top = F.all.slice().sort(function (a, b) { return b.n - a.n; })[0];
  var cross = F.all.filter(function (x) { var p = bloc(x.a), q = bloc(x.b); return (p === "left" && q === "right") || (p === "right" && q === "left"); })
    .reduce(function (t, x) { return t + x.n; }, 0), tot = F.all.reduce(function (t, x) { return t + x.n; }, 0) || 1;
  return { id: "hiz-ag",
    claim: top ? "En sık tekrar eden sıra <b>" + esc(srcName(top.a)) + " → " + esc(srcName(top.b)) + "</b>: " + orN(top.n) + " olayda önce " + esc(srcName(top.a)) + " verdi, " +
      esc(srcName(top.b)) + " tipik olarak " + dur5(median5(top.lags.slice())) + " sonra." : "Sıra verisi yok.",
    read: "Her nokta bir kurum; ok önce verenden sonra verene gider, kalın ok daha çok olay. Bir oka " + orTap() + ": kaç olay, ne kadar sonra.",
    table: vzTable(["Önce veren", "Sonra veren", "Olay", "Ortanca gecikme"], F.edges.filter(function (x) { return ACT5.indexOf(x.a) >= 0 && ACT5.indexOf(x.b) >= 0; }).sort(function (a, b) { return b.n - a.n; })
      .map(function (x) { return [srcName(x.a), srcName(x.b), orN(x.n), dur5(median5(x.lags.slice()))]; })),
    viz: g6Box("follow", "", "İlk veren kurumdan sonra gelen kurumlara giden oklar") +
      legendHTML([{ c: "var(--left)", t: "sola yerleşik" }, { c: "var(--mid)", t: "merkez" }, { c: "var(--right)", t: "sağa yerleşik" }, { line: 1, c: "var(--ink2)", t: "ok: önce veren → sonra veren" }], "Ağ") +
      '<p class="or-hint">Kurumlar yerleşim sırasıyla çember üzerinde; düğüm büyüklüğü ilk veren olduğu olay sayısı. Okun rengi önce veren kurumun yerleşimi, kalınlığı olay sayısı.</p>',
    means: "Okların " + orP(cross / tot) + "’i yelpazenin bir ucundan öbür ucuna (sol ↔ sağ) gidiyor. " +
      "Bir okun kalın olması iki kurumun birbirini izlediğini göstermez: çok haber yayımlayan kurum çok olayda önce çıkar ve sık yayımlayan başka kurumlar onu doğal olarak izler. " +
      "Ağ, bir olayı kimin önce, kimin sonra verdiğinin tekrar eden düzenini gösterir, haberin nereden alındığını değil.",
    how: orHow(["Birim: en az 5 kurumun verdiği olaylar (resmî ilanlar hariç). Her olayda ilk başlığı atan kurumdan, 48 saat içinde ilk başlığını atan her kuruma bir ok sayılır.",
      "Gösterilen oklar: her kurum için onu en sık önceleyen iki kurum ve bütün ağın en sık 24 sırası. Gecikme ortancadır."], "veri") };
}
function orHiz() { return orPage("hiz", [orFindLead(), orFindFollow(), orFindBlocLag(), orFindGap()], orExamples("hiz")); }

function orExamples(q) {
  var ev = orEvents().filter(function (e) { return e.s.length >= 5; }), top = function (f) { return ev.filter(f).sort(function (a, b) { return b.s.length - a.s.length; })[0]; };
  var pick = [];
  var add = function (e) { if (e && pick.indexOf(e) < 0) pick.push(e); };
  if (q === "secim") { add(ORD.bs.L[0]); add(ORD.bs.R[0]); add(top(function () { return true; })); }
  else if (q === "dil") { ev.slice().sort(function (a, b) { return b.p - a.p || b.s.length - a.s.length; }).slice(0, 3).forEach(add); }
  else if (q === "anlati") {
    var nx = []; v7Weeks().forEach(function (w) { w.keys.forEach(function (k) { var e = EV[D.N[k].ev]; if (e) nx.push([e, D.N[k].score || 0]); }); });
    nx.sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3).forEach(function (x) { add(x[0]); }); }
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
  if (k === "dil") return orDil();
  if (k === "anlati") return orAnlati();
  if (k === "hiz") return orHiz();
  return orSecim();
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

function wireOruntu(q, f) {
  var root = document.getElementById("view"); if (!root) return;
  orWire(root); wireGo(root);
  if (f) setTimeout(function () { var t = document.getElementById(f); if (t) t.scrollIntoView({ block: "start" }); }, 30);
  q = OR_PAGES[q] ? q : "secim";
  if (q === "secim") {
    orPut("adv-a", advHeat());
  }
  if (q === "anlati" && !root._ora) {
    root._ora = 1;
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("[data-an]"); if (!b) return;
      [].forEach.call(root.querySelectorAll("[data-an]"), function (x) { x.setAttribute("aria-pressed", x === b); });
      var t = document.getElementById("or-an"); if (t) { vzSwap(t, orAnBars(b.getAttribute("data-an"))); wireGo(t); }
    });
  }
  if (q === "dil") {
    orPut("adv-b", advScatter());
    if (!root._ord) {
      root._ord = 1;
      root.addEventListener("click", function (ev) {
        var b = ev.target.closest && ev.target.closest("[data-lm],[data-ls],[data-tf]"); if (!b) return;
        if (b.hasAttribute("data-tf")) {
          [].forEach.call(root.querySelectorAll("[data-tf]"), function (x) { x.setAttribute("aria-pressed", x === b); });
          var t = document.getElementById("or-t20"); if (t) t.innerHTML = orTop20Html(b.getAttribute("data-tf"));
        } else {
          if (b.hasAttribute("data-lm")) ORD.lang.metric = b.getAttribute("data-lm"); else ORD.lang.sort = b.getAttribute("data-ls");
          var l = document.getElementById("or-lang"); if (l) { vzSwap(l, orLangHtml()); wireGo(l); }
        }
      });
    }
  }
  if (!root._orc) {
    root._orc = 1;
    root.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".or-col"); if (!b) return;
      var set = b.getAttribute("data-set"), d = document.getElementById("or-d-" + set), S = ORD.cols && ORD.cols[set]; if (!d || !S) return;
      var on = b.getAttribute("aria-pressed") !== "true";
      [].forEach.call(root.querySelectorAll('.or-col[data-set="' + set + '"]'), function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", on);
      d.innerHTML = S.detail(on ? S.bins[+b.getAttribute("data-bin")] : null);
      wireGo(d);
    });
  }
}

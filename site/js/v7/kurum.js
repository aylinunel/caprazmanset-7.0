/* v7 Kurumlar: outlet-page findings, each linking to the Örüntüler finding that holds the full chart. */
function kuLink(q, id, text) { return '<a class="lnk" href="#/oruntu?q=' + q + "&f=" + id + '">' + text + "</a>"; }
function kuMore(q, id) { return " " + kuLink(q, id, "Bütün kurumlarla →"); }
function kuName(k) { var b = BIA[k]; return b ? b.tr + " (" + b.en + ")" : k; }
/* Fingerprint rows: how often the outlet's political headlines trigger each structure, against all outlets (ratio 1 = average). */
function kuFp(k) {
  var st = STAT[k], corpusPol = 0, corpusRate = {}, mine = {};
  D.A.forEach(function (x) {
    if (!x.p) return; corpusPol++;
    x.k.forEach(function (c) { corpusRate[c] = (corpusRate[c] || 0) + 1; if (x.s === k) mine[c] = (mine[c] || 0) + 1; });
  });
  return Object.keys(mine).map(function (c) {
    var mr = mine[c] / Math.max(1, st.pol), ar = corpusRate[c] / Math.max(1, corpusPol), v = ar ? mr / ar : 0;
    return { k: c, n: mine[c], value: +v.toFixed(2), display: dec(v, 1) + "×", label: BIA[c] ? BIA[c].en : c,
      tip: "<span class='k'>" + esc(BIA[c] ? BIA[c].en : c) + "</span>" + mine[c] + " başlıkta · bütün haberlerin ortalamasının " + dec(v, 1) + " katı" };
  }).sort(function (x, y) { return y.value - x.value; });
}
/* Loaded-language row for the outlet and its bloc's mean (null without 20 political headlines or without a placement). */
function kuDil(k) {
  var rows = orLangRows(), row = rows.filter(function (r) { return r.s === k; })[0], bl = row && orLangBlocs(rows)[bloc(k)];
  return row ? { row: row, bl: bl && SRC[k].lean != null ? bl.sum / bl.n : null } : null;
}
function kuFirst(k) {
  var o = (V5.leadLag || {}).outlets || {}, ll = o[k];
  if (!ll || ll.firstShare == null) return null;
  var xs = Object.keys(o).filter(function (s) { return o[s].firstShare != null; }).map(function (s) { return o[s].firstShare; });
  return { v: ll.firstShare, med: median5(xs) };
}
function kurumFindings7(s) {
  var evs = orEvents(), mine = evs.filter(function (e) { return e.s.indexOf(s) >= 0; }), L = [], blocks = "";
  if (!mine.length) return "";
  L.push(kuLink("secim", "secim-kapsama", "Olay kapsamı") + ": " + orN(evs.length) + " olayın " + orN(mine.length) + " tanesini verdi (" + orPc(mine.length / evs.length) + ").");
  var bs = evs.filter(function (e) { return e.bs; }), bsm = bs.filter(function (e) { return e.s.indexOf(s) >= 0; });
  if (bs.length) L.push(kuLink("secim", "secim-kor", "Kör nokta olayları") + ": tek taraflı kalan " + orN(bs.length) + " olayın " + orN(bsm.length) + " tanesinde yer aldı.");
  var r = bg7Rates()[s];
  if (r && r.cov >= 5) L.push(kuLink("dil", "dil-yz", "YZ incelemesi") + " " + yzBadge() + ": incelenen " + orN(r.cov) + " olayın " + orN(r.hit) +
    bg7loc(r.hit) + " başlığı YZ incelemesinde kanıt olarak alıntılandı (" + orPc(r.rate) + "). Alıntı bir yanlılık hükmü değildir.");
  var A = ADV && ADV.agenda, name = srcName(s);
  if (A && A.phi[s]) {
    var nb = A.order.filter(function (x) { return x !== s; }).sort(function (a, b) { return A.phi[s][b] - A.phi[s][a]; }).slice(0, 7);
    blocks += findingBlock({ id: "kurum-gundem", claim: "Haber yaptığı olaylar bu kurumunkilerle en çok örtüşen yedi kurum.",
      viz: g6Box("agenda", s, "Bu kurumun gündem komşuları ağı"),
      read: "Yakın ve kalın çizgili olanlar daha benzer; kesikli çizgi, benzerliğin tesadüften ayırt edilemeyecek kadar küçük olduğunu gösterir. " + kuLink("secim", "secim-gundem", "Bütün ağ"),
      table: vzTable(["Kurum", "Ortak olay", "Gündem benzerliği (φ)"], nb.map(function (x) { return [srcName(x), orShared(s, x), dec(A.phi[s][x], 2)]; })),
      how: "Benzerlik, iki kurumun aynı olayları ne ölçüde seçtiğine bakar; ayrıntı için " + kuLink("secim", "secim-gundem", "Örüntüler") + "." });
  }
  var dl = kuDil(s);
  if (dl) blocks += findingBlock({ id: "kurum-dil",
    claim: "Siyasi başlıklarda ortalama yüklü dil puanı " + dec(dl.row.mean, 1) + (dl.bl != null ? "; kendi bloğunun ortalaması " + dec(dl.bl, 1) : "") + " (" + orN(dl.row.n) + " başlık).",
    viz: fig("cdil", "bu kurum ve kendi bloğu · 0–100"),
    read: "Nokta bu kurum" + (dl.bl != null ? ", dikey çizgi kendi bloğunun ortalaması" : "") + ". " + kuLink("dil", "dil-yuklu", "Bütün kurumlarla yüklü dil →"),
    table: vzTable(["", "Ortalama", "Başlık"], [[name, dec(dl.row.mean, 1), orN(dl.row.n)]].concat(dl.bl != null ? [["Kendi bloğu", dec(dl.bl, 1), ""]] : [])) });
  var fp = kuFp(s).filter(function (x) { return x.value > 0; }), top = fp.filter(function (x) { return x.n >= 5; })[0];
  if (fp.length) blocks += findingBlock({ id: "kurum-parmak",
    claim: top && top.value >= 1.5 ? "En belirgin farkı <b>" + esc(kuName(top.k)) + "</b> yapısında: bu kurum ona bütün haberlerin ortalamasından " + dec(top.value, 1) + " kat sık başvuruyor." :
      "Hiçbir yapıya bütün haberlerin ortalamasından belirgin biçimde sık başvurmuyor.",
    viz: fig("cfp", "bu kurum ÷ bütün haberlerin ortalaması"),
    read: "Bir yapının oranı, bu kurumun siyasi başlıklarındaki görülme payının bütün kurumların payına bölünmesiyle bulunur. 1× ortalama demektir; 2×, o yapıya iki kat sık başvurulduğu. Sayı yerine oran kullanılır, çünkü çok haber veren kurum her şeyden daha çok tetikler.",
    table: vzTable(["Yapı", "Başlık", "Ortalamanın katı"], fp.map(function (x) { return [x.label, x.n, x.display]; })) });
  var fs = kuFirst(s);
  if (fs) blocks += findingBlock({ id: "kurum-ilk",
    claim: "Verdiği olayların " + orPcS(fs.v, "de") + " ilk o verdi.",
    viz: fig("cfirst", "ilk veren payı · bu kurum ve kurumların ortancası"),
    read: "Nokta bu kurum, dikey çizgi kurumların ortancası (" + orPc(fs.med) + "). " + kuLink("hiz", "hiz-ilk", "Bütün kurumlarla ilk veren payı →"),
    table: vzTable(["", "İlk veren payı"], [[name, orPc(fs.v)], ["Kurumların ortancası", orPc(fs.med)]]) });
  return '<div class="v7-kurum-lines">' + blocks + '<section class="sec v7-more"><h2>Diğer sayılar</h2><ul class="or-how">' +
    L.map(function (x) { return "<li" + (x.indexOf("yz-badge") >= 0 ? ' class="yz"' : "") + ">" + x + "</li>"; }).join("") + "</ul></section></div>";
}

/* v7 Kurumlar: one line per Örüntüler finding, each linking to the finding that holds the full chart. */
function kuLink(q, id, text) { return '<a class="lnk" href="#/oruntu?q=' + q + "&f=" + id + '">' + text + "</a>"; }
function kurumLines7(s) {
  var evs = orEvents(), mine = evs.filter(function (e) { return e.s.indexOf(s) >= 0; }), L = [];
  if (!mine.length) return "";
  L.push(kuLink("secim", "secim-kapsama", "Olay kapsamı") + ": " + orN(evs.length) + " olayın " + orN(mine.length) + " tanesini verdi (" + orP(mine.length / evs.length) + ").");
  var bs = evs.filter(function (e) { return e.bs; }), bsm = bs.filter(function (e) { return e.s.indexOf(s) >= 0; });
  if (bs.length) L.push(kuLink("secim", "secim-kor", "Kör nokta olayları") + ": tek taraflı kalan " + orN(bs.length) + " olayın " + orN(bsm.length) + " tanesinde yer aldı.");
  var row = orLangRows().filter(function (r) { return r.s === s; })[0], bl = row && orLangBlocs(orLangRows())[bloc(s)];
  if (row) L.push(kuLink("dil", "dil-yuklu", "Yüklü dil") + ": siyasi başlıklarda ortalama puan " + dec(row.mean, 1) +
    (bl ? "; kendi bloğunun ortalaması " + dec(bl.sum / bl.n, 1) : "") + " (" + orN(row.n) + " başlık).");
  var ll = ((V5.leadLag || {}).outlets || {})[s];
  if (ll && ll.firstShare != null) L.push(kuLink("hiz", "hiz-ilk", "İlk veren") + ": olayları ilk verme payı " + pc5(ll.firstShare) + ".");
  var r = bg7Rates()[s];
  if (r && r.cov >= 5) L.push(kuLink("dil", "dil-yz", "YZ incelemesi") + " " + yzBadge() + ": incelenen " + orN(r.cov) + " olayın " + orN(r.hit) +
    bg7loc(r.hit) + " başlığı YZ incelemesinde kanıt olarak alıntılandı (" + orP(r.rate) + "). Alıntı bir yanlılık hükmü değildir.");
  var A = ADV && ADV.agenda, ego = A && A.phi[s] ? '<section class="sec v7-ego" style="margin-top:18px"><h2>Gündem komşuları</h2>' +
    '<p class="sub">Olay seçimi bu kuruma en çok benzeyen yedi kurum. Çizgi kalınlığı benzerlik (φ); kesikli çizgi benzerliğin şanstan farksız olduğunu gösterir. ' +
    kuLink("secim", "secim-gundem", "Bütün ağ") + "</p>" + g6Box("agenda", s, "Bu kurumun gündem komşuları ağı") + "</section>" : "";
  return ego + '<section class="sec v7-kurum-lines" style="margin-top:18px"><h2>Bu kurumun sayıları</h2><ul class="or-how">' +
    L.map(function (x) { return "<li" + (x.indexOf("yz-badge") >= 0 ? ' class="yz"' : "") + ">" + x + "</li>"; }).join("") + "</ul></section>";
}

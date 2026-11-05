/* Homepage: what the site does, one live card per function. Each card states the function in one line
   and shows one number computed from this build's data. */
function pgHome7() {
  var m = D.meta.counts, lead = leadEvent();
  var coded = [], shares;
  NW.forEach(function (w) { if (w.k !== "v1") coded = coded.concat(w.keys.filter(narrOk)); });
  shares = dimShares(D.N, coded);
  var bs = D.E.filter(function (e) { return e.bs; }).length;
  var ps = D.E.map(function (e) { return e.p; }).sort(function (a, b) { return a - b; }), med = ps[Math.floor(ps.length / 2)] || 0;
  var LL = (D.V5 && D.V5.leadLag && D.V5.leadLag.outlets) || {};
  var first = Object.keys(LL).sort(function (a, b) { return LL[b].firstShare - LL[a].firstShare; })[0];
  var B = bg7(), nIlan = CM3.notices(D).total;
  var card = function (href, kick, title, line, fig, ai) {
    return '<a class="v7-hc' + (ai ? " yz" : "") + '" href="' + href + '"><span class="eyebrow">' + kick + (ai ? " " + yzBadge() : "") + "</span><b>" + title +
      "</b><span class=\"v7-hfig\">" + fig + "</span><span>" + line + "</span></a>";
  };
  var h = '<div class="wrap page v7-home"><div class="v7-htop"><div><p class="eyebrow">' + esc(WIN.range) + " · " + m.articles.toLocaleString("tr") + " başlık · " +
    D.E.length.toLocaleString("tr") + " olay · " + D.meta.sources.length + ' kurum</p><h1>Aynı olay, farklı manşet.</h1><p class="lede">' + esc(V7_PURPOSE) +
    " Hüküm vermez: yalnızca kimin neyi nasıl yazdığını yan yana koyar ve bu farkların tekrar edip etmediğini ölçer.</p>" +
    '<a class="xbtn" href="#/anlati">Anlatı haritasını aç →</a></div>';
  if (lead && defaultPair(lead)) h += '<div class="v7-hlead"><p class="eyebrow">Örnek · <a class="lnk" href="#/olay?e=' + lead.i + '">' + esc(storyLabel(lead, 90)) + "</a></p>" + splitCard(lead) + "</div>";
  h += "</div>";
  if (ADV && ADV.agenda) h += '<section class="v7-hnet"><div class="v7-hnet-t"><p class="eyebrow">Gündem ağı · ' + ADV.agenda.order.length + ' kurum</p><h2 class="v7-hh">Kim kiminle aynı olayları seçiyor?</h2>' +
    '<p class="lede">Birlikte çok olay haber yapan kurumlar birbirine çekilir. Renk kayıt defterindeki yerleşim, büyüklük verilen olay sayısı. Bir kuruma gelin, komşuları öne çıksın.</p>' +
    '<a class="lnk" href="#/oruntu?q=secim&f=secim-gundem">Bulgunun tamamı →</a></div>' + g6Box("agenda", "", "Kurumların gündem benzerliği ağı") + "</section>";
  h += '<h2 class="v7-hh">Neler yapabilirsiniz</h2><div class="v7-hgrid">' +
    card("#/anlati", "Anlatı haritası", "Aynı olay, hangi hikâye?", "Kurumların bir olayı hangi çerçeveye, hangi sorumluya, hangi çözüme bağladığını tek grafikte görün.",
      coded.length + " olay kodlandı") +
    card("#/olaylar", "Olaylar", "Başlıklar yan yana", "Her olayda bütün kurumların başlıkları, ayrışan sözcükler işaretli.", D.E.length.toLocaleString("tr") + " olay") +
    card("#/oruntu?q=secim", "Örüntü 1", "Kim neyi haber yapıyor?", "Yelpazenin bir yanının belirgin biçimde az verdiği olaylar ve gündem benzerliği.", bs + " kör nokta") +
    card("#/oruntu?q=dil", "Örüntü 2", "Nasıl anlatıyor?", "Aynı olayın başlıkları arasındaki yüklü dil farkı ve en sık çerçeveleme yapıları.", "ortanca aralık " + med + " puan") +
    card("#/oruntu?q=anlati", "Örüntü 3", "Kimi sorumlu tutuyor?", "Kodlanan olaylarda kurumların en çok hangi boyutta ayrıştığı.",
      "%" + Math.round(100 * (shares.blame || 0)) + " olayda sorumlu ayrışıyor") +
    card("#/oruntu?q=hiz", "Örüntü 4", "Kim önce veriyor?", "Olayı ilk veren kurumlar ve spotun başlıktan ne kadar farklı olduğu.",
      first ? esc(srcName(first)) + " %" + Math.round(100 * LL[first].firstShare) + " ilk" : "—") +
    card("#/kurumlar", "Kurumlar", "Kurum profilleri", "Her kurumun örüntülerdeki yeri; iki kurumu karşılaştırın.", D.meta.sources.length + " kurum") +
    (B ? card("#/yontem?s=yz", "Bilişsel inceleme", "Yapay zekâ ne fark etti?", "En çok kurumun verdiği olaylarda başlıklardaki bilişsel örüntüler, kanıt alıntılarıyla ve neden kesin olmadığıyla.",
      B.summary.completed + " olay incelendi", true) : "") +
    card("#/ilan", "Resmî ilan bul", "İlanınızı arayın", "Mahkeme, icra ve kamu ilanlarını sözcük, tür, tarih ve gazeteye göre bulun.", nIlan.toLocaleString("tr") + " ilan") +
    card("#/yontem?s=turkiye", "Yöntem", "Türkiye için nasıl ayarlandı", "Türkçe ekler, resmî ilanlar, sağa ağırlıklı kurum dağılımı ve diğer uyarlamalar.", "10 uyarlama") +
    "</div></div>";
  return h;
}

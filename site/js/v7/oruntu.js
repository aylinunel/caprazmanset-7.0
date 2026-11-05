/* v7 Örüntüler: stub until Task 7. */
function pgOruntu(q) {
  var T = { secim: "Kim neyi haber yapıyor", dil: "Nasıl anlatıyor", anlati: "Kimi sorumlu tutuyor", hiz: "Kim önce veriyor" };
  var k = T[q && q.q] ? q.q : "secim";
  return '<div class="wrap page"><div class="phead"><h1>' + T[k] + '</h1><p class="lede">Hazırlanıyor.</p></div></div>';
}

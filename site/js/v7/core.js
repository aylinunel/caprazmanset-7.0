/* v7 core: navigation, YZ marker and the finding block (inlined into app.js IIFE after logic.js). */

/* Navigation: five sections; Bulgular and Çerçeveleme fold into Örüntüler/Yöntem via redirectRoute. */
NAV = [["/anlati", "Anlatı haritası", []], ["/olaylar", "Olaylar", ["/olay", "/konu"]], ["/oruntu", "Örüntüler", []],
  ["/kurumlar", "Kurumlar", ["/kurum"]], ["/yontem", "Nasıl çalışır", []]];
SUB["/oruntu"] = [["/oruntu", "secim", "Kim neyi haber yapıyor"], ["/oruntu", "dil", "Nasıl anlatıyor"],
  ["/oruntu", "anlati", "Kimi sorumlu tutuyor"], ["/oruntu", "hiz", "Kim önce veriyor"]];
SECTIONS[0].fn = pgHome7;
SECTIONS.forEach(function (s) { if (s.p === "/anlati") s.fn = pgAnlati; });
SECTIONS.push({ p: "/oruntu", label: "Örüntüler", fn: pgOruntu });
DETAIL["/oruntu"] = { fn: pgOruntu, of: "/oruntu" };

function yzBadge() { return '<span class="yz-badge" title="Yapay zekâ ile üretildi · Yöntem › YZ">YZ</span>'; }

function yzBlock(innerHtml, title) {
  return '<section class="yz">' + (title ? "<h3>" + esc(title) + " " + yzBadge() + "</h3>" : "") + innerHtml + "</section>";
}

/* One finding: claim, picture, what it means, how it was measured. `viz`, `means`, `how` are html. */
function findingBlock(f) {
  return '<section class="v7-find" id="' + esc(f.id || "") + '"><p class="v7-claim">' + f.claim + "</p>" +
    '<div class="v7-viz">' + (f.viz || "") + "</div>" +
    '<p class="v7-means"><b>Bu ne anlama geliyor.</b> ' + (f.means || "") + "</p>" +
    '<details class="v7-how"><summary>Nasıl ölçtük</summary>' + (f.how || "") + "</details></section>";
}

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

/* One finding: claim, picture, how to read it, why it matters, how it was measured.
   f = {id, claim, viz, read, means, example (event id|null), how, table}; all html except example. Missing parts are omitted. */
function findingBlock(f) {
  var why = f.means || f.example ? '<details class="v7-why"><summary>Neden önemli?</summary>' + (f.means ? '<p class="v7-means">' + glossTerms(f.means) + "</p>" : "") +
    (f.example ? '<p><a href="#/olay?e=' + encodeURIComponent(f.example) + '">Bir örnek olay →</a></p>' : "") + "</details>" : "";
  var tbl = f.table ? '<details class="v7-tbl"><summary>Tabloyu göster</summary>' + f.table + "</details>" : "";
  return '<section class="v7-find" id="' + esc(f.id || "") + '"><p class="v7-claim">' + glossTerms(f.claim || "") + "</p>" +
    '<div class="v7-viz">' + (f.viz || "") + "</div>" + (f.read ? '<p class="v7-read">' + f.read + "</p>" : "") + why +
    (f.how || tbl ? '<details class="v7-how"><summary>Nasıl ölçtük?</summary>' + (f.how || "") + tbl + "</details>" : "") + "</section>";
}

/* Glossary popover: click/focus on .gl shows the definition right after the term in the DOM (so Tab reaches "Sözlük →");
   Esc, a click elsewhere, focus leaving both, or navigation closes it. */
function glClose() { var p = document.querySelector(".gl-pop"); if (p) p.parentNode.removeChild(p); }
function glOpen(b) {
  var cur = document.querySelector(".gl-pop"); if (cur && cur.previousSibling === b) return;
  glClose(); var t = b.getAttribute("data-gl"), d = GLOSSARY[t]; if (!d) return;
  var p = document.createElement("span"); p.className = "gl-pop"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", t); p.tabIndex = -1;
  p.innerHTML = "<b>" + esc(t) + "</b> " + esc(d) + ' <a href="#/yontem?s=sozluk">Sözlük →</a>';
  b.parentNode.insertBefore(p, b.nextSibling);
  var r = b.getBoundingClientRect(), w = p.offsetWidth, o = (p.offsetParent || document.documentElement).getBoundingClientRect();
  p.style.left = (Math.max(8, Math.min(innerWidth - w - 8, r.left)) - o.left) + "px"; p.style.top = (r.bottom - o.top + 6) + "px";
}
document.addEventListener("click", function (ev) {
  var b = ev.target.closest && ev.target.closest(".gl");
  if (b) { glOpen(b); return; }
  if (!(ev.target.closest && ev.target.closest(".gl-pop"))) glClose();
});
var glMute = false;
document.addEventListener("focusin", function (ev) { var b = ev.target.closest && ev.target.closest(".gl"); if (b && !glMute) glOpen(b); });
document.addEventListener("focusout", function (ev) {
  var n = ev.relatedTarget;
  if (n && n.closest && !n.closest(".gl") && !n.closest(".gl-pop")) glClose();
});
window.addEventListener("hashchange", glClose);
document.addEventListener("keydown", function (ev) {
  if (ev.key !== "Escape") return;
  var p = document.querySelector(".gl-pop"), inside = p && p.contains(document.activeElement), b = p && p.previousSibling;
  glClose(); if (inside && b && b.focus) { glMute = true; b.focus(); glMute = false; }
});

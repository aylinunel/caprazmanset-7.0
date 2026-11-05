/* v7 Yöntem: the method paper under ten anchors, the Türkiye bağlamı blocks and the concept library
   (inlined into app.js's IIFE after oruntu.js and kurum.js). Every number below is read from the data or the code. */

var YM_TOC = [["veri", "Veri"], ["olay", "Olay tespiti"], ["dil", "Yüklü dil"], ["anlati", "Anlatı kodlaması"], ["yz", "Bilişsel inceleme (YZ)"],
  ["yzicerik", "YZ ile üretilen içerik"], ["turkiye", "Türkiye bağlamı"], ["kavramlar", "Kavram kütüphanesi"], ["sozluk", "Sözlük"], ["kapsama", "Kapsama"], ["sinir", "Sınırlılıklar"], ["kaynak", "Kaynaklar"]];
function glossaryHTML() {
  return "<dl class=\"v7-gloss\">" + Object.keys(GLOSSARY).sort(trCmp).map(function (k) { return "<dt>" + esc(k) + "</dt><dd>" + esc(GLOSSARY[k]) + "</dd>"; }).join("") + "</dl>";
}
var YM_TIER = { detected: "Kural saptıyor", codable: "İnsan kodlaması", reference: "Okur davranışı" };

/* Events where the AI picked this concept, minus the ones whose finding the editor rejected. */
function yzSelMap() {
  var B = bg7(), m = {}; if (!B) return m;
  B.events.forEach(function (x) {
    if (x.status !== "review_complete") return;
    var live = (x.supported || []).concat(x.uncertain || []), seen = {};
    (x.selected || []).forEach(function (id) {
      var k = bg7k(id); if (seen[k]) return; seen[k] = 1;
      var f = live.filter(function (g) { return bg7k(g.id) === k; })[0], r = f && rev7(x.event + "__" + f.id);
      if (!(r && r.status === "rejected")) m[k] = (m[k] || 0) + 1;
    });
  });
  return m;
}
function yzSel(k) { return yzSelMap()[k] || 0; }

/* ---- Türkiye bağlamı: one block per adaptation, each Sorun / Ne yaptık / Sınır ---- */
function trBlock(id, title, sorun, yaptik, sinir) {
  return '<div class="v7-tr-block" id="tr-' + id + '"><h3>' + title + "</h3><dl>" +
    "<dt>Sorun</dt><dd>" + sorun + "</dd><dt>Ne yaptık</dt><dd>" + yaptik + "</dd><dt>Sınır</dt><dd>" + sinir + "</dd></dl></div>";
}
function trN(n) { return (+n).toLocaleString("tr"); }
function trQ(s) { return "“" + esc(s) + "”"; }

function turkiyeBlocks() {
  var P = D.meta.params || {}, C = D.CL, act = V2.active || {}, NP = CM3.PARAMS, N = CM3.notices(D), S = bg7() && bg7().summary, M = D.BGS;
  var pc = function (x) { return "%" + Math.round(100 * x); };
  var calc = function (cap) { return C && C.cases.filter(function (c) { return c.capability === cap; })[0]; };
  var verdict = function (c) { return !c ? "bu kontrol listesinde yok" : c.verdict === "FAIL" ? "başarısız" : c.kind === "trivial" ? "boş geçiş (ilgili kural yok, test hiçbir şey kanıtlamıyor)" : "geçti"; };
  var CAP = { evaluative_language: "değerlendirici dil", quotation_scope: "alıntı kapsamı", causality: "nedensellik", speaker_attribution: "konuşmacıya atıf",
    literal_reporting: "yalın aktarım", publisher_identity: "yayıncı kimliği", turkish_negation: "olumsuzlama", modality: "kiplik", sentence_order: "cümle sırası",
    untrusted_text: "güvenilmeyen metin", concept_boundary: "kavram sınırı", reported_opinion: "aktarılan görüş" };
  var fails = C ? C.cases.filter(function (c) { return c.verdict === "FAIL"; }) : [];
  var out = [];

  /* 1 · case folding */
  var low1 = "IŞIK".toLowerCase(), low2 = trLow("IŞIK");
  out.push(trBlock("buyukkucuk", "Büyük–küçük harf: İ ile ı",
    "Türkçede noktalı İ/i ile noktasız I/ı ayrı harflerdir. Varsayılan küçük harfe çevirme “I” harfini “i” yapar, “İ” harfini ise iki karakterli bir diziye (“i” ve üstünde ayrı bir nokta) dönüştürür. Büyük harfle yazılmış başlıklarda (“IŞIK”, “İSTANBUL”) sözcük listesiyle eşleşme sessizce bozulur.",
    "Puanlayıcı, karşılaştırma kartı ve resmî ilan kuralı küçük harfe çevirmeyi Türkçe yerel ayarla yapar (<span class=\"mono\">toLocaleLowerCase(“tr”)</span>: İ → i, I → ı). Örnek: “IŞIK” varsayılan çeviriyle " + trQ(low1) + ", Türkçe çeviriyle " + trQ(low2) +
    ". Arama kutuları ayrıca ç, ş, ğ, ö, ü ve ı harflerini sadeleştirir; böylece “cumhurbaskani” araması “Cumhurbaşkanı” yazan başlığı bulur.",
    "Sadeleştirme farklı sözcükleri birleştirir: " + trQ("sık") + " ile " + trQ("şık") + " aynı biçime (" + trQ(trFold("sık")) + ") iner. Sözcük listeleri aksanlı yazılmıştır; ASCII yazılmış bir başlık (“cumhurbaskani”) listedeki sözcükle eşleşmez."));

  /* 2 · suffixes */
  var st = function (w) { var t = htoks(w)[0]; return t ? t.stem : ""; };
  var hA = st("hükümetin"), hB = st("hükümete");
  out.push(trBlock("ek", "Ekler: aynı sözcüğün farklı biçimleri",
    "Türkçe sondan eklemelidir: “İspanya’da”, “İspanya’nın” ve “İspanya’ya” tek sözcüğün hâl biçimleridir. Başlıkları sözcük sözcük karşılaştıran bir araç bu ek farklarını çerçeveleme farkı sanar.",
    "Başlıklar sözcüklere ayrılır, kesme işaretinden sonrası atılır ve küçük harfe çevrilir; sonra kökler karşılaştırılır. Kök için ek kesici (<span class=\"mono\">CM3.stemTR</span>) kullanılır: en çok " + NP.maxStripLayers + " ek katmanı, geriye en az " + NP.minStem +
    " harf kalmalı. Ek kesici kapalıyken ilk beş harf alınır. Örnekler: " + trQ("İspanya’da") + " → " + trQ(st("İspanya’da")) + ", " + trQ("İspanya’nın") + " → " + trQ(st("İspanya’nın")) + ", " + trQ("seçimlerinde") + " → " + trQ(st("seçimlerinde")) +
    ". Böylece split kartın “farklı sözcükler” listesine yalnızca hâl eki farkından doğan sözcükler girmez.",
    "Ek kesici sözlüksüz ve kural tabanlıdır. " + (hA !== hB ? trQ("hükümetin") + " → " + trQ(hA) + " ama " + trQ("hükümete") + " → " + trQ(hB) + ": aynı sözcüğün iki biçimi farklı köke inebiliyor. " : "") +
    "Yapım ekleri (-lı, -sız) kesilmez; kesme işareti yalnızca özel adlarda bulunduğundan ek farkı olan öbür sözcükler yalnızca kural ile eşleşir."));

  /* 3 · stop words */
  var nStop = Object.keys(TRSTOP).length;
  out.push(trBlock("durak", "Durak sözcükler: “son dakika”, “flaş”",
    "Türk haber başlıkları " + trQ("SON DAKİKA") + ", " + trQ("FLAŞ") + ", " + trQ("İŞTE") + " gibi her kurumda aynı biçimde dönen kalıplarla açılır. Bunlar sözcük ortaklığı sayılırsa iki başlık olduğundan daha benzer görünür; ortak olmayan sayılırsa olmayan bir fark uydurulur.",
    "Karşılaştırma kartı, " + nStop + " sözcüklük bir durak listesini (örneğin " + ["son", "dakika", "flaş", "işte", "canlı", "izle", "video"].map(trQ).join(", ") + ") ve üç harften kısa sözcükleri “ortak” ve “farklı” listelerinin dışında tutar. Başlık kısaltılmaz, sözcük silinmez; yalnızca karşılaştırmaya girmez.",
    "Liste elle yazılmıştır ve doğrulanmamıştır. " + trQ("son") + ", " + trQ("ilk") + ", " + trQ("büyük") + " ve " + trQ("yeni") + " gibi sözcükler gerçek içerik de taşıyabilir (“son seçim”); onlar da karşılaştırmadan düşer. Yüklü dil puanlayıcısı bu listeyi kullanmaz."));

  /* 4 · negation and modality */
  var cn = calc("turkish_negation"), cm = calc("modality");
  out.push(trBlock("olumsuz", "Olumsuzlama ve kiplik",
    "Türkçede olumsuzluk ek olarak gelir (“yapmadı”, “değil”, “yok”) ve ihtimal ya da iddia fiilin içinde taşınır (“olabilir”, “iddia edildi”). Sözcük listesi eşleştiren bir puanlayıcı ikisini de göremez: “tehlike yok” ile “tehlike var” aynı sözcüğü içerir.",
    C ? "Bunu çözmedik, ölçtük. " + C.total + " vakalık Türkçe davranış kontrol listesi (kaynak: " + esc(C.source) + "; sentetik, uzman incelemesinden geçmemiş) sitenin güncel puanlayıcısıyla (" + esc(C.engine) + ") " + esc(String(C.ran).slice(0, 10)) +
      " tarihinde çalıştırıldı: " + C.real + " gerçek geçiş, " + C.trivial + " boş geçiş, " + C.fail + " başarısız." : "Kontrol listesi bu yapıda yok.",
    C ? "Olumsuzlama vakası: " + verdict(cn) + ". Kiplik vakası: " + verdict(cm) + ". Bu geçişler puanlayıcının olumsuzluğu ya da kipi okuduğunu değil, ilgili bir kuralın bulunmadığını gösterir. Başarısız vakalar: " +
      (fails.length ? fails.map(function (c) { return CAP[c.capability] || c.capability; }).join(", ") : "yok") + ". Bu bir doğruluk ölçüsü değildir; gerçek başlıklarda kaç saptamanın doğru olduğunu söylemez." : ""));

  /* 5 · quote vs own voice */
  var voice = RULEDEF.filter(function (r) { return r[2]; }).length, cq = calc("quotation_scope"), cs = calc("speaker_attribution");
  out.push(trBlock("alinti", "Alıntı ve kurumun kendi sesi",
    "Bir sıfat başlıkta tırnak içindeyse kurumun değil konuşanın sözüdür (“‘haydut’ dedi”). Sözcük eşleşmesi tırnağı görmezse kurum, aktardığı sözü benimsemiş gibi puanlanır.",
    "Puanlayıcıda " + RULEDEF.length + " kuraldan " + voice + " tanesi (kurumun kendi sesiyle sıfat atama, kalıcı niteleme) yalnızca tırnak dışındaki metne bakar: tırnaklı aralıklar (en çok 60 karakter) silinir. Türkçede kesme işareti ek ayırdığı için (“Suriye’nin”) desen yalnızca sözcük başında açılan, boşluk ya da noktalamayla kapanan aralıkları tırnak sayar.",
    "Kalan " + (RULEDEF.length - voice) + " kural bütün başlığa bakar: tırnak içindeki “felaket” ya da “savaş” hâlâ puan getirir. 60 karakterden uzun alıntılar ve tırnaksız dolaylı anlatım (“… olduğunu söyledi”) silinmez. Kontrol listesinde alıntı kapsamı vakası " +
      verdict(cq).replace(/ \(.*$/, "") + ", konuşmacıya atıf vakası " + verdict(cs).replace(/ \(.*$/, "") + "."));

  /* 6 · official notices */
  var nIl = Object.keys(N.events).filter(function (i) { return N.events[i].isIlan; }).length, kw = NP.noticeRules.keywords;
  out.push(trBlock("ilan", "Resmî ilanlar ve haber",
    "Türk gazeteleri mahkeme, icra ve ihale ilanlarını haber sayfalarıyla aynı site haritasında, çoğunlukla büyük harfli başlıklarla yayımlar. Olay kümelemesine girerlerse aynı ilanı veren kurumlar “aynı olayı haber yapmış” görünür.",
    "Bir başlık iki kuraldan biriyle ilan sayılır: adresinde ilan yolu (<span class=\"mono\">/resmi-ilan/</span>, <span class=\"mono\">/ilan/</span>) bulunur ya da büyük harfle yazılmıştır ve " + kw.length + " kurum sözcüğünden birini içerir (" + kw.slice(0, 3).map(trQ).join(", ") + "…). " +
    trN(N.total) + " başlık (" + pc(N.total / D.meta.counts.articles) + ") ilan sayıldı; " + trN(N.rules.url) + " tanesi adres, " + trN(N.rules.keyword) + " tanesi sözcük kuralına uyuyor (kurallar örtüşür). Başlıkların en az " + pc(NP.ilanEventShare) + "’i ilan olan " + nIl +
    " küme “ilan olayı” sayıldı: Örüntüler’e girmez, <a class=\"lnk\" href=\"#/olaylar?t=ilan\">Resmî ilanlar</a> sayfasında aranabilir.",
    "Kural 27 Ekim 2026’da, ilk sürümün haber adresleri içindeki “ilanlar” sözcüğünü de yakaladığı görüldükten sonra sıkılaştırıldı ve gömülü başlıklarda elle denetlendi; kesinlik oranı ölçülmüş bir değer olarak yayımlanmıyor. Sözcük kuralı yalnızca büyük harfli başlıkları görür: normal harfle yazılmış, ilan yolu olmayan bir ilan haber sayılır; kurum sözcüğü taşıyan büyük harfli bir haber başlığı ilan sayılabilir."));

  /* 7 · right-heavy set */
  var bs = D.E.filter(function (e) { return e.bs; }), bsl = bs.filter(function (e) { return e.bs === "left"; }).length;
  var raw = D.E.filter(function (e) { var c = evCoverage(e); return e.s.length >= 4 && (!c.left || !c.right); }).length;
  out.push(trBlock("sag", "Sağa yatık kurum kümesi",
    "Veri alınabilen etkin kurumların " + act.right + " tanesi sağ, " + act.mid + " tanesi merkez, " + act.left + " tanesi sol yerleşimli. Bir olayda “solda hiç kurum yok” görmek bu dengesizlikle de açıklanabilir; ham sayım sistematik olarak solu eksik gösterir. Ham ölçüt " + raw + " olayı işaretler.",
    "Her tarafın kendi etkin kurumlarının olayı verme oranı hesaplanır, paylar bu oranlardan alınır (taraf normalleştirmesi). Ground News kuralının eşikleri korunur: kör nokta sayılan tarafın kaynak sayısı " + P.bs_max_side_outlets + "’dan az, öbür tarafların payı en az " + pc(P.bs_min_other_share) +
    ". Üstüne, eksikliğin şansla açıklanamadığını gösteren binom testi gelir: p &lt; " + dec(P.bs_binom_p, 2) + ". Kurum, dönemin en az " + pc(P.active_day_share) + "’ini kapsıyorsa etkindir. Sonuç: " + bs.length + " kör nokta (" + bsl + " solun, " + (bs.length - bsl) + " sağın).",
    "Solda yalnızca " + act.left + " etkin kurum var; bu az sayıyla test gücü düşüktür ve solun gerçek eksikliklerinin bir kısmı eşiğe takılmayabilir. Yerleşimler sağlanmış veridir (aşağıya bakın). Etkin sayılmayan kurumlar (arşivine ulaşılamayan " + (V2.missing || []).length + " kurum dahil) karşılaştırmalara girmez."));

  /* 8 · supplied placements and ownership */
  var withLean = D.S.filter(function (s) { return s.lean != null; }).length, withOwn = D.S.filter(function (s) { return s.own && s.own.grp; }).length;
  var groups = CM3.ownerGroups(D), g0 = groups[0], unsrc = groups.filter(function (g) { return !g.source; }).length;
  out.push(trBlock("yerlesim", "Sağlanan yerleşim ve sahiplik",
    "Türkiye’de kurumların siyasi yerleşimini ve sahipliğini ölçen, tek bir bağımsız ve güncel kaynak yoktur. Bir yayının sahibinin başka alanlarda da faaliyeti olabilir; sahiplik notu bu yüzden bir yargı değil, bir bağlamdır.",
    "Yerleşim (0 sol – 100 sağ) ve sahiplik notları projeye sağlanmış veridir; bizim hesabımız değildir ve her yerde böyle anılır. " + P.bloc_left_below + " altı sol, " + P.bloc_right_above + " üstü sağ, arası merkez sayılır. Sahiplik notu kurum sayfasında olduğu gibi gösterilir." +
    (g0 ? " Birden çok kurumu olan " + groups.length + " sahip grubu var (ör. " + esc(g0.label) + ": " + g0.members.map(function (s) { return esc(srcName(s)); }).join(", ") + ")." : ""),
    "Doğrulanmadı. " + D.S.length + " kurumdan " + withLean + " tanesinin yerleşimi, " + withOwn + " tanesinin sahiplik notu var; yerleşime dayanan her bulgu bu varsayıma bağlıdır. Sahip gruplarının " + unsrc + " / " + groups.length + " tanesi için kaynak gösterilmemiştir."));

  /* 9 · 48-hour window */
  var hrs = D.E.map(function (e) { return (Date.parse(e.l + "Z") - Date.parse(e.f + "Z")) / 36e5; }).filter(function (x) { return x === x; });
  var over = hrs.filter(function (x) { return x > P.cluster_window_hours; }).length, mx = Math.round(Math.max.apply(null, hrs));
  out.push(trBlock("pencere", P.cluster_window_hours + " saatlik pencere",
    "Aynı konu haftalarca gündemde kalabilir (faiz kararı, deprem, seçim). Zaman sınırı olmazsa benzer başlıklar farklı günlerin farklı olaylarını tek kümede zincirler. Site haritaları yayın saatini verdiği için sınır RSS’e ihtiyaç duymadan uygulanabilir.",
    "Yalnızca birbirinden en çok " + P.cluster_window_hours + " saat arayla yayımlanmış başlıklar arasında bağ kurulur (kosinüs ≥ " + dec(P.cluster_threshold, 2) + "). İki küme ancak olası çiftlerin %" + Math.round(100 * P.cluster_merge_link_share) + "’i bağlıysa birleşir, küme " + P.cluster_max_size +
    " başlığı geçmez, olay için en az " + P.event_min_outlets + " kurum gerekir. Gün sınırları Türkiye saatine (UTC+3) göredir. Hız ölçüsü (kim önce veriyor) aynı " + P.leadlag_horizon_hours + " saatlik ufukla sınırlıdır.",
    P.cluster_window_hours + " saat bir çift sınırıdır, olayın toplam süresi değil: " + trN(D.E.length) + " olayın " + trN(over) + " tanesinde ilk ve son başlık arası " + P.cluster_window_hours + " saati aşıyor (en uzunu " + mx +
    " saat). Yavaş gelişen bir haber birkaç olaya bölünebilir ya da zincirlenebilir; kümeler editoryal olarak doğrulanmamıştır."));

  /* 10 · AI review on Turkish input */
  out.push(trBlock("yz", "Türkçe girdide yapay zekâ incelemesi",
    "BiasGuard’ın kavram kataloğu İngilizcedir ve karar verme bağlamı için yazılmıştır (" + (D.BR.filter(function (b) { return b.no != null; }).length) + " kavram); girdimiz ise Türkçe haber başlığıdır. Kavram adları, tanımlar ve örnekler Türkçe haberin kalıplarına doğrudan oturmaz.",
    "Model Türkçe başlıkları ve bağlam alanını okur, katalogdan en çok altı kavram seçer ve her koşul için başlıktan birebir Türkçe alıntı verir; motor alıntının metinde geçtiğini kodla denetler" +
    (S ? " (" + trN(S.quotesVerified) + " alıntı doğrulandı, " + trN(S.rejectedQuotes) + " alıntı reddedildi)" : "") + ". Açıklamalar Türkçe yazılır. Kavram adları İngilizce kalır; Türkçe karşılıkları ve tanımlar <a class=\"lnk\" href=\"#/yontem?s=kavramlar\">Kavram kütüphanesi</a>’ndedir ve projenin aktarımıdır.",
    "Türkçe için doğrulama kümesi yoktur." + (M ? " Aracın kendi sınaması haber başlıklarıyla değil, bu siteden bağımsız " + M.cases + " kurgusal karar senaryosuyla yapıldı (" + M.primaryCompleted + " tanesi tamamlandı)." : "") +
    " Alıntı denetimi alıntının yerini kanıtlar, anlamını değil; iki inceleyici aynı temel modeldir. Hiçbir sonuç, kavramın olayda bulunduğunu söylemez."));
  return out.join("");
}

/* ---- concept library ---- */
function conceptLibrary() {
  var T = {}; D.BR.forEach(function (b) { T[b.tier] = (T[b.tier] || 0) + 1; });
  var sel = yzSelMap(), nCat = D.BR.filter(function (b) { return b.no != null; }).length, nLit = D.BR.filter(function (b) { return b.inOntology === false; }).length;
  var chips = [["all", "Tümü (" + D.BR.length + ")"]].concat(["detected", "codable", "reference"].map(function (t) { return [t, YM_TIER[t] + " (" + (T[t] || 0) + ")"]; }));
  return "<p>Sitenin tanıdığı " + D.BR.length + " kavramın tamamı: " + nCat + " bilişsel yanlılık kavramı The Decision Lab’den başka sözcüklerle aktarılmış ve işlevselleştirilmiştir (bağımsız doğrulanmamıştır), " + nLit +
    " kayıt medya yanlılığı yazınından gelir. Bir kavramın listede olması, sitede saptandığı anlamına gelmez: " + (T.detected || 0) + " kavramı kural tabanlı puanlayıcı saptayabilir, " + (T.codable || 0) + " tanesi tek bir başlıktan karara bağlanamaz ve " + (T.reference || 0) +
    " tanesi okurun davranışını anlatır, bir haberin özelliği değildir. Bir karta tıklayınca kavramın ayrıntısı açılır.</p>" +
    '<div class="v7-cl-ctl"><input type="search" id="cq" placeholder="Kavram ara…" aria-label="Kavram ara" autocomplete="off">' +
    '<span class="v7-cl-chips">' + chips.map(function (c) { return '<button type="button" class="chip" data-tier="' + c[0] + '" aria-pressed="' + (c[0] === "all") + '">' + esc(c[1]) + "</button>"; }).join("") + "</span></div>" +
    '<p class="xsmall" id="cn" aria-live="polite">' + D.BR.length + " kavram gösteriliyor</p>" +
    '<div class="v7-cl" id="clist">' + D.BR.map(function (b) {
      var n = sel[b.k];
      return '<article class="v7-concept" data-bias7="' + esc(b.k) + '" data-k="' + esc(b.k) + '" data-tier="' + esc(b.tier) + '" data-f="' + esc(trFold([b.en, b.tr, b.df, b.cat].join(" "))) + '">' +
        '<h3><button type="button" class="v7-cb">' + esc(b.en) + "</button></h3>" +
        '<p class="v7-ctr">' + esc(b.tr || "") + ' <span class="tier-b ' + esc(b.tier) + '">' + esc(YM_TIER[b.tier] || b.tier) + "</span></p>" +
        '<p class="v7-cdf">' + esc(b.df || "") + "</p>" +
        (n ? '<p class="yz-line">' + yzBadge() + " YZ incelemesinde " + n + " olayda seçildi</p>" : "") + "</article>";
    }).join("") + "</div>" +
    '<p class="v7-cl-empty" id="cempty" hidden>Eşleşen kavram yok.</p>';
}

/* ---- YZ sections ---- */
function yzMethodHtml() {
  var B = bg7(), S = B && B.summary, M = D.BGS;
  return "<p>Bu bölüm yalnızca BiasGuard adlı bilişsel yanlılık inceleme algoritmasını anlatır. Yüklü dil puanlayıcısı (<a class=\"lnk\" href=\"#/yontem?s=dil\">Yüklü dil</a>) ondan ayrı, kural tabanlı ve deterministik bir araçtır. " +
    "BiasGuard’ın bütün çıktısı yapay zekâ tarafından üretilir; kodla denetlenen tek şey alıntıların metinde geçip geçmediğidir.</p>" +
    "<h3>Sitede nerede kullanılır</h3><ul>" +
    "<li><b>Olay sayfası:</b> incelenen olayda “Bilişsel inceleme” bloğu; her kavram için iki cümle ve başlıklardan alıntılar.</li>" +
    "<li><b>Örüntüler › Nasıl anlatıyor:</b> hangi blokların başlıklarının alıntılandığı.</li>" +
    "<li><b>Kurum sayfaları:</b> kurumun başlığının kaç incelenen olayda alıntılandığı.</li>" +
    "<li><b>Anlatı:</b> yapay zekâ ile kodlanan haftalar “YZ” etiketiyle gösterilir.</li>" +
    "<li><b>Kavram kütüphanesi:</b> her kavramın kaç olayda seçildiği.</li></ul>" +
    "<h3>Girdi</h3><p>Her olay tek bir inceleme birimidir. Metin alanı, olayı veren her kurumun olaydaki ilk başlığını ve spotunu (en çok 280 karakter) yayın saatiyle birlikte içerir; bağlam alanı olayın tarihini, kurumların sağlanan yerleşimlerini ve olayı vermeyen etkin kurumları içerir. " +
    (S ? "İnceleme, en çok kurumun verdiği " + S.planned + " olayla sınırlıdır; diğer olaylar incelenmemiştir." : "Bu yapıda inceleme verisi yok.") + "</p>" +
    "<h3>Adımlar</h3><ol><li><b>Seçim:</b> bir yapay zekâ seçici, 116 kavramlık katalogdan olayla ilgili olabilecek en çok altı kavramı seçer; sözcüksel bir taban eklenir.</li>" +
    "<li><b>İki inceleme:</b> savunan ve sorgulayan iki yapay zekâ inceleyici, birbirinin çıktısını görmeden, her kavramın zorunlu koşullarını tek tek değerlendirir ve metinden birebir alıntı verir.</li>" +
    "<li><b>Denetim (yapay zekâ değil, kod):</b> motor her alıntının metinde birebir geçtiğini, en az sekiz karakter olduğunu ve her karşılanan koşulun geçerli bir alıntıya dayandığını denetler; dayanmayan karar düşürülür. Davranışsal kanıt isteyen kavramlar karşılaştırmalı bir gözlem ister.</li>" +
    "<li><b>Birleştirme:</b> iki inceleyici de kavramı dışlıyorsa kavram gösterilmez; en az biri koşulları metinde görüyorsa ya da kararsızsa kavram o olayda dikkat çeken olarak işaretlenir.</li></ol>" +
    "<h3>Herkese açık metin</h3><p>Her kavram için sitede görünen metin iki cümledir: <b>Ne fark etti</b> ve <b>Neden kesin değil</b>. Bu iki cümle, savunan ve sorgulayan inceleyicinin uzun metinlerinden bir yapay zekâ geçişiyle bir kez üretilir ve veri paketinde saklanır. Uzun inceleyici metinleri yalnızca Yönetim’de görünür." +
    (S ? " Bu yapıda " + trN(S.completed) + " olay incelendi; " + trN(S.supported + S.uncertain) + " kavram–olay eşleşmesi dikkat çekti, " + trN(S.quotesVerified) + " alıntı doğrulandı, " + trN(S.rejectedQuotes) + " alıntı reddedildi." : "") + "</p>" +
    "<h3>Editör incelemesi</h3><p>Site sahibi, Yönetim › Bilişsel inceleme ekranında her yapay zekâ sonucunu reddedebilir ya da kısa bir düzeltme notu yazabilir. Sonuç, reddedilene ya da düzeltilene kadar “YZ” etiketiyle yayında kalır; reddedilen sonuç sayfalardan ve sayımlardan çıkar, düzeltilen sonucun yanında düzeltme notu görünür. Yapay zekâ çıktısının hiçbiri baştan insan tarafından onaylanmaz.</p>" +
    "<h3>Sınırlılıklar</h3><p>Aynı temel modelin iki inceleyicisi istatistiksel olarak bağımsız değildir. Alıntı denetimi alıntının yerini kanıtlar, kavramın anlamca doğru olduğunu kanıtlamaz. Katalog karar süreçleri için yazılmıştır; haber başlıklarına uygulanması bu sürümün bir varsayımıdır. " +
    (M ? "Aracın kendi sınamasında " + M.cases + " senaryonun " + M.primaryCompleted + "’ü tamamlanmış, tamamlananlarda beklenen " + M.recall.of + " etiketin " + M.recall.captured + "’ü yakalanmıştır; etiketler insan doğrulamasından geçmemiştir." : "") + "</p>";
}
function yzIcerikHtml() {
  var ag = NW.filter(function (w) { return w.coded === "agent"; }).map(function (w) { return w.l; }), nCat = D.BR.filter(function (b) { return b.no != null; }).length;
  return "<p>Sitede yapay zekâ ile üretilen her içerik noktalı sol çizgi ve “YZ” etiketiyle gösterilir; kural tabanlı ölçümler ve sağlanan veriler bu biçimi hiç kullanmaz. Üretilen içeriğin tamamı:</p><ul>" +
    "<li><b>İnceleme metinleri:</b> BiasGuard’ın kavram seçimleri, kararları ve bütün Türkçe gerekçeleri, Claude Code ortamında çalışan Claude modelleri tarafından yazılmıştır. Alıntılar metinden birebir alınır ve kodla denetlenir; gerekçeler denetlenmez.</li>" +
    "<li><b>İki cümlelik açıklamalar:</b> olay sayfasındaki “Ne fark etti / Neden kesin değil” metinleri, inceleyici metinlerinden bir yapay zekâ geçişiyle üretilmiştir; Yönetim’den düzeltilebilir.</li>" +
    (ag.length ? "<li><b>Yapay zekâ ile kodlanan anlatı haftaları:</b> " + ag.join(", ") + " haftalarının dokuz boyutlu kodlaması ve olay özetleri (ne oldu, nerede uzlaşıyorlar, nerede ayrışıyorlar, neden önemli) bir Claude modeli tarafından üretilmiştir; önceki haftalar elle kodlanmıştır.</li>" : "") +
    "<li><b>Kavram kataloğu aktarımı:</b> " + nCat + " kavramın tanımları The Decision Lab’den başka sözcüklerle aktarılmış ve işlevselleştirilmiştir; bağımsız doğrulanmamıştır.</li>" +
    "<li><b>Simülasyon senaryoları:</b> aracın kendi sınamasındaki " + (D.BGS ? D.BGS.cases : 52) + " kurgusal karar senaryosu ve beklenen etiketleri yapay zekâ tarafından yazılmış ve yapay zekâ tarafından gözden geçirilmiştir.</li>" +
    "<li><b>7.0 kodu:</b> veri hattı, BiasGuard uyarlaması ve bu sayfaların 7.0 eklemeleri Claude Code ile yazılmıştır.</li></ul>" +
    "<p><b>Yapay zekâ ile üretilmeyenler:</b> başlıkların toplanması, olay kümeleme, yüklü dil puanlayıcısı, kör nokta kuralı ve bütün istatistikler deterministik koddur; kurum yerleşimleri, sahiplik notları ve elle kodlanan anlatı haftaları sağlanan insan verisidir.</p>";
}

function kaynakHtml(refs) {
  var L = CM3.literature();
  return "<h3>Okuma listesi: Türkiye’de medya</h3>" + (L.length ? '<ul class="refs">' + L.map(function (x) {
    var s = x.src;
    return "<li>" + esc(s.authors) + " (" + esc(s.year) + "). " + '<a class="lnk" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + "</a></li>";
  }).join("") + "</ul>" : "<p>Liste bu yapıda yok.</p>") +
    "<h3>Yöntemin dayandığı yazın</h3>" + '<ul class="refs" id="sref">' + refs.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>";
}

function pgYontem7(params) {
  var M = methodSecs(), X = methodExtras();
  var h2 = function (id, t, ai) { return '<h2 id="' + id + '">' + t + (ai ? " " + yzBadge() : "") + "</h2>"; };
  return '<div class="wrap page ym"><div class="phead"><div class="eyebrow">Nasıl çalışır</div><h1>Nasıl çalışır</h1>' +
    '<p class="lede">Çapraz Manşet’in veri toplama, olay tespiti, ölçüm ve çözümleme adımlarının, Türkiye’ye uyarlamaların ve yapay zekâ ile üretilen her parçanın dökümü.</p>' +
    '<nav class="xtoc" aria-label="Bölümler">' + YM_TOC.map(function (t) { return '<a href="#/yontem?s=' + t[0] + '">' + t[1] + "</a>"; }).join("") + "</nav></div>" +
    X.walk + '<article class="xpaper">' + M.intro +
    h2("veri", "Veri") + M.veri + h2("olay", "Olay tespiti") + M.olay + h2("dil", "Yüklü dil puanlayıcısı") + M.dil + h2("anlati", "Anlatı kodlaması") + M.anlati +
    h2("yz", "Bilişsel inceleme", 1) + yzBlock(yzMethodHtml()) + h2("yzicerik", "Yapay zekâ ile üretilen içerik", 1) + yzBlock(yzIcerikHtml()) +
    h2("turkiye", "Türkiye bağlamı") + '<p>Başlık analizi için İngilizce dünyada geliştirilmiş birçok varsayım Türkçede çalışmaz. Her uyarlama için sorunu, ne yaptığımızı ve sınırını yazdık; rakamlar kodun ve verinin kendisinden okunur.</p>' +
    '<div class="v7-tr">' + turkiyeBlocks() + "</div>" +
    h2("kavramlar", "Kavram kütüphanesi") + conceptLibrary() +
    h2("sozluk", "Sözlük") + glossaryHTML() + h2("kapsama", "Kapsama") + kapsamaHTML() +
    h2("sinir", "Sınırlılıklar") + M.sinir + h2("kaynak", "Kaynaklar") + kaynakHtml(M.refs) + "</article>" + X.fix + "</div>";
}

/* After render: scroll to the section (old numeric anchors accepted), wire the concept search, highlight ?k=. */
function wireYontem(params) {
  var id = yontemAnchor(params.s) || (params.k ? "kavramlar" : ""), list = document.getElementById("clist");
  if (list) {
    var q = document.getElementById("cq"), tier = "all", cards = [].slice.call(list.querySelectorAll(".v7-concept"));
    var apply = function () {
      var t = trFold(q.value).trim(), n = 0;
      cards.forEach(function (c) {
        var ok = (tier === "all" || c.getAttribute("data-tier") === tier) && (!t || c.getAttribute("data-f").indexOf(t) >= 0);
        c.hidden = !ok; if (ok) n++;
      });
      document.getElementById("cn").textContent = n + " kavram gösteriliyor";
      document.getElementById("cempty").hidden = n > 0;
    };
    q.oninput = apply;
    [].forEach.call(document.querySelectorAll(".v7-cl-chips .chip"), function (b) {
      b.onclick = function () {
        tier = b.getAttribute("data-tier");
        [].forEach.call(document.querySelectorAll(".v7-cl-chips .chip"), function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        apply();
      };
    });
    if (params.k) {
      var hit = cards.filter(function (c) { return c.getAttribute("data-k") === params.k || c.getAttribute("data-k") === bg7k(params.k); })[0];
      if (hit) { hit.classList.add("on"); hit.setAttribute("aria-current", "true"); id = "kavramlar"; setTimeout(function () { hit.scrollIntoView({ block: "center" }); }, 40); return; }
    }
  }
  var tg = id && document.getElementById(id);
  if (tg) setTimeout(function () { tg.scrollIntoView({ block: "start" }); }, 30);
}

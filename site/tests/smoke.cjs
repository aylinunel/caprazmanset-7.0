// node smoke.cjs <siteDir> <outDir> [routes...]  — exits 1 on console error, h-scroll at 390px, or .v7-empty-bug
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const argv = process.argv.slice(2), ni = argv.indexOf("--expect-nav");
const expectNav = ni >= 0 ? argv.splice(ni, 2)[1] : null;
const evals = [];
for (let ei = argv.indexOf("--eval"); ei >= 0; ei = argv.indexOf("--eval")) { const v = argv.splice(ei, 2)[1], k = v.indexOf("|"); evals.push([v.slice(0, k), v.slice(k + 1)]); }
const clicks = [];
for (let ci = argv.indexOf("--click"); ci >= 0; ci = argv.indexOf("--click")) { const v = argv.splice(ci, 2)[1], k = v.indexOf(":"); clicks.push([v.slice(0, k), v.slice(k + 1)]); }
const [siteDir, outDir, ...argRoutes] = argv;
if (!siteDir || !outDir) { console.log("usage: node smoke.cjs <siteDir> <outDir> [routes...]"); process.exit(0); }
const ROUTES = argRoutes.length ? argRoutes : ["#/", "#/olaylar", "#/olay?e=s4374", "#/oruntu?q=secim", "#/oruntu?q=dil",
  "#/oruntu?q=anlati", "#/oruntu?q=hiz", "#/kurumlar", "#/kurum?s=takvim", "#/karsilastir", "#/yontem", "#/ilan", "#/benim", "#/yonetim?t=bilissel"];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".bin": "application/octet-stream", ".json": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const root = path.resolve(siteDir);
  const srv = http.createServer((q, s) => {
    const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!f.startsWith(root) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); s.end(fs.readFileSync(f));
  }).listen(0);
  const port = srv.address().port, browser = await chromium.launch(), fails = [];
  let first = true;
  for (const route of ROUTES) for (const w of [1280, 390]) for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 800 } });
    await ctx.addInitScript((t) => { try { localStorage.setItem("yh-theme", t); } catch (e) {} }, theme);
    const page = await ctx.newPage(), tag = `${route} ${w} ${theme}`;
    page.on("pageerror", (e) => fails.push(`${tag}: pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") fails.push(`${tag}: console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}/index.html${route}`);
    await sleep(first ? 9000 : 2500); first = false;
    if (w === 390 && await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fails.push(`${tag}: horizontal scroll`);
    if (expectNav && w === 1280) {
      const got = (await page.$$eval(".xnav-l a", (as) => as.map((a) => a.textContent.trim()))).join(",");
      if (got !== expectNav) fails.push(`${tag}: nav "${got}" != "${expectNav}"`);
    }
    if (route.startsWith("#/olaylar?t=liste&f=konu") && w === 1280) {
      const n0 = await page.$eval("#fcount", (e) => e.textContent);
      await page.click(".v7-tchips .chip"); await sleep(800);
      const n1 = await page.$eval("#fcount", (e) => e.textContent);
      if (n0 === n1) fails.push(`${tag}: topic chip did not change event count (${n0})`);
    }
    if (route.startsWith("#/olay?e=")) {
      const ok = await page.evaluate(() => {
        const m = document.querySelector(".v7-map"); if (!m) return "ok";
        const sp = document.querySelector(".xspwrap");
        if (sp && !(m.compareDocumentPosition(sp) & 4)) return ".v7-map must precede .xspwrap";
        for (const el of document.querySelectorAll("[data-cm3], .cm3-voices, .cm3-counter, .xvoices"))
          if (el.compareDocumentPosition(m) & 4) return "v3 block before .v7-map: " + el.className + " " + el.outerHTML.slice(0, 80);
        const yz = [].map.call(document.querySelectorAll(".yz"), (x) => x.textContent).join(" ");
        return /bağlam gerekli|desteklendi|inceleyiciler ayrıştı/.test(yz) ? "status label in .yz" : "ok";
      });
      if (ok !== "ok") fails.push(`${tag}: ${ok}`);
    }
    if (route.startsWith("#/oruntu?q=")) {
      const bad = await page.evaluate(() => {
        const fs = [...document.querySelectorAll(".v7-find")];
        if (fs.length < 3) return `only ${fs.length} .v7-find`;
        if (fs.some((f) => !((f.querySelector(".v7-means") || {}).textContent || "").replace("Bu ne anlama geliyor.", "").trim())) return "empty .v7-means";
        const v = document.querySelector(".v7-viz");
        if (!v || !v.querySelector("[data-go],[data-tip],[data-vtip],.vz-dp,.vz-lp")) return "first .v7-viz has no interactive mark";
        if (/bağlam gerekli/i.test(document.body.innerText)) return "text 'bağlam gerekli'";
        return "";
      });
      if (bad) fails.push(`${tag}: oruntu ${bad}`);
    }
    if (route.startsWith("#/kurum?s=")) {
      const bad = await page.evaluate(() => {
        const n = document.querySelectorAll('.v7-kurum-lines a[href^="#/oruntu"]').length;
        if (n < 4) return `only ${n} oruntu links`;
        if (document.querySelectorAll(".v7-kurum-lines .yz").length !== 1) return "need exactly one .yz";
        if (/bağlam gerekli|desteklendi/i.test(document.querySelector(".v7-kurum-lines").textContent)) return "status word in lines";
        return "";
      });
      if (bad) fails.push(`${tag}: kurum ${bad}`);
    }
    if (route.startsWith("#/yontem")) {
      const bad = await page.evaluate((r) => {
        const ids = ["veri", "olay", "dil", "anlati", "yz", "yzicerik", "turkiye", "kavramlar", "sinir", "kaynak"];
        const miss = ids.filter((i) => !document.getElementById(i));
        if (miss.length) return "missing section ids " + miss.join(",");
        const yz = [].map.call(document.querySelectorAll(".yz"), (x) => x.textContent).join(" ");
        if (/bağlam gerekli|desteklendi|inceleyiciler ayrıştı/i.test(yz + " " + document.querySelector(".xpaper").textContent)) return "status label on page";
        const tb = [...document.querySelectorAll(".v7-tr-block")];
        if (tb.length < 9) return `only ${tb.length} .v7-tr-block`;
        if (tb.some((b) => [...b.querySelectorAll("dt")].map((d) => d.textContent).join("|") !== "Sorun|Ne yaptık|Sınır" || [...b.querySelectorAll("dd")].some((d) => d.textContent.trim().length < 20))) return "tr-block parts incomplete";
        if (/NaN|undefined|\[object/.test(document.querySelector(".v7-tr").textContent)) return "NaN/undefined in tr blocks";
        const cs = document.querySelectorAll(".v7-concept").length;
        if (cs < 129) return `only ${cs} .v7-concept`;
        if (document.querySelectorAll(".v7-concept .yz-badge").length < 1) return "no yz badge in concepts";
        return "";
      }, route);
      if (bad) fails.push(`${tag}: yontem ${bad}`);
      if (route === "#/yontem?s=kavramlar") {
        await page.fill("#cq", "kisiye saldiri"); await sleep(300);
        const n = await page.evaluate(() => [...document.querySelectorAll(".v7-concept")].filter((c) => !c.hidden).length);
        if (n < 1 || n > 20) fails.push(`${tag}: folded search 'kisiye saldiri' shows ${n}`);
        await page.fill("#cq", ""); await page.click('.v7-cl-chips [data-tier="detected"]'); await sleep(200);
        const d = await page.evaluate(() => [...document.querySelectorAll(".v7-concept")].filter((c) => !c.hidden).every((c) => c.dataset.tier === "detected") && [...document.querySelectorAll(".v7-concept")].filter((c) => !c.hidden).length);
        if (!d) fails.push(`${tag}: tier chip filter wrong`);
        await page.click('.v7-cl-chips [data-tier="all"]');
      }
    }
    if (route === "#/ilan") {
      const rows = async (t) => { await page.fill("#ilanq", t); await sleep(400); return page.evaluate(() => [document.querySelectorAll(".v7-ilan-row").length, (document.querySelector("#ilanres") || {}).textContent || ""]); };
      const [n] = await rows("icra");
      if (n < 1) fails.push(`${tag}: ilan 'icra' gives no .v7-ilan-row`);
      const [, txt] = await rows("zzzz");
      if (!txt.includes("Bu aramayla eşleşen ilan bizim derlemimizde yok. Resmî ilanların tamamı için ilan.gov.tr adresine bakabilirsiniz.")) fails.push(`${tag}: ilan empty-state text missing`);
      await rows("");
      if (w === 390 && await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fails.push(`${tag}: ilan horizontal scroll after typing`);
    }
    if (await page.$(".xtick")) fails.push(`${tag}: .xtick present`);
    if (route === "#/") {
      const g = await page.evaluate(() => { const b = [...document.querySelectorAll(".fh [role=group] button")]; return [b.length, b.filter((x) => x.getAttribute("aria-pressed") === "true").length, (document.querySelector(".fh-cta") || {}).textContent, document.querySelector(".fh-cta") && document.querySelector(".fh-cta").getAttribute("href"), !!document.getElementById("bu-hafta")]; });
      if (g[0] !== 2 || g[1] !== 1) fails.push(`${tag}: .fh toggle has ${g[0]} buttons, ${g[1]} pressed`);
      if (g[2] !== "Bu haftanın ayrışmalarını gör ↓" || g[3] !== "#bu-hafta" || !g[4]) fails.push(`${tag}: .fh-cta / #bu-hafta wrong: ${g}`);
      const fd = await page.evaluate(() => [document.querySelectorAll("#bu-hafta .v7-fc").length, !!document.querySelector("#bu-hafta h2"), !!document.querySelector(".v7-steps"), document.querySelectorAll(".v7-hgrid .v7-hc").length, document.documentElement.scrollWidth > innerWidth]);
      if (fd[0] > 6 || !fd[1] || !fd[2] || fd[3] !== 5) fails.push(`${tag}: homepage feed/steps/links wrong: ${fd}`);
      if (w === 390 && fd[4]) fails.push(`${tag}: home horizontal scroll`);
      if (fd[0] && w >= 1280) {
        await page.hover("#bu-hafta .v7-fc"); await sleep(250);
        if (!await page.$("#bu-hafta .v7-fc canvas.dm-word")) fails.push(`${tag}: hover adds no canvas.dm-word`);
        await sleep(1300);
        if (await page.$("canvas.dm-word")) fails.push(`${tag}: canvas.dm-word left after effect`);
      }
      if (fd[0]) {
        await page.evaluate(() => { for (let i = 0; i < 400 && !document.getElementById("feed-more").hidden; i++) document.getElementById("feed-more").click(); });
        if (await page.isVisible("#feed-more")) fails.push(`${tag}: #feed-more still visible after all cards shown`);
      }
      await page.evaluate(() => { window.__E = CM.data.E; CM.data.E = window.__E.slice(0, 1); location.hash = "#/olaylar"; });
      await sleep(600); await page.evaluate(() => { location.hash = "#/"; }); await sleep(1500);
      const zero = await page.evaluate(() => { CM.data.E = window.__E; return [document.querySelectorAll("#bu-hafta .v7-fc").length, (document.querySelector("#bu-hafta .v7-fc-none") || {}).textContent, (document.querySelector("#bu-hafta .lnk") || {}).textContent, !document.querySelector("#feed-more") || document.querySelector("#feed-more").hidden]; });
      if (zero[0] !== 0 || zero[1] !== "Bu hafta iki taraftan da verilen olay yok" || zero[2] !== "Tüm olaylar →" || !zero[3]) fails.push(`${tag}: zero-event feed wrong: ${zero}`);
      const b2 = await page.$(".fh [role=group] button:nth-child(2)");
      if (b2) {
        await b2.click(); await sleep(1200);
        const on = await page.evaluate(() => [!!document.querySelector(".fh-set.r.is-on"), !document.querySelector(".fh-set.l.is-on"), document.querySelector(".fh [role=group] button:nth-child(2)").getAttribute("aria-pressed")]);
        if (!on[0] || !on[1] || on[2] !== "true") fails.push(`${tag}: right set not on after click: ${on}`);
        if (w === 390 && await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fails.push(`${tag}: horizontal scroll after fog switch`);
      }
    }
    for (const [er, js] of evals) if (er === route && !(await page.evaluate(js))) fails.push(`${tag}: eval false: ${js}`);
    if (await page.$(".v7-empty-bug")) fails.push(`${tag}: .v7-empty-bug present`);
    await page.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_")}-${w}-${theme}.png`) });
    for (const [cr, sel] of clicks) if (cr === route) {
      const el = await page.$(sel);
      if (!el) { fails.push(`${tag}: click target ${sel} missing`); continue; }
      await el.click(); await sleep(300);
      const want = sel.includes("th[data-dim]") ? ".v7-group" : sel.includes(".v7-out") ? ".v7-hl" : sel.startsWith(".gl") ? ".gl-pop" : null;
      if (want) {
        const n = await page.$$eval(want, (xs) => xs.filter((x) => x.offsetParent !== null).length);
        if (n < 1) fails.push(`${tag}: after click ${sel} no visible ${want}`);
      }
      if (w === 390 && await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fails.push(`${tag}: horizontal scroll after click ${sel}`);
      await page.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_")}-click-${w}-${theme}.png`) });
    }
    if (route === "#/oruntu?q=secim" && w === 1280 && theme === "light") {
      await page.$eval(".gl", (e) => e.focus()); await page.keyboard.press("Tab"); await sleep(200);
      if (!(await page.evaluate(() => { const a = document.activeElement; return !!(a && a.closest(".gl-pop") && a.tagName === "A"); }))) fails.push(`${tag}: Tab from .gl does not reach popover link`);
      if (!(await page.$(".gl-pop"))) fails.push(`${tag}: .gl-pop missing after Tab`);
      await page.keyboard.press("Escape"); await sleep(200);
      if (await page.$(".gl-pop") || !(await page.evaluate(() => document.activeElement.classList.contains("gl")))) fails.push(`${tag}: Escape did not close popover and refocus .gl`);
      await page.keyboard.press("Tab"); await sleep(100); await page.keyboard.press("Shift+Tab"); await sleep(200);
      if (!(await page.$(".gl-pop"))) fails.push(`${tag}: .gl-pop missing before navigation`);
      await page.evaluate(() => { location.hash = "#/kurumlar"; }); await sleep(800);
      if (await page.$(".gl-pop")) fails.push(`${tag}: .gl-pop survives navigation`);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  fails.forEach((f) => console.error("FAIL", f));
  console.log(fails.length ? `${fails.length} failure(s)` : "smoke ok");
  process.exit(fails.length ? 1 : 0);
})();

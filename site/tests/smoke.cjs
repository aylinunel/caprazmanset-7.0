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
    if (route.startsWith("#/olay?e=")) {
      const ok = await page.evaluate(() => {
        const m = document.querySelector(".v7-map"); if (!m) return "ok";
        const sp = document.querySelector(".xspwrap");
        if (sp && !(m.compareDocumentPosition(sp) & 4)) return ".v7-map must precede .xspwrap";
        for (const el of document.querySelectorAll("[data-cm3], .cm3-voices, .cm3-counter, .xvoices"))
          if (el.compareDocumentPosition(m) & 2) return "v3 block before .v7-map";
        const yz = [].map.call(document.querySelectorAll(".yz"), (x) => x.textContent).join(" ");
        return /bağlam gerekli|desteklendi|inceleyiciler ayrıştı/.test(yz) ? "status label in .yz" : "ok";
      });
      if (ok !== "ok") fails.push(`${tag}: ${ok}`);
    }
    for (const [er, js] of evals) if (er === route && !(await page.evaluate(js))) fails.push(`${tag}: eval false: ${js}`);
    if (await page.$(".v7-empty-bug")) fails.push(`${tag}: .v7-empty-bug present`);
    await page.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_")}-${w}-${theme}.png`) });
    for (const [cr, sel] of clicks) if (cr === route) {
      const el = await page.$(sel);
      if (!el) { fails.push(`${tag}: click target ${sel} missing`); continue; }
      await el.click(); await sleep(300);
      const want = sel.includes("th[data-dim]") ? ".v7-group" : sel.includes(".v7-out") ? ".v7-hl" : null;
      if (want) {
        const n = await page.$$eval(want, (xs) => xs.filter((x) => x.offsetParent !== null).length);
        if (n < 1) fails.push(`${tag}: after click ${sel} no visible ${want}`);
      }
      if (w === 390 && await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fails.push(`${tag}: horizontal scroll after click ${sel}`);
      await page.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_")}-click-${w}-${theme}.png`) });
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  fails.forEach((f) => console.error("FAIL", f));
  console.log(fails.length ? `${fails.length} failure(s)` : "smoke ok");
  process.exit(fails.length ? 1 : 0);
})();

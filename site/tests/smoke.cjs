// node smoke.cjs <siteDir> <outDir> [routes...]  — exits 1 on console error, h-scroll at 390px, or .v7-empty-bug
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const [siteDir, outDir, ...argRoutes] = process.argv.slice(2);
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
    if (await page.$(".v7-empty-bug")) fails.push(`${tag}: .v7-empty-bug present`);
    await page.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_")}-${w}-${theme}.png`) });
    await ctx.close();
  }
  await browser.close(); srv.close();
  fails.forEach((f) => console.error("FAIL", f));
  console.log(fails.length ? `${fails.length} failure(s)` : "smoke ok");
  process.exit(fails.length ? 1 : 0);
})();

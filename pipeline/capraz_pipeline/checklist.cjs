// Runs Mercek's Turkish behaviour checklist (eval/checklist_tr.jsonl) against the site's own headline
// scorer (shared/analysis/rules.cjs) and writes the Çözümleyici › "neyle sınandı" table data.
//   node pipeline/capraz_pipeline/checklist.cjs <checklist_tr.jsonl> > data/reference/checklist-7.json
// Mercek labels map to scorer rules; a label with no rule is a "trivial" pass when absence is expected.
"use strict";
const fs = require("fs");
const path = require("path");
const R = require(path.resolve(__dirname, "../../shared/analysis/rules.cjs"));

const MAP = {
  loaded_language: ["ad-hominem", "illusory-truth", "in-group-bias", "fear-appeal", "metaphorical-framing"],
  authority_bias: ["authority-bias"],
  causal_overclaim: [], affect_heuristic: [],
};
const file = process.argv[2];
const cases = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(JSON.parse);

function detect(c) {
  const a = c.articles[0], s = R.scoreText(a.title + ". " + a.text), own = {}, quoted = {};
  s.evidence.forEach((x) => { (x.own ? own : quoted)[x.key] = 1; });
  const lab = {};
  Object.keys(MAP).forEach((l) => {
    if (MAP[l].some((k) => own[k])) lab[l] = "own_voice";
    else if (MAP[l].some((k) => quoted[k])) lab[l] = "quoted_speaker";
  });
  return { keys: Object.keys(own).concat(Object.keys(quoted)), lab };
}

const got = {};
cases.forEach((c) => { got[c.id] = detect(c); });
const out = cases.map((c) => {
  const x = c.expect, g = got[c.id], checks = [];
  let trivial = false;
  (x.absent || []).forEach((l) => { if (!MAP[l] || !MAP[l].length) trivial = true; checks.push(!g.lab[l]); });
  (x.present || []).forEach((l) => checks.push(!!g.lab[l] && (!x.attribution || !x.attribution[l] || g.lab[l] === x.attribution[l])));
  if (x.added_relative_to) checks.push(!got[x.added_relative_to.case].lab[x.added_relative_to.label]);
  if (x.same_labels_as) checks.push(JSON.stringify(Object.keys(g.lab).sort()) === JSON.stringify(Object.keys(got[x.same_labels_as].lab).sort()));
  const pass = checks.length > 0 && checks.every(Boolean);
  const nomap = (x.present || []).filter((l) => !MAP[l] || !MAP[l].length);
  return { id: c.id, type: c.type, capability: c.capability, verdict: pass ? "PASS" : "FAIL",
    kind: pass && trivial ? "trivial" : "real",
    why: nomap.length ? nomap.join(", ") + " için kural yok" : (pass && trivial ? "beklenen kavram için kural yok — boş geçiş" : ""),
    keys: g.keys.length ? g.keys.join(", ") : "(yok)" };
});
const n = (f) => out.filter(f).length;
process.stdout.write(JSON.stringify({
  ran: new Date().toISOString(), source: "aylinunel/mediabias · eval/checklist_tr.jsonl",
  engine: "shared/analysis/rules.cjs " + R.RULES_VERSION,
  note: "Sentetik, uzman incelemesinden geçmemiş vakalar; sitenin kendi başlık puanlayıcısıyla çalıştırıldı. Gerçek başlıklarda doğruluk ölçmez.",
  real: n((c) => c.verdict === "PASS" && c.kind === "real"), trivial: n((c) => c.kind === "trivial"),
  fail: n((c) => c.verdict === "FAIL"), total: out.length, cases: out }, null, 1) + "\n");

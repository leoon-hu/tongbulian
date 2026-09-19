/**
 * 对战竞技场的排版普查：把对战里会出现的每一种「题干部件组合 × 作答方式」各找一道代表题，
 * 在 iPhone 横屏（紧凑版）和 iPad 横屏各截一张，再拼成对照大图，肉眼过一遍有没有被裁掉 / 折行 / 挤出去的。
 * 用法：npm run dev 后执行 `npm run battle:survey`（可选参数 iphone | ipad 只跑一种；环境变量 BASE_URL、CHROME 可改），
 * 结果在 screenshots/survey/（不进仓库）：每种组合一张 <布局>-<组合>.png，拼图 sheet-<布局>-<n>.png。
 * 竞技场在开发模式把 store 挂在 window.__battle 上，这里靠它跳过倒数、把两边换成同一道代表题、摆一个中局比分。
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, createServerModuleRunner } from "vite";

const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
const outDir = new URL("../screenshots/survey", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const only = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. 枚举组合：每个知识点跑 40 个种子的第一题，按「题干部件种类 + 作答方式」去重
const combos = [];
{
  const server = await createServer({ configFile: "vite.config.ts", logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
  try {
    const runner = createServerModuleRunner(server.environments.ssr);
    const { allCourses } = await runner.import("/src/engine/catalog.ts");
    const { hasGenerator } = await runner.import("/src/engine/index.ts");
    const { questionAt } = await runner.import("/src/battle/stream.ts");
    const seen = new Map();
    for (const course of allCourses()) {
      for (const kp of course.knowledgePoints) {
        if (!hasGenerator(kp.id)) continue;
        for (let seed = 1; seed <= 40; seed++) {
          const q = questionAt(kp.id, seed, 1, 0);
          const key = `${[...new Set(q.stem.map((p) => p.kind))].sort().join("+")}|${q.input}`;
          if (!seen.has(key)) seen.set(key, { key, kp: kp.id, seed });
        }
      }
    }
    combos.push(...[...seen.values()].sort((a, b) => a.key.localeCompare(b.key)));
  } finally {
    await server.close();
  }
}
console.log(`${combos.length} 种组合`);

// 2. 截图
for (let i = 0; i < 120; i++) { try { await fetch(BASE + "/"); break; } catch { await sleep(500); } }
const PREFS = JSON.stringify({ clientId: "survey", names: { me: "A", left: "", right: "B" }, skin: "race", aiLevel: "mid", difficulty: 1 });
const LAYOUTS = { iphone: { w: 852, h: 393, scale: 2, rows: 4 }, ipad: { w: 1024, h: 768, scale: 1.5, rows: 3 } };
const profile = mkdtempSync(join(tmpdir(), "battle-survey-"));
const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CH, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1024,768", "--no-first-run", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
async function json(u) { for (let i = 0; i < 40; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(250); } } throw new Error("chrome not ready"); }
const targets = await json(`http://127.0.0.1:${port}/json`);
const page = targets.find((t) => t.type === "page") ?? targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pending.has(i)) { pending.delete(i); console.log("TIMEOUT " + method); r({ result: {} }); } }, 20000); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
async function capture(name) {
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (!r.result?.data) throw new Error("截图失败：" + name);
  writeFileSync(join(outDir, name + ".png"), Buffer.from(r.result.data, "base64"));
}
await send("Page.enable"); await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('tongbulian:install','{"until":9007199254740991}');localStorage.setItem('tongbulian:battle',${JSON.stringify(PREFS)})}catch(e){}` });
const shots = [];
try {
  for (const [lname, L] of Object.entries(LAYOUTS)) {
    if (only && only !== lname) continue;
    await send("Emulation.setDeviceMetricsOverride", { width: L.w, height: L.h, deviceScaleFactor: L.scale, mobile: true, screenOrientation: { type: "landscapePrimary", angle: 90 } });
    for (const c of combos) {
      // 两种组合用「打机器人」截，顺便看观看行（作答显示 + 表情）的排版
      const mode = c.key === "text|choice" || c.key === "expr|numpad" ? "ai" : "duo";
      await send("Page.navigate", { url: "about:blank" }); await sleep(200);
      await send("Page.navigate", { url: `${BASE}/#/battle/local/${c.kp}?mode=${mode}` }); await sleep(2200);
      await ev(`(()=>{const s=window.__battle;s.beginPlay();const ps=s.state.players.map(p=>({...p,seed:${c.seed},index:0}));s.state={...s.state,players:ps,score:{red:3,blue:2},leading:'red'};return 'ok'})()`);
      await sleep(1000);
      const name = `${lname}-${c.key.replace(/[|+]/g, "_")}`;
      await capture(name);
      shots.push({ layout: lname, name, label: `${c.key}  (${c.kp} #${c.seed}${mode === "ai" ? ", 打机器人" : ""})` });
      console.log("✓", name);
    }
  }
  // 3. 拼图：每张 2 列 × rows 行
  for (const [lname, L] of Object.entries(LAYOUTS)) {
    if (only && only !== lname) continue;
    const mine = shots.filter((s) => s.layout === lname);
    const per = 2 * L.rows;
    for (let i = 0; i < mine.length; i += per) {
      const group = mine.slice(i, i + per);
      const tileW = 1000, tileH = Math.round((tileW * L.h) / L.w);
      const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222;font:14px monospace;color:#fff">
<div style="display:grid;grid-template-columns:repeat(2,${tileW}px);gap:12px;padding:12px">
${group.map((s) => `<figure style="margin:0"><figcaption style="padding:2px 4px">${s.label}</figcaption><img src="file://${join(outDir, s.name + ".png")}" style="width:${tileW}px;height:${tileH}px;display:block"></figure>`).join("\n")}
</div></body>`;
      const file = join(outDir, `sheet-${lname}-${i / per + 1}.html`);
      writeFileSync(file, html);
      const rows = Math.ceil(group.length / 2);
      await send("Emulation.setDeviceMetricsOverride", { width: 2 * tileW + 36, height: rows * (tileH + 34) + 24, deviceScaleFactor: 1, mobile: false });
      await send("Page.navigate", { url: "file://" + file }); await sleep(1500);
      await capture(`sheet-${lname}-${i / per + 1}`);
      rmSync(file);
      console.log("拼图", lname, i / per + 1);
    }
  }
} finally {
  ws.close();
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); });
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

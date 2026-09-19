/**
 * README 用的预览图：用无头 Chrome（CDP）模拟 iPhone（390×844 @2x，触屏）截四张到 screenshots/，
 * 再横过来（852×393 @3x）截一张对战竞技场。
 * 再截 iPad 横屏的对战设置页 / 开局规则句 / 两人同屏竞技场，和帮助页。
 * 用法：npm run dev 后执行 `npm run screenshots`（环境变量 BASE_URL、CHROME 可改）。
 * 安装提示条不进预览图：预先把静默期写成永久；对战的昵称也预先写好，免得先弹名字面板。
 */

import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
const [W, H, SCALE] = [390, 844, 2];
const outDir = new URL("../screenshots", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), "screenshots-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BATTLE_PREFS = JSON.stringify({ names: { me: "🐰 小兔", left: "", right: "" }, aiLevel: "mid" });
// 每个新文档都跑：只压掉安装提示条；对战偏好按每张截图的 prefs 在导航前写（写在这里会把每张的覆盖冲掉）
const INIT = `try{localStorage.setItem('tongbulian:install','{"until":9007199254740991}')}catch(e){}`;
const SHOTS = [
  {
    "name": "home",
    "path": "#/"
  },
  {
    "name": "map",
    "path": "#/s/math/g/g1"
  },
  {
    "name": "practice",
    "path": "#/s/math/g/g1/practice/s1-05-carry-add"
  },
  {
    "name": "clock",
    "path": "#/s/math/g/g2/practice/m2s2-01-clock-hour"
  },
  {
    "name": "battle",
    "path": "#/battle/local/s1-05-carry-add?mode=ai&skin=race",
    "w": 852,
    "h": 393,
    "scale": 3,
    "load": 1500,
    "steps": [
      { "eval": "window.__battle.beginPlay()", "after": 400 },
      { "eval": "window.__battle.state = { ...window.__battle.state, score: { red: 5, blue: 3 }, lastPoint: 'red', leading: 'red' }", "after": 1200 }
    ]
  },
  {
    "name": "battle-setup",
    "path": "#/battle/new/s1-05-carry-add"
  },
  {
    "name": "battle-rule",
    "path": "#/battle/local/s1-05-carry-add?mode=ai&skin=rocket",
    "w": 1024,
    "h": 768,
    "scale": 2,
    "load": 1300
  },
  {
    "name": "battle-ipad",
    "path": "#/battle/local/s1-05-carry-add?mode=duo&skin=tower",
    "w": 1024,
    "h": 768,
    "scale": 2,
    "load": 1500,
    "steps": [
      { "eval": "window.__battle.beginPlay()", "after": 400 },
      { "eval": "window.__battle.state = { ...window.__battle.state, score: { red: 5, blue: 3 }, lastPoint: 'red', leading: 'red' }", "after": 1400 }
    ]
  },
  {
    "name": "help",
    "path": "#/help"
  }
];

const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CH, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", `--window-size=${W},${H}`, "--no-first-run", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
async function json(u) { for (let i = 0; i < 40; i++) { try { return await (await fetch(u)).json(); } catch { await sleep(250); } } throw new Error("chrome not ready"); }
const targets = await json(`http://127.0.0.1:${port}/json`);
const page = targets.find((t) => t.type === "page") ?? targets[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); setTimeout(() => { if (pending.has(i)) { pending.delete(i); console.log("TIMEOUT " + method); r({ result: {} }); } }, 20000); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
async function tap(sel) {
  const c = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2]})()`);
  if (!c) throw new Error("找不到 " + sel);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c[0], y: c[1] }] });
  await sleep(60);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
await send("Page.addScriptToEvaluateOnNewDocument", { source: INIT });
try {
  for (const s of SHOTS) {
    // 每张可以指定自己的尺寸（对战竞技场要横屏）
    const [w, h, scale] = [s.w ?? W, s.h ?? H, s.scale ?? SCALE];
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: scale, mobile: true, screenOrientation: { type: w > h ? "landscapePrimary" : "portraitPrimary", angle: w > h ? 90 : 0 } });
    const prefs = s.prefs ? JSON.stringify({ ...JSON.parse(BATTLE_PREFS), ...s.prefs, names: { me: "🐰 小兔", left: "🐰 小兔", right: "🐯 小虎" } }) : BATTLE_PREFS;
    await ev(`try{localStorage.setItem('tongbulian:battle', ${JSON.stringify(prefs)});'ok'}catch(e){'blank'}`);
    // 先去 about:blank 再进目标页：hash 路由只换 # 不会重新加载，上一张的比赛状态会留在内存里（撞过：截出来还是上一局）
    await send("Page.navigate", { url: "about:blank" });
    await sleep(200);
    await send("Page.navigate", { url: BASE + "/" + s.path });
    await sleep(s.load ?? 2500);
    for (const st of s.steps ?? []) {
      if (st.wait) { await sleep(st.wait); continue; }
      if (st.eval) await ev(st.eval);
      else if (st.tap) await tap(st.tap);
      await sleep(st.after ?? 900);
    }
    const shot = await send("Page.captureScreenshot", { format: "png" });
    if (!shot.result?.data) throw new Error("截图失败：" + s.name);
    writeFileSync(`${outDir}/${s.name}.png`, Buffer.from(shot.result.data, "base64"));
    console.log("✓", s.name);
  }
} finally {
  ws.close();
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); });
  rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}

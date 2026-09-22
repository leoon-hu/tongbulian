/**
 * 游戏画面普查（需求 B34a ⑧）：每种皮肤 / 游戏在几个关键状态各截一帧——只截竞技场里的游戏盒子（.strip）——
 * 0 : 0、3 : 2、6 : 5、7 : 7（冲刺）、8 : 6（胜利）、倒数，以及手机紧凑版的 4 : 2，拼成每种皮肤一张对照图。
 * 用法：npm run dev 后执行 `npm run game:survey [皮肤id]`（环境变量 BASE_URL、CHROME 可改）；
 * 结果在 screenshots/survey/game-<皮肤>-*.png 与拼图 sheet-game-<皮肤>.png（不进仓库）。
 * 靠竞技场开发模式挂在 window.__battle 上的 store 摆状态；倒数 / 胜利 / 弹出提示的覆盖层先隐藏，免得盖住盒子。
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchChrome, sleep, waitForServer } from "./lib/headless.mjs";

const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
const outDir = new URL("../screenshots/survey", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const only = process.argv[2];
const KP = "s1-05-carry-add";
const SKINS = ["race", "car", "train", "rocket", "balloon", "swim", "ladder", "dig", "fish", "tower", "flower", "egg", "bubble", "fruit", "stars", "puzzle", "tug", "seesaw", "flag", "ice", "castle"].filter((s) => !only || s === only);
const PREFS = JSON.stringify({ clientId: "survey", names: { me: "A", left: "", right: "B" }, aiLevel: "mid" });
const HIDE = "(()=>{const s=document.createElement('style');s.textContent='.countdown,.victory,.result,.callout,.confirm-mask{display:none!important}';document.head.appendChild(s);return 'ok'})()";

const POSES = [
  { name: "0-0", js: "window.__battle.state = { ...window.__battle.state, score: { red: 0, blue: 0 }, lastPoint: null, leading: null }" },
  { name: "3-2", js: "window.__battle.state = { ...window.__battle.state, score: { red: 3, blue: 2 }, lastPoint: 'red', leading: 'red' }" },
  { name: "6-5", js: "window.__battle.state = { ...window.__battle.state, score: { red: 6, blue: 5 }, lastPoint: 'red', leading: 'red' }" },
  { name: "7-7", js: "window.__battle.state = { ...window.__battle.state, score: { red: 7, blue: 7 }, lastPoint: 'blue', leading: 'blue' }" },
  { name: "8-6-win", js: "window.__battle.state = { ...window.__battle.state, score: { red: 8, blue: 6 }, lastPoint: 'red', leading: 'red', phase: 'ended', winner: 'red', endedAt: Date.now() }", wait: 1600 },
  { name: "countdown", js: "window.__battle.state = { ...window.__battle.state, score: { red: 0, blue: 0 }, lastPoint: null, leading: null, phase: 'countdown', winner: null }" },
];

await waitForServer(BASE);
const b = await launchChrome();
const frames = [];
try {
  await b.navigate(BASE + "/#/", 800);
  for (const skin of SKINS) {
    for (const layout of [{ name: "ipad", w: 1024, h: 768, scale: 2 }, { name: "compact", w: 852, h: 393, scale: 3 }]) {
      await b.device(layout.w, layout.h, layout.scale);
      await b.ev(`localStorage.setItem('tongbulian:battle', ${JSON.stringify(PREFS)})`);
      await b.navigate("about:blank", 200);
      await b.navigate(`${BASE}/#/battle/local/${KP}?mode=duo&skin=${skin}`, 2200);
      await b.ev(HIDE);
      await b.ev("(()=>{window.__battle.beginPlay();return 'ok'})()");
      await sleep(400);
      const poses = layout.name === "compact" ? [{ name: "4-2", js: "window.__battle.state = { ...window.__battle.state, score: { red: 4, blue: 2 }, lastPoint: 'red', leading: 'red' }" }] : POSES;
      for (const pose of poses) {
        await b.ev(`(()=>{${pose.js};return 'ok'})()`);
        await sleep(pose.wait ?? 1100);
        const file = join(outDir, `game-${skin}-${layout.name}-${pose.name}.png`);
        await b.capture(file, ".strip", layout.scale);
        frames.push({ skin, file, label: `${skin} · ${layout.name} · ${pose.name}` });
        console.log("✓", skin, layout.name, pose.name);
      }
    }
  }
  // 拼图：每种皮肤一张，帧按自然尺寸排，最多两列
  await b.device(2100, 1400, 1, false);
  for (const skin of SKINS) {
    const mine = frames.filter((f) => f.skin === skin);
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222;font:14px monospace;color:#fff">
<div style="display:flex;flex-wrap:wrap;gap:16px;padding:12px;width:2076px">
${mine.map((f) => `<figure style="margin:0"><figcaption style="padding:2px 4px">${f.label}</figcaption><img src="file://${f.file}" style="display:block;max-width:1000px;max-height:700px"></figure>`).join("\n")}
</div></body>`;
    const page = join(outDir, `sheet-game-${skin}.html`);
    writeFileSync(page, html);
    await b.navigate("file://" + page, 1500);
    const h = await b.ev("document.body.scrollHeight");
    await b.device(2100, Math.max(400, Math.min(6000, h + 20)), 1, false);
    await sleep(300);
    await b.capture(join(outDir, `sheet-game-${skin}.png`));
    rmSync(page);
    console.log("拼图", skin);
  }
} finally {
  await b.close();
}

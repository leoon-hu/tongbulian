#!/usr/bin/env node
/**
 * 多设备打怪兽联调（需求 M13，阶段 3）：三个无头 Chrome 在本机走一遍真的房间——
 *   主持人在设置页切到「🥊 打怪兽」→「各用各的」→「一起打」→ 建房（60 秒）→ 二维码页有玩法那一行
 *   → 红队、蓝队开链接进房，两个人到了自动开始 → 三台都进打怪兽竞技场（主持人只看：舞台 + 头像条）
 *   → 红队按键，蓝队的头像条上红队在「正在按」；红队答对，三台的分数、血条一致 → 蓝队发表情，别的设备飞出来
 *   → 60 秒到（服务器计时），三台都出结果页 → 红队「再来一局」，三台一起开新一局（「不玩了」要再等一局，没放进来，room.test 里有）。
 * 自己起中继服务（PORT 8788）与 dev 服务器（5199，/ws 代理到 8788），跑完关掉；不碰用户自己的 5173 / 8787。
 * 用法：npm run build:server && npm run boss:online（SHOTS=<目录> 时在答对后、结果页各截三台的图）
 * 看的是开发模式挂在 window 上的 __room（BattleRoomView.vue）与 __boss（BossArena.vue）；页面里的 error / unhandledrejection 也收起来一起报。
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchChrome, sleep, waitForServer } from "./lib/headless.mjs";

const BATTLE_PORT = 8788;
const VITE_PORT = 5199;
const BASE = `http://127.0.0.1:${VITE_PORT}`;
const KP = "s1-04-simple-addsub";
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
async function shots(tag, list) {
  if (!SHOTS) return;
  for (const [name, p] of Object.entries(list)) await p.capture(join(SHOTS, `${tag}-${name}.png`));
}

if (!existsSync("dist-server/battle.mjs")) {
  console.error("缺 dist-server/battle.mjs，先 npm run build:server");
  process.exit(1);
}
const server = spawn("node", ["dist-server/battle.mjs"], { env: { ...process.env, PORT: String(BATTLE_PORT), HOST: "127.0.0.1" }, stdio: process.env.DEBUG ? "inherit" : "ignore" });
const vite = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(VITE_PORT), "--strictPort"], { env: { ...process.env, BATTLE_PORT: String(BATTLE_PORT) }, stdio: "ignore" });
const pages = [];
async function cleanup() {
  for (const p of pages) await p.close().catch(() => {});
  server.kill();
  vite.kill();
}
process.on("SIGINT", () => cleanup().then(() => process.exit(130)));

const ok = [];
const bad = [];
function pass(what) {
  ok.push(what);
  console.log("  ✓ " + what);
}
async function until(page, expr, what, timeout = 15000) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    last = await page.ev(expr);
    if (last) return last;
    await sleep(200);
  }
  throw new Error(`等不到「${what}」，最后一次 = ${JSON.stringify(last)}：${expr}`);
}
async function click(page, selector, what) {
  await until(page, `!!document.querySelector(${JSON.stringify(selector)})`, what ?? selector);
  await page.ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
/** 起一个浏览器：先在根地址写好身份、名字与打怪兽的偏好（60 秒、一起打；规则卡今天讲过、音乐关掉），装错误收集器，再到目标地址 */
async function open(name, clientId, url, width = 1024, height = 768) {
  const page = await launchChrome({ width, height });
  pages.push(page);
  await page.navigate(BASE + "/", 1200);
  const prefs = { v: 2, clientId, names: { me: name, left: "", right: "" }, music: false, intros: { boss: Date.now() }, format: "boss", boss: { mode: "online", variant: "coop", durationS: 60 } };
  await page.ev(`localStorage.setItem('tongbulian:install','{"until":9007199254740991}');localStorage.setItem('tongbulian:battle', ${JSON.stringify(JSON.stringify(prefs))})`);
  await page.navigate(url, 300);
  await page.ev("location.reload()");
  await sleep(1500);
  await page.ev(`window.__errs = window.__errs || []; addEventListener('error', (e) => __errs.push('error: ' + e.message)); addEventListener('unhandledrejection', (e) => __errs.push('rejection: ' + String(e.reason)))`);
  return page;
}
/** 页面上的字（去掉注音的 <rt>） */
const TEXT = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}).cloneNode(true); el.querySelectorAll('rt').forEach((r) => r.remove()); return el.textContent.replace(/\\s+/g, ' ').trim() })()`;
/** 我这台的选手：答案（数字键盘的数、选项卡的 id） */
const MY_ANSWER = `(() => { const s = window.__boss; const p = s.state.players.find((x) => x.id === s.online.you); const q = s.questionOf(p); return JSON.stringify(q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId) })()`;

try {
  await waitForServer(BASE);
  console.log(`dev ${BASE}，中继 127.0.0.1:${BATTLE_PORT}`);

  // 1. 主持人建打怪兽的房间
  const host = await open("主持", "e2e-host-000000", `${BASE}/#/battle/new/${KP}`);
  await click(host, ".format[data-format=boss]", "打怪兽页签");
  await click(host, ".mode[data-boss-mode=online]", "各用各的");
  await click(host, ".variant[data-variant=coop]", "一起打");
  await click(host, ".start-btn", "建房间");
  await until(host, "!!document.querySelector('.codes-page .format-line')", "二维码页的玩法那一行");
  const line = await host.ev(TEXT(".format-line"));
  const redLink = await host.ev("document.querySelector('.code-card.red .url').textContent");
  const blueLink = await host.ev("document.querySelector('.code-card.blue .url').textContent");
  pass(`建房：${redLink.replace(/.*#/, "#")}，${line}`);

  // 2. 两个人进来：一起打两个人到了就开始
  const red = await open("小兔", "e2e-red-00000000", redLink, 844, 390);
  await until(red, "!!document.querySelector('.wait')", "红队连接状态窗口");
  const sub = await red.ev(TEXT(".wait-sub"));
  if (!sub.includes("两个人")) bad.push(`一起打的连接状态窗口应该说「两个人都进来就自动开始」，现在是「${sub}」`);
  const blue = await open("小虎", "e2e-blue-0000000", blueLink, 390, 844);
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, "!!document.querySelector('.boss-arena')", `${who}进打怪兽竞技场`, 20000);
  await until(host, "document.querySelector('.boss-arena').classList.contains('lay-watch') && !document.querySelector('.boss-arena .side')", "主持人只看（没有作答区）");
  await until(red, "document.querySelectorAll('.boss-arena .side').length === 1 && document.querySelectorAll('.others .chip').length === 1", "红队：自己一栏 + 头像条一个人");
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
  ])
    if (await p.ev("!!document.querySelector('.pause-btn')")) bad.push(`${who}：多设备不该有 ⏸ 暂停`);
  pass("三台进竞技场：主持人只看，红蓝各有自己一栏与头像条");
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, "window.__boss && __boss.state && __boss.state.phase === 'playing'", `${who}开打`, 15000);
  pass("服务器定时开打，三台都在 playing");

  // 3. 红队按键 → 蓝队看到「正在按」；答对 → 三台分数一致
  const redId = await red.ev("__boss.online.you");
  await red.ev(`__boss.setInput(${JSON.stringify(redId)}, '1')`);
  await until(blue, `!!document.querySelector('.others .chip.typing[data-player="${redId}"]')`, "蓝队看到红队正在按");
  pass("红队按键：蓝队头像条上红队在「正在按」");
  const ans = JSON.parse(await red.ev(MY_ANSWER));
  await red.ev(`__boss.submit(${JSON.stringify(redId)}, ${JSON.stringify(ans)})`);
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, `(__boss.state.players.find((x) => x.id === ${JSON.stringify(redId)}) || {}).score === 1 && __boss.state.bosses[0].hp === __boss.state.bosses[0].max - 1`, `${who}看到红队 1 分、Boss 掉一格血`);
  pass("红队答对：三台分数与血条一致");
  await sleep(600);
  await shots("hit", { host, red, blue });

  // 4. 蓝队发表情：主持人那里飞出来
  await click(blue, ".others .emote-btn", "蓝队的表情键");
  await until(host, "!!document.querySelector('.emote-layer .emote.from-blue')", "主持人看到蓝队的表情");
  pass("蓝队发表情：主持人那里飞出来");

  // 5. 60 秒到：服务器计时，三台都出结果页
  console.log("  … 等 60 秒到");
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, "!!document.querySelector('.result') && document.querySelectorAll('.result .big-btn').length >= 2", `${who}的结果页`, 80000);
  pass("时间到：三台都出结果页");
  await shots("result", { host, red, blue });

  // 6. 再来一局：谁都能按，三台一起回到倒数
  await click(red, ".result .rematch-btn", "红队「再来一局」");
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, "__boss.state && (__boss.state.phase === 'countdown' || __boss.state.phase === 'playing') && __boss.state.players.every((x) => x.score === 0)", `${who}回到新一局`, 15000);
  pass("再来一局：三台一起开新一局");

  // 7. 页面错误
  for (const [k, p] of Object.entries({ host, red, blue })) {
    const errs = (await p.ev("window.__errs")) ?? [];
    if (errs.length) bad.push(`${k} 页面有错误：${errs.join(" | ")}`);
  }
} catch (e) {
  bad.push(String(e?.message ?? e));
  for (const [i, p] of pages.entries()) {
    const dump = await p.ev("JSON.stringify({ path: location.hash, phase: window.__boss?.state?.phase, stage: window.__boss?.stage, errs: window.__errs, roomErr: window.__room?.error })").catch(() => null);
    console.log(`  页面 ${i}：${dump}`);
  }
} finally {
  await cleanup();
}

console.log("");
console.log(`通过 ${ok.length} 项${bad.length ? `，问题 ${bad.length} 项：` : ""}`);
for (const b of bad) console.log("  ✗ " + b);
process.exit(bad.length ? 1 : 0);

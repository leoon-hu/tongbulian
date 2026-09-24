#!/usr/bin/env node
/**
 * 语音联调（需求 B57）：三个无头 Chrome 带假麦克风在本机走一遍真的 WebRTC——
 *   主持人建房 → 红队 / 蓝队开链接进房、自动开始 → 红队开麦 → 三台都连上（connectionState connected）、听的两台收到音量
 *   → 蓝队也开麦（两个都开麦的那一对整条重建）→ 红队关麦（我发的连接关掉，蓝队的声音照收）。
 * 自己起中继服务（PORT 8788）与 dev 服务器（5199，/ws 代理到 8788），跑完关掉；不碰用户自己的 5173 / 8787。
 * 用法：npm run build:server && npm run voice:check
 * 看的是开发模式挂在 window 上的 __room / __voice（BattleRoomView.vue）；页面里的 error / unhandledrejection 也收起来一起报。
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { launchChrome, sleep, waitForServer } from "./lib/headless.mjs";

const BATTLE_PORT = 8788;
const VITE_PORT = 5199;
const BASE = `http://127.0.0.1:${VITE_PORT}`;
const KP = "s1-04-simple-addsub";
/** 假麦克风（有声音的）+ 自动允许权限 */
const MEDIA = ["--use-fake-device-for-media-capture", "--use-fake-ui-for-media-stream"];

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

/** 轮询等表达式为真（页面上的东西都是异步到的，直接查一次多半还没有） */
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
/** 起一个浏览器：先在根地址写好身份与名字（每台 clientId 不同）、装错误收集器，再重载到目标地址 */
/** 页面里包一层 WebSocket：进出的消息类型记到 window.__frames（rtc 只记方向 / 对象 / 是 sdp 还是候选），出错时倒出来看信令走没走通 */
const TAP = `(() => {
  const Orig = window.WebSocket;
  window.__frames = [];
  const note = (f) => { window.__frames.push(f); if (window.__frames.length > 400) window.__frames.shift(); };
  const brief = (m, dir, len) => ({ dir, type: m.type, ...(m.type === 'error' ? { error: m.error } : {}), ...(m.type === 'rtc' ? { who: dir === 'in' ? m.from : m.to, kind: Object.keys(m.data || {})[0], len } : {}) });
  window.WebSocket = function (url, protocols) {
    const ws = protocols === undefined ? new Orig(url) : new Orig(url, protocols);
    ws.addEventListener('message', (e) => { try { note(brief(JSON.parse(e.data), 'in', String(e.data).length)); } catch {} });
    const send = ws.send.bind(ws);
    ws.send = (d) => { try { note(brief(JSON.parse(d), 'out', String(d).length)); } catch {} return send(d); };
    return ws;
  };
  window.WebSocket.prototype = Orig.prototype;
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})()`;
async function open(name, clientId, url) {
  const page = await launchChrome({ width: 1024, height: 768, extraArgs: MEDIA });
  pages.push(page);
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: TAP });
  await page.navigate(BASE + "/", 1200);
  await page.ev(`localStorage.setItem('tongbulian:battle', JSON.stringify({ clientId: ${JSON.stringify(clientId)}, names: { me: ${JSON.stringify(name)}, left: '', right: '' } }))`);
  await page.navigate(url, 300);
  await page.ev("location.reload()");
  await sleep(1500);
  await page.ev(`window.__errs = window.__errs || []; addEventListener('error', (e) => __errs.push('error: ' + e.message)); addEventListener('unhandledrejection', (e) => __errs.push('rejection: ' + String(e.reason)))`);
  return page;
}
const peerState = (id) => `(__voice.peers[${JSON.stringify(id)}] || {}).state`;
const peerLevel = (id) => `(__voice.peers[${JSON.stringify(id)}] || {}).level || 0`;

try {
  await waitForServer(BASE);
  console.log(`dev ${BASE}，中继 127.0.0.1:${BATTLE_PORT}`);

  // 1. 主持人建房
  const host = await open("主持", "e2e-host-000000", `${BASE}/#/battle/new/${KP}`);
  await until(host, "document.querySelectorAll('.mode').length === 3", "设置页三张卡");
  await host.ev("document.querySelector('.mode[data-mode=online]').click()");
  await click(host, ".start-btn", "建房间");
  await until(host, "!!document.querySelector('.codes-page')", "二维码页");
  const redLink = await host.ev("document.querySelector('.code-card.red .url').textContent");
  const blueLink = await host.ev("document.querySelector('.code-card.blue .url').textContent");
  pass(`建房：${redLink.replace(/.*#/, "#")}`);

  // 2. 红蓝进房、自动开始
  const red = await open("小兔", "e2e-red-00000000", redLink);
  await until(red, "!!document.querySelector('.wait')", "红队连接状态窗口");
  const blue = await open("小虎", "e2e-blue-0000000", blueLink);
  for (const [p, who] of [
    [host, "主持"],
    [red, "红队"],
    [blue, "蓝队"],
  ])
    await until(p, "!!document.querySelector('.arena')", `${who}进竞技场`, 20000);
  const ids = {};
  for (const [k, p] of Object.entries({ host, red, blue })) ids[k] = await until(p, "__room && __room.you", `${k} 的身份`);
  pass(`三台进竞技场：${JSON.stringify(ids)}`);
  for (const p of [host, red, blue]) await until(p, "!!document.querySelector('.arena .bar .mic-btn')", "顶栏 🎤");
  pass("三台顶栏都有 🎤，都没开麦");

  // 3. 红队开麦：三台连上，听的两台收到音量
  await click(red, ".arena .bar .mic-btn", "红队 🎤");
  await until(red, "__voice.enabled === true", "红队开麦");
  await until(host, `${peerState(ids.red)} === 'connected'`, "主持人收红队（connected）", 20000);
  await until(blue, `${peerState(ids.red)} === 'connected'`, "蓝队收红队（connected）", 20000);
  await until(red, "Object.values(__voice.peers).filter((p) => p.state === 'connected').length === 2", "红队连上两台", 20000);
  pass("红队开麦：主持人与蓝队各一条只收的连接 connected，红队两条 connected");
  await until(host, "__voice.link === 'ok'", "主持人 link ok");
  await until(host, "document.querySelector('.arena .bar .mic-dot.ok') !== null", "主持人 🎤 上的绿点");
  pass("连接状态：link ok、绿点");
  const lvl = await until(host, `${peerLevel(ids.red)} > 0.001 ? ${peerLevel(ids.red)} : 0`, "主持人收到红队的音量", 10000).catch(() => 0);
  if (lvl > 0) pass(`主持人收到红队的音量 ${lvl.toFixed(3)}`);
  else bad.push("主持人 10 秒内没收到红队的音量（假麦克风可能没出声；连接本身是通的）");
  const mark = await until(host, "!!document.querySelector('.team.red .row .mic')", "主持人看到红队名字旁的 🎤");
  if (mark) pass("主持人看到红队名字旁的 🎤");

  // 4. 蓝队也开麦：红蓝那一对重建成双向，主持人多收一路
  await click(blue, ".arena .bar .mic-btn", "蓝队 🎤");
  await until(blue, "__voice.enabled === true", "蓝队开麦");
  await until(red, `${peerState(ids.blue)} === 'connected'`, "红队收蓝队（重建后 connected）", 20000);
  await until(blue, `${peerState(ids.red)} === 'connected'`, "蓝队收红队（重建后 connected）", 20000);
  await until(host, `${peerState(ids.blue)} === 'connected'`, "主持人收蓝队", 20000);
  pass("蓝队开麦：红蓝互连、主持人两路都 connected");

  // 5. 红队关麦：我发的连接都关，蓝队重建一条只收的给红队；主持人只剩蓝队那一路
  await click(red, ".arena .bar .mic-btn", "红队 🎤（关）");
  await until(red, "__voice.enabled === false", "红队关麦");
  await until(red, `${peerState(ids.blue)} === 'connected' && !__voice.peers[${JSON.stringify(ids.host)}]`, "红队只收蓝队", 20000);
  await until(host, `!__voice.peers[${JSON.stringify(ids.red)}] && ${peerState(ids.blue)} === 'connected'`, "主持人只收蓝队", 20000);
  pass("红队关麦：红队只收蓝队，主持人只收蓝队");

  // 6. 页面错误
  for (const [k, p] of Object.entries({ host, red, blue })) {
    const errs = (await p.ev("window.__errs")) ?? [];
    if (errs.length) bad.push(`${k} 页面有错误：${errs.join(" | ")}`);
  }
} catch (e) {
  bad.push(String(e?.message ?? e));
  // 出错时把三台的语音状态与页面错误倒出来，好定位
  for (const [i, p] of pages.entries()) {
    const dump = await p.ev("JSON.stringify({ enabled: __voice?.enabled, link: __voice?.link, peers: __voice?.peers, errs: window.__errs })").catch(() => null);
    console.log(`  页面 ${i}：${dump}`);
    const frames = await p.ev("JSON.stringify((window.__frames || []).filter((f) => f.type !== 'state' && f.type !== 'ping' && f.type !== 'pong'))").catch(() => null);
    console.log(`  页面 ${i} 的信令：${frames}`);
  }
} finally {
  await cleanup();
}

console.log("");
console.log(`通过 ${ok.length} 项${bad.length ? `，问题 ${bad.length} 项：` : ""}`);
for (const b of bad) console.log("  ✗ " + b);
process.exit(bad.length ? 1 : 0);

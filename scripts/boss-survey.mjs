/**
 * 打怪兽普查（需求 M14）：两部分，结果在 screenshots/survey/（不进仓库）。
 *   npm run boss:survey                关键画面：几种屏幕 × 几种玩法，各截 开打 / 蓄力 / 出拳 / 打倒 / 吼 / 扔果冻 / 暂停 / 最后十秒 / 结果页，每种屏幕拼一张 sheet-boss-<屏幕>.png
 *   npm run boss:survey -- questions   题目排版：每一种「题干部件组合 × 作答方式」各找一道代表题，在打怪兽的几种布局里各截一张，
 *                                      并量一下作答区有没有掉出屏幕、题干有没有被挤到要滚动（量出来的问题打印出来），拼 sheet-bossq-<布局>-<n>.png
 * 先 npm run dev（或 BASE_URL 指到别的地址）；环境变量 CHROME 可改浏览器。
 * 竞技场在开发模式把 store 挂在 window.__boss 上：靠它跳过倒数、摆输入、交答案、让 Boss 表演、暂停、把时间拨到最后十秒 / 时间到。
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer, createServerModuleRunner } from "vite";
import { launchChrome, sleep, waitForServer } from "./lib/headless.mjs";

const BASE = (process.env.BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
const outDir = new URL("../screenshots/survey", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const QUESTIONS = process.argv.slice(2).includes("questions");
/** 只跑某几种布局（题目排版那部分）：npm run boss:survey -- questions ipad-solo ipad-duo；key=lineup 只跑组合名里带 lineup 的题型 */
const ONLY = process.argv.slice(2).filter((a) => a !== "questions" && !a.startsWith("key="));
const KEYS = process.argv.slice(2).filter((a) => a.startsWith("key=")).map((a) => a.slice(4));
const KP = "s1-05-carry-add";
// 小动物定死（没选的每次打开随机，B17）；规则卡今天已经讲过（不挡画面）；音乐关掉
const PREFS = (now) => JSON.stringify({ v: 2, clientId: "survey", names: { me: "A", left: "", right: "B" }, avatars: { me: "rabbit", right: "cat" }, aiLevel: "mid", music: false, intros: { boss: now } });
const SETUP = `(()=>{localStorage.setItem('tongbulian:install','{"until":9007199254740991}');localStorage.setItem('tongbulian:battle',${JSON.stringify(PREFS(Date.now()))});return 'ok'})()`;
const SCREENS = [
  { name: "ipad", w: 1024, h: 768, scale: 1.5 },
  { name: "phone-land", w: 844, h: 390, scale: 2 },
  { name: "phone-small", w: 667, h: 375, scale: 2 },
  { name: "phone-port", w: 390, h: 844, scale: 2, soloOnly: true },
];
const MODES = [
  { name: "solo", q: "mode=solo" },
  { name: "ai-coop", q: "mode=ai&v=coop" },
  { name: "duo-coop", q: "mode=duo&v=coop" },
  { name: "duo-versus", q: "mode=duo&v=versus" },
];
const ANSWER = `const ans=(p)=>{const q=window.__boss.questionOf(p);return q.answer.kind==='number'?q.answer.value:q.answer.choiceId}`;
const POSES = [
  { name: "play", js: "", wait: 900 },
  { name: "charge", js: "window.__boss.setInput('left','12')", wait: 350 },
  { name: "hit", js: `${ANSWER};const p=window.__boss.state.players[0];window.__boss.submit(p.id,ans(p))`, wait: 160 },
  {
    name: "down",
    js: `${ANSWER};(async()=>{for(let i=0;i<6;i++){const p=window.__boss.state.players[0];window.__boss.submit(p.id,ans(p));await new Promise(r=>setTimeout(r,420))}})()`,
    wait: 3200,
  },
  // Boss 的表演（M8）：吼、扔果冻；各打各的只演红队那只
  { name: "roar", js: "window.__boss.taunt(window.__boss.state.bosses[0].side,'roar')", wait: 650 },
  // 吼完（1.2 秒）Boss 回到待机才接下一段表演
  { name: "jelly", js: "setTimeout(()=>window.__boss.taunt(window.__boss.state.bosses[0].side,'jelly'),700)", wait: 1400 },
  { name: "paused", js: "window.__boss.pause()", wait: 500 },
  { name: "last-ten", js: "window.__boss.resume();const s=window.__boss.state;window.__boss.state={...s,endsAt:Date.now()+8000};window.__boss.advance()", wait: 1200 },
  { name: "result", js: "const s=window.__boss.state;window.__boss.state={...s,endsAt:Date.now()-1};window.__boss.advance()", wait: 3600 },
];

/**
 * 打开一局（等到开打为止：dev 服务器热更新会让页面重挂载回到倒数）。先跳一下空白页：打怪兽竞技场的路由 key 是固定的，
 * 同一个地址只换参数（换玩法）不会重开一局
 */
async function openArena(b, kp, query) {
  for (let i = 0; i < 5; i++) {
    await b.navigate("about:blank", 150);
    await b.navigate(`${BASE}/#/boss/local/${kp}?${query}`, 1800);
    await b.ev("(()=>{window.__boss?.beginPlay();return 'ok'})()");
    await sleep(300);
    if ((await b.ev("window.__boss?.state?.phase")) === "playing") return true;
  }
  return false;
}

/** 把一组截图拼成一张（最多两列，按自然尺寸） */
async function sheet(b, frames, name) {
  await b.device(2100, 1400, 1, false);
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222;font:14px monospace;color:#fff">
<div style="display:flex;flex-wrap:wrap;gap:16px;padding:12px;width:2076px">
${frames.map((f) => `<figure style="margin:0"><figcaption style="padding:2px 4px">${f.label}</figcaption><img src="file://${f.file}" style="display:block;max-width:1020px;max-height:760px"></figure>`).join("\n")}
</div></body>`;
  const page = join(outDir, `${name}.html`);
  writeFileSync(page, html);
  await b.navigate("file://" + page, 1500);
  const h = await b.ev("document.body.scrollHeight");
  await b.device(2100, Math.max(400, Math.min(8000, h + 20)), 1, false);
  await sleep(300);
  await b.capture(join(outDir, `${name}.png`));
  rmSync(page);
  console.log("拼图", name);
}

/** 题目排版的毛病：作答区底边掉出屏幕、题干要滚动才看得全 */
const MEASURE = `(()=>{const out=[];for(const side of document.querySelectorAll('.boss-arena .side')){const r=side.getBoundingClientRect();const panel=side.querySelector('.a > *');if(panel){const pr=panel.getBoundingClientRect();if(pr.bottom>innerHeight+1)out.push('作答区掉出屏幕 '+Math.round(pr.bottom-innerHeight)+'px')}const q=side.querySelector('.q');if(q&&q.scrollHeight>q.clientHeight+2)out.push('题干要滚动 '+(q.scrollHeight-q.clientHeight)+'px');if(r.bottom>innerHeight+1)out.push('作答栏掉出屏幕')}return out})()`;

await waitForServer(BASE);
const b = await launchChrome();
try {
  await b.navigate(BASE + "/#/", 800);
  await b.ev(SETUP);
  if (!QUESTIONS) {
    for (const screen of SCREENS) {
      const frames = [];
      for (const mode of MODES) {
        if (screen.soloOnly && mode.name !== "solo") continue;
        await b.device(screen.w, screen.h, screen.scale);
        await b.ev(SETUP);
        if (!(await openArena(b, KP, mode.q))) {
          console.log("✗ 开不了局", screen.name, mode.name);
          continue;
        }
        for (const pose of POSES) {
          if (pose.js) await b.ev(`(()=>{${pose.js};return 'ok'})()`);
          await sleep(pose.wait);
          const file = join(outDir, `boss-${screen.name}-${mode.name}-${pose.name}.png`);
          await b.capture(file, null, 1);
          frames.push({ file, label: `${screen.name} · ${mode.name} · ${pose.name}` });
          console.log("✓", screen.name, mode.name, pose.name);
        }
      }
      if (frames.length) await sheet(b, frames, `sheet-boss-${screen.name}`);
    }
  } else {
    // 1. 枚举组合：每个知识点 40 个种子的第一题，按「题干部件种类 + 作答方式」去重（同 battle-survey）
    const combos = [];
    const server = await createServer({ configFile: "vite.config.ts", logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
    try {
      const runner = createServerModuleRunner(server.environments.ssr);
      const { allCourses, loadAllCourses } = await runner.import("/src/engine/catalog.ts");
      await loadAllCourses();
      const { hasGenerator } = await runner.import("/src/engine/index.ts");
      const { questionAt } = await runner.import("/src/battle/stream.ts");
      const seen = new Map();
      for (const course of allCourses()) {
        for (const kp of course.knowledgePoints) {
          if (!hasGenerator(kp.id)) continue;
          for (let seed = 1; seed <= 40; seed++) {
            const q = questionAt(kp.id, seed, 0);
            const key = `${[...new Set(q.stem.map((p) => p.kind))].sort().join("+")}|${q.input}`;
            if (!seen.has(key)) seen.set(key, { key, kp: kp.id, seed });
          }
        }
      }
      combos.push(...[...seen.values()].sort((a, c) => a.key.localeCompare(c.key)).filter((c) => !KEYS.length || KEYS.some((k) => c.key.includes(k))));
    } finally {
      await server.close();
    }
    console.log(`${combos.length} 种组合`);
    // 2. 每种布局截一遍：一个人（iPad / 手机横屏 / 手机竖屏）、两人一台（iPad / 手机横屏）
    const LAYOUTS = [
      { name: "ipad-solo", w: 1024, h: 768, scale: 1, q: "mode=solo" },
      { name: "ipad-duo", w: 1024, h: 768, scale: 1, q: "mode=duo&v=coop" },
      { name: "phone-land-solo", w: 844, h: 390, scale: 1, q: "mode=solo" },
      { name: "phone-land-duo", w: 844, h: 390, scale: 1, q: "mode=duo&v=coop" },
      { name: "phone-small-duo", w: 667, h: 375, scale: 1, q: "mode=duo&v=coop" },
      { name: "phone-port-solo", w: 390, h: 844, scale: 1, q: "mode=solo" },
    ];
    const problems = [];
    for (const layout of LAYOUTS.filter((l) => !ONLY.length || ONLY.includes(l.name))) {
      const frames = [];
      for (const c of combos) {
        await b.device(layout.w, layout.h, layout.scale);
        await b.ev(SETUP);
        if (!(await openArena(b, c.kp, layout.q))) {
          console.log("✗ 开不了局", layout.name, c.key);
          continue;
        }
        await b.ev(`(()=>{const s=window.__boss.state;window.__boss.state={...s,players:s.players.map(p=>({...p,seed:${c.seed},index:0}))};return 'ok'})()`);
        await sleep(900);
        const bad = await b.ev(MEASURE);
        if (bad?.length) problems.push(`${layout.name} · ${c.key} · ${c.kp}#${c.seed}：${bad.join('；')}`);
        const file = join(outDir, `bossq-${layout.name}-${frames.length}.png`);
        await b.capture(file, null, 1);
        frames.push({ file, label: `${layout.name} · ${c.key}${bad?.length ? " ⚠" : ""}` });
      }
      for (let i = 0; i < frames.length; i += 12) await sheet(b, frames.slice(i, i + 12), `sheet-bossq-${layout.name}-${i / 12 + 1}`);
    }
    console.log(problems.length ? `有 ${problems.length} 处放不下：\n${problems.join("\n")}` : "全部放得下");
  }
} finally {
  await b.close();
}

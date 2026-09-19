/**
 * 无头 Chrome（CDP）小工具：起浏览器、发命令、执行表达式、截图（可只截某个元素的区域）。
 * 给 scripts/ 下的截图 / 普查脚本共用；环境变量 CHROME 可改浏览器路径。
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 等 dev server 起来（最多约 60 秒） */
export async function waitForServer(base) {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(base + "/");
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error("dev server 没起来：" + base);
}

export async function launchChrome({ width = 1024, height = 768 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "headless-"));
  const port = 9700 + Math.floor(Math.random() * 200);
  const chrome = spawn(
    CH,
    [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", `--window-size=${width},${height}`, "--no-first-run", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore" },
  );
  async function json(u) {
    for (let i = 0; i < 40; i++) {
      try {
        return await (await fetch(u)).json();
      } catch {
        await sleep(250);
      }
    }
    throw new Error("chrome not ready");
  }
  const targets = await json(`http://127.0.0.1:${port}/json`);
  const page = targets.find((t) => t.type === "page") ?? targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
      setTimeout(() => {
        if (pending.has(i)) {
          pending.delete(i);
          console.log("TIMEOUT " + method);
          r({ result: {} });
        }
      }, 20000);
    });
  const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  await send("Page.enable");
  await send("Runtime.enable");

  /** 设备尺寸（CSS 像素）、像素比、横竖屏 */
  async function device(w, h, scale, mobile = true) {
    const landscape = w > h;
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: h,
      deviceScaleFactor: scale,
      mobile,
      screenOrientation: { type: landscape ? "landscapePrimary" : "portraitPrimary", angle: landscape ? 90 : 0 },
    });
  }

  /** 截整页，或只截 selector 那个元素的区域（clip 用 CSS 像素） */
  async function capture(file, selector = null, scale = 1) {
    const params = { format: "png" };
    if (selector) {
      const box = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const b=e.getBoundingClientRect();return {x:b.left,y:b.top,width:b.width,height:b.height}})()`);
      if (!box) throw new Error("找不到 " + selector);
      params.clip = { ...box, scale };
    }
    const r = await send("Page.captureScreenshot", params);
    if (!r.result?.data) throw new Error("截图失败：" + file);
    writeFileSync(file, Buffer.from(r.result.data, "base64"));
  }

  async function navigate(url, wait = 0) {
    await send("Page.navigate", { url });
    if (wait) await sleep(wait);
  }

  async function close() {
    ws.close();
    await new Promise((r) => {
      chrome.once("exit", r);
      chrome.kill();
    });
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  }

  return { send, ev, device, capture, navigate, close };
}

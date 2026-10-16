/**
 * 首页宣传片（需求 F1）：scripts/promo/ 那一页（scene.ts）在无头 Chrome 里一帧一帧画、截图交给 ffmpeg 编码；
 * 声音由那一页用 OfflineAudioContext 渲染（背景乐、音效、旁白），旁白用 Edge 神经语音（edge-tts，同 npm run audio）合成。
 * 产出 src/assets/promo/promo-<zh|en>.mp4（1280×720、30 帧、H.264 + AAC、响度 -16 LUFS，约 1.5 MB）与首页封面
 * promo-<zh|en>.webp，首页的 components/ui/PromoVideo.vue 引用（构建时带内容哈希进 dist/assets/，不进预缓存）。
 * 片尾的知识点数、年级、学科取自目录（同 npm run og），网址取自 .env 的 SITE_URL：加了年级 / 学科后重跑一次。
 * 用法：npm run promo [-- zh|en]。需要 Chrome（环境变量 CHROME 可改路径）、ffmpeg（环境变量 FFMPEG、PATH 里的，或 Python 包
 * imageio-ffmpeg 自带的）、edge-tts 并联网；字幕用 macOS 的圆体（Yuanti SC）。合成的旁白缓存在系统临时目录 tongbulian-promo-tts。
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer, createServerModuleRunner, loadEnv } from 'vite'
import { launchChrome, sleep } from './lib/headless.mjs'

const LANGS = ['zh', 'en'].filter((l) => !process.argv.slice(2).some((a) => /^(zh|en)$/.test(a)) || process.argv.includes(l))
const OUT = resolve('src/assets/promo')
const CACHE = join(tmpdir(), 'tongbulian-promo-tts')
/** 跑 edge-tts（同 scripts/build-audio.py：2026-10 起旧的合成地址回 403，还连旧地址时先换到 api.msedgeservices.com） */
const EDGE_TTS_MAIN = `
import edge_tts.communicate as c, edge_tts.constants as k
if "speech.platform.bing.com" in c.WSS_URL:
    c.WSS_URL = k.WSS_URL = "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=" + k.TRUSTED_CLIENT_TOKEN
from edge_tts.util import main
main()
`

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg'
  const r = spawnSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' })
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim()
  throw new Error('找不到 ffmpeg：装一个、或设环境变量 FFMPEG、或 pip install imageio-ffmpeg')
}
const FF = findFfmpeg()
const ff = (args) => spawnSync(FF, ['-hide_banner', ...args], { encoding: 'utf8' })

/** 合成一句旁白 → 去掉首尾静音的 48 kHz 单声道 WAV；返回 WAV 路径、时长、句中每段声音开口的时刻（按停顿量） */
function synth(voice, { text, rate = '+0%' }) {
  mkdirSync(CACHE, { recursive: true })
  const key = createHash('sha1').update(`${voice}|${rate}|${text}`).digest('hex').slice(0, 12)
  const mp3 = join(CACHE, `${key}.mp3`)
  const wav = join(CACHE, `${key}.wav`)
  if (!existsSync(mp3)) {
    let err = ''
    for (let i = 0; i < 3 && !existsSync(mp3); i++) {
      const r = spawnSync('python3', ['-c', EDGE_TTS_MAIN, '--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', `${mp3}.part`], { encoding: 'utf8' })
      if (r.status === 0) renameSync(`${mp3}.part`, mp3)
      else err = r.stderr.slice(-300)
    }
    if (!existsSync(mp3)) throw new Error(`edge-tts 合成失败：${text}\n${err}`)
  }
  if (!existsSync(wav)) {
    // 开头留 10 毫秒、结尾留 30 毫秒（-45 dB 以下算静音）
    const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.01,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse'
    execFileSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', '-i', mp3, '-af', trim, '-ar', '48000', '-ac', '1', wav])
  }
  const det = ff(['-i', wav, '-af', 'silencedetect=noise=-38dB:d=0.07', '-f', 'null', '-']).stderr
  const dur = Number(/Duration: \d+:\d+:([\d.]+)/.exec(det)?.[1] ?? 0)
  const onsets = [0, ...[...det.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t < dur - 0.05)]
  return { wav, dur, onsets }
}

/** ffmpeg loudnorm 第一遍：量响度（第二遍按量出来的数线性拉到 -16 LUFS，峰值 -1.5 dBTP） */
function loudness(wav) {
  const out = ff(['-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']).stderr
  const j = JSON.parse(out.slice(out.lastIndexOf('{'), out.lastIndexOf('}') + 1))
  return `measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}`
}

// 片尾的数：知识点数、年级、学科（同首页的 SEO 文案）
const env = loadEnv('production', process.cwd(), '')
const site = (env.SITE_URL ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
const server = await createServer({
  configFile: 'vite.config.ts',
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 5400 + Math.floor(Math.random() * 200), strictPort: false, hmr: false },
})
const work = mkdtempSync(join(tmpdir(), 'promo-'))
let chrome = null
try {
  const runner = createServerModuleRunner(server.environments.ssr)
  const { homeMeta } = await runner.import('/src/seo/site.ts')
  const { liveCourses } = await runner.import('/src/engine/catalog.ts')
  const courses = liveCourses()
  const grades = [...new Set(courses.map((c) => Number(c.grade.id.slice(1))))].sort((a, b) => a - b)
  const query = new URLSearchParams({
    kp: String(homeMeta().kpCount),
    grades: `${grades[0]}-${grades[grades.length - 1]}`,
    subjects: [...new Set(courses.map((c) => c.subject.id))].join(','),
    site,
  })
  await server.listen()
  const base = server.resolvedUrls.local[0].replace(/\/+$/, '')
  mkdirSync(OUT, { recursive: true })
  chrome = await launchChrome({ width: 1280, height: 720 })
  // 2 倍像素比画，ffmpeg 再缩到 1280×720：细线、文字边缘更干净
  await chrome.device(1280, 720, 2, false)

  for (const lang of LANGS) {
    const t0 = Date.now()
    query.set('lang', lang)
    await chrome.navigate(`${base}/scripts/promo/index.html?${query}`)
    for (let i = 0; ; i++) {
      const st = await chrome.ev('window.__promo ? (window.__promo.error || window.__promo.ready()) : false')
      if (st === true) break
      if (typeof st === 'string') throw new Error(st)
      if (i > 300) throw new Error('画面页 60 秒没准备好')
      await sleep(200)
    }
    const api = await chrome.ev('({ frames: window.__promo.frames, fps: window.__promo.fps, poster: window.__promo.poster, voice: window.__promo.voice })')
    const voices = api.voice.lines.map((line) => synth(api.voice.name, line))
    // 「怎么玩」那句（一个人、两个人、一群人，都能玩）每段开口的时刻：英文只有三段，「都能玩」那一下放在句末
    const o = voices[3].onsets
    const cues = [0, o[1] ?? 0.8, o[2] ?? 1.6, o[3] ?? Math.max((o[2] ?? 1.6) + 0.5, voices[3].dur - 0.25)]
    await chrome.ev(`window.__promo.configure(${JSON.stringify({ cues })})`)

    // 声音先渲染（画面按帧推进，要从第 0 帧画起；声音不依赖画面）
    const b64 = voices.map((v) => readFileSync(v.wav).toString('base64'))
    const r = await chrome.send('Runtime.evaluate', { expression: `window.__promo.audio(${JSON.stringify(b64)})`, awaitPromise: true, returnByValue: true })
    const wavData = r.result?.result?.value
    if (typeof wavData !== 'string') throw new Error(`声音渲染失败：${JSON.stringify(r).slice(0, 300)}`)
    const wav = join(work, `${lang}.wav`)
    writeFileSync(wav, Buffer.from(wavData, 'base64'))
    const norm = loudness(wav)

    // 画面：PNG 一帧帧喂给 ffmpeg，和声音一起编码；末尾 0.25 秒声音淡出（循环播放时不咔哒一下）
    const mp4 = join(OUT, `promo-${lang}.mp4`)
    const dur = api.frames / api.fps
    const enc = spawn(
      FF,
      [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', String(api.fps), '-c:v', 'png', '-i', '-',
        '-i', wav,
        '-filter_complex', `[0:v]scale=1280:720:flags=lanczos,format=yuv420p[v];[1:a]loudnorm=I=-16:TP=-1.5:LRA=11:${norm}:linear=true,afade=t=out:st=${(dur - 0.25).toFixed(2)}:d=0.25[a]`,
        '-map', '[v]', '-map', '[a]',
        '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', '30', '-profile:v', 'high', '-g', '60',
        '-c:a', 'aac', '-b:a', '96k', '-ar', '48000',
        '-movflags', '+faststart', '-t', dur.toFixed(3),
        mp4,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    )
    const encoded = new Promise((ok, fail) => enc.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出码 ${code}`)))))
    for (let i = 0; i < api.frames; i++) {
      const fr = await chrome.send('Runtime.evaluate', { expression: `window.__promo.frame(${i}).then(() => 'ok', (e) => String(e && e.stack || e))`, awaitPromise: true, returnByValue: true })
      if (fr.result?.result?.value !== 'ok') throw new Error(`第 ${i} 帧：${fr.result?.result?.value ?? JSON.stringify(fr).slice(0, 300)}`)
      const shot = await chrome.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })
      if (!shot.result?.data) throw new Error(`第 ${i} 帧截图失败`)
      const png = Buffer.from(shot.result.data, 'base64')
      if (i === api.poster) writeFileSync(join(work, `${lang}-poster.png`), png)
      if (!enc.stdin.write(png)) await new Promise((ok) => enc.stdin.once('drain', ok))
      if (i % 90 === 0) process.stdout.write(`\r${lang} ${i}/${api.frames}`)
    }
    enc.stdin.end()
    await encoded
    // 封面：首页视频开始播放前、减少动画 / 省流量时显示的那一帧
    const poster = join(OUT, `promo-${lang}.webp`)
    execFileSync(FF, ['-y', '-hide_banner', '-loglevel', 'error', '-i', join(work, `${lang}-poster.png`), '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', poster])
    const kb = (f) => `${Math.round(readFileSync(f).length / 1024)} KB`
    console.log(`\r✓ ${lang}：${mp4}（${kb(mp4)}）、${poster}（${kb(poster)}），${((Date.now() - t0) / 1000).toFixed(0)} 秒`)
  }
} finally {
  await chrome?.close()
  await server.close()
  rmSync(work, { recursive: true, force: true })
}

/**
 * 同步的 SHA-1（十六进制），给朗读片段算文件名用（N8）：音频文件名是 `<语言>-<sha1(文本)[:10]>`，
 * 页面里只带一份「有哪些哈希」的紧凑表（virtual:audio-clips），不再带 265 KB 的「文本 → 文件名」全表。
 * SubtleCrypto 是异步的，而切片段 → 找文件这条链是同步的，所以自己实现；每道题只算几条短字符串，开销可忽略。
 */
const enc = new TextEncoder()

function rotl(x: number, n: number): number {
  return (x << n) | (x >>> (32 - n))
}

export function sha1Hex(text: string): string {
  const bytes = enc.encode(text)
  const bitLen = bytes.length * 8
  // 填充：0x80、补零到 56 mod 64、末 8 字节是大端的比特长度
  const total = (((bytes.length + 8) >> 6) + 1) << 6
  const buf = new Uint8Array(total)
  buf.set(bytes)
  buf[bytes.length] = 0x80
  const view = new DataView(buf.buffer)
  view.setUint32(total - 8, Math.floor(bitLen / 0x100000000))
  view.setUint32(total - 4, bitLen >>> 0)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Int32Array(80)
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(off + i * 4)
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3]! ^ w[i - 8]! ^ w[i - 14]! ^ w[i - 16]!, 1)
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const t = (rotl(a, 5) + f + e + k + w[i]!) | 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = t
    }
    h0 = (h0 + a) | 0
    h1 = (h1 + b) | 0
    h2 = (h2 + c) | 0
    h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0
  }
  return [h0, h1, h2, h3, h4].map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
}

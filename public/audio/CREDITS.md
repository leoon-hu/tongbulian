# 音频来源

这里的 mp3 是题目朗读用的片段（数字、短语、emoji 的名字、运算符的读法），由 `scripts/build-audio.py` 生成：

- `zh-*.mp3`（3542 条）：Microsoft Edge 神经语音 zh-CN-XiaoyiNeural（edge-tts，语速 -10%）合成，
  裁静音、响度归一到 -18 dB 后转成 24 kHz 单声道 48 kbps。
- `en-*.mp3`（3311 条）：Microsoft Edge 神经语音 en-US-JennyNeural（edge-tts，语速 -10%）合成，
  裁静音、响度归一到 -18 dB 后转成 24 kHz 单声道 48 kbps。

文件名是 `<语言>-<片段文本的 sha1 前 10 位>`，文本 → 文件名的对应表在 `src/audio/manifest.json`，
片段清单在 `src/audio/corpus.json`。合成语音仅供学习使用。

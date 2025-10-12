import { writeFileSync } from 'fs'
import { exit } from 'process'

const host = process.env.VOICE_RECOGNITION_CDN ?? ''
const filenames = ["sherpa-onnx-wasm-main-asr.data", "sherpa-onnx-wasm-main-asr.wasm"]

for (const file of filenames) {
  const response = await fetch(`${host}/${file}`)
  if (response.status !== 200) {
    console.error(`Fail to download ${file}`)
    exit(1)
  }
  const buffer = await response.arrayBuffer()
  writeFileSync(`public/${file}`, new Uint8Array(buffer))
}

import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import replace from '@rollup/plugin-replace'
import { run } from 'vite-plugin-run'
import { VitePWA, VitePWAOptions } from 'vite-plugin-pwa'

const resources = [
  'rime.data', 'rime.js', 'rime.wasm',
  // 'sherpa-onnx-wasm-main-asr.wasm', 'sherpa-onnx-wasm-main-asr.js' /* ,'sherpa-onnx-wasm-main-asr.data' */
]

const workbox: VitePWAOptions["workbox"] = {
  maximumFileSizeToCacheInBytes: 3145728,
  globPatterns: [
    '**/*.{js,css,html}',
    'apple-touch-icon.png',
    ...resources
  ]
}

if (process.env.LIBRESERVICE_CDN) {
  workbox.manifestTransforms = [
    manifest => ({
      manifest: manifest.map(entry => resources.includes(entry.url) ? {
        url: process.env.LIBRESERVICE_CDN + entry.url,
        revision: entry.revision,
        size: entry.size
      } : entry),
      warnings: []
    })
  ]
}

const plugins = [
  replace({
    __LIBRESERVICE_CDN__: process.env.LIBRESERVICE_CDN || '',
    __COMMIT__: execSync('git rev-parse HEAD').toString().trim(),
    __BUILD_DATE__: new Date().toLocaleString()
  }),
  VitePWA({
    registerType: 'autoUpdate',
    workbox,
    includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
    manifest: {
      name: "VR在线输入法",
      short_name: "VR在线输入法",
      description: "为Meta Quest用户打造的在线中文输入法",
      icons: [
        {
          "src": "pwa-64x64.png",
          "sizes": "64x64",
          "type": "image/png"
        },
        {
          "src": "pwa-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "pwa-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        },
        {
          "src": "maskable-icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ],
      theme_color: '#000',
      screenshots: [
        {
          "src": "screenshot.png",
          "type": "image/png",
          "sizes": "1024x768",
          "form_factor": "wide"
        }
      ]
    }
  }),
  vue(),
  vueJsx()
]

if (process.env.NODE_ENV !== 'production') {
  const watchFiles = [
    'worker.ts',
    'schema-files.json',
    'schema-name.json',
    'schema-target.json',
    'dependency-map.json',
    'target-files.json',
    'target-version.json'
  ]
  plugins.push(run({
    input: [
      {
        name: 'Transpile worker',
        run: ['pnpm run worker'],
        condition: file => watchFiles.some(name => file.includes(name))
      }
    ],
    silent: false
  }))
}

export default defineConfig({
  base: '',
  plugins,
  server: {
    watch: {
      ignored: ['**/boost/**', '**/build/**', '**/dist/**', '**/librime/**', '**/scripts/**', '**/wasm/**'],
    },
  }
})

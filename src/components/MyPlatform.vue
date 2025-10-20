<script setup lang="ts">
import { h, Component } from 'vue'
import { NA } from 'naive-ui'
import {
  Linux,
  Windows,
  Apple,
  Android,
  AppStoreIos,
  Terminal,
  InternetExplorer
} from '@vicons/fa'
import { MyFeaturePanel } from '@libreservice/my-widget'

function generateContent(project: string, name: string, href: string) {
  return [h(NA, { href, target: '_blank' }, project), ' ' + name]
}

const platforms: {
  icon: Component,
  title: string
  content?: () => any
  description?: string
}[] = [
    {
      icon: Linux,
      title: 'Linux',
      content: () => [
        h('div', {}, generateContent('fcitx5-rime', '小企鹅', 'https://github.com/fcitx/fcitx5-rime')),
        h('div', {}, generateContent('ibus-rime', '中州韵', 'https://github.com/rime/ibus-rime'))
      ]
    },
    {
      icon: Windows,
      title: 'Windows',
      content: () => [
        h('div', {}, generateContent('Weasel', '小狼毫', 'https://github.com/rime/weasel')),
        h('div', {}, generateContent('Rabbit', '玉兔毫', 'https://github.com/amorphobia/rabbit')),
        h('div', {}, generateContent('Xiaobai-t9', '小白T9', 'https://t9.xiaobai.pro/'))
      ]
    },
    {
      icon: Apple,
      title: 'macOS',
      content: () => [
        h('div', {}, generateContent('fcitx5-macos', '小企鹅', 'https://github.com/fcitx-contrib/fcitx5-macos')),
        h('div', {}, generateContent('Squirrel', '鼠须管', 'https://github.com/rime/squirrel'))
      ]
    },
    {
      icon: Android,
      title: 'Android',
      content: () => [
        h('div', {}, generateContent('fcitx5-android', '小企鹅', 'https://github.com/fcitx5-android/fcitx5-android')),
        h('div', {}, generateContent('Trime', '同文', 'https://github.com/osfans/trime')),
        h('div', {}, generateContent('YuyanIme', '语燕输入法', 'https://github.com/gurecn/YuyanIme'))
      ]
    },
    {
      icon: AppStoreIos,
      title: 'iOS',
      content: () => generateContent('Hamster', '仓', 'https://github.com/imfuxiao/Hamster')
    },
    {
      icon: Terminal,
      title: 'Command Line',
      content: () => generateContent('librime', '中州韵输入法引擎', 'https://github.com/rime/librime')
    },
    {
      icon: InternetExplorer,
      title: 'Web',
      content: () => [
        h('div', {}, generateContent('My RIME', "梧桐输入法", "https://github.com/LibreService/my_rime")), 
        h('div', {}, generateContent('fcitx5-rime.js', "", "https://github.com/rimeinn/fcitx5-rime.js")), 
        h('div', {}, generateContent('VRIME', "👈 你在这", "https://github.com/zhou9110/vr_pinyin"))
      ]
    }
  ]
</script>

<template>
  <my-feature-panel style="text-align: center; white-space: break-spaces;" title="喜欢 RIME 吗？您还可以在以下系统里安装开源输入法!
  Love Rime? Install Open Source IME on your platform!"
    :features="platforms" />
</template>

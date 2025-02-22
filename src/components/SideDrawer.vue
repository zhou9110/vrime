<script setup lang="ts">
import {
  ref, defineAsyncComponent, computed, watch, defineProps
} from 'vue'
import MyFooter from './MyFooter.vue'
import {
  getTextarea,
  isMobile,
} from '../util'
import MicroPlum from './micro-plum/MicroPlum.vue'
import MyPlatform from './MyPlatform.vue'
import MyAppearance from './MyAppearance.vue'
import MyDeployer from './MyDeployer.vue'
import type MySimulator from './MySimulator.vue'
import type MyEditor from './MyEditor.vue'

import { homepage } from '../../package.json'
import { NA, NP, NInput, NSpace, NFlex, NSwitch, useMessage, NButton, NDrawer, NDrawerContent, NIcon, NLayout, NLayoutFooter } from 'naive-ui'
import {
  getQueryString,
} from '../util'

const AsyncSimulator = defineAsyncComponent(() => import('../components/MySimulator.vue'))
const AsyncEditor = defineAsyncComponent(() => import('../components/MyEditor.vue'))

const advancedLoaded = ref<boolean>(Boolean(getQueryString('debug')))
const showAdvanced = ref<boolean>(advancedLoaded.value)
const editorLoaded = ref<boolean>(advancedLoaded.value && !isMobile.value)
const showEditor = computed(() => showAdvanced.value && !isMobile.value)

const debugMode = ref<boolean>()

watch(showEditor, (newValue: boolean) => {
  if (newValue) {
    editorLoaded.value = true
  }
})

function toggleAdvanced(newValue: boolean) {
  advancedLoaded.value = true
  showAdvanced.value = newValue
}

const props = defineProps<{
  panel: any;
}>()
const { panel } = props

defineExpose({
  debugMode
})
</script>

<template>
  <n-layout style="background: transparent; height: 100%;" :native-scrollbar="false">
    <my-appearance />
    <my-deployer />
    <micro-plum />
    <n-space style="align-items: center">
      <h3>高级</h3>
      <n-switch :value="showAdvanced" @update:value="toggleAdvanced" />
    </n-space>
    <component :is="AsyncSimulator" v-if="advancedLoaded" v-show="showAdvanced" ref="simulator" :debug="panel?.debug" :debugMode="debugMode" />
    <component :is="AsyncEditor" v-if="editorLoaded" v-show="showEditor" ref="editor" />
    <my-platform />
    <n-p style="margin-top: 10px;">
      喜欢这个网站的话，可以关注我的
      <n-a href="https://space.bilibili.com/627876">B站账号</n-a>或者给<n-a
        href="https://github.com/zhou9110/vr_pinyin">Github仓库</n-a>点个星标🌟。<br />
      也可以请我喝杯咖啡或者可乐
      <span>
        <a href='https://ko-fi.com/O4O515LV4N' target='_blank'><img height='36' style='border:0px;height:36px;'
            src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
      </span>
    </n-p>
    <n-p>欢迎提供改进建议以及BUG反馈，您的支持是我最大的动力 (ò ω ó )</n-p>
    <n-p>
      该站点基于 <n-a href="https://github.com/LibreService/my_rime">My Rime</n-a> 开发<br />
      This site is based on <n-a href="https://github.com/LibreService/my_rime">My Rime</n-a>
    </n-p>
    <n-layout-footer>
      <my-footer class="my-footer" :homepage="homepage" commit="__COMMIT__" build-date="__BUILD_DATE__" />
    </n-layout-footer>
  </n-layout>
</template>

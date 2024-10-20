<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { NInput, NSpace, NSwitch, useMessage, NButton, NDrawer, NDrawerContent } from 'naive-ui'
import { MyFooter } from '@libreservice/my-widget'
import MyMenu from '../components/MyMenu.vue'
import MyPanel from '../components/MyPanel.vue'
import MyBar from '../components/MyBar.vue'
import MyAppearance from '../components/MyAppearance.vue'
import MyFont from '../components/MyFont.vue'
import MyDeployer from '../components/MyDeployer.vue'
import type MySimulator from '../components/MySimulator.vue'
import type MyEditor from '../components/MyEditor.vue'
import MicroPlum from '../components/micro-plum/MicroPlum.vue'
import MyPlatform from '../components/MyPlatform.vue'
import SimpleKeyboard from '../components/SimpleKeyboard.vue'
import {
  setQuery,
  getTextarea,
  getQueryString,
  isMobile
} from '../util'
import {
  init,
  text
} from '../control'
import { setMessage } from '../micro-plum'

setQuery(useRoute().query)
setMessage(useMessage())
init()

let savedStart = 0
let savedEnd = 0

function onBlur () {
  const textarea = getTextarea()
  savedStart = textarea.selectionStart
  savedEnd = textarea.selectionEnd
}

function onFocus () {
  const textarea = getTextarea()
  textarea.selectionStart = savedStart
  textarea.selectionEnd = savedEnd
}

const panel = ref<InstanceType<typeof MyPanel>>()
const simulator = ref<InstanceType<typeof MySimulator>>()
const editor = ref<InstanceType<typeof MyEditor>>()

const showDrawer = ref(false)
const showKeyboard = ref(true)

const advancedLoaded = ref<boolean>(Boolean(getQueryString('debug')))
const showAdvanced = ref<boolean>(advancedLoaded.value)
const editorLoaded = ref<boolean>(advancedLoaded.value && !isMobile.value)
const showEditor = computed(() => showAdvanced.value && !isMobile.value)

watch(showEditor, (newValue: boolean) => {
  if (newValue) {
    editorLoaded.value = true
  }
})

function toggleAdvanced (newValue: boolean) {
  advancedLoaded.value = true
  showAdvanced.value = newValue
}

function toggleDrawer() {
  showDrawer.value = !showDrawer.value
}

function triggerPanelKeyDown(button: string) {
  const textarea = getTextarea()
  textarea.focus()
  if (button === "{bksp}") {
      panel.value.onKeydown(new KeyboardEvent('keydown', { 'key': 'Backspace', 'keyCode': 8 }));
    return;
  }
  if (button === "{space}") {
    panel.value.onKeydown(new KeyboardEvent('keydown', { 'key': ' ', code: 'Space', 'keyCode': 32 }));
    return;
  }
  if (button === "{shift}" || button === "{lock}") {
    panel.value.onKeydown(new KeyboardEvent('keydown', { 'key': 'Shift', code: 'Shift', 'keyCode': 16 }));
    return;
  }

  if (button === "{settings}") {
    toggleDrawer();
  }

  if (button === "{lang}") switchLanguage();

  if (button[0] !== "{") {
    panel.value.onKeydown(new KeyboardEvent('keydown', { 'key': `${button}`, code: `Key${button.toUpperCase()}`, 'keyCode': button.charCodeAt(0) }));
  }
}

const AsyncSimulator = defineAsyncComponent(() => import('../components/MySimulator.vue'))
const AsyncEditor = defineAsyncComponent(() => import('../components/MyEditor.vue'))
</script>

<template>
  <n-drawer v-model:show="showDrawer" width="600px" placement="right">
    <n-drawer-content title="设置">
    <my-appearance />
      <my-deployer />
      <micro-plum />
      <n-space style="align-items: center">
        <h3>Advanced</h3>
        <n-switch
          :value="showAdvanced"
          @update:value="toggleAdvanced"
        />
      </n-space>
      <component
        :is="AsyncSimulator"
        v-if="advancedLoaded"
        v-show="showAdvanced"
        ref="simulator"
        :debug="panel?.debug"
      />
      <component
        :is="AsyncEditor"
        v-if="editorLoaded"
        v-show="showEditor"
        ref="editor"
      />
      <my-platform />

      <n-footer>This site is modified from <a href="https://github.com/LibreService/my_rime">My Rime</a></n-footer>
      <my-footer
        class="my-footer"
        commit="__COMMIT__"
        build-date="__BUILD_DATE__"
        copyright="2022-2024 Qijia Liu and contributors"
      />
    </n-drawer-content>
  </n-drawer>
  <n-space
    vertical
    class="my-column"
    style="justify-content: center;"
  >
    <my-menu />
    <n-input
      id="container"
      v-model:value="text"
      type="textarea"
      :rows="showKeyboard ? 3 : 10"
      clearable
      @blur="onBlur"
      @focus="onFocus"
      :readonly="showKeyboard"
    />
    <my-bar :showKeyboard="showKeyboard" @toggle-keyboard="() => showKeyboard = !showKeyboard" />
    <SimpleKeyboard v-if="showKeyboard" @onKeyPress="triggerPanelKeyDown" />
    <my-panel
      ref="panel"
      :debug-mode="simulator?.debugMode"
      :showKeyboard="showKeyboard"
    />
  </n-space>
</template>

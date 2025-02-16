<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { NA, NP, NInput, NSpace, NFlex, NSwitch, useMessage, NButton, NDrawer, NDrawerContent, NIcon, NLayout, NLayoutFooter } from 'naive-ui'
import type { InputInst } from 'naive-ui'
import { MyFooter } from '@libreservice/my-widget'
import Instruction from "../components/Instruction.vue"
import MyMenu from '../components/MyMenu.vue'
import MyPanel from '../components/MyPanel.vue'
import MyBar from '../components/MyBar.vue'
import MyAppearance from '../components/MyAppearance.vue'
import MyFont from '../components/MyFont.vue'
import MyDeployer from '../components/MyDeployer.vue'
import SimpleKeyboard from '../components/SimpleKeyboard.vue'
import MySearchButton from '../components/MySearchButton.vue'
import SideDrawer from '../components/SideDrawer.vue'
import {
  setQuery,
  getTextarea,
  getQueryString,
  isMobile,
  showDrawer,
  toggleDrawer
} from '../util'
import {
  init,
  text,
  changeLanguage
} from '../control'
import { setMessage } from '../micro-plum'

setQuery(useRoute().query)
setMessage(useMessage())
init()

let savedStart = 0
let savedEnd = 0

function onBlur() {
  const textarea = getTextarea()
  savedStart = textarea.selectionStart
  savedEnd = textarea.selectionEnd
  console.log({savedStart, savedEnd})
}

function onFocus() {
//   const textarea = getTextarea()
//   textarea.selectionStart = savedStart
//   textarea.selectionEnd = savedEnd
}

const inputInstRef = ref<InputInst>()
const panel = ref<InstanceType<typeof MyPanel>>()
  
const simulatorDebugMode = ref<boolean>()

const showKeyboard = ref(true)

// Select all
function selectAll() {
  // inputInstRef.value?.select()
  const textarea = getTextarea()
  textarea.focus()
  textarea.select()
}

function moveCursorToEnd() {
  const textarea = getTextarea()
  textarea.selectionStart = textarea.value.length
}

function triggerPanelKeyDown(button: string) {
  const textarea = getTextarea()
  // moveCursorToEnd()
  if (button === "{bksp}") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': 'Backspace', 'keyCode': 8 }));
    return;
  }
  if (button === "{esc}") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': 'Escape', 'keyCode': 27 }));
    return;
  }
  if (button === "{space}") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': ' ', code: 'Space', 'keyCode': 32 }));
    return;
  }
  if (button === "{enter}") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': 'Enter', code: 'Enter', 'keyCode': 13 }));
    return;
  }
  if (button === "{shift}" || button === "{lock}") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': 'Shift', code: 'Shift', 'keyCode': 16 }));
    return;
  }

  if (button === "{settings}") {
    toggleDrawer();
  }

  if (button === "{hide}") {
    showKeyboard.value = false;
  }

  if (button === "{lang}") changeLanguage();

  if (button === "，" || button === "。") {
    // Add character when not editing
    if (!panel.value?.editing) {
      const mapping = {
        "。": { 'key': '.', code: 'Period', 'keyCode': 190 },
        "，": { 'key': ',', code: 'Comma', 'keyCode': 188 },
      }
      panel.value?.onKeydown(new KeyboardEvent('keydown', mapping[button]));
      return;
    }
  }
  if (button[0] !== "{" && button.length > 1) {
    // In case like ".com", add to text to the textarea directly
    text.value += button;
    moveCursorToEnd();
    return;
  }
  if (button.length === 1 || button[0] !== "{") {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { 'key': `${button}`, code: `Key${button.toUpperCase()}`, 'keyCode': button.charCodeAt(0) }));
  }
}
</script>
<!-- header-style="background: #1c1c26" body-style="background: #101014" -->
<template>
  <n-drawer v-model:show="showDrawer" width="85vw" placement="right">
    <n-drawer-content title="设置">
      <SideDrawer ref="drawer" :debugMode="simulatorDebugMode" :panel="panel" />
    </n-drawer-content>
  </n-drawer>
  <n-flex vertical class="my-column">
    <instruction :showKeyboard="showKeyboard" />
    <my-menu />
    <div style="display: flex; align-items: center;">
      <n-input id="container" ref="inputInstRef" v-model:value="text" type="textarea" :rows="showKeyboard ? 6 : 10"
        clearable @focus="onFocus" size="large"
        :readonly="showKeyboard" />
      <MySearchButton />
    </div>
    <my-bar :showKeyboard="showKeyboard" @toggle-keyboard="() => showKeyboard = !showKeyboard"
      @select-all="selectAll" />
    <SimpleKeyboard v-if="showKeyboard" @onKeyPress="triggerPanelKeyDown" />
    <my-panel ref="panel" :debug-mode="simulatorDebugMode" :showKeyboard="showKeyboard" />
  </n-flex>
</template>

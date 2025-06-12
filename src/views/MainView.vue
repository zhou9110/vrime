<script setup lang="ts">
import { ref, provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import { NInput, NFlex, useMessage, NModal, NCard } from 'naive-ui'
import type { InputInst } from 'naive-ui'
import Instruction from "../components/Instruction.vue"
import MyMenu from '../components/MyMenu.vue'
import MyPanel from '../components/MyPanel.vue'
import MyBar from '../components/MyBar.vue'
import SimpleKeyboard from '../components/SimpleKeyboard.vue'
import MySearchButton from '../components/MySearchButton.vue'
import Settings from '../components/SideDrawer.vue'
import {
  setQuery,
  getTextarea,
  showDrawer,
  toggleDrawer
} from '../util'
import {
  init,
  text,
  changeLanguage,
  isRecording,
} from '../control'
import { setMessage } from '../micro-plum'
import VoiceRecognition from '../components/VoiceRecognition.vue'
import T9Keyboard from '../components/T9Keyboard.vue'

setQuery(useRoute().query)
setMessage(useMessage())
init()


let savedStart = 0
let savedEnd = 0

function onBlur() {
  const textarea = getTextarea()
  savedStart = textarea.selectionStart
  savedEnd = textarea.selectionEnd
  console.log({ savedStart, savedEnd })
}

function onFocus() {
  //   const textarea = getTextarea()
  //   textarea.selectionStart = savedStart
  //   textarea.selectionEnd = savedEnd
}

const inputInstRef = ref<InputInst>()
const panel = ref<InstanceType<typeof MyPanel>>()
const voiceRecognitionRef = ref<InstanceType<typeof VoiceRecognition>>()
const voiceRecognitionRefFn = () => voiceRecognitionRef
provide('voiceRecognitionRef', voiceRecognitionRefFn)

const simulatorDebugMode = ref<boolean>()

const showKeyboard = ref(true)

function appendToTextBox(newText: string) {
  text.value = text.value + newText
}

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

function getRows() {
  if (!showKeyboard.value) {
    return 10;
  }
  return 6;
}

const rows = computed(() => getRows());
</script>
<!-- header-style="background: #1c1c26" body-style="background: #101014" -->
<template>
  <n-modal v-model:show="showDrawer" placement="right">
    <n-card style="width: 80vw; margin-top: 10px; margin-bottom: 15px;">
      <Settings ref="drawer" :debugMode="simulatorDebugMode" :panel="panel" />
    </n-card>
  </n-modal>
  <n-flex vertical class="my-column">
    <instruction :showKeyboard="showKeyboard" />
    <my-menu />
    <div style="display: flex; align-items: center">
      <n-input
        id="container"
        ref="inputInstRef"
        :input-props="{
          inputmode: showKeyboard ? 'none' : 'text'
        }"
        v-model:value="text"
        type="textarea"
        :rows="rows"
        clearable
        @focus="onFocus"
        size="large"
      />

      <MySearchButton />
    </div>
    <my-bar :showKeyboard="showKeyboard" @toggle-keyboard="() => showKeyboard = !showKeyboard" @select-all="selectAll"
      :getVoiceRecognitionRef="voiceRecognitionRefFn" />
    <SimpleKeyboard v-if="showKeyboard" @onKeyPress="triggerPanelKeyDown"
      :getVoiceRecognitionRef="voiceRecognitionRefFn" />
    <!-- <T9Keyboard /> -->
    <my-panel ref="panel" :debug-mode="simulatorDebugMode" :showKeyboard="showKeyboard" />
    <VoiceRecognition ref="voiceRecognitionRef" @set-input="appendToTextBox" />
  </n-flex>
</template>

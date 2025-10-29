<script setup lang="ts">
import { ref, provide, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NInput, NFlex, useMessage, NModal, NCard } from 'naive-ui'
import type { InputInst } from 'naive-ui'
import Instruction from '../components/Instruction.vue'
import MyMenu from '../components/MyMenu.vue'
import MyPanel from '../components/MyPanel.vue'
import SimpleKeyboard from '../components/SimpleKeyboard.vue'
import MySearchButton from '../components/MySearchButton.vue'
import Settings from '../components/SettingsModal.vue'

import {
  setQuery,
  getTextarea,
  showDrawer,
  toggleDrawer,
  isMobile,
  useMobileHeightBreakpoint
} from '../util'
import {
  init,
  text,
  changeLanguage,
  autoSwitchKeyboardLayout,
  autoSwitchToT9Ime,
  currentKeyboardLayout,
  selectIME,
  schemaId,
  ime,
  chooseKeyboardFromIME
} from '../control'
import { setMessage } from '../micro-plum'
import VoiceRecognition from '../components/VoiceRecognition.vue'
import T9Keyboard from '../components/T9Keyboard.vue'
import MobileSimpleKeyboard from '../components/MobileSimpleKeyboard.vue'

setQuery(useRoute().query)
setMessage(useMessage())
init()

let savedStart = 0
let savedEnd = 0

function onBlur () {
  const textarea = getTextarea()
  savedStart = textarea.selectionStart
  savedEnd = textarea.selectionEnd
  console.log({ savedStart, savedEnd })
}

function onFocus () {
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

function appendToTextBox (newText: string) {
  text.value = text.value + newText
}

// Select all
function selectAll () {
  // inputInstRef.value?.select()
  const textarea = getTextarea()
  textarea.focus()
  textarea.select()
}

function moveCursorToEnd () {
  const textarea = getTextarea()
  textarea.selectionStart = textarea.value.length
}

function triggerPanelKeyDown (button: string | KeyboardEvent) {
  if (button instanceof KeyboardEvent) {
    panel.value?.onKeydown(button)
    return
  }
  const textarea = getTextarea()
  // moveCursorToEnd()
  if (button === '{bksp}') {
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', { key: 'Backspace', keyCode: 8 })
    )
    return
  }
  if (button === '{esc}') {
    panel.value?.onKeydown(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }))
    return
  }
  if (button === '{space}') {
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', keyCode: 32 })
    )
    return
  }
  if (button === '{enter}') {
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 })
    )
    return
  }
  if (button === '{shift}' || button === '{lock}') {
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', { key: 'Shift', code: 'Shift', keyCode: 16 })
    )
    return
  }

  if (button === '{settings}') {
    setTimeout(() => {
      toggleDrawer()
    }, 400)
    return
  }

  if (button === '{hide}') {
    showKeyboard.value = false
    return
  }

  if (button === '{segment}') {
    // Send Shift+Left for word segmentation
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', {
        key: 'Left',
        code: 'ArrowLeft',
        keyCode: 37,
        shiftKey: true
      })
    )
    return
  }

  if (button === '{lang}') changeLanguage()

  if (button === '，' || button === '。') {
    // Add character when not editing
    if (!panel.value?.editing) {
      const mapping = {
        '。': { key: '.', code: 'Period', keyCode: 190 },
        '，': { key: ',', code: 'Comma', keyCode: 188 }
      }
      panel.value?.onKeydown(new KeyboardEvent('keydown', mapping[button]))
      return
    }
  }
  if (button[0] !== '{' && button.length > 1) {
    // In case like ".com", add to text to the textarea directly
    text.value += button
    moveCursorToEnd()
    return
  }
  if (button.length === 1 || button[0] !== '{') {
    panel.value?.onKeydown(
      new KeyboardEvent('keydown', {
        key: `${button}`,
        code: `Key${button.toUpperCase()}`,
        keyCode: button.charCodeAt(0)
      })
    )
  }
}

const mobileHeightMatches = useMobileHeightBreakpoint()

function getRows () {
  if (mobileHeightMatches.value) {
    return 2
  }
  if (!showKeyboard.value) {
    return 10
  }
  return 6
}

const rows = computed(() => getRows())

const prevSchemaId = ref(schemaId.value)

watch([isMobile, autoSwitchKeyboardLayout], ([isMobileVal, newAutoSwitch]) => {
  if (isMobileVal && newAutoSwitch) {
    prevSchemaId.value = ime.value || schemaId.value
    console.log('prevSchemaId set to:', prevSchemaId.value)
    selectIME(autoSwitchToT9Ime.value)
  } else if (prevSchemaId.value) {
    selectIME(prevSchemaId.value)
  }
})
</script>
<!-- header-style="background: #1c1c26" body-style="background: #101014" -->
<template>
  <n-modal v-model:show="showDrawer">
    <n-card style="width: 80vw; margin-top: 10px; margin-bottom: 15px">
      <Settings
        ref="drawer"
        :debug-mode="simulatorDebugMode"
        :panel="panel"
      />
    </n-card>
  </n-modal>
  <n-flex
    vertical
    class="my-column"
  >
    <instruction :show-keyboard="showKeyboard" />
    <my-menu @select-ime="chooseKeyboardFromIME" />
    <div style="display: flex; align-items: center">
      <n-input
        id="container"
        ref="inputInstRef"
        v-model:value="text"
        :input-props="{
          inputmode: showKeyboard ? 'none' : 'text',
        }"
        type="textarea"
        :rows="rows"
        clearable
        size="large"
        @focus="onFocus"
      />
      <MySearchButton />
    </div>
    <my-bar
      :show-keyboard="showKeyboard"
      :get-voice-recognition-ref="voiceRecognitionRefFn"
      @toggle-keyboard="() => (showKeyboard = !showKeyboard)"
      @select-all="selectAll"
    />
    <template v-if="showKeyboard">
      <T9Keyboard
        v-if="currentKeyboardLayout[0] === 't9'"
        :panel="panel"
        @on-key-press="triggerPanelKeyDown"
      />
      <MobileSimpleKeyboard
        v-else-if="
          isMobile ||
            (currentKeyboardLayout[0] === 'qwerty' && currentKeyboardLayout[1] === 'mobile')
        "
        :get-voice-recognition-ref="voiceRecognitionRefFn"
        @on-key-press="triggerPanelKeyDown"
      />
      <SimpleKeyboard
        v-else
        :get-voice-recognition-ref="voiceRecognitionRefFn"
        @on-key-press="triggerPanelKeyDown"
      />
    </template>
    <my-panel
      ref="panel"
      :debug-mode="simulatorDebugMode"
      :show-keyboard="showKeyboard"
    />
    <VoiceRecognition
      ref="voiceRecognitionRef"
      @set-input="appendToTextBox"
    />
  </n-flex>
</template>

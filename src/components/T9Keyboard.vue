<script setup lang="tsx">
import { NButton, NFlex } from "naive-ui";
import { defineEmits, defineProps, ref } from "vue";

import SimpleKeyboard from "./MobileSimpleKeyboard.vue";
import NumKey from "./NumKey.vue";
import RecordButton from "./RecordButton.vue";
import SideKey from "./T9SideKey.vue";
import { currentKeyboardLayout, ime } from "../control";
import { isMobile } from "../util";

const KeyboardReturnRoundSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg>'
const BackspaceRegularSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41L17.59 17L19 15.59L15.41 12L19 8.41L17.59 7L14 10.59L10.41 7L9 8.41L12.59 12L9 15.59z" fill="currentColor"></path></svg>'
const NUMPAD0_KEYCODE = 96
const NUM_0_KEYCODE = 48

const emit = defineEmits(['onKeyPress'])

const micButtonTarget = ref<HTMLElement | null>(null)
const currentLayout = ref<'num' | 'abc' | 't9'>('t9')

function onKeyPress(button: string) {
  const num = parseInt(button, 10)
  const isValidNum = !isNaN(num)

  if (isValidNum) {
    if (ime.value === "xiaobai_simp") {
      // Send as Numpad keys
      const eventBody = {
        "key": `${num}`,
        "keyCode": NUMPAD0_KEYCODE + num,
        "which": NUMPAD0_KEYCODE + num,
        "code": `Numpad${num}`,
        "description": `Number Pad ${num}`,
      }
      emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
    } else {
      // Send as Normal number keys
      const eventBody = {
        "key": `${num}`,
        "keyCode": NUM_0_KEYCODE + num,
        "which": NUM_0_KEYCODE + num,
        "code": `Digit${num}`,
        "description": `${num}`,
      }
      emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
    }
    return
  }
  // Fallback to default
  emit('onKeyPress', button)
}

function onAbcKeyPress(button: string | KeyboardEvent) {
  if (button === '{hide}') {
    currentLayout.value = 't9';
  } else {
    emit('onKeyPress', button)
  }
}

function swapLayout(toLayout: 'num' | 't9' | 'abc') {
  console.log('swapLayout', toLayout)
  currentLayout.value = toLayout

  if (toLayout === 'abc') {
    currentLayout.value = 'abc';
  }
}

</script>

<template>
  <template v-if="currentLayout === 'abc'">
    <SimpleKeyboard @onKeyPress="onAbcKeyPress" returnKeyText="返回" />
  </template>
  <div class="numpad" v-else>
    <n-flex vertical class="side" gap="5px">
      <SideKey class="side-key" @onKeyPress="onKeyPress">，</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">。</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">?</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">@</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">!</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">$</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">%</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">&</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">(</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">)</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">-</SideKey>
      <SideKey class="side-key" @onKeyPress="onKeyPress">+</SideKey>
    </n-flex>

    <template v-if="currentLayout === 't9' && ime === 'xiaobai_simp'">
      <NumKey class="numpad-key" keyName="" number="7" @onKeyPress="onKeyPress">分词</NumKey>
      <NumKey class="numpad-key" keyName="" number="8" @onKeyPress="onKeyPress">abc</NumKey>
      <NumKey class="numpad-key" keyName="" number="9" @onKeyPress="onKeyPress">def</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{bksp}')"><span
          v-html="BackspaceRegularSvg"></span></n-button>
      <NumKey class="numpad-key" keyName="" number="4" @onKeyPress="onKeyPress">ghi</NumKey>
      <NumKey class="numpad-key" keyName="" number="5" @onKeyPress="onKeyPress">jkl</NumKey>
      <NumKey class="numpad-key" keyName="" number="6" @onKeyPress="onKeyPress">mno</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{esc}')">重输</n-button>
      <NumKey class="numpad-key" keyName="" number="1" @onKeyPress="onKeyPress">pqrs</NumKey>
      <NumKey class="numpad-key" keyName="" number="2" @onKeyPress="onKeyPress">tuv</NumKey>
      <NumKey class="numpad-key" keyName="" number="3" @onKeyPress="onKeyPress">wxyz</NumKey>
      <n-button class="numpad-key" size="large" @click="swapLayout('abc')">ABC</n-button>
      <n-button class="numpad-key" size="large" secondary disabled>符号</n-button>
      <RecordButton class="numpad-key" style="height: 100%;" :secondary="false" />
      <NumKey class="numpad-key" keyName=" " number="0" @onKeyPress="onKeyPress(' ')">空格</NumKey>
      <n-button class="numpad-key" size="large" @click="swapLayout('num')">123</n-button>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{enter}')"><span
          v-html="KeyboardReturnRoundSvg"></span></n-button>
    </template>
    <template v-else-if="currentLayout === 't9'">
      <NumKey class="numpad-key" keyName="1" number="1" @onKeyPress="onKeyPress">分词</NumKey>
      <NumKey class="numpad-key" keyName="2" number="2" @onKeyPress="onKeyPress">abc</NumKey>
      <NumKey class="numpad-key" keyName="3" number="3" @onKeyPress="onKeyPress">def</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{bksp}')"><span
          v-html="BackspaceRegularSvg"></span></n-button>
      <NumKey class="numpad-key" keyName="4" number="4" @onKeyPress="onKeyPress">ghi</NumKey>
      <NumKey class="numpad-key" keyName="5" number="5" @onKeyPress="onKeyPress">jkl</NumKey>
      <NumKey class="numpad-key" keyName="6" number="6" @onKeyPress="onKeyPress">mno</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{esc}')">重输</n-button>
      <NumKey class="numpad-key" keyName="7" number="7" @onKeyPress="onKeyPress">pqrs</NumKey>
      <NumKey class="numpad-key" keyName="8" number="8" @onKeyPress="onKeyPress">tuv</NumKey>
      <NumKey class="numpad-key" keyName="9" number="9" @onKeyPress="onKeyPress">wxyz</NumKey>
      <n-button class="numpad-key" size="large" @click="swapLayout('abc')">ABC</n-button>
      <n-button class="numpad-key" size="large" secondary disabled>符号</n-button>
      <RecordButton class="numpad-key" style="height: 100%;" :secondary="false" />
      <NumKey class="numpad-key" keyName=" " @onKeyPress="onKeyPress(' ')">空格</NumKey>
      <n-button class="numpad-key" size="large" @click="swapLayout('num')">123</n-button>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{enter}')"><span
          v-html="KeyboardReturnRoundSvg"></span></n-button>
    </template>
    <template v-else-if="currentLayout === 'num'">
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">1</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">2</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">3</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{bksp}')"
        @longclick="setInterval(() => onKeyPress('{bksp}'), 100)"><span v-html="BackspaceRegularSvg"></span></n-button>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">4</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">5</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">6</NumKey>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{esc}')"></n-button>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">7</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">8</NumKey>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">9</NumKey>
      <n-button class="numpad-key" size="large"></n-button>
      <n-button class="numpad-key" size="large"></n-button>
      <n-button class="numpad-key"></n-button>
      <NumKey class="numpad-key" @onKeyPress="onKeyPress">0</NumKey>
      <n-button class="numpad-key" size="large" @click="swapLayout('t9')">返回</n-button>
      <n-button class="numpad-key" size="large" @click="onKeyPress('{enter}')"><span
          v-html="KeyboardReturnRoundSvg"></span></n-button>
    </template>
  </div>
</template>

<style scoped>
.side {
  border-radius: 3px;
  grid-area: side;
  overflow: auto;
  background-color: rgba(166, 161, 161, 0.242);
  padding: 3px;
}

.side>.side-key:not(:last-child)::after {
  position: absolute;
  bottom: -3px;
  width: 95%;
  content: '';
  /* border-bottom: 1px solid rgba(100, 100, 100, 0.5); */
  border-bottom: var(--n-border);
}

.side-key {
  height: 25%;
}

.numpad {
  max-width: 800px;
  min-height: 200px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(4, 1fr);
  grid-template-areas:
    "side . . . ."
    "side . . . ."
    "side . . . ."
    ". . . . .";
  gap: 5px;
  align-self: center;
  width: 100%;
}

.numpad-key {
  height: 100%;
  font-size: 1.5em;
}

.operation-bar {
  display: flex;
  flex-direction: column;
}

@media (max-height: 768px) {
  .numpad {
    min-height: 100px;
    max-height: 50vh;
  }
}
</style>

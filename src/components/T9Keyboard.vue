<script setup lang="tsx">
import { NButton, NFlex } from 'naive-ui'
import { ref, computed } from 'vue'
import type MyPanel from './MyPanel.vue'

import SimpleKeyboard from './MobileSimpleKeyboard.vue'
import NumKey from './NumKey.vue'
import RecordButton from './RecordButton.vue'
import SideKey from './T9SideKey.vue'
import { currentKeyboardLayout } from '../control'

const KeyboardReturnRoundSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg>'
const BackspaceRegularSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41L17.59 17L19 15.59L15.41 12L19 8.41L17.59 7L14 10.59L10.41 7L9 8.41L12.59 12L9 15.59z" fill="currentColor"></path></svg>'
const NUMPAD0_KEYCODE = 96
const NUM_0_KEYCODE = 48

const props = defineProps<{
  panel?: InstanceType<typeof MyPanel>
}>()

const emit = defineEmits(['onKeyPress'])

const currentLayout = ref<'num' | 'abc' | 't9'>('t9')

// Get pinyin candidates from panel
const pinyinCandidates = computed(() => props.panel?.pinyinCandidates || [])
const hasPinyinCandidates = computed(() => pinyinCandidates.value.length > 0)

function onKeyPress (button: string) {
  const num = parseInt(button, 10)
  const isValidNum = !isNaN(num)

  if (isValidNum) {
    if (ime.value === 'xiaobai_simp') {
      // Send as Numpad keys
      const eventBody = {
        key: `${num}`,
        keyCode: NUMPAD0_KEYCODE + num,
        which: NUMPAD0_KEYCODE + num,
        code: `Numpad${num}`,
        description: `Number Pad ${num}`
      }
      emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
    } else {
      // Send as Normal number keys
      const eventBody = {
        key: `${num}`,
        keyCode: NUM_0_KEYCODE + num,
        which: NUM_0_KEYCODE + num,
        code: `Digit${num}`,
        description: `${num}`
      }
      emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
    }
    return
  }
  // Fallback to default
  emit('onKeyPress', button)
}

function onAbcKeyPress (button: string | KeyboardEvent) {
  if (button === '{hide}') {
    currentLayout.value = 't9'
  } else {
    emit('onKeyPress', button)
  }
}

function swapLayout (toLayout: 'num' | 't9' | 'abc') {
  console.log('swapLayout', toLayout)
  currentLayout.value = toLayout

  if (toLayout === 'abc') {
    currentLayout.value = 'abc'
  }
}

function onPinyinClick (pinyin: string) {
  // First clear current input
  emit('onKeyPress', '{esc}')

  // Then send each letter of the pinyin as a key press
  setTimeout(() => {
    for (const letter of pinyin) {
      const eventBody = {
        key: letter,
        code: `Key${letter.toUpperCase()}`,
        keyCode: letter.charCodeAt(0)
      }
      emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
    }
  }, 50) // Small delay to ensure Escape is processed first
}
</script>

<template>
  <template v-if="currentLayout === 'abc'">
    <SimpleKeyboard
      return-key-text="返回"
      @on-key-press="onAbcKeyPress"
    />
  </template>
  <div
    v-else
    style="flex: 1; display: flex; flex-direction: column; justify-content: flex-end"
  >
    <div id="t9-menu-bar" />
    <div class="numpad">
    <n-flex
      vertical
      class="side"
      gap="5px"
    >
      <!-- Show pinyin candidates when available -->
        <template v-if="hasPinyinCandidates && currentKeyboardLayout[1] !== 'xiaobai'">
        <SideKey
          v-for="pinyin in pinyinCandidates"
          :key="pinyin"
          class="side-key pinyin-key"
          @click="onPinyinClick(pinyin)"
        >
          {{ pinyin }}
        </SideKey>
      </template>
      <!-- Default symbols when no pinyin candidates -->
      <template v-else>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          ，
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          。
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          ?
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          @
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          !
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          $
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          %
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          &
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          (
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          )
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          -
        </SideKey>
        <SideKey
          class="side-key"
          @on-key-press="onKeyPress"
        >
          +
        </SideKey>
          <SideKey
            class="side-key"
            @on-key-press="onKeyPress"
          >
            :
          </SideKey>
      </template>
    </n-flex>

      <template v-if="currentLayout === 't9' && currentKeyboardLayout[1] === 'xiaobai'">
      <NumKey
        class="numpad-key"
        key-name="7"
        number="7"
        @on-key-press="onKeyPress"
      >
        功能键
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="8"
        number="8"
        @on-key-press="onKeyPress"
      >
        abc
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="9"
        number="9"
        @on-key-press="onKeyPress"
      >
        def
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{bksp}')"
      >
        <span
          v-html="BackspaceRegularSvg"
        />
      </n-button>
      <NumKey
        class="numpad-key"
        key-name="4"
        number="4"
        @on-key-press="onKeyPress"
      >
        ghi
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="5"
        number="5"
        @on-key-press="onKeyPress"
      >
        jkl
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="6"
        number="6"
        @on-key-press="onKeyPress"
      >
        mno
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{esc}')"
      >
        重输
      </n-button>
      <NumKey
        class="numpad-key"
        key-name="1"
        number="1"
        @on-key-press="onKeyPress"
      >
        pqrs
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="2"
        number="2"
        @on-key-press="onKeyPress"
      >
        tuv
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="3"
        number="3"
        @on-key-press="onKeyPress"
      >
        wxyz
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="swapLayout('abc')"
      >
        ABC
      </n-button>
      <n-button
        class="numpad-key"
        size="large"
        secondary
        disabled
      >
        符号
      </n-button>
      <RecordButton
        class="numpad-key"
        style="height: 100%;"
        :secondary="false"
      />
      <NumKey
        class="numpad-key"
        key-name="0"
        number="0"
        @on-key-press="onKeyPress(' ')"
      >
        空格
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="swapLayout('num')"
      >
        123
      </n-button>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{enter}')"
      >
        <span
          v-html="KeyboardReturnRoundSvg"
        />
      </n-button>
    </template>
    <template v-else-if="currentLayout === 't9'">
      <NumKey
        class="numpad-key"
        key-name="1"
        number="1"
        @on-key-press="onKeyPress('\'')"
      >
        分词
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="2"
        number="2"
        @on-key-press="onKeyPress"
      >
        abc
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="3"
        number="3"
        @on-key-press="onKeyPress"
      >
        def
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{bksp}')"
      >
        <span
          v-html="BackspaceRegularSvg"
        />
      </n-button>
      <NumKey
        class="numpad-key"
        key-name="4"
        number="4"
        @on-key-press="onKeyPress"
      >
        ghi
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="5"
        number="5"
        @on-key-press="onKeyPress"
      >
        jkl
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="6"
        number="6"
        @on-key-press="onKeyPress"
      >
        mno
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{esc}')"
      >
        重输
      </n-button>
      <NumKey
        class="numpad-key"
        key-name="7"
        number="7"
        @on-key-press="onKeyPress"
      >
        pqrs
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="8"
        number="8"
        @on-key-press="onKeyPress"
      >
        tuv
      </NumKey>
      <NumKey
        class="numpad-key"
        key-name="9"
        number="9"
        @on-key-press="onKeyPress"
      >
        wxyz
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="swapLayout('abc')"
      >
        ABC
      </n-button>
      <n-button
        class="numpad-key"
        size="large"
        secondary
        disabled
      >
        符号
      </n-button>
      <RecordButton
        class="numpad-key"
        style="height: 100%;"
        :secondary="false"
      />
      <NumKey
        class="numpad-key"
        key-name=" "
        @on-key-press="onKeyPress(' ')"
      >
        空格
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="swapLayout('num')"
      >
        123
      </n-button>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{enter}')"
      >
        <span
          v-html="KeyboardReturnRoundSvg"
        />
      </n-button>
    </template>
    <template v-else-if="currentLayout === 'num'">
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        1
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        2
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        3
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{bksp}')"
      >
        <span v-html="BackspaceRegularSvg" />
      </n-button>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        4
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        5
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        6
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{esc}')"
      />
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        7
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        8
      </NumKey>
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        9
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
      />
      <n-button
        class="numpad-key"
        size="large"
      />
      <n-button class="numpad-key" />
      <NumKey
        class="numpad-key"
        @on-key-press="onKeyPress"
      >
        0
      </NumKey>
      <n-button
        class="numpad-key"
        size="large"
        @click="swapLayout('t9')"
      >
        返回
      </n-button>
      <n-button
        class="numpad-key"
        size="large"
        @click="onKeyPress('{enter}')"
      >
        <span
          v-html="KeyboardReturnRoundSvg"
        />
      </n-button>
    </template>
    </div>
  </div>
</template>

<style scoped>
.side {
  border-radius: 3px;
  grid-area: side;
  overflow-y: scroll;
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

.pinyin-key {
  height: 65px;
  text-align: center;
  cursor: pointer;
}

#t9-menu-bar {
  flex: 1;
  min-height: 40px;
}

.numpad {
  flex: 6;
  max-width: 800px;
  min-height: 200px;
  max-height: 50vh;
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

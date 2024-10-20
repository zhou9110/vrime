<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { NSpace, NButtonGroup, NButton, NIcon, NCheckbox, NFlex } from 'naive-ui'
import {
  Cut20Regular,
  Copy20Regular,
  ClipboardLink20Regular
} from '@vicons/fluent'
import { getTextarea } from '../util'
import {
  text,
  loading,
  deployed,
  autoCopy,
  schemaId,
  variant
} from '../control'

const props = defineProps<{ showKeyboard: boolean }>()

const notShowKeyboard = computed(() => !props.showKeyboard)


function copy () {
  const textarea = getTextarea()
  textarea.focus()
  return navigator.clipboard.writeText(text.value)
}

async function cut () {
  await copy()
  text.value = ''
}

function clear() {
  text.value = ''
}

function notKeyboardShown() {
  return !(props.showKeyboard)
}

function handleToggleKeyboard() {
  this.$emit('toggleKeyboard')
}

async function copyLink () {
  const usp = new URLSearchParams({
    schemaId: schemaId.value,
    variantName: variant.value.name
  })
  const url = `${window.location.origin}${window.location.pathname}?${usp}`
  await navigator.clipboard.writeText(url)
  const textarea = getTextarea()
  textarea.focus()
}
</script>

<template>
<n-flex>
  <n-space style="align-items: center">
    <n-button-group class="square-group">
      <n-button
        secondary
        @click="cut"
      >
        <n-icon :component="Cut20Regular" />
      </n-button>
      <n-button
        secondary
        @click="copy"
      >
        <n-icon :component="Copy20Regular" />
      </n-button>
      <n-button
        :disabled="loading || deployed"
        secondary
        title="Copy link for current IME"
        @click="copyLink"
      >
        <n-icon :component="ClipboardLink20Regular" />
      </n-button>
    </n-button-group>
    <!-- Least astonishment: user may explicitly cut, so shouldn't overwrite the clipboard. -->
    <n-checkbox v-model:checked="autoCopy">
      自动复制文字
    </n-checkbox>
  </n-space>
  <n-button
    secondary
    @click="clear"
  >
    清空
  </n-button>
  <n-checkbox :checked="!props.showKeyboard" @update:checked="$emit('toggleKeyboard')">
    使用系统键盘
  </n-checkbox>
</n-flex>
</template>

<style scoped>
.n-button-group .n-button {
  font-size: 24px;
}
</style>

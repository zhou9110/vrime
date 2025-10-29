<script setup lang="ts">
import { useSlots } from 'vue'
import { NButton } from 'naive-ui'

const props = defineProps<{ number?: number | string, keyName?: string }>()
const emit = defineEmits(['onKeyPress'])

const slots = useSlots()

function onKeyPress () {
  const slotText = slots.default?.()[0].children
  console.log('slotText', slotText)
  if (typeof slotText === 'string') {
    emit('onKeyPress', slotText.trim())
  }
}
</script>

<template>
  <n-button
    class="side-key"
    size="large"
    quaternary
    @click="onKeyPress"
  >
    <slot />
  </n-button>
</template>

<style>
.side-key {
  height: 25%;
}
</style>

<script setup lang="ts">
import { defineProps, useSlots } from 'vue';
import { NButton } from 'naive-ui'

const NUMPAD0_KEYCODE = 96
const props = defineProps<{ number?: number | string, keyName?: string }>()
const emit = defineEmits(['onKeyPress'])

const slots = useSlots()

function onKeyPress() {
  // When number and keyName are not provided, use the slot text instead
  if (props.number === undefined && props.keyName === undefined) {
    const slotText = slots.default?.()[0].children
    console.log('slotText', slotText)
    if (typeof slotText === 'string') {
      emit('onKeyPress', slotText);
    }
    return
  }
  const eventBody = {
    "key": `${props.number}`,
    "keyCode": NUMPAD0_KEYCODE + props.number,
    "which": NUMPAD0_KEYCODE + props.number,
    "code": `Numpad${props.number}`,
    "description": `Number Pad ${props.number}`,
  }
  emit('onKeyPress', new KeyboardEvent('keydown', eventBody))
}
</script>

<template>
  <n-button size="large" class="number-key" secondary v-on:click="onKeyPress">
    <slot></slot>
    <span class="number-indicator">{{ props.keyName ?? props.number }}</span>
  </n-button>
</template>

<style>
.number-key {
  font-size: 1.5em;
  ;
}

.number-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 0.8em;
  color: #AAA;
}
</style>
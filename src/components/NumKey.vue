<script setup lang="ts">
import { defineProps, useSlots } from 'vue';
import { NButton } from 'naive-ui'

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
  const num = typeof props.number === 'number' ? props.number : parseInt(props.number || '0', 10)
  emit('onKeyPress', num)
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
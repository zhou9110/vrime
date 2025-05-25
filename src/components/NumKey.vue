<script setup lang="ts">
import { defineProps } from 'vue';
import { NButton } from 'naive-ui'

const props = defineProps<{ number?: number | string, keyName?: string }>()
const emit = defineEmits(['onKeyPress'])

function onKeyPress() {
  emit('onKeyPress', props.number ?? props.keyName)
}
</script>

<template>
  <n-button size="large" class="number-key" secondary v-on:click="onKeyPress">
    <slot></slot>
    <span class="number-indicator">{{ props.number }}</span>
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
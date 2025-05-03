<script setup lang="ts">
import { ref, defineEmits, computed, shallowRef, inject } from 'vue'
import { onLongPress } from '@vueuse/core'
import { NIcon, NP, NPopover, NButton } from 'naive-ui';
import { MicNoneRound, MicOffOutlined } from "@vicons/material"

import { isRecording as globalIsRecording, recognisedText } from '../control';
import { currentTheme } from '../util'
import VoiceLoader from './VoiceLoader.vue';
import OvalLoader from './OvalLoader.vue';

const buttonRef = ref()
const isRecording = ref(globalIsRecording);
const isLongPressing = shallowRef(false)
const emit = defineEmits<{ 'toggleRecording': [value: boolean] }>();

const injectedVoiceRecognitionRef = inject('voiceRecognitionRef') as InstanceType<any>;
const voiceRecognitionRef = injectedVoiceRecognitionRef ? injectedVoiceRecognitionRef() : undefined;

// const isModelLoaded = computed(() => !!voiceRecognitionRef.value.recognizer);
const isModelLoaded = computed(() => true);
const loaderColor = computed(() => currentTheme.value === 'dark' ? '#fff' : '#000');

async function toggleRecording() {
  const currentValue = isRecording.value;

  if (currentValue === true) {
    await voiceRecognitionRef.value?.onStop();
  } else {
    await voiceRecognitionRef.value?.onStart();
  }

  emit('toggleRecording', !currentValue);
  isRecording.value = !currentValue;
}

async function onLongPressHandler() {
  isLongPressing.value = true;
  if (!isRecording.value) {
    isRecording.value = true;
    await voiceRecognitionRef.value?.onStart();
  }
}

async function onLongPressUpHandler() {
  if (isRecording.value && isLongPressing.value) {
    await voiceRecognitionRef.value?.onStop();
    isRecording.value = false;
  }
  isLongPressing.value = false;
}

onLongPress(
  buttonRef,
  onLongPressHandler,
  {
    delay: 500,
    onMouseUp: onLongPressUpHandler,
    modifiers: { 'prevent': true },
  }
)
</script>

<template>
  <n-popover trigger="manual" :show="isRecording" placement="bottom">
    <template #trigger>
      <slot>
        <n-button ref="buttonRef" secondary :class="{ 'mic': !isRecording, 'mic-off': isRecording }"
          style="padding: 0; height: 50px; min-width: 100px; font-size: 18px;" v-bind="$attrs" @click="toggleRecording">
          <n-icon size="24">
            <MicNoneRound v-if="!isRecording" />
            <MicOffOutlined v-else style="color: white;" />
          </n-icon>
        </n-button>
      </slot>
    </template>
    <div style="display: flex;">
      <n-icon size="20">
        <OvalLoader v-if="!isModelLoaded" :color="loaderColor" />
        <VoiceLoader v-else :color="loaderColor" />
      </n-icon>
      <n-p
        style="max-width: 200px; white-space: pre; margin-top: 0; margin-left: 8px; text-wrap: auto; font-size: 18px;">{{
          recognisedText
        }}</n-p>
    </div>
  </n-popover>
</template>

<style scoped>
.mic-off:hover {
  background: rgba(255, 114, 114);
}

.mic-off:active {
  background: rgb(165, 45, 45);
  /* background: #8d9ca5cc; */
}

.mic-off {
  color: white;
  background: red;
}
</style>
<script setup lang="ts">
import { ref, defineEmits, computed, shallowRef } from 'vue'
import { onLongPress } from '@vueuse/core'
import { NIcon, NP, NPopover } from 'naive-ui';
import { MicNoneRound, MicOffOutlined } from "@vicons/material"

import { isRecording as globalIsRecording, recognisedText } from '../control';
import { currentTheme } from '../util'
import VoiceLoader from './VoiceLoader.vue';
import OvalLoader from './OvalLoader.vue';

const buttonRef = ref()
const props = defineProps<{ getVoiceRecognitionRef: Function }>()
const isRecording = ref(globalIsRecording);
const isLongPressing = shallowRef(false)
const emit = defineEmits<{ 'toggleRecording': [value: boolean] }>();

// const voiceRecognitionRef = inject('voiceRecognitionRef') as InstanceType<typeof VoiceRecognition>;
const voiceRecognitionRef = props.getVoiceRecognitionRef();
const isModelLoaded = computed(() => !!voiceRecognitionRef.value.recognizer);
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
  <n-popover trigger="manual" :show="isRecording" placement="top-start">
    <template #trigger>
      <div ref="buttonRef" class="hg-functionBtn"
        :class="{ 'hg-button-mic': !isRecording, 'hg-button-mic-off': isRecording }" style="padding: 0;"
        :data-skbtn="`{${isRecording ? 'mic-off' : 'mic'}}`" @click="toggleRecording">
        <n-icon size="24">
          <MicNoneRound v-if="!isRecording" />
          <MicOffOutlined v-else style="color: white;" />
        </n-icon>
      </div>
    </template>
    <div style="display: flex;">
      <n-icon>
        <OvalLoader v-if="!isModelLoaded" :color="loaderColor" />
        <VoiceLoader v-else :color="loaderColor" />
      </n-icon>
      <n-p style="max-width: 200px; white-space: pre; margin-top: 0; margin-left: 8px; text-wrap: auto;">{{
        recognisedText
      }}</n-p>
    </div>
  </n-popover>
</template>

<style>
.hg-functionBtn.hg-button-mic,
.hg-functionBtn.hg-button-mic-off {
  flex: 1;
  display: inherit;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  border-radius: inherit;
}

.hg-functionBtn.hg-button-mic-off:hover {
  background: rgba(255, 114, 114);
}

.hg-functionBtn.hg-button-mic-off:active {
  background: rgb(165, 45, 45);
  /* background: #8d9ca5cc; */
}

.hg-functionBtn.hg-button-mic-off {
  color: white;
  background: red;
}
</style>
<script setup lang="ts">
import { defineProps, defineEmits, Teleport, ref, onMounted } from "vue";
import { NText, NSpace, NButtonGroup, NButton, NIcon, NCheckbox, NFlex } from "naive-ui";
import {
  Cut20Regular,
  Copy20Regular,
  Clipboard20Regular,
  ArrowUndo20Filled,
  Delete20Regular,
} from "@vicons/fluent";
import { UndoOutlined, RedoOutlined } from "@vicons/material";
import { getTextarea } from "../util";
import { text, autoCopy, copiedText, schemaId, variant } from "../control";
import RecordButton from "./RecordButtonInBar.vue";

const props = defineProps<{
  showKeyboard: boolean;
  getVoiceRecognitionRef: Function;
}>();

const emit = defineEmits(["selectAll", "toggleKeyboard"]);

function copy() {
  const textarea = getTextarea();
  textarea.focus();
  copiedText.value = text.value;
  return navigator.clipboard.writeText(text.value);
}

async function cut() {
  await copy();
  text.value = "";
}

function clear() {
  text.value = "";
}

function selectAll() {
  emit("selectAll");
}

async function copyLink() {
  const usp = new URLSearchParams({
    schemaId: schemaId.value,
    variantName: variant.value.name,
  });
  const url = `${window.location.origin}${window.location.pathname}?${usp}`;
  await navigator.clipboard.writeText(url);
  const textarea = getTextarea();
  textarea.focus();
}

async function paste() {
  const textarea = getTextarea();
  textarea.focus();
  const pastedText = await navigator.clipboard.readText();
  text.value += pastedText;
  if (autoCopy.value) {
    navigator.clipboard.writeText(text.value)
    copiedText.value = text.value
  }
}

const elementIsReady = ref(false)
onMounted(() => {
  setTimeout(() => {
    elementIsReady.value = document.getElementById("copied") !== null
    console.log(elementIsReady.value) 
  }, 1000)
})
</script>

<template>
  <n-flex justify="space-between">
    <n-space style="align-items: center">
      <n-button-group style="gap: 5px" size="large">
        <n-button secondary @click="cut">
          <template #icon>
            <n-icon>
              <Cut20Regular />
            </n-icon>
            <!-- <n-icon :component="Cut20Regular" /> -->
          </template>
          剪切
        </n-button>
        <n-button secondary @click="copy">
          <template #icon>
            <n-icon :component="Copy20Regular" />
          </template>
          复制
        </n-button>
        <n-button secondary title="粘贴" @click="paste">
          <template #icon>
            <n-icon :component="Clipboard20Regular" />
          </template>
          粘贴
        </n-button>
      </n-button-group>
      <!-- Least astonishment: user may explicitly cut, so shouldn't overwrite the clipboard. -->
      <n-flex>
        <n-checkbox v-model:checked="autoCopy">自动复制文字</n-checkbox>
        <Teleport defer to="#copied" v-if="elementIsReady" :disabled="!autoCopy">
          <n-text class="line-clamped" type="warning" v-show="copiedText">已复制：{{ copiedText }}</n-text>
        </Teleport>
      </n-flex>
    </n-space>
    <n-space class="right-btns" style="align-items: center; gap: 5px">
      <RecordButton v-if="!props.showKeyboard" :get-voice-recognition-ref="props.getVoiceRecognitionRef" />
      <!-- <n-button secondary @click="undo">
          <template #icon>
            <n-icon :component="UndoOutlined" />
          </template>
        </n-button>
        <n-button secondary @click="redo">
          <template #icon>
            <n-icon :component="RedoOutlined" />
          </template>
        </n-button> -->
      <n-button secondary style="height: 50px; min-width: 80px; font-size: 16px" @click="clear"
        size="large">
        <template #icon>
          <n-icon :component="Delete20Regular" />
        </template>
        清空
      </n-button>
      <n-button secondary style="height: 50px; min-width: 100px; font-size: 16px" @click="selectAll" size="medium">
        全选
      </n-button>
      <n-checkbox style="font-size: 16px" :checked="props.showKeyboard" @update:checked="$emit('toggleKeyboard')">
        启用虚拟键盘
      </n-checkbox>
    </n-space>
  </n-flex>
</template>

<style scoped>
.n-button-group .n-button {
  font-size: 18px;
  height: 50px;
  padding: 10px;
  min-width: 50px;
}

.right-btns .n-button {

}

.line-clamped {
  display: -webkit-box;

  -webkit-box-orient: vertical;
  /* 垂直排列子元素 */
  -webkit-line-clamp: 2;
  /* 限制最大行数 */
  line-clamp: 2;
  overflow: hidden;
  /* 超出隐藏 */
  text-overflow: ellipsis;
  /* 添加省略号 */
  max-width: 50vw;
}
</style>

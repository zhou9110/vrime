<script setup lang="ts">
import { computed, watchEffect, defineEmits } from "vue";
import { NButton, NButtonGroup, NIcon, NSpace, NSelect, NFlex, NTooltip } from "naive-ui";
import { WeatherMoon16Regular, Circle16Regular } from "@vicons/fluent";
import {
  deployed,
  loading,
  schemaId,
  ime,
  selectOptions,
  showVariant,
  variants,
  variant,
  isEnglish,
  isFullWidth,
  isExtendedCharset,
  isEnglishPunctuation,
  enableEmoji,
  schemaExtended,
  changeLanguage,
  changeVariant,
  changeWidth,
  changeCharset,
  changePunctuation,
  changeEmoji,
  selectIME,
} from "../control";
import { getTextarea } from "../util";

const emit = defineEmits(["select-ime"]);

const variantLabel = computed(() =>
  showVariant.value && !deployed.value ? variant.value.name : ""
);
const singleVariant = computed(() => !deployed.value && variants.value.length === 1);

watchEffect(() => {
  if (ime.value) {
    localStorage.setItem("schemaId", ime.value);
  }
  if (variantLabel.value) {
    localStorage.setItem("variantName", variantLabel.value);
  }
});

async function switchVariant() {
  showVariant.value = false;
  await changeVariant();
  showVariant.value = true;
}

const extendedDisabled = computed(
  () => ime.value !== schemaId.value || !schemaExtended.includes(ime.value)
);

function resetFocus() {
  getTextarea().focus();
}

function onSelectIME(value: string) {
  resetFocus();
  emit("select-ime", value);
  selectIME(value);
}
</script>

<template>
  <n-flex justify="space-between">
    <n-space>
      <n-select style="width: 160px" :value="ime" :options="selectOptions" :loading="loading"
        @update:value="onSelectIME" size="large" />
      <n-button-group class="square-group" @click="resetFocus" size="large">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary @click="changeLanguage">
              {{ isEnglish ? "En" : "中" }}
            </n-button>
          </template>
          中英文切换
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary :disabled="isEnglish || singleVariant || deployed" @click="switchVariant">
              {{ variantLabel }}
            </n-button>
          </template>
          简/繁
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary @click="changeWidth">
              <template #icon>
                <n-icon :component="isFullWidth ? Circle16Regular : WeatherMoon16Regular" />
              </template>
            </n-button>
          </template>
          全角/半角
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary :disabled="extendedDisabled" @click="changeCharset">
              {{ extendedDisabled ? "" : isExtendedCharset ? "增" : "常" }}
            </n-button>
          </template>
          常用字符集/增强字符集
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary :disabled="isEnglish" @click="changePunctuation">
              {{ isEnglishPunctuation ? "." : "。" }}
            </n-button>
          </template>
          中文/英文标点符号
        </n-tooltip>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button secondary @click="changeEmoji">
              {{ enableEmoji ? "😀" : "🚫" }}
            </n-button>
          </template>
          在候选词里显示Emoji
        </n-tooltip>
      </n-button-group>
    </n-space>
    <n-space>
      <span id="copied"></span>
    </n-space>
  </n-flex>
</template>
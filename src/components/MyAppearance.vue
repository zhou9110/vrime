<script setup lang="ts">
import { isMobile } from "../util";
import {
  NCheckbox,
  NFlex,
  NSelect,
  NTooltip,
  NIcon,
  NSpace,
  NP,
  NGrid,
  NGridItem,
} from "naive-ui";
import {
  autoSwitchKeyboardLayout,
  autoSwitchToT9Ime,
  forceVertical,
  keyHintMode,
  pageSize,
} from "../control";
import { QuestionCircle } from "@vicons/fa";

const options = [
  { label: "默认", value: 0 },
  ...Array.from({ length: 10 }, (_, i) => ({ label: (i + 1).toString(), value: i + 1 })),
];

const t9options = [
  { label: "语燕九键", value: "yuyan_t9_pinyin" },
  { label: "小白九键", value: "xiaobai_simp" },
];

const keyHintOptions = [
  { label: "字母+提示", value: "both" },
  { label: "仅字母", value: "letter" },
  { label: "仅提示", value: "hint" },
];
</script>

<template>
  <h3>外观</h3>
  <n-grid :cols="isMobile ? 1 : 2" :x-gap="10" :y-gap="10">
    <n-grid-item>
      <n-flex style="align-items: center; flex: 1">
        候选词个数
        <n-select v-model:value="pageSize" style="width: 96px" :options="options" />
      </n-flex>
    </n-grid-item>
    <n-grid-item>
      <n-checkbox
        v-model:checked="forceVertical"
        style="justify-content: center; align-items: center; flex: 1"
      >
        垂直排列候选词
      </n-checkbox>
    </n-grid-item>
    <n-grid-item>
      <div style="flex: 1; align-items: center">
        <n-checkbox v-model:checked="autoSwitchKeyboardLayout"
          >自动切换九键和全键盘 (beta)
        </n-checkbox>
        <n-tooltip>
          <template #trigger>
            <n-icon>
              <QuestionCircle />
            </n-icon>
          </template>
          当窗口拖窄时，自动切换成九键输入法
        </n-tooltip>
      </div>
    </n-grid-item>
    <n-grid-item>
      <span>自动切换为：</span>
      <n-select :options="t9options" v-model:value="autoSwitchToT9Ime" />
    </n-grid-item>
    <n-grid-item>
      <n-flex style="align-items: center; flex: 1">
        键位提示
        <n-tooltip>
          <template #trigger>
            <n-icon>
              <QuestionCircle />
            </n-icon>
          </template>
          在按键上显示注音/仓颉/五笔字根、双拼韵母等键位
        </n-tooltip>
        <n-select
          v-model:value="keyHintMode"
          style="width: 140px"
          :options="keyHintOptions"
        />
      </n-flex>
    </n-grid-item>
  </n-grid>
</template>

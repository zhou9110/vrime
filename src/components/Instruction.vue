<script setup>
import { NIcon, NText, NButton } from 'naive-ui'
import { CaretLeft, CaretRight } from '@vicons/fa'
import { LanguageOutlined } from '@vicons/material'
import { isMobile } from '../util'

defineProps({ showKeyboard: Boolean })
</script>

<template>
  <div
    v-if="!isMobile"
    style="margin-top: 5px;"
  >
    使用说明：请点击按键输入拼音, 点击 "-" 和 "=" 键 (或者
    <n-button
      secondary
      disabled
      size="tiny"
    >
      <n-icon
        :component="CaretLeft"
        size="15"
        @click="onPageChange(true)"
      />
    </n-button>
    <span>&nbsp;</span>
    <n-button
      secondary
      disabled
      size="tiny"
    >
      <n-icon
        :component="CaretRight"
        size="15"
        @click="onPageChange(false)"
      />
    </n-button>
    ) 翻页
  </div>
  <n-text
    v-show="!showKeyboard"
    v-if="!isMobile"
  >
    使用 Quest 自带键盘时，请点击键盘右下角的 <n-icon
      size="14"
      style="margin: 0; padding: 0;"
    >
      <LanguageOutlined />
    </n-icon> 按钮，将键盘切换至 Espanol 或者 Italiano 布局
  </n-text>
</template>

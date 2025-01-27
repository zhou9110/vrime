<script setup>
import { NIcon, NText, NButton } from "naive-ui"
import { CaretLeft, CaretRight } from '@vicons/fa'
import { LanguageOutlined } from '@vicons/material'

const props = defineProps(['showKeyboard'])
</script>

<template>
    <div style="margin-top: 5px;">
        使用说明：请点击按键输入拼音, 点击 "-" 和 "=" 键 (或者
        <n-button secondary disabled size="tiny">
            <n-icon :component="CaretLeft" @click="onPageChange(true)" size="15" />
        </n-button>
        <span>&nbsp;</span>
        <n-button  secondary disabled size="tiny">
            <n-icon :component="CaretRight" @click="onPageChange(false)" size="15" />
        </n-button>
        ) 翻页
    </div>
    <n-text v-show="!showKeyboard">
        使用 Quest 自带键盘时，请点击键盘右下角的 <n-icon size="14" style="margin: 0; padding: 0;">
            <LanguageOutlined />
        </n-icon> 按钮，将键盘切换至 Espanol 或者 Italiano 布局
    </n-text>
</template>
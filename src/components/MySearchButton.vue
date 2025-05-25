<script setup>
import { ref, watch } from 'vue'

import { NSelect, NButton, NIcon, NTooltip } from 'naive-ui'

import { OpenInNewOutlined } from "@vicons/material"

import { text } from "../control"

const options = [
  {
    label: '哔哩哔哩',
    value: 'https://search.bilibili.com/all?keyword=',
  },
  {
    label: 'Google',
    value: 'https://www.google.com/search?q='
  },
  {
    label: '百度',
    value: 'https://www.baidu.com/s?wd='
  },
  {
    label: '必应',
    value: 'https://www4.bing.com/search?q='
  },
  {
    label: '小红书',
    value: 'https://www.xiaohongshu.com/search_result?keyword='
  }
]

const previousSavedValue = localStorage.getItem("searchOption")

const value = ref(previousSavedValue ? JSON.parse(previousSavedValue) : options[0].value)
const validateStatus = ref()
const showTooltip = ref(false)

watch(value, (newValue) => {
  localStorage.setItem("searchOption", JSON.stringify(newValue))
})

const search = async () => {
  const searchKeyWord = text.value
  const dropdownValue = value.value
  if (!dropdownValue) {
    validateStatus.value = "error"
    showTooltip.value = true
    setTimeout(() => {
      showTooltip.value = false
    }, 3000)
    return;
  }
  window.open(`${dropdownValue}${encodeURIComponent(searchKeyWord)}`, "__blank")
}

const getOptionLabel = () => {
  if (!value.value) return null
  const option = options.find(op => op.value === value.value)
  return option.label
}
</script>

<template>
  <div
    style="margin-left: 5px; min-width: 100px; display: flex;  flex-direction: column; align-items: stretch; gap: 8px;">
    <n-tooltip :show="showTooltip" trigger="manual">
      <template #trigger>
        <n-select size="large" v-model:value="value" :status="validateStatus" :options="options"
        default-value="哔哩哔哩" :consistent-menu-width="false" clearable></n-select>
      </template>
      <span>请选择一个选项</span>
    </n-tooltip>
    <n-button size="large" type="primary" @click="search">搜索&nbsp;<n-icon size="18"><OpenInNewOutlined /></n-icon></n-button>
  </div>
</template>
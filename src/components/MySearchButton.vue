<script setup>
import { ref } from 'vue'

import { NSelect, NButton, NIcon } from 'naive-ui'

import { OpenInNewOutlined } from "@vicons/material"

import { text } from "../control"

const value = ref(null)

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
    label: '小红书',
    value: 'https://www.xiaohongshu.com/search_result?keyword='
  }
]

const search = async () => {
  const searchKeyWord = text.value
  const dropdownValue = value.value
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
    <n-select size="large" v-model:value="value" :options="options"
      default-value="哔哩哔哩" :consistent-menu-width="false"></n-select>
    <n-button size="large" type="primary" @click="search">搜索&nbsp;<n-icon size="18"><OpenInNewOutlined /></n-icon></n-button>
  </div>
</template>
<script setup lang="ts">
import { NSpace, NCheckbox, NSelect } from 'naive-ui'
import { forceVertical, pageSize } from '../control'


const options = [
  { label: '默认', value: 0 },
  ...Array.from({ length: 10 }, (_, i) => ({ label: (i + 1).toString(), value: i + 1 }))
]
</script>

<template>
  <n-space style="align-items: center">
    <h3>外观</h3>
    <n-checkbox v-model:checked="forceVertical">
      垂直排列候选词
    </n-checkbox>
    <n-space style="align-items: center">
      候选词个数
      <n-select v-model:value="pageSize" style="width: 96px" :options="options" />
    </n-space>
  </n-space>
</template>

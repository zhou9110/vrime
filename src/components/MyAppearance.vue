<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { NSpace, NCheckbox, NSelect } from 'naive-ui'
import { forceVertical } from '../control'
import { setPageSize } from '../workerAPI'

const PAGE_SIZE = 'pageSize'
const pageSize = ref<number>(Number(localStorage.getItem(PAGE_SIZE)) || 0)

watchEffect(() => {
  localStorage.setItem(PAGE_SIZE, pageSize.value.toString())
  setPageSize(pageSize.value)
})

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
      <n-select
        v-model:value="pageSize"
        style="width: 96px"
        :options="options"
      />
    </n-space>
  </n-space>
</template>

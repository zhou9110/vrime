<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NButton, NText, NMenu, NSwitch, NSpace, NTooltip } from 'naive-ui'
import { Github } from '@vicons/fa'
import { HeadsetVr24Filled, Keyboard20Regular, Settings32Regular } from '@vicons/fluent'
import { LightModeFilled, DarkModeFilled } from '@vicons/material'
import { currentTheme, toggleDrawer } from '../util'

const prop = defineProps<{
  icon: string,
  homepage: string
}>()

const isDark = computed({
  get: () => (currentTheme.value === "dark"),
  set: (val) => {
    currentTheme.value = val ? "dark" : "light"
  }
})

function toRepo() {
  window.open(prop.homepage, '_blank')
}

// <n-icon
//   :size="28"
//   style="padding-right: 16px; cursor: pointer"
//   @click="toRepo"
// >
//   <github />
// </n-icon>
</script>

<template>
  <div style="padding-left: 24px; display: flex; align-items: center; cursor: pointer" @click="toRepo">
    <!-- <img :src="icon" style="width: 48px; height: 48px"> -->
    <n-icon size="40">
      <HeadsetVr24Filled />
    </n-icon>
    <span style="font-size: 20px; vertical-align: middle; align-self:baseline;">+</span>
    <n-icon size="35">
      <Keyboard20Regular />
    </n-icon>
    <n-text style="font-size: 18px; margin-left: 12px">
      在线中文输入法 (Quest用)
    </n-text>
  </div>
  <n-space>
    <n-tooltip>
      <template #trigger>
        <n-switch v-model:value="isDark" size="large">
          <template #checked-icon>
            <n-icon :component="DarkModeFilled" color="#333" />
          </template>
          <template #unchecked-icon>
            <n-icon :component="LightModeFilled" />
          </template>
        </n-switch>
      </template>
      <div>浅色/深色模式</div>
    </n-tooltip>
    <n-button text style="font-size: 24px" @click="toggleDrawer">
      <n-icon :size="28" :component="Settings32Regular" />
    </n-button>
    <n-icon :size="28" style="padding-right: 16px; cursor: pointer" @click="toRepo">
      <github />
    </n-icon>
  </n-space>
</template>
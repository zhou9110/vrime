<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import { NIcon, NButton, NText, NSwitch, NSpace, NTooltip, NBadge, useMessage } from 'naive-ui'
import { Github } from '@vicons/fa'
import { HeadsetVr24Filled, Keyboard20Regular, Settings32Regular, PersonFeedback24Regular } from '@vicons/fluent'
import { Bullhorn } from '@vicons/fa'
import { LightModeFilled, DarkModeFilled, FeedbackOutlined, InfoOutlined } from '@vicons/material'
import { currentTheme, toggleDrawer, isMobile } from '../util'
import FeedbackForm from './FeedbackForm.vue'
import type Announcement from './Announcement.vue'

const message = useMessage()

const prop = defineProps<{
  icon: string,
  homepage: string
}>()

// Inject the announcement ref from App.vue
const announcementRef = inject<Ref<InstanceType<typeof Announcement> | undefined>>('announcementRef')

// Get unseen count from announcement component
const unseenCount = computed(() => {
  return announcementRef?.value?.unseenCount ?? 0
})

const isDark = computed({
  get: () => (currentTheme.value === 'dark'),
  set: (val) => {
    currentTheme.value = val ? 'dark' : 'light'
  }
})

function toRepo() {
  window.open(prop.homepage, '_blank')
}

const showFeedbackModal = ref(false)

function openFeedback() {
  showFeedbackModal.value = true
}

function handleFeedbackSuccess() {
  message.success('感谢您的反馈！我们已收到您的消息。')
}

function handleFeedbackError(errorMessage: string) {
  message.error(errorMessage)
}

function openWhatsNew() {
  announcementRef?.value?.openAnnouncement()
}
</script>

<template>
  <div class="vrime-header" style="padding-left: 24px; display: flex; align-items: center; cursor: pointer">
    <!-- <img :src="icon" style="width: 48px; height: 48px"> -->
    <n-icon size="40">
      <HeadsetVr24Filled />
    </n-icon>
    <span style="font-size: 20px; vertical-align: middle; align-self:baseline;">+</span>
    <n-icon size="35">
      <Keyboard20Regular />
    </n-icon>
    <n-text v-if="!isMobile" style="font-size: 18px; margin-left: 12px">
      VRIME | 在线中文输入法
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
    <n-tooltip>
      <template #trigger>
        <n-badge :value="unseenCount" :max="9" :show="unseenCount > 0" dot>
          <n-button text @click="openWhatsNew">
            <n-icon :size="24" :component="Bullhorn" />
          </n-button>
        </n-badge>
      </template>
      <div>更新公告</div>
    </n-tooltip>
    <n-tooltip>
      <template #trigger>
        <n-button text @click="openFeedback">
          <n-icon :size="28" :component="PersonFeedback24Regular" />
        </n-button>
      </template>
      <div>提交反馈</div>
    </n-tooltip>
    <n-tooltip>
      <template #trigger>
        <n-button id="settings-btn" text style="font-size: 24px" @click="toggleDrawer">
          <n-icon :size="28" :component="Settings32Regular" />
        </n-button>
      </template>
      <div>设置</div>
    </n-tooltip>
    <n-icon :size="28" style="padding-right: 16px; cursor: pointer" @click="toRepo">
      <github />
    </n-icon>
  </n-space>
  <FeedbackForm v-model:show="showFeedbackModal" @success="handleFeedbackSuccess" @error="handleFeedbackError" />
</template>

<style>
@media (max-height: 768px) {
  .vrime-header {
    display: none;
  }
}
</style>

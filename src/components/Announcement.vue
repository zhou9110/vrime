<script setup lang="ts">
import { ref, onMounted, defineExpose } from 'vue'
import { NModal, NButton, NDivider, NTag, NBadge } from 'naive-ui'
import {
  parseChangelog,
  markChangelogAsViewed,
  getUnseenCount,
  isNewUpdate,
  type ProductUpdate
} from '../changelog-parser'

const showModal = ref(false)
const unseenCount = ref(0)
const productUpdates = ref<ProductUpdate[]>([])
const loading = ref(true)

// Calculate unseen count
const updateUnseenCount = () => {
  unseenCount.value = getUnseenCount(productUpdates.value)
}

// Mark as viewed when modal is closed with "知道了"
const markAsViewed = () => {
  markChangelogAsViewed()
  updateUnseenCount()
  showModal.value = false
}

// Open announcement and mark as viewed
const openAnnouncement = () => {
  showModal.value = true
  // Mark as viewed when opening manually
  markChangelogAsViewed()
  updateUnseenCount()
}

// Get tag type for section name
const getSectionType = (name: string): 'success' | 'info' | 'warning' | 'default' => {
  if (name.includes('新增') || name.includes('功能')) return 'success'
  if (name.includes('改进') || name.includes('优化')) return 'info'
  if (name.includes('修复') || name.includes('修正')) return 'warning'
  return 'default'
}

// Load changelog on mount
onMounted(async () => {
  try {
    const response = await fetch('/announcement.zh-CN.md')
    const text = await response.text()
    productUpdates.value = parseChangelog(text)
    updateUnseenCount()
  } catch (error) {
    console.error('Failed to load changelog:', error)
  } finally {
    loading.value = false
  }
})

defineExpose({
  openAnnouncement,
  unseenCount
})
</script>

<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    title="更新公告"
    style="max-width: 700px; width: 95%"
    :bordered="false"
    :segmented="{
      content: 'soft',
      footer: 'soft'
    }"
  >
    <div
      v-if="productUpdates.length > 0"
      style="max-height: 70vh; overflow-y: auto; padding: 4px"
    >
      <div
        v-for="(update, index) in productUpdates"
        :key="update.version"
        style="margin-bottom: 32px"
      >
        <n-divider
          v-if="index > 0"
          style="margin: 32px 0"
        />

        <!-- Update Header -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
          <n-tag
            type="success"
            size="medium"
            :bordered="false"
          >
            v{{ update.version }}
          </n-tag>
          <n-badge
            v-if="isNewUpdate(update)"
            value="新"
            type="error"
          />
          <span style="color: var(--n-text-color); opacity: 0.6; font-size: 14px">
            {{ update.date }}
          </span>
        </div>

        <!-- Update Title & Description -->
        <h3 style="margin: 12px 0 8px 0; color: var(--n-text-color); font-size: 18px; font-weight: 600">
          {{ update.title }}
        </h3>
        <p
          v-if="update.description"
          style="color: var(--n-text-color); opacity: 0.8; margin-bottom: 20px; line-height: 1.6"
        >
          {{ update.description }}
        </p>

        <!-- Sections (新增功能, 改进优化, etc.) -->
        <div
          v-for="(section, sectionIndex) in update.sections"
          :key="sectionIndex"
          style="margin-bottom: 20px"
        >
          <n-tag
            :type="getSectionType(section.name)"
            size="small"
            :bordered="false"
            style="margin-bottom: 12px"
          >
            {{ section.name }}
          </n-tag>

          <ul style="margin: 0; padding-left: 20px; color: var(--n-text-color)">
            <li
              v-for="(item, itemIndex) in section.items"
              :key="itemIndex"
              style="margin: 8px 0; line-height: 1.6; opacity: 0.9"
            >
              {{ item.text }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div
      v-else-if="!loading"
      style="text-align: center; padding: 40px; opacity: 0.6"
    >
      暂无更新记录
    </div>

    <template #footer>
      <div style="display: flex; justify-content: flex-end; gap: 12px">
        <n-button
          type="primary"
          @click="markAsViewed"
        >
          知道了
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
ul {
  list-style-type: disc;
}

li::marker {
  color: var(--n-text-color);
}

/* Custom scrollbar for changelog */
:deep(.n-card__content) {
  scrollbar-width: thin;
  scrollbar-color: var(--n-color-target) transparent;
}

:deep(.n-card__content)::-webkit-scrollbar {
  width: 6px;
}

:deep(.n-card__content)::-webkit-scrollbar-track {
  background: transparent;
}

:deep(.n-card__content)::-webkit-scrollbar-thumb {
  background-color: var(--n-color-target);
  border-radius: 3px;
}
</style>

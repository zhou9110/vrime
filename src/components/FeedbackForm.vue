<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NForm, NFormItem, NInput, NButton, NSpace } from 'naive-ui'
import { text } from '../control'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean],
  'success': [],
  'error': [message: string]
}>()

const formRef = ref<any>(null)
const isSubmitting = ref(false)

const formValue = ref({
  name: '',
  contact: '',
  feedback: ''
})

const rules = {
  contact: {
    required: false,
    trigger: ['blur', 'input']
  },
  feedback: {
    required: true,
    message: '请输入反馈内容',
    trigger: ['blur', 'input']
  }
}

function handleClose() {
  emit('update:show', false)
}

async function handleSubmit(e: Event) {
  e.preventDefault()

  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  isSubmitting.value = true

  try {
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData as any).toString()
    })

    if (response.ok) {
      emit('success')
      formValue.value = { name: '', contact: '', feedback: '' }
      handleClose()
    } else {
      throw new Error('提交失败')
    }
  } catch (error) {
    emit('error', '提交失败，请稍后重试')
    console.error('Form submission error:', error)
  } finally {
    isSubmitting.value = false
  }
}

function handleReset() {
  formValue.value = { name: '', contact: '', feedback: '' }
}

function pasteFromTextbox() {
  // 将打字框的内容添加到反馈内容中
  if (text.value) {
    // 如果反馈框已有内容，换行后添加
    if (formValue.value.feedback) {
      formValue.value.feedback += '\n\n--- 打字框内容 ---\n' + text.value
    } else {
      formValue.value.feedback = text.value
    }
  }
}
</script>

<template>
  <n-modal :show="props.show" preset="card" title="提交反馈" style="max-width: 600px" :bordered="false" :segmented="{
    content: 'soft',
    footer: 'soft'
  }" @update:show="(val) => emit('update:show', val)">
    <n-form name="feedback" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" ref="formRef"
      :model="formValue" :rules="rules" label-placement="left" label-width="80" require-mark-placement="right-hanging"
      @submit="handleSubmit">
      <input type="hidden" name="form-name" value="feedback">
      <!-- Honeypot 字段（防止垃圾邮件） -->
      <p style="display: none">
        <label>
          Don't fill this out if you're human: <input name="bot-field">
        </label>
      </p>
      <n-form-item label="反馈内容" path="feedback">
        <n-space vertical style="width: 100%">
          <n-input v-model:value="formValue.feedback" name="feedback" type="textarea"
            :placeholder="'请告诉我们您的意见、建议或遇到的问题...\n(该功能在自行部署的服务器上无法使用)'" :autosize="{
              minRows: 4,
              maxRows: 8
            }" clearable />
          <n-button secondary size="small" :disabled="!text" @click="pasteFromTextbox">
            粘贴打字框内容
          </n-button>
        </n-space>
      </n-form-item>
      <n-form-item label="姓名" path="name">
        <n-input v-model:value="formValue.name" name="name" placeholder="请输入您的姓名（可选）" clearable />
      </n-form-item>
      <n-form-item label="联系方式" path="contact">
        <n-input v-model:value="formValue.contact" name="contact" placeholder="请输入您的邮箱，或其他联系方式（可选）" clearable />
      </n-form-item>
      <n-space justify="end" style="margin-top: 16px">
        <n-button :disabled="isSubmitting" @click="handleReset">
          重置
        </n-button>
        <n-button :disabled="isSubmitting" @click="handleClose">
          取消
        </n-button>
        <n-button type="primary" attr-type="submit" :loading="isSubmitting">
          提交反馈
        </n-button>
      </n-space>
    </n-form>
  </n-modal>
</template>

<style scoped>
/* 确保表单在移动端也能正常显示 */
@media (max-width: 640px) {
  :deep(.n-card) {
    margin: 16px;
  }
}
</style>

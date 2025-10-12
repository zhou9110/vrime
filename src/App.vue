<script setup lang="ts">
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  darkTheme,
  zhCN
} from 'naive-ui'
import { homepage } from '../package.json'
import MyHeader from './components/MyHeader.vue'
import MyLayout from './components/MyLayout.vue'
import MyPwa from './components/MyPwa.vue'
import { currentTheme } from './util'
</script>

<template>
  <n-config-provider :theme="currentTheme === 'dark' ? darkTheme : null" :locale="zhCN">
    <n-message-provider>
      <MyPwa />
      <my-layout>
        <template #header>
          <my-header icon="./icon.svg" :homepage="homepage" />
        </template>
        <template #content>
          <n-notification-provider :max="1">
            <n-dialog-provider>
              <router-view v-slot="{ Component }">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </n-dialog-provider>
          </n-notification-provider>
        </template>
      </my-layout>
    </n-message-provider>
  </n-config-provider>
</template>

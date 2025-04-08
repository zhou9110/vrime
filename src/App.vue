<script setup lang="ts">
import {
  NConfigProvider,
  NNotificationProvider,
  NDialogProvider,
  NMessageProvider,
  darkTheme,
  useOsTheme,
  zhCN
} from 'naive-ui'
import MyHeader from './components/MyHeader.vue'
import MyLayout from './components/MyLayout.vue'
import MyFooter from './components/MyFooter.vue'
import MyPwa from './components/MyPwa.vue'
import { currentTheme } from "./util"
import { homepage, appName } from '../package.json'
</script>

<template>
  <n-config-provider :theme="currentTheme === 'dark' ? darkTheme : null" :locale="zhCN">
    <MyPwa />
    <my-layout>
      <template #header>
        <my-header icon="./icon.svg" :homepage="homepage" />
      </template>
      <template #content>
        <n-notification-provider :max="1">
          <n-dialog-provider>
            <n-message-provider>
              <router-view v-slot="{ Component }">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </n-message-provider>
          </n-dialog-provider>
        </n-notification-provider>
      </template>
    </my-layout>
  </n-config-provider>
</template>

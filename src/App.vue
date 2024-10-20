<script setup lang="ts">
import {
  NConfigProvider,
  NNotificationProvider,
  NDialogProvider,
  NMessageProvider,
  NH1,
  darkTheme,
  useOsTheme
} from 'naive-ui'
import { MyLayout, MyFooter } from '@libreservice/my-widget'
import MyHeader from "./components/MyHeader.vue"
import MyPwa from './components/MyPwa.vue'
import { homepage, appName } from '../package.json'

const osThemeRef = useOsTheme()
</script>

<template>
  <n-config-provider :theme="osThemeRef === 'dark' ? darkTheme : null">
    <my-layout>
      <template #header>
        <my-header
          icon="./icon.svg"
          :homepage="homepage"
        />
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

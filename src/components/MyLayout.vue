<script setup lang="ts">
import { NLayout, NLayoutHeader, NLayoutContent, NLayoutFooter } from 'naive-ui'
</script>

<template>
  <n-layout-header
    style="height: 48px; display: flex; align-items: center; justify-content: space-between"
  >
    <slot name="header" />
  </n-layout-header>
  <n-layout
    position="absolute"
    :native-scrollbar="false"
    style="top: 48px"
    content-style="height: 100%; display: flex; flex-direction: column"
  >
    <n-layout-content style="flex: 1 0 auto">
      <slot name="content" />
    </n-layout-content>
    <n-layout-footer
      style="flex-shrink: 0; margin-top: 16px"
    >
      <slot name="footer" />
    </n-layout-footer>
  </n-layout>
</template>
<script setup lang="ts">
import { NA } from 'naive-ui'

const props = defineProps<{
  homepage?: string
  commit?: string
  buildDate?: string
  copyright?: string
}>()

const commitURL = `${props.homepage}/commit/${props.commit}`
</script>

<template>
  <div>
    <p>
      Commit <n-a
        :href="commitURL"
        target="_blank"
      >
        {{ commit?.slice(0, 7) }}
      </n-a> · Built at {{ buildDate }}

      <span>{{ copyright }}</span> &copy;
    </p>
    <p>
      This project is <n-a
        href="https://www.gnu.org/philosophy/free-sw"
        target="_blank"
      >
        Free
      </n-a> and
      <n-a
        href="https://opensource.org/osd"
        target="_blank"
      >
        Open Source
      </n-a>
      (<n-a
        href="https://www.gnu.org/licenses/agpl-3.0.html"
        target="_blank"
      >
        AGPLv3
      </n-a>+)
    </p>
  </div>
</template>
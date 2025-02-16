<script setup lang="ts">
import { ref, defineProps} from 'vue'
import { NA } from 'naive-ui'
import { version as v } from '../../package.json'

const props = defineProps<{
  homepage?: string
  commit?: string
  buildDate?: string
  copyright?: string
}>()

const commitURL = `${props.homepage}/commit/${props.commit}`

const version = ref(v)
</script>

<template>
  <div>
    <p>
      Version: {{ version }} · Commit <n-a
        :href="commitURL"
        target="_blank"
      >
        {{ commit?.slice(0, 7) }}
      </n-a> · Built at {{ buildDate }}

    </p>
    <span>{{ copyright }}</span> &copy;
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
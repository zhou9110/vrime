<script setup lang="ts">
import { NA } from 'naive-ui';
import { defineProps, ref } from 'vue';
import { version as v } from '../../package.json';
import { homepage } from '../../package.json'

const props = defineProps<{
  commit?: string
  buildDate?: string
  copyright?: string
}>()

const commitURL = `${homepage}/commit/${props.commit}`

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
    
    &copy;<span>
      2024-{{new Date().getFullYear()}} David Zhou (<n-a href="https://github.com/zhou9110">@zhou9110</n-a>), My Rime authors (Qijia Liu (<n-a href="https://github.com/eagleoflqj">@eagleoflqj</n-a>), et al.)
    </span>
    <p>Made with ❤️ and supported by <n-a href="https://aibuild.com">AIBUILD</n-a></p>
  </div>
</template>
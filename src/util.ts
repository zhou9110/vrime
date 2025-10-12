import { ref, computed, onMounted, onUnmounted } from 'vue'
import { LocationQuery } from 'vue-router'
import { useBreakpoint } from 'vooks'
import { useOsTheme } from 'naive-ui'

import schemas from "../schemas.json"

let query: LocationQuery

function setQuery (_query: LocationQuery) {
  query = _query
}

const breakpoint = useBreakpoint()
const isMobile = computed(() => (breakpoint.value === 'xs'))

const osThemeRef = useOsTheme()
const currentTheme = ref(osThemeRef.value)

const showDrawer = ref(false)

const textareaSelector = '#container textarea'

function getTextarea () {
  return document.querySelector(textareaSelector) as HTMLTextAreaElement
}

function getQueryString (key: string) {
  const queryValue = query[key]
  return typeof queryValue === 'string' ? queryValue : ''
}

function getQueryOrStoredString (key: string) {
  return getQueryString(key) || localStorage.getItem(key) || ''
}

function toggleDrawer() {
  showDrawer.value = !showDrawer.value
}

function useMobileHeightBreakpoint(callback?: (matches: boolean, query: MediaQueryList) => void) {
  const mobileHeightQuery = matchMedia('(max-height: 768px)')
  const matches = ref(mobileHeightQuery.matches)

  const onChange = () => {
    matches.value = mobileHeightQuery.matches
    if (callback) {
      callback(matches.value, mobileHeightQuery)
    }
  }

  onMounted(() => {
    // 监听媒体查询变化
    mobileHeightQuery.addEventListener('change', onChange)
  })
  
  onUnmounted(() => {
    mobileHeightQuery.removeEventListener('change', onChange)
  })

  return matches
}

function getImeGroup(imeId: string) {
  return schemas.find((item) => item.id === imeId)?.group
}

export {
  isMobile,
  currentTheme,
  showDrawer,
  setQuery,
  getTextarea,
  getQueryString,
  getQueryOrStoredString,
  toggleDrawer,
  useMobileHeightBreakpoint,
  getImeGroup
}

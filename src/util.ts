import { ref, computed } from 'vue'
import { LocationQuery } from 'vue-router'
import { useBreakpoint } from 'vooks'
import { useOsTheme } from 'naive-ui'

let query: LocationQuery

function setQuery (_query: LocationQuery) {
  query = _query
}

const breakpoint = useBreakpoint()
const isMobile = computed(() => breakpoint.value === 'xs')

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

export {
  isMobile,
  currentTheme,
  showDrawer,
  setQuery,
  getTextarea,
  getQueryString,
  getQueryOrStoredString,
  toggleDrawer
}

<script setup lang="ts">
import { ref, computed, h } from "vue";
import {
  NButton,
  NIcon,
  NPopover,
  NFlex,
  NButtonGroup,
  NCheckbox,
  NText,
  NMenu,
  type MenuOption,
} from "naive-ui";
import {
  Cut20Regular,
  Copy20Regular,
  Clipboard20Regular,
  Delete20Regular,
  Edit20Regular,
  ChevronUp20Regular,
  ChevronDown20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  MoreCircle20Regular,
} from "@vicons/fluent";
import { UndoOutlined, RedoOutlined, KeyboardHideOutlined } from "@vicons/material";
import type MyPanel from "./MyPanel.vue";
import { text, copiedText, autoCopy } from "../control";
import { getTextarea } from "../util";

interface Props {
  panel?: InstanceType<typeof MyPanel>;
  showKeyboard: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["toggleKeyboard"]);

// 状态
const showEditMenu = ref(false); // 文字编辑菜单是否展开
const expandedCandidates = ref(false); // 候选词是否展开
const expanded = ref(false); // 整个菜单栏是否展开

// 计算属性
const hasCandidates = computed(() => {
  // 只在 editing 模式下且 showMenu 为 true 时显示候选词
  // 当用户选中候选词后，showMenu 会变为 false，此时应该隐藏选字框
  return (
    props.panel?.editing &&
    props.panel?.showMenu &&
    props.panel?.menuOptions &&
    props.panel.menuOptions.length > 0
  );
});

const candidates = computed(() => {
  return props.panel?.menuOptions || [];
});

const highlighted = computed(() => props.panel?.highlighted || 0);
const prevDisabled = computed(() => props.panel?.prevDisabled ?? true);
const nextDisabled = computed(() => props.panel?.nextDisabled ?? false);

// 文字编辑功能（从 MyBar.vue 复用）
async function copy() {
  const textarea = getTextarea();
  textarea.focus();
  copiedText.value = text.value;
  await navigator.clipboard.writeText(text.value);
  showEditMenu.value = false;
}

async function cut() {
  if (text.value) {
    await copy();
    text.value = "";
  }
  showEditMenu.value = false;
}

async function paste() {
  const textarea = getTextarea();
  textarea.focus();
  const pastedText = await navigator.clipboard.readText();
  text.value += pastedText;
  if (autoCopy.value) {
    await navigator.clipboard.writeText(text.value);
    copiedText.value = text.value;
  }
  showEditMenu.value = false;
}

function selectAll() {
  emit("selectAll");
}

function clear() {
  text.value = "";
  showEditMenu.value = false;
}

function undo() {
  document.execCommand("undo");
  showEditMenu.value = false;
}

function redo() {
  document.execCommand("redo");
  showEditMenu.value = false;
}

// 候选词选择
function onSelectCandidate(index: number | string | undefined) {
  if (typeof index === "number") {
    props.panel?.onClick(index);
    expandedCandidates.value = false; // 选择后收起
  }
}

// 翻页
function onPrevPage() {
  props.panel?.onPageChange(true);
}

function onNextPage() {
  props.panel?.onPageChange(false);
}

// 展开/收起候选词
function toggleExpandCandidates() {
  expandedCandidates.value = !expandedCandidates.value;
}

// 隐藏键盘（只隐藏数字键盘，保留 menu bar）
function hideKeyboard() {
  emit("toggleKeyboard");
}
</script>

<template>
  <n-flex
    inline
    class="t9-menu-bar"
    :class="{ expanded: expandedCandidates || expanded }"
    align="stretch"
    :wrap="false"
  >
    <!-- 默认状态：工具栏 -->
    <n-flex
      style="padding: 5px 10px; flex: 1"
      v-if="!hasCandidates"
      justify="space-between"
      align="center"
    >
      <n-button secondary size="medium" @click="cut">
        <template #icon>
          <n-icon>
            <Cut20Regular />
          </n-icon>
        </template>
        剪切
      </n-button>
      <n-button secondary size="medium" @click="copy">
        <template #icon>
          <n-icon>
            <Copy20Regular />
          </n-icon>
        </template>
        复制
      </n-button>
      <n-button secondary size="medium" @click="paste">
        <template #icon>
          <n-icon>
            <Clipboard20Regular />
          </n-icon>
        </template>
        粘贴
      </n-button>
      <n-button secondary class="select-all" size="medium" @click="selectAll">
        全选
      </n-button>
      <n-button secondary size="medium" @click="clear">
        <template #icon>
          <n-icon :component="Delete20Regular" />
        </template>
        清空
      </n-button>

      <n-checkbox v-model:checked="autoCopy"> 自动复制文字 </n-checkbox>
      <n-flex>
        <!-- 文字编辑按钮（带下拉菜单） -->
        <n-popover v-model:show="showEditMenu" trigger="click" placement="bottom-start">
          <template #trigger>
            <n-button text size="large">
              <n-icon size="28">
                <MoreCircle20Regular />
              </n-icon>
            </n-button>
          </template>
          <n-button-group vertical>
            <n-button @click="undo">
              <template #icon>
                <n-icon>
                  <UndoOutlined />
                </n-icon>
              </template>
              撤销
            </n-button>
            <n-button @click="redo">
              <template #icon>
                <n-icon>
                  <RedoOutlined />
                </n-icon>
              </template>
              重做
            </n-button>
          </n-button-group>
        </n-popover>
        <!-- 隐藏键盘按钮 -->
        <n-button text @click="hideKeyboard">
          <n-icon size="28">
            <KeyboardHideOutlined />
          </n-icon>
        </n-button>
      </n-flex>
    </n-flex>

    <!-- 候选词状态 -->
    <n-flex v-else class="candidates-container" vertical>
      <!-- 收起状态：横向滚动列表 -->
      <n-flex style="flex: 1">
        <n-text type="success"> {{ panel?.preEditHead }} </n-text>
        <n-text type="info"> {{ panel?.preEditBody }} </n-text>
        {{ panel?.preEditTail }}
      </n-flex>
      <n-flex
        v-if="!expandedCandidates"
        horizontal
        class="candidates-row"
        align="center"
        :wrap="false"
        style="flex: 3"
      >
        <div class="candidates-scroll">
          <n-button
            secondary
            v-for="(option, index) in candidates"
            :key="option.key"
            :type="index === highlighted ? 'primary' : 'default'"
            size="medium"
            @click="onSelectCandidate(option.key)"
            style="padding-top: 15px; padding-bottom: 15px"
          >
            {{ (option.label as string).split(" ").slice(2).join(" ") }} <br />
            {{ (option.label as string).split(" ")[1] }}
          </n-button>
        </div>

        <!-- 控制按钮 -->
        <n-button-group size="small">
          <n-button :disabled="prevDisabled" @click="onPrevPage">
            <n-icon>
              <ChevronLeft20Regular />
            </n-icon>
          </n-button>
          <n-button :disabled="nextDisabled" @click="onNextPage">
            <n-icon>
              <ChevronRight20Regular />
            </n-icon>
          </n-button>
          <n-button @click="toggleExpandCandidates">
            <n-icon>
              <ChevronDown20Regular />
            </n-icon>
          </n-button>
        </n-button-group>
      </n-flex>

      <!-- 展开状态：网格布局，覆盖键盘区域 -->
      <div v-else class="candidates-expanded">
        <div class="candidates-grid">
          <n-button
            v-for="(option, index) in candidates"
            :key="option.key"
            :type="index === highlighted ? 'primary' : 'default'"
            block
            @click="onSelectCandidate(option.key)"
          >
            {{ option.label }}
          </n-button>
        </div>

        <!-- 收起按钮 -->
        <n-flex justify="center" style="margin-top: 10px">
          <n-button-group size="small">
            <n-button :disabled="prevDisabled" @click="onPrevPage"> 上一页 </n-button>
            <n-button :disabled="nextDisabled" @click="onNextPage"> 下一页 </n-button>
            <n-button @click="toggleExpandCandidates">
              <n-icon>
                <ChevronUp20Regular />
              </n-icon>
              收起
            </n-button>
          </n-button-group>
        </n-flex>
      </div>
    </n-flex>
  </n-flex>
</template>

<style scoped>
.t9-menu-bar {
  flex: 1;
  min-height: 50px;
  width: 100%;
  max-width: 800px;
  background: rgba(128, 128, 128, 0.1);
  border-radius: 5px;
  transition: all 0.3s ease;
}

.t9-menu-bar.expanded {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: var(--n-color);
  min-height: auto;
  display: flex;
  flex-direction: column;
}

.candidates-container {
  width: 100%;
  height: 100%;
}

.candidates-row {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
}

.candidates-scroll {
  flex: 1;
  display: flex;
  gap: 5px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 2px 0;
  align-items: stretch;
}

.candidates-scroll::-webkit-scrollbar {
  height: 4px;
}

.candidates-scroll::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.3);
  border-radius: 2px;
}

.candidates-expanded {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.candidates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}
</style>

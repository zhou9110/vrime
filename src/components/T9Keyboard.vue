<script setup lang="tsx">
import { NButton, NIcon, useOsTheme } from "naive-ui";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";
import { computed, defineComponent, nextTick, ref } from "vue";
import { currentTheme } from '../util';

const KeyboardHideOutlinedSvg = `<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-1.99.9-1.99 2L2 15c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H4V5h16v10zm-9-9h2v2h-2zm0 3h2v2h-2zM8 6h2v2H8zm0 3h2v2H8zM5 9h2v2H5zm0-3h2v2H5zm3 6h8v2H8zm6-3h2v2h-2zm0-3h2v2h-2zm3 3h2v2h-2zm0-3h2v2h-2zm-5 17l4-4H8z" fill="currentColor"></path></svg>`
const KeyboardReturnRoundSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg>'
const SettingsRegularSvg = '<svg style="width:20px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98c0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566 0 0 0-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98c0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03c.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73c0 .21-.02.43-.05.73l-.14 1.13l.89.7l1.08.84l-.7 1.21l-1.27-.51l-1.04-.42l-.9.68c-.43.32-.84.56-1.25.73l-1.06.43l-.16 1.13l-.2 1.35h-1.4l-.19-1.35l-.16-1.13l-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7l-1.06.43l-1.27.51l-.7-1.21l1.08-.84l.89-.7l-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13l-.89-.7l-1.08-.84l.7-1.21l1.27.51l1.04.42l.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43l.16-1.13l.2-1.35h1.39l.19 1.35l.16 1.13l1.06.43c.43.18.83.41 1.23.71l.91.7l1.06-.43l1.27-.51l.7 1.21l-1.07.85l-.89.7l.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z" fill="currentColor"></path></svg>'
const BackspaceRegularSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41L17.59 17L19 15.59L15.41 12L19 8.41L17.59 7L14 10.59L10.41 7L9 8.41L12.59 12L9 15.59z" fill="currentColor"></path></svg>'

import { isEnglish, isRecording } from "../control";
import RecordButton from "./RecordButton2.vue";
import NumKey from "./NumKey.vue";

const micButtonTarget = ref<HTMLElement | null>(null)

const currentLanguage = computed(() => isEnglish.value ? "engish" : "chinese")

const langBtnCn = "<span><b>中</b>/<span style='color: lightgray'>英</span></span>"
const langBtnEn = "<span><span style='color: lightgray'>中</span>/<b>英</b></span>"

function getDisplay() {
  const prevIsEnglish = isEnglish.value
  return {
    // '{enter}': render(h(NIcon, { ':component': KeyboardReturnRound })),
    // '{enter}': returnIcon,
    '{enter}': KeyboardReturnRoundSvg, // '<img src="@sicons/fluent/Money16Regular.svg" />',
    '{settings}': SettingsRegularSvg, // '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
    '{bksp}': BackspaceRegularSvg, //  '<span class="material-icons-outlined">backspace</span>',
    "{lock}": "caps ⇪",
    "{shift}": "⇧",
    "{lang}": prevIsEnglish ? langBtnCn : langBtnEn,
    // "{hide}": `<img src="data:image/svg+xml,${encodeURIComponent(KeyboardHideOutlinedSvg)}" />`
    "{hide}": KeyboardHideOutlinedSvg,
    "{mic}": '', // MicNoneRoundSvg,
  };
}

// defineComponent({
// setup() {
//   return {
//     isRecording,
//     isEnglish,
//     keyboard: ref<Keyboard | null>(null),
//     isKeyboardReady: ref(false),
//     micButtonTarget,
//     BackspaceRegularSvg,
//   }
// },
// methods: {
//   remountRecorderButton() {
//     const element = document.querySelector("[data-skbtn='{mic}']") as HTMLElement
//     if (element) {
//       this.micButtonTarget = element
//     }
//   },
//   onChange(input: string) {
//     this.$emit("onChange", input);
//   },
//   onKeyPress(button: string) {
//     this.$emit("onKeyPress", button);

//     /**
//      * If you want to handle the shift and caps lock buttons
//      */
//     if (button === "{shift}" || button === "{lock}") this.handleShift();

//     if (button === "{lang}") this.switchLanguage();
//   },
//   handleShift() {
//     if (!this.keyboard) return
//     let currentLayout = this.keyboard.options.layoutName;
//     let shiftToggle = currentLayout === "default" ? "shift" : "default";

//     this.keyboard.setOptions({
//       layoutName: shiftToggle
//     });
//     this.remountRecorderButton()
//   },
//   switchLanguage() {
//     if (!this.keyboard) return
//     const currentLayout = this.keyboard.options.layoutName;
//     const langToggle = currentLayout === "default" ? "eng" : "default";

//     this.keyboard.setOptions({
//       layoutName: langToggle,
//       display: getDisplay()
//     });
//     this.remountRecorderButton()
//   }
// },
// watch: {
//   input(input) {
//     this.keyboard?.setInput(input);
//   },
//   isDark(isDark) {
//     console.log("isDark", isDark)
//     this.keyboard?.setOptions({
//       theme: isDark
//         ? "hg-theme-default darkTheme"
//         : "hg-theme-default"
//     })
//     this.remountRecorderButton()
//   },
//   // isRecording(newIsRecording) {
//   //   if (!this.keyboard) return
//   //   this.keyboard.setOptions({
//   //     display: getDisplay(),
//   //     layoutName: newIsRecording ? "micOn" : "default"
//   //   })
//   // },
// },
// computed: {
//   isDark() {
//     return currentTheme.value === "dark"
//   },
//   getDarkThemeClassName() {
//     return osThemeRef.value === "dark" ? "darkTheme" : undefined
//   },
//   //   getDisplay() {
//   //     return {
//   //       // '{enter}': '<span class="material-icons-outlined">keyboard_return</span>',
//   //       // '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
//   //       // '{bksp}': '<span class="material-icons-outlined">backspace</span>',
//   //       // "{lock}": "caps ⇪",
//   //       // "{shift}": "⇧",
//   //       // "{lang}": isEnglish.value ? langBtnEn : langBtnCn

//   //       // '{enter}': render(h(NIcon, { ':component': KeyboardReturnRound })),
//   //       // '{enter}': returnIcon,
//   //       '{enter}': '<span style="height: 20px; width: 20px;"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg></span>',
//   //       '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
//   //       '{bksp}': '<span class="material-icons-outlined">backspace</span>',
//   //       "{lock}": "caps ⇪",
//   //       "{shift}": "⇧",
//   //       "{lang}": currentLanguage.value === "chinese" ? langBtnCn : langBtnEn,
//   //       "{hide}": "hide2"
//   //     };
//   //   }
// },
// });
</script>

<template>
  <div class="numpad">
    <n-button class="numpad-key" size="large">，</n-button>
    <NumKey class="numpad-key" number="1">分词</NumKey>
    <NumKey class="numpad-key" number="2">abc</NumKey>
    <NumKey class="numpad-key" number="3">def</NumKey>
    <n-button class="numpad-key" size="large"><span v-html="BackspaceRegularSvg"></span></n-button>
    <n-button class="numpad-key" size="large">。</n-button>
    <NumKey class="numpad-key" number="4">ghi</NumKey>
    <NumKey class="numpad-key" number="5">jkl</NumKey>
    <NumKey class="numpad-key" number="6">mno</NumKey>
    <n-button class="numpad-key" size="large">重输</n-button>
    <n-button class="numpad-key" size="large">？</n-button>
    <NumKey class="numpad-key" number="7">pqrs</NumKey>
    <NumKey class="numpad-key" number="8">tuv</NumKey>
    <NumKey class="numpad-key" number="9">wxyz</NumKey>
    <n-button class="numpad-key" size="large">OK</n-button>
    <n-button class="numpad-key" size="large">符号</n-button>
    <RecordButton style="height: 100%;" :secondary="false"/>
    <NumKey class="numpad-key" number="0">空格</NumKey>
    <n-button class="numpad-key" size="large">123</n-button>
    <n-button class="numpad-key" size="large"><span v-html="KeyboardReturnRoundSvg"></span></n-button>
  </div>
</template>

<style scoped>
.numpad {
  max-width: 800px;
  min-height: 300px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(4, 1fr);
  grid-template-areas: 
    "a n n n b"
    "a n n n b"
    "a n n n b"
    "b b n b b";
  gap: 5px;
  align-self: center;
}

.numpad-key {
  height: 100%;
  font-size: 1.5em;
}

.operation-bar {
  display: flex;
  flex-direction: column;
}
</style>

<template>
  <div :class="keyboardClass"></div>
</template>

<script lang="tsx">
import { ref, h, render, computed, defineComponent } from "vue"
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";
import { useOsTheme, NIcon } from "naive-ui"
import { currentTheme } from '../util'

import { KeyboardReturnRound } from "@vicons/material"

const KeyboardHideOutlinedSvg = `<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-1.99.9-1.99 2L2 15c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H4V5h16v10zm-9-9h2v2h-2zm0 3h2v2h-2zM8 6h2v2H8zm0 3h2v2H8zM5 9h2v2H5zm0-3h2v2H5zm3 6h8v2H8zm6-3h2v2h-2zm0-3h2v2h-2zm3 3h2v2h-2zm0-3h2v2h-2zm-5 17l4-4H8z" fill="currentColor"></path></svg>`
const KeyboardReturnRoundSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg>'
const SettingsRegularSvg = '<svg style="width:20px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98c0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566 0 0 0-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98c0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03c.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73c0 .21-.02.43-.05.73l-.14 1.13l.89.7l1.08.84l-.7 1.21l-1.27-.51l-1.04-.42l-.9.68c-.43.32-.84.56-1.25.73l-1.06.43l-.16 1.13l-.2 1.35h-1.4l-.19-1.35l-.16-1.13l-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7l-1.06.43l-1.27.51l-.7-1.21l1.08-.84l.89-.7l-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13l-.89-.7l-1.08-.84l.7-1.21l1.27.51l1.04.42l.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43l.16-1.13l.2-1.35h1.39l.19 1.35l.16 1.13l1.06.43c.43.18.83.41 1.23.71l.91.7l1.06-.43l1.27-.51l.7 1.21l-1.07.85l-.89.7l.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z" fill="currentColor"></path></svg>'
const BackspaceRegularSvg = '<svg style="width:24px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41L17.59 17L19 15.59L15.41 12L19 8.41L17.59 7L14 10.59L10.41 7L9 8.41L12.59 12L9 15.59z" fill="currentColor"></path></svg>'

import { isEnglish } from "../control"

const osThemeRef = useOsTheme()

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
    "{hide}": KeyboardHideOutlinedSvg
  };
}

export default defineComponent({
  name: "SimpleKeyboard",
  props: {
    keyboardClass: {
      default: "simple-keyboard",
      type: String
    },
    input: {
      type: String
    }
  },
  data() {
    return {
      keyboard: null
    } as { keyboard: Keyboard | null }
  },
  mounted() {
    this.keyboard = new Keyboard(this.keyboardClass, {
      onChange: this.onChange,
      onKeyPress: this.onKeyPress,
      theme: this.isDark ? "hg-theme-default darkTheme" : "hg-theme-default",
      layout: {
        default: [
          "{esc} \u0060 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
          "{tab} q w e r t y u i o p [ ] \\",
          "{lock} a s d f g h j k l ; ' {enter}",
          "{shift} z x c v b n m , . / {shift}",
          "{lang} ， {space} 。 {settings} {hide}",
        ],
        eng: [
          "{esc} \u0060 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
          "{tab} q w e r t y u i o p [ ] \\",
          "{lock} a s d f g h j k l ; ' {enter}",
          "{shift} z x c v b n m , . / {shift}",
          "{lang} .com {space} @ {settings} {hide}",
        ],
        shift: [
          "{esc} ~ ! @ # $ % ^ & * ( ) _ + {bksp}",
          "{tab} Q W E R T Y U I O P { } |",
          '{lock} A S D F G H J K L : " {enter}',
          "{shift} Z X C V B N M < > ? {shift}",
          "{lang} , {space} . {settings} {hide}",
        ],
      },
      mergeDisplay: true,
      display: {
        '{enter}': KeyboardReturnRoundSvg,
        '{settings}': SettingsRegularSvg,
        '{bksp}': BackspaceRegularSvg,
        "{hide}": KeyboardHideOutlinedSvg,
        "{lock}": "caps ⇪",
        "{shift}": "⇧",
        "{lang}": currentLanguage.value === "chinese" ? langBtnCn : langBtnEn,
        "{esc}": "esc",
      }
    });
  },
  methods: {
    onChange(input: string) {
      this.$emit("onChange", input);
    },
    onKeyPress(button: string) {
      this.$emit("onKeyPress", button);

      /**
       * If you want to handle the shift and caps lock buttons
       */
      if (button === "{shift}" || button === "{lock}") this.handleShift();

      if (button === "{lang}") this.switchLanguage();
    },
    handleShift() {
      if (!this.keyboard) return
      let currentLayout = this.keyboard.options.layoutName;
      let shiftToggle = currentLayout === "default" ? "shift" : "default";

      this.keyboard.setOptions({
        layoutName: shiftToggle
      });
    },
    switchLanguage() {
      if (!this.keyboard) return
      const currentLayout = this.keyboard.options.layoutName;
      const langToggle = currentLayout === "default" ? "eng" : "default";

      this.keyboard.setOptions({
        layoutName: langToggle,
        display: getDisplay()
      });
    }
  },
  watch: {
    input(input) {
      this.keyboard?.setInput(input);
    },
    isDark(isDark) {
      console.log("isDark", isDark)
      this.keyboard?.setOptions({
        theme: isDark
          ? "hg-theme-default darkTheme"
          : "hg-theme-default"
      })
    }
  },
  computed: {
    isDark() {
      return currentTheme.value === "dark"
    },
    getDarkThemeClassName() {
      return osThemeRef.value === "dark" ? "darkTheme" : undefined
    },
    getDisplay() {
      return {
        // '{enter}': '<span class="material-icons-outlined">keyboard_return</span>',
        // '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
        // '{bksp}': '<span class="material-icons-outlined">backspace</span>',
        // "{lock}": "caps ⇪",
        // "{shift}": "⇧",
        // "{lang}": isEnglish.value ? langBtnEn : langBtnCn

        // '{enter}': render(h(NIcon, { ':component': KeyboardReturnRound })),
        // '{enter}': returnIcon,
        '{enter}': '<span style="height: 20px; width: 20px;"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg></span>',
        '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
        '{bksp}': '<span class="material-icons-outlined">backspace</span>',
        "{lock}": "caps ⇪",
        "{shift}": "⇧",
        "{lang}": currentLanguage.value === "chinese" ? langBtnCn : langBtnEn,
        "{hide}": "hide2"
      };
    }
  },
});
</script>

<style>
.button-section {
  margin-top: 60px;
}

.simple-keyboard {
  max-width: 100%;
  flex: 1;
  border-radius: 20px;
  padding: 8px;
  background-color: #CBD2D9;
  background: radial-gradient(ellipse at center 120%, #FF6C5C14, #FF6C5C00),
    radial-gradient(ellipse at 0% 0%, #A033FF14, #A033FF00),
    radial-gradient(ellipse at 100% 0%, #25D36607, #25D36600),
    #CBD2D9;
}

.hg-rows {
  height: 100%;
  max-height: 80vh;
  display: grid;
}

.hg-theme-default .hg-row:not(:last-child) {
  margin-bottom: 6px;
}

.hg-theme-default .hg-row .hg-button:not(:last-child) {
  margin-right: 6px;
}

.simple-keyboard .hg-button {
  min-height: 50px;
  height: 100%;
  color: black;
  background-color: rgba(255, 255, 255, 90%);
  /* background-color: rgba(0,0,0,5%); */
}

.hg-theme-default .hg-button {
  border-radius: 8px;
}

.hg-theme-default .hg-button:hover {
  background-color: #e7e7e7;
}

.hg-theme-default .hg-button:active {
  background-color: rgb(160 160 160 / 50%);
}

.hg-theme-default .hg-button.hg-button-shift {
  flex: 2;
}

/* Border radius for buttons at 4 corners */
.hg-theme-default .hg-row:first-child .hg-button:last-child {
  border-top-right-radius: 16px;
}

.hg-theme-default .hg-row:first-child .hg-button:first-child {
  border-top-left-radius: 16px;
}

.hg-theme-default .hg-row:last-child .hg-button:first-child {
  border-bottom-left-radius: 16px;
}

.hg-theme-default .hg-row:last-child .hg-button:last-child {
  border-bottom-right-radius: 16px;
}

/*
  Theme: darkTheme
*/
.simple-keyboard.darkTheme {
  /* Keyboard Iridescence */
  background: radial-gradient(ellipse at center 120%, #FF6C5C14, #FF6C5C00),
    radial-gradient(ellipse at 0% 0%, #A033FF14, #A033FF00),
    radial-gradient(ellipse at 100% 0%, #25D36607, #25D36600),
    #1C2B33;
  background-color: #1C2B33;
}

.simple-keyboard.darkTheme .hg-button {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.hg-theme-default.darkTheme .hg-button:hover {
  background-color: rgba(250, 250, 250, 20%);
}

.simple-keyboard.darkTheme .hg-button:active {
  background: #8d9ca5cc;
  color: white;
}

.vr-tip {
  align-items: center;
  display: flex;
  display: none;
}

.button-section {
  margin-top: 60px;
}

.hg-rows {
  height: 100%;
  max-height: 80vh;
  display: grid;
}

.simple-keyboard .hg-button {
  min-height: 50px;
  height: 100%;
}

.hg-button.hg-button-space {
  flex: 4;
}

.hg-button.hg-standardBtn[data-skbtn="，"] {
  max-width: 60px;
}

.hg-button.hg-standardBtn[data-skbtn="。"] {
  max-width: 60px;
}

.hg-button.hg-functionBtn span {
  display: flex;
}

/*
  Theme: myTheme1
*/
/*.simple-keyboard.myTheme1 {
  background-color: #192A34;
  border-radius: 0;
  border-bottom-right-radius: 5px;
  border-bottom-left-radius: 5px;
}

.simple-keyboard.myTheme1 .hg-button {
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #37424B;
  color: white;
}

.simple-keyboard.myTheme1 .hg-button:active {
  background: #8D9CA5CC;
  color: white;
}

.simple-keyboard .hg-button[data-skbtn="{settings}"] {
  flex-basis: 100px;
  flex-grow: 0;
}

#root .simple-keyboard.myTheme1 + .simple-keyboard-preview {
  background: #1c4995;
}*/
</style>

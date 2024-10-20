<template>
  <div :class="keyboardClass"></div>
</template>

<script>
import { ref, h } from "vue"
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";
import { useOsTheme } from "naive-ui"

const osThemeRef = useOsTheme()

const currentLanguage = ref("chinese")

const langBtnCn ="<span><b>中</b>/<span style='color: lightgray'>英</span></span>"
const langBtnEn ="<span><span style='color: lightgray'>中</span>/<b>英</b></span>"

function getDisplay() {
  return {
    '{enter}': h('n-icon', { ':component': "KeyboardReturnRound" }),
      // '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 8v3H5.83l2.88-2.88A.996.996 0 1 0 7.3 6.71L2.71 11.3a.996.996 0 0 0 0 1.41L7.3 17.3a.996.996 0 1 0 1.41-1.41L5.83 13H20c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1s-1 .45-1 1z" fill="currentColor"></path></svg>',
    '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
    '{bksp}': '<span class="material-icons-outlined">backspace</span>',
    "{lock}": "caps ⇪",
    "{shift}": "⇧",
    "{lang}": currentLanguage.value === "chinese" ? langBtnCn : langBtnEn
  };
}

export default {
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
  data: () => ({
    keyboard: null,
  }),
  mounted() {
    this.keyboard = new Keyboard(this.keyboardClass, {
      onChange: this.onChange,
      onKeyPress: this.onKeyPress,
      theme: osThemeRef.value === "dark" ? "hg-theme-default darkTheme" : undefined,
      layout: {
        default: [
          "\u0060 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
          "{tab} q w e r t y u i o p [ ] \\",
          "{lock} a s d f g h j k l ; ' {enter}",
          "{shift} z x c v b n m , . / {shift}",
          "{lang} ， {space} 。 {settings}",
        ],
        eng: [
          "\u0060 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
          "{tab} q w e r t y u i o p [ ] \\",
          "{lock} a s d f g h j k l ; ' {enter}",
          "{shift} z x c v b n m , . / {shift}",
          "{lang} .com {space} @ {settings}",
        ],
        shift: [
          "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
          "{tab} Q W E R T Y U I O P { } |",
          '{lock} A S D F G H J K L : " {enter}',
          "{shift} Z X C V B N M < > ? {shift}",
          "{lang} , {space} . {settings}",
        ],
      },
      mergeDisplay: true,
      display: {
        '{enter}': '<span class="material-icons-outlined">keyboard_return</span>',
        // '{enter}': h('n-icon', { ':component': "KeyboardReturnRound" }),
        '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
        '{bksp}': '<span class="material-icons-outlined">backspace</span>',
        "{lock}": "caps ⇪",
        "{shift}": "⇧",
      }
    });
  },
  methods: {
    onChange(input) {
      this.$emit("onChange", input);
    },
    onKeyPress(button) {
      this.$emit("onKeyPress", button);

      /**
       * If you want to handle the shift and caps lock buttons
       */
      if (button === "{shift}" || button === "{lock}") this.handleShift();

      if (button === "{lang}") switchLanguage();
    },
    handleShift() {
      let currentLayout = this.keyboard.options.layoutName;
      let shiftToggle = currentLayout === "default" ? "shift" : "default";

      this.keyboard.setOptions({
        layoutName: shiftToggle
      });
    },
    switchLanguage() {
      const currentLayout = keyboard.options.layoutName;
      const langToggle = currentLayout === "default" ? "eng" : "default";

      if (langToggle === "eng") {
        // Turn off input method
        currentLanguage = "english"
      } else {
        currentLanguage = "chinese"
      }

      keyboard.setOptions({
        layoutName: langToggle,
        display: getDisplay()
      });
    }
  },
  watch: {
    input(input) {
      this.keyboard.setInput(input);
    }
  },
  computed: {
    getDarkThemeClassName() {
      return osThemeRef.value === "dark" ? "darkTheme" : undefined
    },
    getDisplay() {
      return {
          '{enter}': '<span class="material-icons-outlined">keyboard_return</span>',
          '{settings}': '<span style="width: 20px;" class="material-icons-outlined">settings</span>',
          '{bksp}': '<span class="material-icons-outlined">backspace</span>',
          "{lock}": "caps ⇪",
          "{shift}": "⇧",
          "{lang}": currentLanguage === "chinese" ? langBtnCn : langBtnEn
      };
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.button-section {
  margin-top: 60px;
}

.simple-keyboard {
  max-width: 100%;
  flex: 1;
  border-radius: 0 0 10px 10px;
}

.hg-rows {
  height: 100%;
  max-height: 80vh;
  display: grid;
}

.simple-keyboard .hg-button {
  min-height: 50px;
  height: 100%;
  color: black;
}

/*
  Theme: darkTheme
*/
.simple-keyboard.darkTheme {
  background-color: #192A34;
  border-radius: 0;
  border-bottom-right-radius: 5px;
  border-bottom-left-radius: 5px;
}

.simple-keyboard.darkTheme .hg-button {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #37424B;
  color: white;
}

.simple-keyboard.darkTheme .hg-button:active {
  background: #8D9CA5CC;
  color: white;
}

.simple-keyboard .hg-button[data-skbtn="{settings}"] {
  flex-basis: 100px;
  flex-grow: 0;
}

.vr-tip {
  align-items: center;
  display: flex;
  display: none;
}

.button-section {
  margin-top: 60px;
}

.simple-keyboard {
  max-width: 100%;
  flex: 1;
  border-radius: 0 0 10px 10px;
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

.hg-button.hg-standardBtn[data-skbtn="，"]{max-width:60px}
.hg-button.hg-standardBtn[data-skbtn="。"]{max-width:60px}

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
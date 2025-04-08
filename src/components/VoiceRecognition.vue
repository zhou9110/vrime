<script lang="ts">
import { defineComponent, ref } from 'vue'
import { NModal, NProgress, NButton, NText, NAlert, NA } from 'naive-ui'
import { createOnlineRecognizer, type OnlineRecognizer } from '../sherpa-onnx-asr';
import { isRecording, recognisedText } from '../control';

// const { showRecorder } = defineProps<{ showRecorder: boolean }>()

// This file copies and modifies code
// from https://mdn.github.io/web-dictaphone/scripts/app.js
// and https://gist.github.com/meziantou/edb7217fddfbb70e899e


// this function is copied from
// https://github.com/awslabs/aws-lex-browser-audio-capture/blob/master/lib/worker.js#L46
function downsampleBuffer(buffer: any, exportSampleRate: number) {
  if (exportSampleRate === recordSampleRate) {
    return buffer;
  }
  var sampleRateRatio = recordSampleRate / exportSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0, count = 0;
    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
};

let lastResult = '';
const resultListRef = ref<string[]>([]);

let expectedSampleRate = 16000;
let recordSampleRate: number; // the sampleRate of the microphone
let recorder: any = null;

let recognizer: OnlineRecognizer | null = null;
let recognizer_stream: any = null;

// import("/sherpa-onnx-wasm-main-asr.js?url").then((module) => {
//   console.log('module loaded', module);
//   Module = module;
//   Module.setStatus('Model downloaded. Initializing recognizer...');
//   // Module.onRuntimeInitialized();
// }).catch((error) => {
//   console.error('Error loading module:', error);
// });

function getDebugDisplayResult() {
  let i = 0;
  let ans = '';
  const resultList = resultListRef.value
  for (let s in resultList) {
    if (resultList[s] == '') {
      continue;
    }

    ans += '' + i + ': ' + resultList[s] + '\n';
    i += 1;
  }

  if (lastResult.length > 0) {
    ans += '' + i + ': ' + lastResult + '\n';
  }
  return ans;
}


function getDisplayResult() {
  let i = 0;
  let ans = '';
  const resultList = resultListRef.value
  for (let s in resultList) {
    if (resultList[s] == '') {
      continue;
    }

    ans += resultList[s] + '\n';
    i += 1;
  }

  if (lastResult.length > 0) {
    ans += lastResult + '\n';
  }
  return ans;
}

export default defineComponent({
  name: "VoiceRecognition",
  components: {
    NModal, NProgress, NButton, NText, NAlert, NA
  },
  setup() {
    return {
      isRecording,
      stream: ref<MediaStream | null>(null),
      recognisedText,
      resultList: resultListRef,
    }
  },
  emits: ['setInput', 'modelLoaded'],
  data() {
    return {
      failureReason: '',
      status: '',
      showModal: false,
      audioCtx: null as AudioContext | null,
      recognizer: null as OnlineRecognizer | null,
      showRecorder: false,
    }
  },
  computed: {
    percentage() {
      if (!this.status) {
        return 0
      }
      if (/running/i.test(this.status)) return 100
      if (this.recognizer !== null) return 100
      const matched = this.status.match(/\((\d+)\/(\d+)\)/)
      if (!matched) return 0
      const downloaded = Number(matched[1])
      const total = Number(matched[2])
      return Math.round(Math.min(downloaded / total, 1) * 100)
    },
    modelLoaded() {
      return this.recognizer !== null
    },
    alertObj() {
      if (this.recognizer !== null) {
        return { title: "模型加载成功", type: "success" } as const
      } else {
        return { title: '模型未加载', type: 'info' } as const
      }
    },
  },
  methods: {
    async onStart() {
      if (this.recognizer === null) {
        console.log('Recognizer not loaded, showing modal first');
        this.showModal = true;
        return;
      }
      const audioContext = await this.startRecording();
      this.audioCtx = audioContext
      console.log('recorder started');

      this.recognisedText = '';
      this.resultList = [];
      this.isRecording = true;
    },
    async onStop() {
      console.log('recorder stopped');

      this.$emit('setInput', this.recognisedText);

      this.resultList = [];

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream.getAudioTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      if (!this.audioCtx || !this.audioCtx?.close) {
        console.error('Audio context close method not available! Current value:', this.audioCtx);
        return
      }
      try {
        await this.audioCtx.close()
        console.log('Audio context closed');
        this.audioCtx = null;
      } catch (error) {
        console.error('Error closing audio context:', error);
      };
      this.onClear();
    },
    onClear() {
      this.recognisedText = '';
      this.resultList = [];
    },
    openModal() {
      this.isRecording = true;
    },
    closeModal() {
      this.isRecording = false;
      this.showModal = false;
    },
    async startLoading() {
      console.log('Start loading sherpa-onnx model...');
      if (this.recognizer !== null) {
        console.log('Recognizer already loaded');
        return;
      }
      const Module: any = {};
      // https://emscripten.org/docs/api_reference/module.html#Module.locateFile
      Module.locateFile = function (path: string, scriptDirectory = '') {
        // console.log(`path: ${path}, scriptDirectory: ${scriptDirectory}`);
        // return scriptDirectory + path;
        const cdn = '__VOICE_RECOGNITION_CDN__'
        return cdn + path;
      };

      // https://emscripten.org/docs/api_reference/module.html#Module.locateFile
      Module.setStatus = (status: string) => {
        console.log(`status ${status}`);
        if (this.status == "Loading model...") {
          status = 'Model downloaded. Now loading model and initializing recongizer...'
        }
        this.status = status
      };

      Module.onRuntimeInitialized = () => {
        console.log('inited!');

        recognizer = createOnlineRecognizer(Module, undefined);
        this.recognizer = recognizer;
        console.log('recognizer is created!', recognizer);
        this.$emit('modelLoaded');
      };

      // @ts-ignore
      window.Module = Module;

      // import module for side effects to add attributes to the Module object
      try {
        await import("/sherpa-onnx-wasm-main-asr.js?url");
      } catch (e) {
        console.error('Error loading module:', e);
      }
    },
    // Audio Context 可以理解成像 Unity shader graph 一样，几个节点之间相互连接的图 // 连接的关系类似这样?: [mediaStream] -> [recorder] -> [audioCtx.destination] let audioCtx = null
    async startRecording() {
      const constraints = { audio: true };
      let audioCtx: AudioContext | null = null;
      const onSuccess = async (stream: MediaStream) => {
        audioCtx = new AudioContext({ sampleRate: 16000 });

        await audioCtx.audioWorklet.addModule('processor.js');

        recordSampleRate = audioCtx.sampleRate;
        console.log('sample rate ' + recordSampleRate);

        const mediaStream = audioCtx.createMediaStreamSource(stream);
        console.log('media stream', mediaStream);

        const recorder = new AudioWorkletNode(audioCtx, 'microphone-processor'); // the microphone

        mediaStream.connect(recorder);
        recorder.connect(audioCtx.destination);

        recorder.port.onmessage = (event) => {
          let samples = new Float32Array(event.data);
          samples = downsampleBuffer(samples, expectedSampleRate);

          recognizer = this.recognizer!;

          if (recognizer_stream == null && recognizer !== null) {
            recognizer_stream = recognizer.createStream();
          }

          recognizer_stream.acceptWaveform(expectedSampleRate, samples);
          while (recognizer.isReady(recognizer_stream)) {
            recognizer.decode(recognizer_stream);
          }

          let isEndpoint = recognizer.isEndpoint(recognizer_stream);
          let result = recognizer.getResult(recognizer_stream).text;

          // @ts-ignore
          if (recognizer.config.modelConfig.paraformer.encoder != '') {
            let tailPaddings = new Float32Array(expectedSampleRate);
            recognizer_stream.acceptWaveform(expectedSampleRate, tailPaddings);
            while (recognizer.isReady(recognizer_stream)) {
              recognizer.decode(recognizer_stream);
            }
            result = recognizer.getResult(recognizer_stream).text;
          }

          if (result.length > 0 && lastResult != result) {
            lastResult = result;
          }

          if (isEndpoint) {
            if (lastResult.length > 0) {
              this.resultList.push(lastResult);
              lastResult = '';
            }
            recognizer.reset(recognizer_stream);
          }

          // let textArea = document.getElementById('results')!;
          // textArea.scrollTop = textArea.scrollHeight;
          this.recognisedText = getDisplayResult();

          // The original code also has some logic to store the audio buffer, not necessary in our case
        };
        return audioCtx;
      }

      const onError = (err: Error) => { console.log('The following error occured: ' + err, err.stack); };

      // Get user media 首先获取麦克风音频的 Media Stream，
      // 然后在onSuccess里传给AudioContext, 以实时stream的方式传给recognizer 
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.stream = stream;
        await onSuccess(stream);
        return audioCtx;
      } catch (err) {
        onError(err as Error);
        console.error('Error accessing media devices.', err);
        return null;
      }
    }
  },
  mounted() {
    if ((window as any).navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia supported.');
    } else {
      console.log('getUserMedia not supported on your browser!');
      alert('getUserMedia not supported on your browser!');
    }
  },
  watch: {
    // isRecording(val) {
    //   if (!this.modelLoaded && val) {
    //     this.onStart();
    //     return
    //   }
    //   if (!val) {
    //     this.onStop();
    //     return
    //   }
    // },
    showModal(val) {
      if (!val && this.recognizer === null) {
        this.isRecording = false;
      }
    }
  }
})
</script>

<template>
  <n-modal :show="showModal" v-on:update:show="closeModal" preset="card" size="medium" title="使用须知"
    content-style="display: flex; flex-direction: column; justify-content: center; align-items:center"
    style="max-width: 400px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
    <n-alert :title="alertObj.title" :type="alertObj.type">
      <n-text v-if="modelLoaded">模型加载成功，可以关闭弹窗，开始语音识别</n-text>
      <n-text v-else>该功能需要先下载语音识别模型才能使用，大小约为200MB。目前尚不支持缓存结果，页面刷新后需要重新下载。</n-text>
    </n-alert>
    <div v-if="!modelLoaded" style="display: flex; flex-direction: column; align-items: center; width: 100%">
      <n-button size="medium" type="primary" @click="startLoading" class="mt-1">开始下载模型</n-button>
      <div id="status" style="width: 100%;" v-show="!!status">
        <p>
          {{ status }}
        </p>
        <n-progress style="width: 100%;" type="line" :percentage="percentage" processing />
      </div>
    </div>
    <div v-else style="display: flex; flex-direction: column; align-items: center; width: 100%">
      <n-button size="medium" type="primary" @click="() => { onStart(); closeModal(); }" class="mt-1">好的</n-button>

      <div id="singleAudioContent" class="tab-content loading" v-if="false">
        <div style="display: flex; gap: 1.5rem;">
          <h3>Debug用</h3>
          <div style="flex: 1; display: flex; flex-direction: row; align-items: center; gap: 1rem;">
            <n-button id="startBtn" @click="onStart">Start</n-button>
            <n-button id="stopBtn" @click="onStop">Stop</n-button>
            <n-button id="clearBtn" @click="onClear">Clear</n-button>
          </div>
        </div>
        <n-text style="font-size: 1rem; font-weight: bold; padding-top: 15px; border-radius: 8px;">
          识别结果
        </n-text>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 1rem;">
          <textarea id="results" rows="10" placeholder="Output will appear here..." readonly :value="recognisedText"
            style="flex: 1; padding: 0.75rem; font-size: 1rem; border: 1px solid #ced4da; border-radius: 8px; resize: none; background-color: #f8f9fa;"></textarea>
        </div>
      </div>
    </div>
    <template #footer>
      <n-text depth="3" style="text-align: right; width: 100%;">语音识别模型来自 <n-a
          href="https://github.com/k2-fsa/sherpa-onnx">Sherpa-onnx</n-a> 项目</n-text>
    </template>
  </n-modal>
</template>

<style>
.mt-1 {
  margin-top: 1rem;
}

.actions {}
</style>
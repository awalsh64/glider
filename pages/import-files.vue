<template>
  <div class="container">
    <!-- File List -->
    <div class="file-holder">
      <label
        >Files:
        <input
          id="files"
          ref="files"
          type="file"
          multiple
          @change="handleFilesUpload()"
        />
      </label>
      <div>
        <div v-for="(file, key) in files" :key="key">
          {{ file.name }}
          <v-btn v-if="!loading" class="select-file" @click="select(key)"
            >Select</v-btn
          >
          <v-btn v-if="!loading" class="remove-file" @click="removeFile(key)"
            >Remove</v-btn
          >
        </div>
      </div>
    </div>
    <div>
      <!-- Add Files -->
      <v-btn v-if="!loading" @click="addFiles()">Add Files</v-btn>
      <!-- Submit -->
      <v-btn v-if="!loading" @click="submitFiles()">Submit</v-btn>
      <!-- Audio Player -->
      <audio id="audio" controls>
        <source :src="audioSrc" type="audio/wav" />
        Your browser does not support the audio tag.
      </audio>
      <!-- Loading -->
      <span v-if="loading">Loading...</span>
    </div>

    <!-- Spectrogram -->
    <div class="plot-holder">
      <heatmap :index="fileSelected" />
    </div>
  </div>
</template>

<script>
/**
 * TODO:
 * get correct colormap
 * figure out if i need 1 or 2 channels of audio
 * determine this.minDecibels,this.maxDecibels, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/maxDecibels
 * what happens when you remove last file
 * highlight selected file
 * upgrade depreciated functions, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
 * drag and drop files
 */

// Spectrogram example documentation: https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0802-spectrogram.html?theme=lightNew&page-theme=light
// Web Audio Documentation: https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
import { mapMutations, mapGetters } from 'vuex';
import Heatmap from '@/components/heatmap.vue';
// File Upload Ex: https://serversideup.net/uploading-files-vuejs-axios/
export default {
  components: {
    Heatmap,
  },
  data() {
    return {
      audioCtx: null,
      audioSrc: null,
      fileSelected: -1,
      loading: false,
      config: {
        /**
         * The resolution of the FFT calculations
         * Higher value means higher resolution decibel domain.
         */
        fftResolution: 4096,
        /**
         * Smoothing value for FFT calculations
         */
        smoothingTimeConstant: 0.1,
        /**
         * The size of processing buffer,
         * determines how often FFT is run
         */
        processorBufferSize: 2048,
      },
      resolution: {
        x: 1000,
        y: 1000,
      },
      minDecibels: 0,
      maxDecibels: 0,
      loadedFileInfo: [{ spectrogramData: [], duration: 0, maxFreq: 0 }],
    };
  },
  computed: {
    files() {
      return this.$store.state.files;
    },
  },
  /*
      Defines the method used by the component
    */
  methods: {
    /*
        Adds a file
      */
    addFiles() {
      console.log('add');
      this.$refs.files.click();
    },

    /*
        Submits files to the server
      */
    async submitFiles() {
      this.loading = true;

      /*
          Iterate over any file sent over appending the files
          to the form data.
        */
      this.loading = true;
      const numLoaded = this.$store.getters.getNumSpectrograms;

      for (let i = numLoaded; i < this.files.length; i++) {
        // Documentation: https://zellwk.com/blog/async-await-in-loops/
        // wait for async function
        await this.loadAudioData(i).then((v) => {
          this.addSpectrogramData(v);
        });
      }
      this.select(this.files.length - 1);
      this.loading = false;
    },

    loadAudioData(index) {
      console.log('load ', index);
      const audioCtx = new AudioContext();
      const processWaveform = this.processWaveform;

      // create URL to reference imported audio file
      const myAudio = URL.createObjectURL(this.files[index]);

      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#examples
      // decode audio data loaded from an XMLHttpRequest
      console.log('XML HTTP');
      return new Promise(function (resolve) {
        const request = new XMLHttpRequest();
        request.open('GET', myAudio, true);
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        request.responseType = 'arraybuffer';
        console.log(request);
        request.onload = () => {
          console.log('loaded');
          // wait for file to load using promise
          const audioData = request.response;
          audioCtx.decodeAudioData(audioData).then((decodedData) => {
            // use the decoded data here
            console.log('decoded');
            resolve(processWaveform(decodedData));
            console.log('processed');
          });
        };
        request.send();
      });
    },
    /**
     * Process a AudioBuffer and create FFT Data for Spectrogram from it.
     * @param   {AudioBuffer}     audioBuffer   AudioBuffer to process into FFT data.
     * @returns {WaveFormData}                  Processed data
     */
    async processWaveform(audioBuffer) {
      // Create a new OfflineAudioContext with information from the pre-created audioBuffer
      // The OfflineAudioContext can be used to process a audio file as fast as possible.
      // Normal AudioContext would process the file at the speed of playback.
      // const audioSampleRate = 128000; // 128kHz
      console.log('offline context');
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      // Create a new source, in this case we have a AudioBuffer to create it for, so we create a buffer source
      const source = offlineCtx.createBufferSource();
      // Set the buffer to the audio buffer we are using
      source.buffer = audioBuffer;
      // Set source channel count to the audio buffer channel count, if this wasn't set, the source would default to 2 channels.
      source.channelCount = audioBuffer.numberOfChannels;

      // We want to create spectrogram for each channel in the buffer, so we need to separate the channels to separate outputs.
      const splitter = offlineCtx.createChannelSplitter(source.channelCount);
      // Create a analyzer node for the full context
      const generalAnalyzer = offlineCtx.createAnalyser();
      generalAnalyzer.fftSize = this.config.fftResolution;
      generalAnalyzer.smoothingTimeConstant = this.config.smoothingTimeConstant;

      // Prepare buffers and analyzers for each channel
      const channelFFtDataBuffers = [];
      const channelDbRanges = [];
      const analyzers = [];
      for (let i = 0; i < source.channelCount; i += 1) {
        channelFFtDataBuffers[i] = new Uint8Array(
          (audioBuffer.length / this.config.processorBufferSize) *
            (this.config.fftResolution / 2)
        );
        // Setup analyzer for this channel
        analyzers[i] = offlineCtx.createAnalyser();
        analyzers[i].smoothingTimeConstant = this.config.smoothingTimeConstant;
        analyzers[i].fftSize = this.config.fftResolution;
        analyzers[i].maxDecibels = this.$store.state.maxDecibels;
        analyzers[i].minDecibels = this.$store.state.minDecibels;
        // TODO: figure out what decibel range to use
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/minDecibels
        // Connect the created analyzer to a single channel from the splitter
        splitter.connect(analyzers[i], i);
        channelDbRanges.push({
          minDecibels: analyzers[i].minDecibels,
          maxDecibels: analyzers[i].maxDecibels,
        });
      }

      // Script processor is used to process all of the audio data in fftSize sized blocks
      // Script processor is a deprecated API but the replacement APIs have really poor browser support
      offlineCtx.createScriptProcessor =
        offlineCtx.createScriptProcessor || offlineCtx.createJavaScriptNode;
      const processor = offlineCtx.createScriptProcessor(
        this.config.processorBufferSize,
        1,
        1
      );
      let offset = 0;
      // Documentation https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode/audioprocess_event
      processor.onaudioprocess = () => {
        // Run FFT for each channel
        /// //////slow
        for (let i = 0; i < source.channelCount; i += 1) {
          const freqData = new Uint8Array(
            channelFFtDataBuffers[i].buffer,
            offset,
            analyzers[i].frequencyBinCount
          );
          analyzers[i].getByteFrequencyData(freqData);
        }
        offset += generalAnalyzer.frequencyBinCount;
      };
      // Connect source buffer to correct nodes,
      // source feeds to:
      // splitter, to separate the channels
      // processor, to do the actual processing
      // generalAnalyzer, to get collective information
      source.connect(splitter);
      source.connect(processor);
      processor.connect(offlineCtx.destination);
      source.connect(generalAnalyzer);
      // Start the source, other wise start rendering would not process the source
      source.start(0);

      // Process the audio buffer when loaded
      await offlineCtx.startRendering();
      const processed = {
        channels: channelFFtDataBuffers,
        channelDbRanges,
        stride: this.config.fftResolution / 2,
        tickCount: Math.ceil(
          audioBuffer.length / this.config.processorBufferSize
        ),
        maxFreq: offlineCtx.sampleRate / 2, // max freq is always half the sample rate
        duration: audioBuffer.duration,
      };

      return this.formatSpectrogram(processed);
    },
    /**
     * Create data matrix for heatmap from one dimensional array
     * @param {Uint8Array}  data        FFT Data
     * @param {number}      strideSize  Single data block width
     * @param {number}      tickCount    Data row count
     */
    remapDataToTwoDimensionalMatrix(data, strideSize, tickCount) {
      /**
       * @type {Array<number>}
       */
      // Map the one dimensional data to two dimensional data where data goes from right to left
      // [1, 2, 3, 4, 5, 6]
      // -> strideSize = 2
      // -> rowCount = 3
      // maps to
      // [1, 4]
      // [2, 5]
      // [3, 6]
      // const output = Array.from(Array(strideSize)).map(() =>
      // Array.from(Array(tickCount))
      // );
      console.log('remap data');
      const output = [];
      // console.log(output);
      for (let row = 0; row < strideSize; row += 1) {
        output[row] = [];
        for (let col = 0; col < tickCount; col += 1) {
          output[row][col] = data[col * strideSize + row];
        }
      }
      console.log('done remapped');
      return output;
    },
    /**
     * Setup data for the chart
     * */
    formatSpectrogram(data) {
      // Create channels and set data for each channel
      // Setup the data for the chart
      const remappedData = this.remapDataToTwoDimensionalMatrix(
        data.channels[0],
        data.stride,
        data.tickCount
      )
        // Slice only first half of data (rest are 0s).
        .slice(0, data.stride / 2);
      // this.spectrogramData = remappedData;
      // //TODO: duration should be different units than seconds so you don't have to round
      // this.duration = Math.floor(data.duration);
      // this.maxFreq = Math.ceil(data.maxFreq / 2); //Use half of the fft data range
      this.minDecibels = data.channelDbRanges[0].minDecibels;
      this.maxDecibels = data.channelDbRanges[0].maxDecibels;
      return {
        duration: Math.floor(data.duration),
        maxFreq: Math.ceil(data.maxFreq / 2),
        spectrogramData: remappedData,
      };
    },
    /*
        Handles the uploading of files
      */
    handleFilesUpload() {
      const uploadedFiles = this.$refs.files.files;

      /*
          Adds the uploaded file to the files array
        */
      for (let i = 0; i < uploadedFiles.length; i++) {
        this.addFilesToStore(uploadedFiles[i]);
        this.loadedFileInfo.push({
          maxFreq: 0,
          duration: 0,
          spectrogramData: [],
        });
      }
    },

    /*
        Removes a select file the user has uploaded
      */
    removeFile(key) {
      this.removeFilesFromStore(key);
      if (this.fileSelected === key) {
        if (this.fileSelected !== 0) {
          this.select(this.fileSelected - 1);
        } else {
          this.select(0); // TODO: This won't trigger a replot because fileSelected isn't changing
        }
      }
    },
    /*
    Select file to display audio
    */
    select(key) {
      console.log('select');
      this.fileSelected = key;
      // add sound to audio player
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      this.audioSrc = URL.createObjectURL(this.files[this.fileSelected]);
      const sound = document.getElementById('audio');
      sound.load();
    },
    ...mapMutations({
      addSpectrogramData: 'addSpectrogramData',
      addFilesToStore: 'addFilesToStore',
      removeFilesFromStore: 'removeFilesFromStore',
    }),
    ...mapGetters({
      getNumSpectrograms: 'getNumSpectrograms',
    }),
  },
};
</script>

<style>
input[type='file'] {
  position: absolute;
  top: -500px;
}

span.remove-file {
  color: red;
  cursor: pointer;
  float: right;
}

span.select-file {
  color: aqua;
  cursor: pointer;
  float: right;
}

.file-holder {
  height: 30vh;
  max-height: 30vh;
  overflow-y: scroll;
}

.plot-holder {
  height: 50vh;
}
</style>

<template>
  <div class="container">
    <p>
      Add .wav files to the Audio Files list, select Process Files, then Select
      a file to view the Spectrogram.
    </p>
    <p>Add NetCDF files at the bottom to view the parameters.</p>
    <load-files
      :add-files-to-store="addAudioFilesToStore"
      :remove-files-from-store="removeAudioFilesFromStore"
      :file-selected.sync="fileSelected"
      file-type="Audio"
      :hide-buttons="loading"
    />
    <div>
      <!-- Submit -->
      <v-btn v-if="!loading" @click="submitFiles()">Process Files</v-btn>
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

    <!-- NetCDF files -->
    <load-files
      :add-files-to-store="addNCFilesToStore"
      :remove-files-from-store="removeNCFilesFromStore"
      :file-selected.sync="ncFileSelected"
      file-type="NetCDF"
      :hide-buttons="loading"
    />
    <!-- Load NetCDF-->
    <v-btn v-if="!loading" @click="readNetCDF()">Read NetCDF</v-btn>
    <div>
      <p>Select a Variable</p>
      <div class="variable-holder">
        <div v-for="(variable, key) in variables" :key="key">
          <v-btn color="purple" @click="selectVariable(key)">{{
            variable.name
          }}</v-btn>
        </div>
      </div>
      <div class="variable-holder">
        <p>Selected Variable:</p>
        {{ selectedVariable }}
      </div>
    </div>
  </div>
</template>

<script>
/**
 * TODO:
 * get correct colormap
 * determine this.minDecibels,this.maxDecibels, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/maxDecibels
 * what happens when you remove last file
 * highlight selected file
 * upgrade depreciated functions, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
 * drag and drop files
 * time scrolling line with audio player
 * hide select button before processed
 */

// Spectrogram example documentation: https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0802-spectrogram.html?theme=lightNew&page-theme=light
// Web Audio Documentation: https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
import { mapMutations, mapGetters } from 'vuex';
import { NetCDFReader } from 'netcdfjs';
import Heatmap from '@/components/heatmap.vue';
import LoadFiles from '@/components/loadFiles.vue';
// File Upload Ex: https://serversideup.net/uploading-files-vuejs-axios/
export default {
  components: {
    Heatmap,
    LoadFiles,
  },
  data() {
    return {
      audioCtx: null,
      audioSrc: null,
      fileSelected: -1,
      ncFileSelected: -1,
      selectedVariable: null,
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
      variables: [],
    };
  },
  computed: {
    audioFiles() {
      return this.$store.state.audioFiles;
    },
    ncFiles() {
      return this.$store.state.ncFiles;
    },
  },
  watch: {
    fileSelected() {
      // add sound to audio player
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      this.audioSrc = URL.createObjectURL(this.audioFiles[this.fileSelected]);
      const sound = document.getElementById('audio');
      sound.load();
    },
  },
  methods: {
    /**
     * Read Net CDF files
     */
    async readNetCDF() {
      for (let i = 0; i < this.ncFiles.length; i++) {
        await this.getVariables(i).then((v) => {
          this.addNCDataToStore(v);
        });
      }
      this.variables = this.$store.getters.getNCData(
        this.$store.getters.getNumNCFiles - 1
      ).header.variables;
      this.ncFileSelected = this.$store.getters.getNumNCFiles - 1;
    },

    /**
     * Return all variables in NetCDF file
     */
    getVariables(index) {
      const file = URL.createObjectURL(this.ncFiles[index]);
      return new Promise(function (resolve) {
        const request = new XMLHttpRequest();
        request.open('GET', file, true);
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        request.responseType = 'arraybuffer';
        request.onload = () => {
          // wait for file to load using promise
          const data = request.response;
          const reader = new NetCDFReader(data);
          resolve(reader);
        };
        request.send();
      });
    },

    selectVariable(index) {
      const ncData = this.$store.getters.getNCData(this.ncFileSelected);
      console.log(index);
      console.log(ncData.header.variables[index].name);
      const name = `${ncData.header.variables[index].name}`;
      this.readVariable({
        ind: this.ncFileSelected,
        name,
      });
      this.selectedVariable = this.$store.state.readVar.variable;
    },

    /*
        Submits audioFiles to the server
      */
    async submitFiles() {
      /*
          Iterate over any file sent over appending the audioFiles
          to the form data.
        */
      this.loading = true;
      const numLoaded = this.$store.getters.getNumSpectrograms;

      for (let i = numLoaded; i < this.audioFiles.length; i++) {
        // Documentation: https://zellwk.com/blog/async-await-in-loops/
        // wait for async function
        await this.loadAudioData(i).then((v) => {
          this.addSpectrogramData(v);
        });
      }
      this.fileSelected = this.audioFiles.length - 1;
      this.loading = false;
    },

    loadAudioData(index) {
      console.log('load ', index);
      const audioCtx = new AudioContext();
      const processWaveform = this.processWaveform;

      // create URL to reference imported audio file
      const myAudio = URL.createObjectURL(this.audioFiles[index]);

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
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      // Create a new source, in this case we have a AudioBuffer to create it for, so we create a buffer source
      const source = offlineCtx.createBufferSource();
      // Set the buffer to the audio buffer we are using
      source.buffer = audioBuffer;

      // Create a analyzer node for the full context
      const generalAnalyzer = offlineCtx.createAnalyser();
      generalAnalyzer.fftSize = this.config.fftResolution;
      generalAnalyzer.smoothingTimeConstant = this.config.smoothingTimeConstant;

      // Prepare buffer and analyzer
      const channelFFtDataBuffer = new Uint8Array(
        (audioBuffer.length / this.config.processorBufferSize) *
          (this.config.fftResolution / 2)
      );
      // Setup analyzer for this channel
      const analyzer = offlineCtx.createAnalyser();
      analyzer.smoothingTimeConstant = this.config.smoothingTimeConstant;
      analyzer.fftSize = this.config.fftResolution;
      analyzer.maxDecibels = this.$store.state.maxDecibels;
      analyzer.minDecibels = this.$store.state.minDecibels;
      // TODO: figure out what decibel range to use
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/minDecibels
      // Connect the created analyzer to the source
      source.connect(analyzer);
      const channelDbRanges = {
        minDecibels: analyzer.minDecibels,
        maxDecibels: analyzer.maxDecibels,
      };

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
        const freqData = new Uint8Array(
          channelFFtDataBuffer.buffer,
          offset,
          analyzer.frequencyBinCount
        );
        analyzer.getByteFrequencyData(freqData);
        offset += generalAnalyzer.frequencyBinCount;
      };
      // Connect source buffer to correct nodes,
      // source feeds to:
      // processor, to do the actual processing
      // generalAnalyzer, to get collective information
      source.connect(processor);
      processor.connect(offlineCtx.destination);
      source.connect(generalAnalyzer);
      // Start the source, other wise start rendering would not process the source
      source.start(0);

      // Process the audio buffer when loaded
      await offlineCtx.startRendering();
      const processed = {
        channel: channelFFtDataBuffer,
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
      // Set data for each channel
      // Setup the data for the chart
      const remappedData = this.remapDataToTwoDimensionalMatrix(
        data.channel,
        data.stride,
        data.tickCount
      )
        // Slice only first half of data (rest are 0s).
        .slice(0, data.stride / 2);
      // this.spectrogramData = remappedData;
      // //TODO: duration should be different units than seconds so you don't have to round
      // this.duration = Math.floor(data.duration);
      // this.maxFreq = Math.ceil(data.maxFreq / 2); //Use half of the fft data range
      this.minDecibels = data.channelDbRanges.minDecibels;
      this.maxDecibels = data.channelDbRanges.maxDecibels;
      return {
        duration: Math.floor(data.duration),
        maxFreq: Math.ceil(data.maxFreq / 2),
        spectrogramData: remappedData,
      };
    },
    ...mapMutations([
      'addSpectrogramData',
      'addAudioFilesToStore',
      'removeAudioFilesFromStore',
      'addNCFilesToStore',
      'removeNCFilesFromStore',
      'addNCDataToStore',
      'readVariable',
    ]),
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

.plot-holder {
  height: 50vh;
}

.variable-holder {
  height: 40vh;
  width: 42vw;
  overflow-y: scroll;
  float: left;
}
</style>

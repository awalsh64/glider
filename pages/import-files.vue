<template>
  <div class="container">
    <p>Add NetCDF files and select Read NetCDF to load them into the app.</p>
    <p>
      <!-- NetCDF files -->
      <load-files
        :add-files-to-store="addNCFilesToStore"
        :remove-files-from-store="removeNCFilesFromStore"
        :file-selected.sync="ncFileSelected"
        file-type="NetCDF"
        :hide-buttons="loading"
        :show-select="numNCLoaded"
      />
      <!-- Load NetCDF-->
      <v-btn v-if="!loading" @click="readNetCDF()">Read NetCDF</v-btn>
      <span v-if="loading">Loading...</span>
    </p>

    <p>
      Add .wav files to the Audio Files list, select Process Files, then Select
      a file to view the Spectrogram.
    </p>
    <!-- Audio Files -->
    <load-files
      :add-files-to-store="addAudioFilesToStore"
      :remove-files-from-store="removeAudioFilesFromStore"
      :file-selected.sync="fileSelected"
      file-type="Audio"
      :hide-buttons="loading"
      :show-select="numLoaded"
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

    <!-- <div>
      <p>Select a Variable</p>
      <div class="variable-holder">
        <div v-for="(variable, key) in variables" :key="key">
          <v-btn color="purple" @click="selectVariable(key)"
            >{{ key }}. {{ variable.name }}</v-btn
          >
        </div>
      </div>
      <div class="variable-holder">
        <p>Selected Variable:</p>
        {{ selectedVariable }}
      </div>
    </div> -->
  </div>
</template>

<script>
/**
 * TODO:
 * DONE-get correct colormap
 * DONE-determine this.minDecibels,this.maxDecibels, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/maxDecibels
 * make heatmap range (decibel range) user prop
 * what happens when you remove last file
 * highlight selected file
 * upgrade depreciated functions, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
 * drag and drop files
 * time scrolling line with audio player
 * add audio player to data viewer
 * DONE-hide select button before processed
 * Make spectrogram config parameters adjustable by user
 * change getByteFrequencyData to getFloatFrequencyData if better precision needed, need to fix array remap
 * duration should be different units than seconds so you don't have to figure out minutes
 * DONE-button control on netcdf file loader
 * reorder files by number/time
 * Try with single component, v-if, no store
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
      numNCLoaded: 0,
      selectedVariable: null,
      loading: false,
      totalTime: 0,
      numLoaded: 0,
      config: {
        /**
         * The resolution of the FFT calculations
         * Higher value means higher resolution decibel domain.
         * 4096 gives freq res of 31-32Hz
         * 8192 gives 15-16Hz
         */
        fftResolution: 4096,
        /**
         * Smoothing value for FFT calculations
         */
        smoothingTimeConstant: 0,
        /**
         * The size of processing buffer,
         * determines how often FFT is run
         * 256 gives time resolution of 0.002s
         * 2048 gives time res of 0.016s
         */
        processorBufferSize: 2048,
        /**
         * sampling rate for audio data in Hz
         * this should match the recorded sample rate of the wav file
         */
        sampleRate: 128000,
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
  computed: {},
  watch: {
    fileSelected() {
      // add sound to audio player
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      this.audioSrc = URL.createObjectURL(
        this.$store.state.audioFiles[this.fileSelected]
      );
      const sound = document.getElementById('audio');
      sound.load();
      // const audioCtx = new AudioContext();
      // const source = audioCtx.createMediaElementSource(sound);
    },
  },
  methods: {
    /**
     * Read Net CDF files and add trajectory path variables to gliderData state in store
     */
    async readNetCDF() {
      this.loading = true;
      for (let i = 0; i < this.$store.state.ncFiles.length; i++) {
        console.log('load file ', i);
        await this.getVariables(i, [
          'ctd_time',
          'ctd_depth',
          'latitude',
          'longitude',
        ]).then((v) => {
          // Documentation: https://www.digitalocean.com/community/tutorials/understanding-date-and-time-in-javascript
          console.log(v[0][0]); // new Date(v[0][0] * 1000).getUTCHours());
          this.addGliderData(v);
        });
      }
      console.log('all nc files read');
      this.ncFileSelected = this.$store.getters.getNumNCFiles - 1;
      this.numNCLoaded = this.$store.getters.getNumNCFiles;
      this.loading = false;
    },

    /**
     * Return needed variables for trajectory path from NetCDF file
     * @param fileIndex fileIndex of nc file in store
     * @param vars array of variable names
     * @return [{name, data}]
     */
    getVariables(fileIndex, vars) {
      const file = URL.createObjectURL(this.$store.state.ncFiles[fileIndex]);
      return new Promise(function (resolve) {
        const request = new XMLHttpRequest();
        request.open('GET', file, true);
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        request.responseType = 'arraybuffer';
        request.onload = () => {
          // wait for file to load using promise
          const data = request.response;
          const reader = new NetCDFReader(data);
          // Documentation: https://cheminfo.github.io/netcdfjs/
          let dataset = [];
          // Use NetCDF file reader to get variable data
          if (vars.length === 0) {
            dataset = reader.variables;
          } else {
            for (let i = 0; i < vars.length; i++) {
              dataset.push(reader.getDataVariable(vars[i]));
            }
          }
          resolve(dataset);
        };
        request.send();
      });
    },

    /**
     * Get variable information for specific term
     */
    async selectVariable(index) {
      // get all variables for variable list for selected nc file
      // when variable is selected, get variable from name async from this.getVariales
      // need to get variable name from a different way than getting the whole list and using the index
      // await this.getVariables(this.ncFileSelected, []).then((v) => {
      //     this.variables = v;
      //     const name = `${this.variables[index].name}`;
      // this.selectedVariable = await this.getVariables(this.ncFileSelected, [
      //   name,
      // ])[0].data;
      // console.log(this.selectedVariable);
      //   });
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
      console.log('audioFiles ', this.$store.state.audioFiles);

      for (
        let i = this.$store.getters.getNumSpectrograms;
        i < this.$store.state.audioFiles.length;
        i++
      ) {
        // Documentation: https://zellwk.com/blog/async-await-in-loops/
        // wait for async function

        await this.loadAudioData(i).then((v) => {
          // TODO: load time from inputable look up table or read .cap file
          const csvTimestamps = [
            1569338218, 1569338615, 1569341097, 1569341877, 1569343447,
            1569344206,
          ];
          const name = this.$store.state.audioFiles[i].name;
          let year = name.substr(15, 2);
          year = '20'.concat(year);
          // months are from 0-11
          const month = parseInt(name.substr(17, 2)) - 1;
          // TODO: Double check that 9 = September?
          const day = name.substr(19, 2);
          // TODO: convert time to GMT (4 can't be hard coded)
          const hours = parseInt(name.substr(22, 2)) - 4;
          const minutes = name.substr(24, 2);
          const secs = name.substr(26, 2);
          const date = new Date(year, month, day, hours, minutes, secs);
          const timestamp = date.getTime() / 1000; // convert to seconds to match ctd_time
          v.startTime = csvTimestamps[i];
          // v.startTime = timestamp;
          this.addSpectrogramData(v);
        });
      }
      this.fileSelected = this.$store.state.audioFiles.length - 1;
      this.numLoaded = this.$store.state.audioFiles.length;
      this.loading = false;
    },

    loadAudioData(index) {
      console.log('load ', index);
      const audioCtx = new AudioContext({ sampleRate: this.config.sampleRate });
      const processWaveform = this.processWaveform;

      // create URL to reference imported audio file
      const myAudio = URL.createObjectURL(this.$store.state.audioFiles[index]);

      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#examples
      // decode audio data loaded from an XMLHttpRequest
      console.log('XML HTTP');
      return new Promise(function (resolve) {
        const request = new XMLHttpRequest();
        request.open('GET', myAudio, true);
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        request.responseType = 'arraybuffer';
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
      // this is the length of the audio buffer if the processorBufferSize is half the fftResolution
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
        // TODO: change getByteFrequencyData to getFloatFrequencyData for better precision, need to fix remap
        // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData
        // const freqArrayData = new Float32Array(
        //   channelFFtDataBuffer.buffer,
        //   offset,
        //   analyzer.frequencyBinCount
        // );
        // analyzer.getFloatFrequencyData(freqArrayData);
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
      this.totalTime += Math.floor(data.duration);
      return {
        duration: Math.floor(data.duration),
        maxFreq: Math.ceil(data.maxFreq),
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
      'addGliderData',
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

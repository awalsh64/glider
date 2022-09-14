<template>
  <div class="container">
    <div class="large-12 medium-12 small-12 cell">
      <label
        >Files
        <input
          type="file"
          id="files"
          ref="files"
          multiple
          v-on:change="handleFilesUpload()"
        />
      </label>
    </div>
    <div class="large-12 medium-12 small-12 cell">
      <div v-for="(file, key) in files" class="file-listing">
        {{ file.name }}
        <span class="remove-file" v-on:click="removeFile(key)">Remove</span>
      </div>
    </div>
    <br />
    <div class="large-12 medium-12 small-12 cell">
      <button v-on:click="addFiles()">Add Files</button>
    </div>
    <br />
    <div class="large-12 medium-12 small-12 cell">
      <button v-on:click="submitFiles()">Submit</button>
    </div>
    <div class="audio-player" id="song"></div>
    <div id="app" style="height: 50vh">
      <heatmap
        :spectrogram-data="spectrogramData"
        :x-max="duration"
        :y-max="maxFreq"
      />
    </div>
  </div>
</template>

<script>
/**
 * TODO:
 * get correct colormap
 * setup heatmap with responsive x and y max values
 * figure out if i need 1 or 2 channels of audio
 * setup store so heatmap gets data from store
 * decibel range props this.minDecibels,this.maxDecibels;
 */

import Heatmap from '@/components/heatmap.vue';
// File Upload Ex: https://serversideup.net/uploading-files-vuejs-axios/
export default {
  components: {
    Heatmap,
  },
  data() {
    return {
      audioCtx: null,
      files: [],
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
      duration: 0,
      maxFreq: 0,
      minDecibels: 0,
      maxDecibels: 0,
      spectrogramData: [],
    };
  },

  /*
      Defines the method used by the component
    */
  methods: {
    /*
        Adds a file
      */
    addFiles() {
      this.$refs.files.click();
    },

    /*
        Submits files to the server
      */
    submitFiles() {
      /*
          Initialize the form data
        */
      let formData = new FormData();

      /*
          Iterate over any file sent over appending the files
          to the form data.
        */
      for (var i = 0; i < this.files.length; i++) {
        let file = this.files[i];

        formData.append('files[' + i + ']', file);
      }

      const sound = document.createElement('audio');
      sound.id = 'audio-player';
      sound.controls = 'controls';
      sound.src = URL.createObjectURL(this.files[0]);
      sound.type = 'audio/wav';
      document.getElementById('song').appendChild(sound);

      this.playFile();
    },

    playFile() {
      this.audioCtx = new AudioContext();

      // create URL to reference imported audio file
      const myAudio = URL.createObjectURL(this.files[0]);

      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#examples
      // decode audio data loaded from an XMLHttpRequest
      const request = new XMLHttpRequest();
      request.open('GET', myAudio, true);
      request.responseType = 'arraybuffer';
      request.onload = () => {
        // wait for file to load
        let audioData = request.response;
        this.audioCtx.decodeAudioData(audioData).then((decodedData) => {
          // use the decoded data here
          console.log(decodedData);
          const processed = this.processWaveform(decodedData);
          console.log(processed);
          // //save processed audio data to store
          // this.formatSpectrogram(processed);
        });
      };
      request.send();
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
      processor.onaudioprocess = (ev) => {
        // Run FFT for each channel
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

      //TODO: save processed audio data to store
      this.formatSpectrogram(processed);
    },
    /**
     * Setup data for the chart
     * */
    async formatSpectrogram(data) {
      // Create channels and set data for each channel
      for (let i = 0; i < data.channels.length; i += 1) {
        // Setup the data for the chart
        const remappedData = this.remapDataToTwoDimensionalMatrix(
          data.channels[i],
          data.stride,
          data.tickCount
        )
          // Slice only first half of data (rest are 0s).
          .slice(0, data.stride / 2);
        this.spectrogramData = remappedData;
        //TODO: duration should be different units than seconds so you don't have to round
        this.duration = Math.floor(data.duration);
        this.maxFreq = Math.ceil(data.maxFreq / 2); //Use half of the fft data range
        this.minDecibels = data.channelDbRanges[i].minDecibels;
        this.maxDecibels = data.channelDbRanges[i].maxDecibels;
      }
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
      const arr = Array.from(data);

      // Map the one dimensional data to two dimensional data where data goes from right to left
      // [1, 2, 3, 4, 5, 6]
      // -> strideSize = 2
      // -> rowCount = 3
      // maps to
      // [1, 4]
      // [2, 5]
      // [3, 6]
      const output = Array.from(Array(strideSize)).map(() =>
        Array.from(Array(tickCount))
      );
      for (let row = 0; row < strideSize; row += 1) {
        for (let col = 0; col < tickCount; col += 1) {
          output[row][col] = arr[col * strideSize + row];
        }
      }

      return output;
    },
    /*
        Handles the uploading of files
      */
    handleFilesUpload() {
      let uploadedFiles = this.$refs.files.files;

      /*
          Adds the uploaded file to the files array
        */
      for (var i = 0; i < uploadedFiles.length; i++) {
        this.files.push(uploadedFiles[i]);
      }
    },

    /*
        Removes a select file the user has uploaded
      */
    removeFile(key) {
      this.files.splice(key, 1);
    },
  },
  mounted() {},
};
</script>

<style>
input[type='file'] {
  position: absolute;
  top: -500px;
}

div.file-listing {
  width: 200px;
}

span.remove-file {
  color: red;
  cursor: pointer;
  float: right;
}
</style>

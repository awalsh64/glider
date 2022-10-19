<template>
  <div class="container">
    <p>Add NetCDF files and select Read NetCDF to load them into the app.</p>
    <p>
      <!-- NetCDF files -->
      <load-files
        :files.sync="ncFiles"
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
      :files.sync="audioFiles"
      :file-selected.sync="fileSelected"
      file-type="Audio"
      :hide-buttons="loading"
      :show-select="numLoaded"
    />
    <div>
      <!-- Submit -->
      <v-btn v-if="!loading" @click="submitAudioFiles()">Process Files</v-btn>
      <!-- Audio Player -->
      <audio id="audio" controls>
        <source :src="audioSrc" type="audio/wav" />
        Your browser does not support the audio tag.
      </audio>
      <!-- Loading -->
      <span v-if="loading">Loading...</span>
    </div>

    <!-- Trajectory Plot -->
    <div style="height: 40vh">
      <trajectory
        :points="gliderDepth"
        :start-date="startDate"
        :spectrograms="spectrogramData"
        @date="selectedDate = $event"
      />
    </div>
    <!-- Spectrogram -->
    <div class="plot-holder">
      <heatmap
        :selected-time="selectedTime"
        :index="fileSelected"
        :spectrogram="spectrogramData[fileSelected]"
        :min-decibel="config.minDecibel"
        :max-decibel="config.maxDecibel"
      />
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
 * Load audio start time from inputable look up table or read .cap file
 * fix npm run build for path stuff
 * GMT time
 * lat lon on a map
 * import bathymetry
 * get new improved colormap > jet
 * add parameters to change spectrogram - nfft, overlap, window type
 * test on mp3 file
 * rainbow line for sound speed on trajectory
 * depth vs. ctd_depth
 * temperature and salinity profile
 * overlays - bathy, sea surface temp, chlorophyl (how to import, file type)
 * show all spectrograms by scrolling down
 * ask Mel where the whales are
 * |map|profiles|
 * |spectrograms|
 * change netCDF variables to object to avoid wrong indexing
 */

// Spectrogram example documentation: https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0802-spectrogram.html?theme=lightNew&page-theme=light
// Web Audio Documentation: https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
import { mapMutations, mapGetters } from 'vuex';
import Trajectory from '@/components/chartxy.vue';
import Heatmap from '@/components/heatmap.vue';
import LoadFiles from '@/components/loadFiles.vue';
import dateToHMS from '@/components/utils.js';
import {
  getNetCDFVariables,
  loadAudioData,
  getStartTimeFromFilename,
} from '@/components/import-functions.js';
// File Upload Ex: https://serversideup.net/uploading-files-vuejs-axios/
export default {
  components: {
    Trajectory,
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
      numLoaded: 0,
      selectedDate: null,
      selectedTime: 1,
      ctdTimeIndex: 0,
      ctdDepthIndex: 1,
      spectrogramData: [],
      audioFiles: [],
      ncFiles: [],
      ncData: [],
      readVar: { name: '', variable: null },
      gliderData: [], // [{ time: [], latitude: [], longitude: [], depth: [] }], // length num files
      gliderDepth: [],
      startDate: new Date(),
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
        minDecibels: -160,
        maxDecibels: -60,
      },
      resolution: {
        x: 1000,
        y: 1000,
      },
      variables: [],
    };
  },
  computed: {},
  watch: {
    fileSelected() {
      // add sound to audio player
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      if (this.fileSelected < 0) return;
      this.audioSrc = URL.createObjectURL(this.audioFiles[this.fileSelected]);
      const sound = document.getElementById('audio');
      sound.load();
      // const audioCtx = new AudioContext();
      // const source = audioCtx.createMediaElementSource(sound);
    },
    selectedDate(v) {
      // find spectrogramData.startTime that starts closest to selectedTime
      const hours = v.getHours();
      const minutes = v.getMinutes();
      const secs = v.getSeconds();
      this.selectedTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
      const index = this.spectrogramData.findIndex((data) => {
        // selected time < spectrogram start after current
        return this.selectedTime < data.startTime;
      });
      // index-1 to get previous spectrogram
      if (index < 0) this.fileSelected = this.spectrogramData.length - 1;
      else this.fileSelected = index - 1;
      console.log('index', this.fileSelected);
    },
  },
  methods: {
    /**
     * Read Net CDF files and add trajectory path variables to gliderData
     */
    async readNetCDF() {
      this.loading = true;
      const newData = [];
      let depthData = [];
      let startTime = 0;
      // only read new files
      for (let i = this.gliderData.length; i < this.ncFiles.length; i++) {
        console.log('load file ', i);
        const file = URL.createObjectURL(this.ncFiles[i]);
        await getNetCDFVariables(file, [
          'ctd_time',
          'ctd_depth',
          'latitude',
          'longitude',
        ]).then((v) => {
          // TODO: change variables to object to avoid wrong indexing
          // Documentation: https://www.digitalocean.com/community/tutorials/understanding-date-and-time-in-javascript
          v[0] = v[0].map((time) => {
            return time * 1000; // convert seconds to milliseconds
          });
          newData.push(v);

          // get start time of all data
          if (this.gliderData.length < 1)
            startTime = newData[0][this.ctdTimeIndex][0];
          else startTime = this.gliderData[0][this.ctdTimeIndex][0];

          // create glider depth profile
          const time = v[this.ctdTimeIndex];
          const oneDive = time.map((x, i) => {
            return {
              x: x - startTime, // time milliseconds
              y: v[this.ctdDepthIndex][i], // depth
            };
          });
          depthData = depthData.concat(oneDive);
        });
      }
      console.log('all nc files read');
      this.gliderData = this.gliderData.concat(newData);
      this.gliderDepth = this.gliderDepth.concat(depthData);
      // offset time by timezone to GMT
      this.startDate = new Date(
        startTime + new Date(startTime * 1000).getTimezoneOffset() * 60000
      );
      this.ncFileSelected = this.ncFiles.length - 1;
      this.numNCLoaded = this.ncFiles.length;
      this.loading = false;
    },

    /**
     * Get variable information for specific term
     */
    async selectVariable(index) {
      // get all variables for variable list for selected nc file
      // when variable is selected, get variable from name async from this.getVariales
      // need to get variable name from a different way than getting the whole list and using the index
      // await getNetCDFVariables(this.ncFileSelected, []).then((v) => {
      //     this.variables = v;
      //     const name = `${this.variables[index].name}`;
      // this.selectedVariable = await getNetCDFVariables(this.ncFileSelected, [
      //   name,
      // ])[0].data;
      // console.log(this.selectedVariable);
      //   });
    },

    /*
        Submits audioFiles to the server
      */
    async submitAudioFiles() {
      /*
          Iterate over any file sent over appending the audioFiles
          to the form data.
        */
      this.loading = true;
      console.log('audioFiles ', this.audioFiles);
      const data = [];
      for (
        let i = this.spectrogramData.length;
        i < this.audioFiles.length;
        i++
      ) {
        // Documentation: https://zellwk.com/blog/async-await-in-loops/
        // wait for async function
        const file = this.audioFiles[i];
        console.log('load ', i);
        await loadAudioData(file, this.config).then((v) => {
          // TODO: make option to load time from inputable look up table or read .cap file
          const csvTimestamps = [
            1569338218, 1569338615, 1569341097, 1569341877, 1569343447,
            1569344206,
          ];
          v.startTime = getStartTimeFromFilename(file.name);
          data.push(v);
        });
      }
      this.fileSelected = this.audioFiles.length - 1;
      this.spectrogramData = this.spectrogramData.concat(data);
      this.numLoaded = this.audioFiles.length;
      this.loading = false;
    },
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
  height: 80vh;
}

.variable-holder {
  height: 40vh;
  width: 42vw;
  overflow-y: scroll;
  float: left;
}
</style>

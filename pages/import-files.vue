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
      <v-btn v-if="!loading" @click="submitAudioFiles()">Process Files</v-btn>
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
        const file = URL.createObjectURL(this.$store.state.ncFiles[i]);
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
          this.addGliderData(v);
        });
      }
      console.log('all nc files read');
      this.ncFileSelected = this.$store.getters.getNumNCFiles - 1;
      this.numNCLoaded = this.$store.getters.getNumNCFiles;
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
      console.log('audioFiles ', this.$store.state.audioFiles);

      for (
        let i = this.$store.getters.getNumSpectrograms;
        i < this.$store.state.audioFiles.length;
        i++
      ) {
        // Documentation: https://zellwk.com/blog/async-await-in-loops/
        // wait for async function
        const file = this.$store.state.audioFiles[i];
        console.log('load ', i);
        await loadAudioData(file, this.config).then((v) => {
          // TODO: make option to load time from inputable look up table or read .cap file
          const csvTimestamps = [
            1569338218, 1569338615, 1569341097, 1569341877, 1569343447,
            1569344206,
          ];
          v.startTime = getStartTimeFromFilename(file.name);
          this.addSpectrogramData(v);
        });
      }
      this.fileSelected = this.$store.state.audioFiles.length - 1;
      this.numLoaded = this.$store.state.audioFiles.length;
      this.loading = false;
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
  height: 80vh;
}

.variable-holder {
  height: 40vh;
  width: 42vw;
  overflow-y: scroll;
  float: left;
}
</style>

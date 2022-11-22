<template>
  <div>
    <v-expansion-panels>
      <v-expansion-panel>
        <v-expansion-panel-header
          >Add NetCDF files and select Read NetCDF to import.
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <p>
            <!-- NetCDF files -->
            <load-files
              :allowed-extensions="/(\.nc|\.netCDF)$/i"
              :files.sync="ncFiles"
              :file-selected.sync="ncFileSelected"
              file-type="NetCDF"
              :hide-buttons="loading"
              :show-select="numNCLoaded"
            />
            <!-- Load NetCDF-->
            <v-btn v-if="!loading" color="primary" @click="readNetCDF()"
              >Read NetCDF</v-btn
            >
            <span v-if="loading">Loading...</span>
          </p>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-header>
          Add audio files (.wav or .mp3) and select Process Files to import.
          Select a file to view the Spectrogram.
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <!-- Audio Files -->
          <load-files
            :allowed-extensions="/(\.mp3|\.wav)$/i"
            :files.sync="audioFiles"
            :file-selected.sync="fileSelected"
            file-type="Audio"
            :hide-buttons="loading"
            :show-select="numLoaded"
          />
          <div>
            <!-- Submit -->
            <v-btn v-if="!loading" color="primary" @click="submitAudioFiles()"
              >Process Files</v-btn
            >
            <v-dialog v-model="dialog" width="500">
              <template #activator="{ on, attrs }">
                <v-btn color="primary" v-bind="attrs" v-on="on">
                  FFT Parameters
                </v-btn>
              </template>

              <v-card>
                <v-card-title class="text-h5"> FFT Parameters </v-card-title>
                <v-card-text>
                  <v-combobox
                    v-model="nfftSelected"
                    :items="nfftOptions"
                    label="NFFT"
                    outlined
                    dense
                  ></v-combobox>
                  <v-text-field
                    v-model="sampleRateInput"
                    label="Sample Rate"
                    clearable
                    :rules="[rules.min0]"
                  ></v-text-field>
                  <v-text-field
                    v-model="minDecibelInput"
                    label="Minimum dB"
                    clearable
                    :rules="[rules.max0]"
                  ></v-text-field>
                  <v-text-field
                    v-model="maxDecibelInput"
                    label="Maximum dB"
                    clearable
                    :rules="[rules.max0]"
                  ></v-text-field>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="dialog = false">
                    Submit
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <!-- Loading -->
            <span v-if="loading">Loading...</span>
          </div>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="map-holder">
      <geo :points="latLonData"></geo>
    </div>

    <!-- Trajectory Plot -->
    <div class="nc-plot-holder">
      <trajectory
        :points="gliderDepth"
        :points2="tempSalData"
        :start-date="startDate"
        :spectrograms="spectrogramData"
        @date="selectedDate = $event"
      />
    </div>

    <!-- Audio Player -->
    <div>
      <audio id="audio" controls>
        <source :src="audioSrc" type="audio/wav" />
        Your browser does not support the audio tag.
      </audio>
    </div>

    <!-- Spectrogram -->
    <div class="plot-holder">
      <heatmap
        :selected-time="selectedTime"
        :index="fileSelected"
        :spectrogram="spectrogramData[fileSelected]"
        :min-decibel="config.minDecibel"
        :max-decibel="config.maxDecibel"
        :current-time="currentTime"
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
 * DONE-drag and drop files
 * DONE-add audio player to data viewer
 * DONE-hide select button before processed
 * DONE-duration should be different units than seconds so you don't have to figure out minutes
 * DONE-button control on netcdf file loader
 * DONE-reorder files by number/time
 * DONE-Try with single component, v-if, no store
 * DONE-test on mp3 file
 * DONE-GMT time
 * DONE-temperature and salinity profile
 * DONE - time scrolling line with audio player
 * import bathymetry
 * DONE-get new improved colormap > jet Turbo
 * DONE-depth vs. ctd_depth - change depthData variable index - depth_ctd is better!!!
 * overlays - bathy, sea surface temp, chlorophyl (how to import, file type)
 * show all spectrograms by scrolling down
 * upgrade depreciated functions, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
 * fix npm run build for path stuff	https://elpan.dev/en/deploy-nuxt-js-on-github-pages
 * Make spectrogram config parameters adjustable by user
 * change getByteFrequencyData to getFloatFrequencyData if better precision needed, need to fix array remap
 * ask Mel where the whales are
 * Layout:
 * |map|profiles|
 * |spectrograms|
 * change netCDF variables to object to avoid wrong indexing, handle missing variables
 * handle missing netCDF variables
 * DONE-make heatmap range (decibel range) user prop
 * what happens when you remove last file
 * Load audio start time from inputable look up table or read .cap file
 * DONE-highlight selected file
 * DONE-lat lon on a map
 * add parameters to change spectrogram - nfft, overlap, window type
 * DONE-rainbow line for sound speed on trajectory
 * crashes if click nc chart while loading audio files because change fileSelected
 * add watchers to FFT Parameters and button
 * add overlay loading indicator
 * TODO 11/17:try higher sample rate
 * click spectrogram to play time
 * label dive number and show number and time in readout
 * network attached storage or google drive?
 * link geo to trajectory plot and spectrogram
 * collapse plots
 * add speed nc variable
 * standalone build-https://www.sitepoint.com/bundle-static-site-webpack/
 * overlap data
 * adding data in middle doesn't work (i.e. adding 5 when 4 and 6 are already loaded)
 *
 */

// Spectrogram example documentation: https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0802-spectrogram.html?theme=lightNew&page-theme=light
// Web Audio Documentation: https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
import Trajectory from '@/components/chartxy.vue';
import Heatmap from '@/components/heatmap.vue';
import Geo from '@/components/geo.vue';
import LoadFiles from '@/components/loadFiles.vue';
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
    Geo,
  },
  data() {
    return {
      dialog: false,
      nfftOptions: [256, 512, 2048, 4096, 8192, 16384],
      nfftSelected: 2048,
      sampleRateInput: 128000,
      minDecibelInput: -160,
      maxDecibelInput: -60,
      rules: {
        min0: (value) => Number(value) > 0 || 'Value must be greater than 0.',
        max0: (value) =>
          Number(value) <= 0 || 'Value must be less than or equal to 0.',
      },
      currentTime: 0,
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
      depthIndex: 1, // ctd_depth
      latitudeIndex: 3,
      longitudeIndex: 4,
      temperatureIndex: 5,
      salinityIndex: 6,
      svpIndex: 7,
      spectrogramData: [],
      audioFiles: [],
      ncFiles: [],
      ncData: [],
      readVar: { name: '', variable: null },
      gliderData: [], // [{ time: [], latitude: [], longitude: [], depth: [] }], // length num files
      gliderDepth: [],
      tempSalData: [],
      latLonData: [],
      startDate: new Date(),
      config: {
        /**
         * The resolution of the FFT calculations - NFFT
         * Higher value means higher resolution decibel domain.
         * 4096 gives freq res of 31-32Hz
         * 8192 gives 15-16Hz
         */
        fftResolution: 512,
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
      this.selectedTime = this.spectrogramData[this.fileSelected].startTime;
      this.currentTime = this.spectrogramData[this.fileSelected].startTime;
      sound.addEventListener(
        'timeupdate',
        () => {
          this.currentTime =
            sound.currentTime * 1000 +
            this.spectrogramData[this.fileSelected].startTime;
        },
        false
      );

      // const audioCtx = new AudioContext();
      // const source = audioCtx.createMediaElementSource(sound);

      console.log('file selected');
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
      if (this.spectrogramData.length < 1) return;
      this.selectedTime = this.spectrogramData[this.fileSelected].startTime;
      this.currentTime = this.spectrogramData[this.fileSelected].startTime;
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
      let tempSalData = [];
      let latLonData = [];
      let startTime = 0;
      // only read new files
      for (let i = this.gliderData.length; i < this.ncFiles.length; i++) {
        console.log('load file ', i);
        const file = URL.createObjectURL(this.ncFiles[i]);
        await getNetCDFVariables(file, [
          'ctd_time',
          'ctd_depth',
          'depth',
          'latitude',
          'longitude',
          'temperature',
          'salinity_raw',
          'sound_velocity',
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
            const T = v[this.temperatureIndex][i]; // Celcius
            const S = v[this.salinityIndex][i]; // ppt
            const D = v[this.depthIndex][i] * 0.3048; // meters
            const soundSpeed =
              1448.96 +
              4.591 * T -
              5.304 * 10 ** -2 * T ** 2 +
              2.374 * 10 ** -4 * T ** 3 +
              1.34 * (S - 35) +
              1.63 * 10 ** -2 * D +
              1.675 * 10 ** -7 * D ** 2 -
              1.025 * 10 ** -2 * T * (S - 35) -
              7.139 * 10 ** -13 * T * D ** 3; // documentation: Mackenzie equation (1981) http://resource.npl.co.uk/acoustics/techguides/soundseawater/underlying-phys.html
            // reference: K.V. Mackenzie, Nine-term equation for the sound speed in the oceans (1981) J. Acoust. Soc. Am. 70(3), pp 807-812
            return {
              x: x - startTime, // time milliseconds
              y: v[this.depthIndex][i], // depth
              value: soundSpeed, // sound speed
            };
          });
          depthData = depthData.concat(oneDive);

          const tempSalinityData = oneDive.map((dive, i) => {
            return {
              x: dive.x,
              y: v[this.temperatureIndex][i],
              z: v[this.salinityIndex][i],
              value: dive.value,
            };
          });
          tempSalData = tempSalData.concat(tempSalinityData);

          const latitudeLongitude = oneDive.map((dive, i) => {
            return {
              x: v[this.longitudeIndex][i],
              y: v[this.latitudeIndex][i],
              value: dive.y, // depth
            };
          });
          latLonData = latLonData.concat(latitudeLongitude);
        });
      }
      console.log('all nc files read');
      this.gliderData = this.gliderData.concat(newData);
      this.gliderDepth = this.gliderDepth.concat(depthData);
      this.tempSalData = this.tempSalData.concat(tempSalData);
      this.latLonData = this.latLonData.concat(latLonData);
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
      this.config = {
        fftResolution: this.nfftSelected,
        smoothingTimeConstant: 0,
        processorBufferSize: 2048,
        sampleRate: this.sampleRateInput,
        minDecibels: this.minDecibelInput,
        maxDecibels: this.maxDecibelInput,
      };
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
.map-holder {
  height: 50vh;
}

.plot-holder {
  height: 80vh;
}

.nc-plot-holder {
  height: 80vh;
}

.variable-holder {
  height: 40vh;
  width: 42vw;
  overflow-y: scroll;
  float: left;
}

#audio {
  width: 98vw;
}
</style>

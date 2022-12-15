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
              @index-removed="removeNC($event)"
            />
            <!-- Load NetCDF-->
            <v-btn v-if="!loading" color="primary" @click="readNetCDF()"
              >Read NetCDF</v-btn
            >
            <!-- Load bathy -->
            <v-dialog v-if="!loading" v-model="dialog3">
              <template #activator="{ on, attrs }">
                <v-btn color="primary" class="ml-1" v-bind="attrs" v-on="on">
                  Load Bathy
                </v-btn>
              </template>
              <v-card class="bathy-window">
                <v-card-title class="text-h5"> Load Bathy File </v-card-title>
                <v-card-text>
                  <!-- Bathy NetCDF File -->
                  <load-files
                    :allowed-extensions="/(\.nc|\.netCDF)$/i"
                    :files.sync="bathyFiles"
                    :hide-buttons="loading"
                    file-type="NetCDF"
                    single-file
                  />
                </v-card-text>
                <v-card-text>
                  Enter NetCDF Variable Names. Defaults are for
                  download.gebco.net.
                </v-card-text>
                <v-card-text>
                  <v-text-field
                    v-model="latitudeName"
                    label="latitude"
                    clearable
                  ></v-text-field>
                  <v-text-field
                    v-model="longitudeName"
                    label="longitude"
                    clearable
                  ></v-text-field>
                  <v-text-field
                    v-model="elevationName"
                    label="elevation"
                    clearable
                  ></v-text-field>
                  <v-radio-group v-model="depthPositive">
                    <v-radio
                      :label="`Positive Above Sea Level`"
                      :value="-1"
                    ></v-radio>
                    <v-radio
                      :label="`Positive Below Sea Level`"
                      :value="1"
                    ></v-radio>
                  </v-radio-group>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="loadBathy">
                    Submit
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
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
            @index-removed="removeAudio($event)"
          />
          <div>
            <!-- Submit -->
            <v-btn v-if="!loading" color="primary" @click="submitAudioFiles()"
              >Process Files</v-btn
            >
            <v-dialog v-if="!loading" v-model="dialog" width="500">
              <template #activator="{ on, attrs }">
                <v-btn color="primary" class="ml-1" v-bind="attrs" v-on="on">
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
            <!-- Load timestamp csv -->
            <v-dialog v-if="!loading" v-model="dialog2">
              <template #activator="{ on, attrs }">
                <v-btn color="primary" class="ml-1" v-bind="attrs" v-on="on">
                  Load Timestamps
                </v-btn>
              </template>
              <v-card>
                <v-card-title class="text-h5">
                  Load Timestamp CSV File
                </v-card-title>
                <v-card-text>
                  <!-- CSV Files -->
                  <load-csv
                    :allowed-extensions="/(\.csv)$/i"
                    :files.sync="csvFiles"
                    :hide-buttons="loading"
                  />
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" text @click="loadTimestamp">
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

    <!-- Geo Plot -->
    <div class="map-holder">
      <geo
        :points="latLonData"
        :bathy-points="bathyPoints"
        :max-depth="maxDepth"
      ></geo>
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
        :selected-time.sync="selectedTime"
        :spectrogram="spectrogramData[fileSelected]"
        :min-decibel="currentConfig.minDecibel"
        :max-decibel="currentConfig.maxDecibel"
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
 * DONE- import bathymetry
 * DONE-get new improved colormap > jet Turbo
 * DONE-depth vs. ctd_depth - change depthData variable index - depth_ctd is better!!!
 * overlays - bathy, sea surface temp, chlorophyl (how to import, file type)
 * show all spectrograms by scrolling down
 * upgrade depreciated functions, documentation: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createMediaElementSource
 * fix npm run build for path stuff	https://elpan.dev/en/deploy-nuxt-js-on-github-pages
 * DONE-Make spectrogram config parameters adjustable by user
 * change getByteFrequencyData to getFloatFrequencyData if better precision needed, need to fix array remap
 * ask Mel where the whales are
 * Layout:
 * |map|profiles|
 * |spectrograms|
 * change netCDF variables to object to avoid wrong indexing, handle missing variables
 * handle missing netCDF variables
 * DONE-make heatmap range (decibel range) user prop
 * DONE-what happens when you remove last file
 * DONE-Load audio start time from inputable look up table or read .cap file
 * DONE-highlight selected file
 * DONE-lat lon on a map
 * DONE-add parameters to change spectrogram - nfft, overlap, window type
 * DONE-rainbow line for sound speed on trajectory
 * crashes if click nc chart while loading audio files because change fileSelected
 * DONE-add watchers to FFT Parameters and button
 * add overlay loading indicator
 * TODO 11/17:try higher sample rate
 * click spectrogram to play time ???can you set time of audio player???
 * label dive number and show number and time in readout
 * network attached storage or google drive?
 * link geo to trajectory plot and spectrogram
 * collapse plots
 * DONE-add speed nc variable
 * standalone build-https://www.sitepoint.com/bundle-static-site-webpack/
 * overlap data
 * adding data in middle doesn't work (i.e. adding 5 when 4 and 6 are already loaded)
 * removing all files doesn't let you reload same file(s)
 * add input for processing buffer
 * remove NC files from plot data
 * add hide NC files
 * change audio start time line to shading (duration in seconds,convert to ms)
 * add audio time line to nc plots (when audio file is loaded second)
 * reprocess when timestamp loaded
 * //TODO: remove duplicate files in loadFiles addFiles
 * lightningchart too many active webgl contexts when reloading
 * fix timestamp import time posixtodate
 * mdi doesn't load offline
 * make trajectory line segments not connect, then you can remove individual segments for nc files instead of rereading all
 */

// Spectrogram example documentation: https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0802-spectrogram.html?theme=lightNew&page-theme=light
// Web Audio Documentation: https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
import Trajectory from '@/components/chartxy.vue';
import Heatmap from '@/components/heatmap.vue';
import Geo from '@/components/geo.vue';
import LoadFiles from '@/components/loadFiles.vue';
import LoadCsv from '@/components/loadCSV.vue';
import {
  getNetCDFVariables,
  loadAudioData,
  getStartTimeFromFilename,
  posixToDate,
} from '@/components/import-functions.js';
// File Upload Ex: https://serversideup.net/uploading-files-vuejs-axios/
export default {
  components: {
    Trajectory,
    Heatmap,
    LoadFiles,
    LoadCsv,
    Geo,
  },
  data() {
    return {
      depthPositive: -1,
      latitudeName: 'lat',
      longitudeName: 'lon',
      elevationName: 'elevation',
      maxDepth: 1,
      dialog: false,
      dialog2: false,
      dialog3: false,
      nfftOptions: [256, 512, 1024, 2048, 4096, 8192, 16384],
      nfftSelected: 256, // TODO:2048
      sampleRateInput: 32000, // TODO:128000,
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
      csvFiles: [],
      bathyFiles: [],
      bathyPoints: [],
      readVar: { name: '', variable: null },
      gliderData: [], // [{ time: [], latitude: [], longitude: [], depth: [] }], // length num files
      gliderDepth: [],
      tempSalData: [],
      latLonData: [],
      startDate: new Date(),
      resolution: {
        x: 1000,
        y: 1000,
      },
      variables: [],
      currentConfig: {
        fftResolution: this.nfftSelected,
        smoothingTimeConstant: 0,
        processorBufferSize: 2048,
        sampleRate: this.sampleRateInput,
        minDecibels: this.minDecibelInput,
        maxDecibels: this.maxDecibelInput,
      },
    };
  },
  computed: {
    numAudioFiles() {
      return this.audioFiles.length;
    },
    config() {
      return {
        /**
         * The resolution of the FFT calculations - NFFT
         * Higher value means higher resolution decibel domain.
         * 2048 ~62-64
         * 4096 gives freq res of 31-32Hz
         * 8192 gives 15-16Hz
         */
        fftResolution: this.nfftSelected,
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
        sampleRate: this.sampleRateInput,
        minDecibels: this.minDecibelInput,
        maxDecibels: this.maxDecibelInput,
      };
    },
  },
  watch: {
    numAudioFiles() {
      if (this.fileSelected <= 0) {
        // last file was removed, trigger reload because fileSelected index didn't change
        this.loadSelectedAudioFile();
      }
    },
    fileSelected() {
      if (this.fileSelected >= 0) {
        this.loadSelectedAudioFile();
      }
    },
    selectedTime(v) {
      this.sound.currentTime = v / 1000 - 0.1;
    },
    selectedDate(v) {
      // return if no spectrograms created
      if (this.spectrogramData.length === 0) return;
      // find spectrogramData.startTime that starts closest to selectedTime
      const hours = v.getHours();
      const minutes = v.getMinutes();
      const secs = v.getSeconds();
      this.selectedTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
      const index = this.spectrogramData.findIndex((data) => {
        // find index of the spectrogram after selected time
        return this.selectedTime < data.startTime;
      });
      // index-1 = spectrogram that starts before selected time
      let newIndex = index - 1;
      if (index < 0) {
        // last spectrogram
        newIndex = this.spectrogramData.length - 1;
        if (
          this.selectedTime >
          this.spectrogramData[newIndex].startTime +
            this.spectrogramData[newIndex].duration * 1000
        ) {
          // selected time is beyond last spectrogram duration
          newIndex = -1;
        }
      }
      if (this.fileSelected !== newIndex) {
        // set new spectrogram if it is not the current selection
        this.fileSelected = newIndex;
        if (this.fileSelected >= 0) {
          // reset play time
          this.currentTime = this.spectrogramData[this.fileSelected].startTime;
        }
      }
      console.log('index', this.fileSelected);
    },
  },
  methods: {
    removeAudio(index) {
      this.spectrogramData.splice(index, 1);
      this.numLoaded--;
    },
    /**
     * load the audio file from an optional specified start time in seconds
     */
    loadSelectedAudioFile() {
      // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
      this.sound = document.getElementById('audio');
      if (this.fileSelected < 0) {
        this.audioSrc = null;
        this.sound.load();
        return;
      }
      this.audioSrc = URL.createObjectURL(this.audioFiles[this.fileSelected]);
      this.sound.load();
      this.currentTime = this.spectrogramData[this.fileSelected].startTime;
      const sound = this.sound;
      this.sound.addEventListener(
        'timeupdate',
        () => {
          if (this.fileSelected < 0) return;
          this.currentTime =
            sound.currentTime * 1000 +
            this.spectrogramData[this.fileSelected].startTime;
        },
        false
      );

      // const audioCtx = new AudioContext();
      // const source = audioCtx.createMediaElementSource(sound);
    },
    loadTimestamp() {
      this.spectrogramData = [];
      this.fileSelected = -1;
      this.dialog2 = false;
    },
    async loadBathy() {
      if (this.bathyFiles.length > 0) {
        console.log('load bathy');
        const file = URL.createObjectURL(this.bathyFiles[0]);
        const bathyData = [];
        let maxDepth = this.maxDepth;
        await getNetCDFVariables(file, [
          this.longitudeName,
          this.latitudeName,
          this.elevationName,
        ]).then((v) => {
          const x = v[0]; // longitude
          const y = v[1]; // latitude
          const z = v[2]; // elevation
          let zCounter = 0;
          for (let i = 0; i < y.length; i++) {
            for (let j = 0; j < x.length; j++) {
              const depth = this.depthPositive * z[zCounter]; // depth = elevation * -1
              maxDepth = Math.max(maxDepth, depth);
              bathyData.push({
                x: x[j],
                y: y[i],
                value: depth,
              });
              zCounter++;
            }
          }
          this.bathyPoints = bathyData;
          this.maxDepth = maxDepth;
        });
      }
      // close dialog
      this.dialog3 = false;
    },
    /**
     * reread all net cdf files when one is removed that has already been read
     * this will not read files if removing file before it is read
     */
    removeNC(index) {
      if (index < this.numNCLoaded) {
        this.readNetCDF();
      }
    },
    /**
     * Read Net CDF files and add trajectory path variables to gliderData
     */
    async readNetCDF() {
      this.loading = true;
      // reset data because data is a continuous stream of points
      this.gliderData = [];
      this.gliderDepth = [];
      this.tempSalData = [];
      this.latLonData = [];

      const newData = [];
      let depthData = [];
      let tempSalData = [];
      let latLonData = [];
      let startTime = 0;
      let maxDepth = this.maxDepth;
      // only read new files
      for (let i = this.gliderData.length; i < this.ncFiles.length; i++) {
        console.log('load file ', i);
        const file = URL.createObjectURL(this.ncFiles[i]);
        await getNetCDFVariables(file, [
          'ctd_time', // unix timestamp - seconds since 1970-1-1 00:00:00
          'ctd_depth', // meters
          'depth', // meters
          'latitude', // deg
          'longitude', // deg
          'temperature', // deg Celsius
          'salinity_raw', // ppt
          'sound_velocity', // m/s
          'speed', // cm/s
        ]).then((v) => {
          // TODO: change variables to object to avoid wrong indexing
          // Documentation: https://www.digitalocean.com/community/tutorials/understanding-date-and-time-in-javascript
          v[0] = v[0].map((time) => {
            return time * 1000; // convert seconds to milliseconds
          });
          newData.push(v);

          // get start time of all data
          if (this.gliderData.length < 1) {
            startTime = newData[0][this.ctdTimeIndex][0];
          } else startTime = this.gliderData[0][this.ctdTimeIndex][0];

          // create glider depth profile
          const time = v[this.ctdTimeIndex];
          const oneDive = time.map((x, i) => {
            const depth = v[this.depthIndex][i]; // meters
            maxDepth = Math.max(maxDepth, depth);
            const T = v[this.temperatureIndex][i]; // Celcius
            const S = v[this.salinityIndex][i]; // ppt
            const D = depth; // meters
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
              y: depth, // depth
              value: soundSpeed, // sound speed
            };
          });
          depthData = depthData.concat(oneDive);

          const tempSalinityData = oneDive.map((dive, i) => {
            return {
              x: dive.x, // time
              y: v[this.temperatureIndex][i],
              z: v[this.salinityIndex][i],
              value: dive.value, // sound speed
            };
          });
          tempSalData = tempSalData.concat(tempSalinityData);

          const latitudeLongitude = oneDive.map((dive, i) => {
            return {
              x: v[this.longitudeIndex][i], // longitude
              y: v[this.latitudeIndex][i], // latitude
              value: dive.y, // depth
              speed: v[8][i], // speed
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
      this.maxDepth = maxDepth;
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
      // TODO: if lower file number is loaded after higher, the spectrogramData doesn't reset
      if (this.currentConfig !== this.config) {
        // reprocess spectrograms
        this.currentConfig = this.config;
        this.spectrogramData = [];
        this.fileSelected = -1;
      }
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
        await loadAudioData(file, this.currentConfig).then((v) => {
          if (this.csvFiles.length > 0) {
            v.startTime = posixToDate(this.csvFiles[i].toString());
            console.log(v.startTime);
            console.log(getStartTimeFromFilename(file.name));
          } else {
            v.startTime = getStartTimeFromFilename(file.name);
          }
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

.bathy-window {
  overflow-x: hidden;
}
</style>

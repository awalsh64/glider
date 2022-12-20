<template>
  <div>
    <v-expansion-panels>
      <v-expansion-panel class="mt-0">
        <v-expansion-panel-header>Add NetCDF Files </v-expansion-panel-header>
        <v-expansion-panel-content>
          <p>
            Add files, then select Read NetCDF to import the data. Select Load
            Bathy to import a bathymetric NetCDF file.
          </p>
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
                    <v-row>
                      <v-col cols="4">
                        <v-radio
                          :label="`Positive Above Sea Level`"
                          :value="-1"
                        ></v-radio>
                      </v-col>
                      <v-col cols="4">
                        <v-radio
                          :label="`Positive Below Sea Level`"
                          :value="1"
                        ></v-radio>
                      </v-col>
                    </v-row>
                  </v-radio-group>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" @click="loadBathy"> Submit </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
            <span v-if="loading">Loading...</span>
          </p>
        </v-expansion-panel-content>
      </v-expansion-panel>
      <v-expansion-panel class="mt-0">
        <v-expansion-panel-header class="light-border">
          Add Audio Files
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <p>
            Add .wav or .mp3 files, then select Process Files to import. Before
            processing, select FFT Parameters to modify the parameters, and
            select Load Timestamps to import a .csv file of audio file start
            times. Once processed, select a file to view the spectrogram. You
            must reselect Process Files after changing the FFT Parameters or
            timestamps.
          </p>
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
            <v-btn v-if="!loading" color="primary" @click="submitAudioFiles"
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
                  <v-tooltip bottom>
                    <template #activator="{ on, attrs }">
                      <v-combobox
                        v-model="nfftSelected"
                        :items="nfftOptions"
                        label="NFFT"
                        outlined
                        dense
                        v-bind="attrs"
                        v-on="on"
                      ></v-combobox>
                    </template>
                    <span>Increase NFFT to increase frequency resolution.</span>
                  </v-tooltip>
                  <v-tooltip bottom>
                    <template #activator="{ on, attrs }">
                      <v-combobox
                        v-model="processorBufferSizeInput"
                        :items="nfftOptions"
                        label="Processor Buffer Size"
                        outlined
                        dense
                        v-bind="attrs"
                        v-on="on"
                      ></v-combobox>
                    </template>
                    <span
                      >Decrease Processor Buffer Size to increase time
                      resolution.</span
                    >
                  </v-tooltip>
                  <v-text-field
                    v-model="sampleRateInput"
                    label="Sample Rate (Hz)"
                    clearable
                    :rules="[rules.samplerate]"
                  ></v-text-field>
                  <v-text-field
                    v-model="minDecibelInput"
                    label="Minimum dB"
                    clearable
                    :rules="[rules.mindb]"
                  ></v-text-field>
                  <v-text-field
                    v-model="maxDecibelInput"
                    label="Maximum dB"
                    clearable
                    :rules="[rules.maxdb]"
                  ></v-text-field>
                </v-card-text>
                <v-divider></v-divider>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" @click="dialog = false">
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
                  <v-btn color="primary" @click="loadTimestamp"> Submit </v-btn>
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
    <div v-if="!hideGeo" class="map-holder">
      <geo
        :points="latLonData"
        :bathy-points="bathyPoints"
        :max-depth="maxDepth"
      ></geo>
    </div>

    <!-- Trajectory Plot -->
    <div
      v-if="!hideTrajectory || !hideTemp"
      :class="{
        'big-plot': !hideTrajectory && !hideTemp,
        'small-plot': hideTrajectory || hideTemp,
      }"
    >
      <trajectory
        :points="gliderDepth"
        :points2="tempSalData"
        :start-date="startDate"
        :spectrogram-times="spectrogramTimes"
        :hide-temp="hideTemp"
        :hide-trajectory="hideTrajectory"
        :min-sound-speed="minSoundSpeed"
        :max-sound-speed="maxSoundSpeed"
        @date="selectedDate = $event"
      />
    </div>

    <!-- Audio Player -->
    <div id="audio-holder">
      <audio id="audio" controls>
        <source :src="audioSrc" type="audio/wav" />
        Your browser does not support the audio tag.
      </audio>
    </div>

    <!-- Spectrogram -->
    <div
      v-if="!hideSpec"
      :class="{
        'big-plot': hideTrajectory && hideTemp,
        'small-plot': !hideTrajectory || !hideTemp,
      }"
    >
      <heatmap
        :selected-time.sync="selectedTime"
        :spectrogram="spectrogramData"
        :min-decibel="Number(minDecibelInput)"
        :max-decibel="Number(maxDecibelInput)"
        :current-time="currentTime"
        :file="spectrogramFile"
      />
    </div>

    <!-- Hide Plot Buttons -->
    <v-card flat height="52">
      <v-row>
        <v-col cols="3">
          <v-checkbox
            v-model="hideGeo"
            class="mt-0 ml-6"
            label="Hide Geo Location"
            hide-details
          ></v-checkbox>
        </v-col>
        <v-col cols="3">
          <v-checkbox
            v-model="hideTrajectory"
            class="mt-0 ml-6"
            label="Hide Glider Trajectory"
            hide-details
          ></v-checkbox>
        </v-col>
        <v-col cols="3">
          <v-checkbox
            v-model="hideTemp"
            class="mt-0 ml-6"
            label="Hide Temp/Salinity"
            hide-details
          ></v-checkbox>
        </v-col>
        <v-col cols="3">
          <v-checkbox
            v-model="hideSpec"
            class="mt-0 ml-6"
            label="Hide Spectrogram"
            hide-details
          ></v-checkbox>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script>
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
  unixToTime,
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
      hideGeo: false,
      hideTrajectory: false,
      hideTemp: false,
      hideSpec: false,
      depthPositive: -1,
      latitudeName: 'lat',
      longitudeName: 'lon',
      elevationName: 'elevation',
      maxDepth: 1,
      dialog: false,
      dialog2: false,
      dialog3: false,
      nfftOptions: [256, 512, 1024, 2048, 4096, 8192, 16384],
      nfftSelected: 2048,
      processorBufferSizeInput: 1024,
      sampleRateInput: 48000,
      minDecibelInput: -160,
      maxDecibelInput: -60,
      rules: {
        samplerate: (value) =>
          (Number(value) >= 3000 && Number(value) <= 768000) ||
          'Value must be between 3000 and 768000.',
        mindb: (value) =>
          Number(value) <= 0 || 'Value must be less than or equal to 0.',
        maxdb: (value) =>
          (Number(value) <= 0 && Number(value) > -100) ||
          'Value must be less than or equal to 0 and greater than -100.',
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
      latitudeIndex: 2,
      longitudeIndex: 3,
      temperatureIndex: 4,
      salinityRawIndex: 5,
      speedIndex: 6,
      salinityIndex: 7,
      spectrogramData: {},
      spectrogramTimes: [],
      audioFiles: [],
      ncFiles: [],
      ncData: [],
      csvFiles: [],
      bathyFiles: [],
      bathyPoints: {},
      readVar: { name: '', variable: null },
      gliderData: [], // [{ time: [], latitude: [], longitude: [], depth: [] }], // length num files
      gliderDepth: [],
      tempSalData: [],
      latLonData: [],
      minSoundSpeed: 1420,
      maxSoundSpeed: 1570,
      spectrogramFile: '',
      startDate: new Date(),
      resolution: {
        x: 1000,
        y: 1000,
      },
      variables: [],
      currentConfig: {
        fftResolution: this.nfftSelected,
        smoothingTimeConstant: 0,
        processorBufferSize: this.processorBufferSizeInput,
        sampleRate: this.sampleRateInput,
        minDecibels: this.minDecibelInput,
        maxDecibels: this.maxDecibelInput,
      },
    };
  },
  computed: {
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
        processorBufferSize: this.processorBufferSizeInput,
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
    fileSelected() {
      // load audio files when new file is selected or when Process Files is clicked
      if (this.fileSelected >= 0) {
        // numLoaded watcher will trigger loadSelectedAudioFile
        this.submitAudioFiles();
        this.loadSelectedAudioFile();
      }
    },
    selectedTime(v) {
      this.sound.currentTime = v / 1000 - 0.1;
    },
    selectedDate(date) {
      // return if no spectrograms created
      if (this.spectrogramTimes.length === 0) return;
      // find spectrogramTimes.startTime that starts closest to selectedDate
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const secs = date.getSeconds();
      this.selectedTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
      const index = this.spectrogramTimes.findIndex((data) => {
        // find index of the spectrogram after selected time
        // return this.selectedTime < data.startTime;
        return date < data.startDate;
      });
      // index-1 = spectrogram that starts before selected time
      let newIndex = index - 1;
      if (index < 0) {
        // last spectrogram
        newIndex = this.spectrogramTimes.length - 1;
      }
      if (this.fileSelected !== newIndex) {
        // set new spectrogram if it is not the current selection
        this.fileSelected = newIndex;
        if (this.fileSelected >= 0) {
          // reset play time
          this.currentTime = 0;
        }
      }
    },
  },
  methods: {
    removeAudio(index) {
      this.spectrogramTimes.splice(index, 1);
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

      const sound = this.sound;
      this.sound.addEventListener(
        'timeupdate',
        () => {
          if (this.fileSelected < 0) return;
          this.currentTime =
            sound.currentTime * 1000 + this.spectrogramData.startTime;
        },
        false
      );
    },
    loadTimestamp() {
      this.spectrogramTimes = [];
      this.dialog2 = false;
    },
    async loadBathy() {
      if (this.bathyFiles.length > 0) {
        const file = URL.createObjectURL(this.bathyFiles[0]);
        let maxDepth = this.maxDepth;
        await getNetCDFVariables(file, [
          this.longitudeName,
          this.latitudeName,
          this.elevationName,
        ]).then((v) => {
          const x = v[0]; // longitude
          const y = v[1]; // latitude
          let z = v[2]; // elevation
          z = z.map((v, i) => {
            const depth = v * this.depthPositive; // depth = elevation * -1
            maxDepth = Math.max(maxDepth, depth);
            return depth;
          });
          this.bathyPoints = { x, y, value: z };
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
      this.minSoundSpeed = 1600; // set out of range so first calculated value will be set
      this.maxSoundSpeed = 0;

      // only read new files
      for (let i = this.gliderData.length; i < this.ncFiles.length; i++) {
        const file = URL.createObjectURL(this.ncFiles[i]);
        const name = this.ncFiles[i].name;
        await getNetCDFVariables(file, [
          'ctd_time', // unix timestamp - seconds since 1970-1-1 00:00:00
          'ctd_depth', // meters
          'latitude', // deg
          'longitude', // deg
          'temperature', // deg Celsius
          'salinity_raw', // ppt
          'speed', // cm/s
          'salinity', // psu (practical salinity units)
        ]).then((v) => {
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
            const depth = v[this.ctdDepthIndex][i]; // meters
            maxDepth = Math.max(maxDepth, depth);
            const T = v[this.temperatureIndex][i]; // Celcius
            const S = v[this.salinityRawIndex][i]; // ppt
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
            this.minSoundSpeed = Math.min(soundSpeed, this.minSoundSpeed);
            this.maxSoundSpeed = Math.max(soundSpeed, this.maxSoundSpeed);
            return {
              x: x - startTime, // time in milliseconds since start of nc data
              y: depth, // depth
              value: soundSpeed, // sound speed
              file: name,
            };
          });
          depthData = depthData.concat(oneDive);

          const tempSalinityData = oneDive.map((dive, i) => {
            return {
              x: dive.x, // time
              y: v[this.temperatureIndex][i],
              z: isNaN(v[this.salinityIndex][i]) ? 0 : v[this.salinityIndex][i],
              value: dive.value, // sound speed
              file: name,
            };
          });
          tempSalData = tempSalData.concat(tempSalinityData);
          const latitudeLongitude = oneDive.map((dive, i) => {
            return {
              x: v[this.longitudeIndex][i], // longitude
              y: v[this.latitudeIndex][i], // latitude
              value: dive.y, // depth
              speed: v[this.speedIndex][i], // speed
              file: name,
            };
          });
          latLonData = latLonData.concat(latitudeLongitude);
        });
      }
      this.gliderData = this.gliderData.concat(newData);
      this.gliderDepth = this.gliderDepth.concat(depthData);
      this.tempSalData = this.tempSalData.concat(tempSalData);
      this.latLonData = this.latLonData.concat(latLonData);
      const timezone = new Date(startTime).getTimezoneOffset();
      this.startDate = new Date(startTime + timezone * 60 * 1000);
      this.maxDepth = maxDepth;
      this.ncFileSelected = this.ncFiles.length - 1;
      this.numNCLoaded = this.ncFiles.length;
      this.loading = false;
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
      if (this.currentConfig !== this.config) {
        // reprocess spectrograms
        this.currentConfig = this.config;
      }

      // get audio file names
      this.spectrogramTimes = [];
      for (let i = 0; i < this.audioFiles.length; i++) {
        const fileData = {};
        const file = this.audioFiles[i];
        if (this.csvFiles.length > 0) {
          fileData.startTime = unixToTime(this.csvFiles[i]).startTime;
          fileData.startDate = unixToTime(this.csvFiles[i]).startDate;
        } else {
          const times = getStartTimeFromFilename(file.name);
          fileData.startTime = times.startTime;
          fileData.startDate = times.startDate;
        }
        this.spectrogramTimes.push(fileData);
      }

      let data = {};
      const loadFileNum = this.fileSelected < 0 ? 0 : this.fileSelected;
      // Documentation: https://zellwk.com/blog/async-await-in-loops/
      // wait for async function
      const file = this.audioFiles[loadFileNum];
      await loadAudioData(file, this.currentConfig).then((v) => {
        data = v;
      });
      // }
      this.spectrogramFile = file.name;
      data.startTime = this.spectrogramTimes[loadFileNum].startTime;
      data.startDate = this.spectrogramTimes[loadFileNum].startDate;
      this.currentTime = data.startTime;
      if (this.fileSelected !== loadFileNum) {
        this.fileSelected = loadFileNum;
        this.loadSelectedAudioFile();
      }
      this.spectrogramData = data;
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

.big-plot {
  height: 80vh;
}

.small-plot {
  height: 40vh;
}
#audio-holder {
  height: 54px;
}
.light-border {
  border-top: 1px solid #454545;
}

#audio {
  width: 98vw;
}

.bathy-window {
  overflow-x: hidden;
}
</style>

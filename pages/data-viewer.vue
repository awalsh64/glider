<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card>
        <div style="height: 40vh">
          <trajectory
            :points="gliderDepth"
            :start-date="startDate"
            @date="selectedDate = $event"
          />
        </div>
        <div style="height: 50vh">
          <heatmap :selected-time="selectedTime" :index="index" />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
// TODO:create dashboard for 2 plots
// turn off animation
import Trajectory from '@/components/chartxy.vue';
import Heatmap from '@/components/heatmap.vue';
export default {
  name: 'DataViewer',
  components: {
    Trajectory,
    Heatmap,
  },
  data: () => {
    return {
      selectedDate: null,
      selectedTime: 1,
      index: 0,
      ctdTimeIndex: 0,
    };
  },
  computed: {
    gliderData() {
      return this.$store.state.gliderData;
    },
    startTime() {
      return this.gliderData[0][this.ctdTimeIndex][0];
    },
    startDate() {
      // offset time by timezone to GMT
      return new Date(
        this.startTime +
          new Date(this.startTime * 1000).getTimezoneOffset() * 60000
      );
    },
    gliderDepth() {
      if (this.gliderData.length < 1) return [];
      const ctdDepthIndex = 1;
      let depthData = [];
      for (let j = 0; j < this.gliderData.length; j++) {
        const time = this.gliderData[j][this.ctdTimeIndex];
        const newData = time.map((x, i) => {
          return {
            x: x - this.startTime, // time milliseconds
            y: this.gliderData[j][ctdDepthIndex][i], // depth
          };
        });
        depthData = depthData.concat(newData);
      }
      return depthData;
    },
  },
  watch: {
    selectedDate(v) {
      // find spectrogramData.startTime that starts closest to selectedTime
      const hours = v.getHours();
      const minutes = v.getMinutes();
      const secs = v.getSeconds();
      this.selectedTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
      const index = this.$store.state.spectrogramData.findIndex((data) => {
        // selected time < spectrogram start after current
        // -1 to get previous spectrogram
        return this.selectedTime < data.startTime;
      });
      if (index < 0) this.index = this.$store.state.spectrogramData.length - 1;
      else this.index = index - 1;
      console.log('index', this.index);
    },
  },
  methods: {
    getVariableIndex(data, name) {
      return data.findIndex((v) => {
        return v.name === name;
      });
    },
  },
};
</script>

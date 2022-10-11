<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card>
        <div id="app" style="height: 40vh">
          <trajectory :points="gliderDepth" @time="selectedTime = $event" />
        </div>
        <div id="app" style="height: 50vh">
          <heatmap :selected-time="selectedTime" :index="index" />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
// TODO:create dashboard for 2 plots
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
      selectedTime: 1,
      index: 0,
    };
  },
  computed: {
    gliderData() {
      return this.$store.state.gliderData;
    },
    gliderDepth() {
      if (this.gliderData.length < 1) return [];
      const ctdTimeIndex = 0;
      const ctdDepthIndex = 1;
      const startTime = this.gliderData[0][ctdTimeIndex][0];
      let depthData = [];
      for (let j = 0; j < this.gliderData.length; j++) {
        const time = this.gliderData[j][ctdTimeIndex];
        const newData = time.map((x, i) => {
          return {
            x: x - startTime, // time
            y: this.gliderData[j][ctdDepthIndex][i], // depth
          };
        });
        depthData = depthData.concat(newData);
      }
      return depthData;
    },
  },
  watch: {
    selectedTime(v) {
      // find spectrogramData.startTime that starts closest to selectedTime
      const startTime = this.$store.state.gliderData[0][0][0];
      const index = this.$store.state.spectrogramData.findIndex((data) => {
        console.log('start ', data.startTime);
        console.log('selected ', v);
        // selected time < spectrogram start after current
        // -1 to get previous spectrogram
        return v < data.startTime - startTime;
      });
      if (index < 0) this.index = this.$store.state.spectrogramData.length - 1;
      else this.index = index - 1;
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

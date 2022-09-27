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
    gliderDepth() {
      return new Array(1000).fill(1).map((_, i) => {
        return {
          x: i,
          y: Math.sin((0.001 * (i * 180)) / Math.PI) * 50 + 51,
        };
      });
    },
  },
};
</script>

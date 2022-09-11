<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card>
        <div id="app" style="height: 40vh">
          <trajectory :points="points" />
        </div>
        <div id="app" style="height: 50vh">
          <heatmap />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import Trajectory from '@/components/chartxy.vue';
import Heatmap from '@/components/heatmap.vue';
export default {
  name: 'Spectrogram',
  components: {
    Trajectory,
    Heatmap,
  },
  data: () => {
    return {};
  },
  computed: {
    points() {
      return new Array(1000).fill(1).map((v, i) => {
        return {
          x: i,
          y: Math.sin((0.001 * (i * 180)) / Math.PI) * 50 - 100,
        };
      });
    },
  },
};
</script>

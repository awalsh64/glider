<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card>
        <div id="app" style="height: 50vh">
          <heatmap />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import Heatmap from '@/components/heatmap.vue';
export default {
  name: 'Spectrogram',
  components: {
    Heatmap,
  },
  data: () => {
    return {};
  },
  mounted() {
    console.log('spect');
  },
};
</script>

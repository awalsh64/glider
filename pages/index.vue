<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card class="logo py-4 d-flex justify-center">
        <NuxtLogo />
        <VuetifyLogo />
      </v-card>
      <v-card>
        <v-card-title class="headline">
          Welcome to the Glider Data Viewer
        </v-card-title>
        <v-card-text>
          <p>
            Import NetCDF file to view glider path and import .wav file to view
            associated spectrogram.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" nuxt to="/import-files"> Import </v-btn>
        </v-card-actions>
      </v-card>
      <!-- <line-chart /> -->
      <spectrogram />
    </v-col>
  </v-row>
</template>

<script>
import LineChart from './line-chart.vue'
import Spectrogram from './spectrogram.vue'
export default {
  name: 'IndexPage',
  components: {
    LineChart,
    Spectrogram,
  },
  data: () => {
    return {}
  },
}
</script>

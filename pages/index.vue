<template>
  <v-row justify="center" align="center">
    <v-col cols="12" sm="8" md="6">
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
            Import NetCDF file to view glider path and import .wav file to view associated spectrogram.
          </p>
         </v-card-text>
         <v-card-actions>
          <v-spacer />
          <v-btn color="primary" nuxt to="/import-files"> Import </v-btn>
        </v-card-actions>
      </v-card>
      <v-card>
        <div id="app" style="height: 50vh">
          <chart-data :points="points"/>
         </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
  import ChartData from '@/components/chart.vue'
export default {
  name: 'IndexPage',
  components:{
    ChartData
  },
  data: () => {
    return {
      // Data points for the chart
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 7 },
        { x: 2, y: 3 },
        { x: 3, y: 10 },
        { x: 4, y:  12},
        { x: 5, y: 9 },
        { x: 6, y: 15 }
      ]
    }
    },
}
</script>

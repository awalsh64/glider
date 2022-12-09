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
          <h3>Questions:</h3>
          <p>What plot interactions are needed?</p>
          <p>What spectrogram manipulations are useful?</p>
          <p>Would it be helpful to view NetCDF file variables?</p>
          <p>
            Would a fast loading method be helpful that only computes
            spectrograms when trajectory is clicked?
          </p>
          <p>Where should lat lon be integrated?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" nuxt to="/import-files"> Import </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: 'IndexPage',
  components: {},
  data: () => {
    return {};
  },
};
</script>

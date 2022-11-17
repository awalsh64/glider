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
          <h3>Updates</h3>
          <p>Turbo Colormap</p>
          <p>Audio time scrolling line on spectrogram</p>
          <p>Drag and drop files</p>
          <p>GMT</p>
          <p>Temperature and Salinity profile</p>
          <p>Sound Speed colormap on depth plot-Mackenzie</p>
          <p>Spectrogram processing input parameters</p>
          <p>
            Changed depth to ctd_depth because depth was giving wrong sound
            speed
          </p>
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

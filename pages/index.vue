<template>
  <v-card class="mt-4">
    <v-row justify="center" align="center">
      <v-col>
        <v-row justify="space-around" class="mt-4">
          <v-icon x-large>mdi-submarine</v-icon>
        </v-row>
        <v-row class="mt-6" justify="space-around">
          <div class="headline">Welcome to the Glider Data Viewer</div>
        </v-row>
        <v-row justify="space-around" class="mt-6">
          <v-col cols="8">
            Import NetCDF and passive acoustic audio files to view the glider's
            measured trajectory, environmental variables, and associated
            spectrograms. Click Import to begin.
          </v-col>
        </v-row>
        <v-row class="mt-8 mb-8" justify="space-around">
          <v-btn color="primary" nuxt to="/import-files"> Import </v-btn>
        </v-row>
      </v-col>
    </v-row>
  </v-card>
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

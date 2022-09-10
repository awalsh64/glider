<template>
  <v-row justify="center" align="center">
    <v-col>
      <v-card>
        <div id="app" style="height: 50vh">
          <chart-data :points="points" />
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import ChartData from '@/components/chart.vue'
export default {
  name: 'LineChart',
  components: {
    ChartData,
  },
  data: () => {
    return {
      // Data points for the chart
      points: [
        { x: 0, y: 0, z: 4 },
        { x: 1, y: 7, z: 12 },
        { x: 2, y: 3, z: 6 },
        { x: 3, y: 10, z: 3 },
        { x: 4, y: 12, z: 10 },
        { x: 5, y: 9, z: 7 },
        { x: 6, y: 15, z: 6 },
      ],
    }
  },
}
</script>

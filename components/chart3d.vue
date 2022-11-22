<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
import { lightningChart } from '@arction/lcjs';
export default {
  name: 'ChartData',
  props: {
    points: {
      required: true,
      type: Array,
    },
  },
  data() {
    // Add the chart to the data in a way that Vue will not attach it's observers to it.
    // If the chart variable would be added in the return object, Vue would attach the observers and
    // every time LightningChart JS made a change to any of it's internal variables, vue would try to observe the change and update.
    // Observing would slow down the chart a lot .
    this.chart = null;
    return {
      chartId: null,
    };
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
  },
  mounted() {
    // Chart can only be created when the component has mounted the DOM because
    // the chart needs the element with specified containerId to exist in the DOM
    this.create3DChart();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
    this.chart = undefined;
    this.chart3D.dispose();
    this.chart3D = undefined;
  },
  methods: {
    createChart() {
      // Create chartXY
      this.chart = lightningChart()
        .ChartXY({ container: `${this.chartId}` })
        // Set chart title
        .setTitle('Getting Started')
        .setMouseInteractionWheelZoom(false);

      // Add line series to the chart
      const lineSeries = this.chart.addLineSeries();
      // Set stroke style of the line
      lineSeries.setStrokeStyle((style) => style.setThickness(5));
      // Add data points to the line series
      lineSeries.add(this.points);
    },

    create3DChart() {
      this.chart3D = lightningChart()
        .Chart3D({ container: `${this.chartId}` })
        .setCameraLocation({ x: 0, y: 0, z: 5 });

      // get x (time) location of mouse
      this.series = this.chart3D.addLineSeries();
      // Multiple points at once.
      this.series.add(this.points);
    },
  },
};
</script>
<style scoped>
.fill {
  height: 100%;
}
</style>

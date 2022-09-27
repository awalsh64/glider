<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
import {
  lightningChart,
  SolidFill,
  ColorHEX,
  translatePoint,
} from '@arction/lcjs';

export default {
  name: 'TrajectoryChart',
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
      selectedTime: 1,
    };
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
  },

  mounted() {
    // Chart can only be created when the component has mounted the DOM because
    // the chart needs the element with specified containerId to exist in the DOM
    this.createChart();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
  },
  methods: {
    createChart() {
      // Create chartXY
      // documentation: https://lightningchart.com/lightningchart-js-api-documentation/v3.1.0/classes/dashboard.html#createchartxy
      this.chart = lightningChart()
        .ChartXY({ container: `${this.chartId}` })
        // Set chart title
        .setTitle('Glider Trajectory')
        .setMouseInteractionWheelZoom(false);

      // set axes titles
      this.chart.getDefaultAxisX().setTitle('Time (s)');
      this.chart.getDefaultAxisY().setTitle('Depth (ft)');

      // Add line series to the chart for glider trajectory
      this.lineSeries = this.chart
        .addLineSeries()
        .setCursorResultTableFormatter((builder, series, x, y) =>
          builder
            .addRow('Time:', '', series.axisX.formatValue(x) + ' s')
            .addRow('Depth:', '', series.axisY.formatValue(y) + ' ft')
        )
        // Set stroke style of the line
        .setStrokeStyle((style) => style.setThickness(5))
        // Add data points to the line series
        .add(this.points);

      // Add line for time selection
      this.timeSelectedLine = this.setSelectedTime();

      this.chart.onSeriesBackgroundMouseClick((_, event) => {
        // TODO: Disable click when zooming(mousedrag)
        // Translate mouse location to Axis coordinate system.
        const curLocationAxis = translatePoint(
          this.chart.engine.clientLocation2Engine(event.clientX, event.clientY),
          this.chart.engine.scale,
          this.lineSeries.scale
        );
        this.selectedTime = curLocationAxis.x;
        this.timeSelectedLine.dispose();
        this.timeSelectedLine = this.setSelectedTime();
        this.$emit('time', this.selectedTime);
      });
    },
    setSelectedTime() {
      return this.chart
        .addLineSeries()
        .setStrokeStyle((style) =>
          style
            .setThickness(3)
            .setFillStyle(new SolidFill({ color: ColorHEX('#F00') }))
        )
        .add([
          { x: this.selectedTime, y: 0 },
          { x: this.selectedTime, y: 100 },
        ]);
    },
  },
};
</script>
<style scoped>
.fill {
  height: 100%;
}
</style>

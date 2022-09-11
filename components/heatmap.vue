<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
// Extract required parts from LightningChartJS.
import {
  lightningChart,
  PalettedFill,
  LUT,
  ColorRGBA,
  emptyLine,
  Themes,
  LegendBoxBuilders,
} from '@arction/lcjs';

export default {
  data() {
    // Add the chart to the data in a way that Vue will not attach it's observers to it.
    // If the chart variable would be added in the return object, Vue would attach the observers and
    // every time LightningChart JS made a change to any of it's internal variables, vue would try to observe the change and update.
    // Observing would slow down the chart a lot .
    this.chart = null;
    return {
      chartId: null,
      resolution: {
        x: 1000,
        y: 1000,
      },
    };
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
  },
  methods: {
    createChart() {
      // Create chartXY
      this.chart = lightningChart()
        .ChartXY({ container: `${this.chartId}`, theme: Themes.lightNew })
        .setTitle('Spectrogram')
        .setMouseInteractionWheelZoom(false)
        .setPadding({ right: 40 });

      //set axes titles
      this.chart.getDefaultAxisX().setTitle('Time (s)');
      this.chart.getDefaultAxisY().setTitle('Frequency (Hz)');
      // Create LUT and FillStyle
      const palette = new LUT({
        units: 'dB',
        steps: [
          { value: 0, color: ColorRGBA(255, 255, 0) },
          { value: 10, color: ColorRGBA(255, 0, 0) },
        ],
        interpolate: true,
      });

      // Generate heatmap data.
      const data = new Array(this.resolution.x).fill(1).map(() => {
        return new Array(this.resolution.y).fill(1).map(() => {
          return Math.random() * 10;
        });
      });

      // Add a Heatmap to the Chart.
      this.chart
        .addHeatmapGridSeries({
          columns: this.resolution.x,
          rows: this.resolution.y,
          start: { x: 0, y: 0 },
          end: { x: this.resolution.x, y: this.resolution.y },
          dataOrder: 'rows',
          heatmapDataType: 'intensity',
        })
        // Color Heatmap using previously created color look up table.
        .setFillStyle(new PalettedFill({ lut: palette }))
        .setWireframeStyle(emptyLine)
        // Use look up table (LUT) to get heatmap intensity value coloring
        .invalidateIntensityValues(data)
        .setMouseInteractions(false)
        .setCursorResultTableFormatter((builder, series, dataPoint) =>
          builder
            .addRow('Acoustic Data')
            .addRow('Time:', '', series.axisX.formatValue(dataPoint.x) + ' s')
            .addRow(
              'Frequency:',
              '',
              series.axisY.formatValue(dataPoint.y) + ' Hz'
            )
            .addRow('Amplitude:', '', dataPoint.intensity.toFixed(1) + ' dB')
        );

      // Add LegendBox.
      this.chart
        .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
        // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
        .setAutoDispose({
          type: 'max-width',
          maxWidth: 0.8,
        })
        .add(this.chart);
    },
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
};
</script>
<style scoped>
.fill {
  height: 100%;
}
</style>

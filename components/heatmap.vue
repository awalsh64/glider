<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
// TODO: axis.addBand for current song playing location
// Extract required parts from LightningChartJS.
import {
  lightningChart,
  PalettedFill,
  LUT,
  ColorHSV,
  SolidFill,
  ColorHEX,
  emptyLine,
  Themes,
  LegendBoxBuilders,
} from '@arction/lcjs';

export default {
  name: 'HeatmapChart',
  props: {
    selectedTime: {
      type: Number,
      default: 1,
    },
    index: {
      type: Number,
      default: 0,
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
      resolution: {
        x: 2000,
        y: 100,
      },
      legend: false,
      dataSeries: undefined,
    };
  },
  computed: {
    numSpectrograms() {
      return this.$store.getters.getNumSpectrograms;
    },
    spectrogramData() {
      if (this.numSpectrograms === 0) return []; // init as blank chart
      return this.$store.getters.getSpectrogramData(this.index).spectrogramData;
    },
    xMax() {
      if (this.numSpectrograms === 0) return 100; // init as blank chart
      return this.$store.getters.getSpectrogramData(this.index).duration;
    },
    yMax() {
      if (this.numSpectrograms === 0) return 100; // init as blank chart
      return this.$store.getters.getSpectrogramData(this.index).maxFreq;
    },
    palette() {
      // slow
      console.log('LUT');
      // Jet Colormap Documentation: http://www.gnuplotting.org/matlab-colorbar-with-gnuplot/
      return new LUT({
        units: 'dB',
        steps: [
          {
            value: 0,
            color: ColorHEX('#000090'),
            label: `${Math.round(this.intensityDataToDb(255 * (0 / 8)))}`,
          },
          {
            value: 255 * (1 / 8),
            color: ColorHEX('#000fff'),
            label: `${Math.round(this.intensityDataToDb(255 * (1 / 8)))}`,
          },
          {
            value: 255 * (2 / 8),
            color: ColorHEX('#0090ff'),
            label: `${Math.round(this.intensityDataToDb(255 * (2 / 8)))}`,
          },
          {
            value: 255 * (3 / 8),
            color: ColorHEX('#0fffee'),
            label: `${Math.round(this.intensityDataToDb(255 * (3 / 8)))}`,
          },
          {
            value: 255 * (4 / 8),
            color: ColorHEX('#90ff70'),
            label: `${Math.round(this.intensityDataToDb(255 * (4 / 8)))}`,
          },
          {
            value: 255 * (5 / 8),
            color: ColorHEX('#ffee00'),
            label: `${Math.round(this.intensityDataToDb(255 * (5 / 8)))}`,
          },
          {
            value: 255 * (6 / 8),
            color: ColorHEX('#ff7000'),
            label: `${Math.round(this.intensityDataToDb(255 * (6 / 8)))}`,
          },
          {
            value: 255 * (7 / 8),
            color: ColorHEX('#ee0000'),
            label: `${Math.round(this.intensityDataToDb(255 * (7 / 8)))}`,
          },
          {
            value: 255,
            color: ColorHEX('#7f0000'),
            label: `${Math.round(this.intensityDataToDb(255))}`,
          },
        ],
        interpolate: true,
      });
    },
  },
  watch: {
    // selectedTime() {
    // this.selectedTimeLine.dispose();
    // this.selectedTimeLine = this.setSelectedTime();
    // },
    index() {
      if (this.numSpectrograms < this.index + 1 || this.index < 0) return;
      this.createChart();
      this.addDataToChart();
    },
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
  },
  mounted() {
    // Chart can only be created when the component has mounted the DOM because
    // the chart needs the element with specified containerId to exist in the DOM
    this.createChart();
    if (this.numSpectrograms > this.index) {
      this.addDataToChart();
    }
    // this.selectedTimeLine = this.setSelectedTime();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
  },
  methods: {
    // Define function that maps Uint8 [0, 255] to Decibels.
    intensityDataToDb(intensity) {
      return (
        this.$store.state.minDecibels +
        (intensity / 255) *
          (this.$store.state.maxDecibels - this.$store.state.minDecibels)
      );
    },
    createChart() {
      if (this.chart) this.chart.dispose();
      console.log('create chart');
      // Create chartXY
      // documentation: https://lightningchart.com/lightningchart-js-api-documentation/v3.1.0/classes/chartxy.html
      this.chart = lightningChart()
        .ChartXY({
          container: `${this.chartId}`,
          theme: Themes.darkGold,
        })
        .setTitle('Spectrogram')
        .setMouseInteractionWheelZoom(false);

      // set axes titles
      this.chart.getDefaultAxisX().setTitle('Time (s)');
      this.chart.getDefaultAxisY().setTitle('Frequency (Hz)');
    },
    addDataToChart() {
      const ylen = this.spectrogramData.length;
      if (ylen === 0) return;
      const xlen = this.spectrogramData[0].length;
      // Add a Heatmap to the Chart.
      console.log('add data');
      this.dataSeries = this.chart
        .addHeatmapGridSeries({
          columns: xlen,
          rows: ylen,
          start: { x: 0, y: 0 },
          end: {
            x: this.xMax,
            y: this.yMax,
          },
          dataOrder: 'rows',
          heatmapDataType: 'intensity',
        })
        // Color Heatmap using previously created color look up table.
        .setFillStyle(new PalettedFill({ lut: this.palette }))
        .setWireframeStyle(emptyLine)
        // Use look up table (LUT) to get heatmap intensity value coloring
        .invalidateIntensityValues(this.spectrogramData)
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
            .addRow(
              'Amplitude:',
              '',
              this.intensityDataToDb(dataPoint.intensity).toFixed(1) + ' dB'
            )
        );

      // Add LegendBox
      if (this.legend) this.legend.dispose();
      this.legend = this.chart
        .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
        // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
        .setAutoDispose({
          type: 'max-width',
          maxWidth: 0.8,
        })
        .add(this.dataSeries);
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
          { x: this.selectedTime, y: this.xMax },
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

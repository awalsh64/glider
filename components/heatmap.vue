<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
import {
  lightningChart,
  PalettedFill,
  LUT,
  emptyLine,
  emptyFill,
  translatePoint,
  Themes,
  LegendBoxBuilders,
  AxisTickStrategies,
  SolidFill,
  SolidLine,
  ColorHEX,
  UIOrigins,
  UIDraggingModes,
  FontSettings,
} from '@arction/lcjs';

import getTurboSteps from '@/components/turbo.js';

export default {
  name: 'HeatmapChart',
  props: {
    currentTime: {
      type: Number,
      default: NaN,
    },
    selectedTime: {
      type: Number,
      default: 1,
    },
    spectrogram: {
      type: Object,
      default: () => {
        return {};
      },
    },
    minDecibel: {
      type: Number,
      default: -160,
    },
    maxDecibel: {
      type: Number,
      default: -60,
    },
    file: {
      type: String,
      default: '',
    },
  },
  data() {
    // Add the chart to the data in a way that Vue will not attach it's observers to it.
    // If the chart variable would be added in the return object, Vue would attach the observers and
    // every time LightningChart JS made a change to any of it's internal variables, vue would try to observe the change and update.
    // Observing would slow down the chart a lot.
    // https://github.com/Arction/lcjs-vue-template
    this.chart = null;
    return {
      chartId: null,
      resolution: {
        x: 2000,
        y: 100,
      },
      legend: false,
      dataSeries: undefined,
      xAxis: null,
      currentTimeLine: null,
      turbo: {},
      fileTitle: undefined,
    };
  },
  computed: {
    startTime() {
      return this.spectrogram.startTime;
    },
  },
  watch: {
    spectrogram() {
      this.addDataToChart();
      this.currentTimeLine.setValue(this.currentTime);
      this.createColormap();
      this.createLegend();
    },
    selectedTime() {
      this.selectedTimeLine.setValue(this.selectedTime);
    },
    currentTime() {
      this.currentTimeLine.setValue(this.currentTime);
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
    this.createColormap();
    this.addDataToChart();
    this.setCurrentTime();
    this.setSelectedTime();
    this.createLegend();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
    this.chart = undefined;
  },
  methods: {
    // Define function that maps Uint8 [0, 255] to Decibels.
    //
    intensityDataToDb(intensity) {
      const dataMinDecibel = this.minDecibel;
      const dataMaxDecibel = this.maxDecibel;
      const minDecibels = dataMinDecibel; // + gliderMaxSPL;
      const maxDecibels = dataMaxDecibel; // + gliderMaxSPL;
      return minDecibels + (intensity / 255) * (maxDecibels - minDecibels);
    },
    createChart() {
      if (this.chart) {
        this.chart.dispose();
        this.chart = undefined;
      }
      // Create chartXY
      // documentation: https://lightningchart.com/lightningchart-js-api-documentation/v3.1.0/classes/chartxy.html
      this.chart = lightningChart()
        .ChartXY({
          container: `${this.chartId}`,
          theme: Themes.darkGold,
        })
        .setTitle('')
        .setPadding({ top: 65 })
        .setMouseInteractionWheelZoom(false);

      this.chart
        .addUIElement(undefined, this.chart.uiScale)
        .setPosition({ x: 8, y: 90 })
        .setOrigin(UIOrigins.LeftCenter)
        .setText('Spectrogram')
        .setTextFont(
          new FontSettings({
            size: 20,
            weight: 200,
          })
        )
        .setDraggingMode(UIDraggingModes.notDraggable)
        .setBackground((bg) =>
          bg.setFillStyle(emptyFill).setStrokeStyle(emptyLine)
        );

      // set axes titles
      this.xAxis = this.chart
        .getDefaultAxisX()
        .setTitle('Time (hh:mm:ss)')
        .setTickStrategy(AxisTickStrategies.Time) // expects time in milliseconds
        .setAnimationScroll(undefined);
      this.chart
        .getDefaultAxisY()
        .setAnimationScroll(undefined)
        .setTitle('Frequency (Hz)');
    },
    addDataToChart() {
      let ylen = 2;
      let xlen = 2;
      let start = {
        x: 0,
        y: 0,
      };
      let end = {
        x: 2,
        y: 2,
      };
      if (this.spectrogram.spectrogramData) {
        ylen = this.spectrogram.spectrogramData.length;
        start = { x: this.spectrogram.startTime, y: 0 };
        if (this.spectrogram.spectrogramData.length !== 0) {
          xlen = this.spectrogram.spectrogramData[0].length;
          end = {
            x: this.spectrogram.startTime + this.spectrogram.duration * 1000, // convert seconds to milliseconds to match AxisTickStrategies.Time
            y: this.spectrogram.maxFreq,
          };
        }
      }
      // Add a Heatmap to the Chart.
      if (this.dataSeries) {
        this.dataSeries.dispose();
        this.dataSeries = undefined;
      }
      this.dataSeries = this.chart
        .addHeatmapGridSeries({
          columns: ylen,
          rows: xlen,
          start,
          end,
          dataOrder: 'columns',
          heatmapDataType: 'intensity',
        })
        .setName('Power/Frequency(dB/Hz)')
        // Color Heatmap using previously created color look up table.
        .setFillStyle(new PalettedFill({ lut: this.turbo }))
        .setWireframeStyle(emptyLine)
        // Use look up table (LUT) to get heatmap intensity value coloring
        .setMouseInteractions(false);
      if (this.spectrogram.spectrogramData) {
        this.dataSeries
          .invalidateIntensityValues(this.spectrogram.spectrogramData)
          .setCursorResultTableFormatter((builder, series, dataPoint) =>
            builder
              .addRow('Acoustic Data')
              .addRow('Time:', '', series.axisX.formatValue(dataPoint.x))
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
      }
      this.chart.getDefaultAxisX().fit();
      this.chart.getDefaultAxisY().fit();
      if (this.fileTitle) this.fileTitle.dispose();
      this.fileTitle = this.chart
        .addUIElement(undefined, this.chart.uiScale)
        .setPosition({ x: 8, y: 80 })
        .setOrigin(UIOrigins.LeftCenter)
        .setText('File: ' + this.file)
        .setDraggingMode(UIDraggingModes.notDraggable);

      // setup click listener
      const startTime = this.spectrogram.startTime;
      this.chart.offSeriesBackgroundMouseUp();
      this.chart.onSeriesBackgroundMouseUp((_, event) => {
        // Translate mouse location to Axis coordinate system.
        const curLocationAxis = translatePoint(
          this.chart.engine.clientLocation2Engine(event.clientX, event.clientY),
          this.chart.engine.scale,
          this.dataSeries.scale
        );
        this.$emit('update:selected-time', curLocationAxis.x - startTime);
      });
    },
    setSelectedTime() {
      // Add a Constantline to the X Axis
      if (this.selectedTimeLine) {
        this.selectedTimeLine.dispose();
        this.selectedTimeLine = undefined;
      }
      this.selectedTimeLine = this.xAxis.addConstantLine();
      // Position the Constantline in the Axis Scale
      this.selectedTimeLine.setValue(this.selectedTime);
      // The name of the Constantline will be shown in the LegendBox
      this.selectedTimeLine
        .setName('Selected Time')
        .setStrokeStyle(
          new SolidLine({
            thickness: 2,
            fillStyle: new SolidFill({
              color: ColorHEX('#FF00FF'), // magenta
            }),
          })
        )
        .setMouseInteractions(false);
    },
    setCurrentTime() {
      // Add a Constantline to the X Axis
      if (this.currentTimeLine) {
        this.currentTimeLine.dispose();
        this.currentTimeLine = undefined;
      }
      this.currentTimeLine = this.xAxis.addConstantLine();
      // Position the Constantline in the Axis Scale
      this.currentTimeLine.setValue(this.currentTime);
      // The name of the Constantline will be shown in the LegendBox
      this.currentTimeLine
        .setName('Audio Time')
        .setStrokeStyle(
          new SolidLine({
            thickness: 2,
            fillStyle: new SolidFill({
              color: ColorHEX('#000000'), // black
            }),
          })
        )
        .setMouseInteractions(false);
    },
    createColormap() {
      const steps = getTurboSteps(this.minDecibel, this.maxDecibel, 0, 255);
      this.turbo = new LUT({
        units: 'dB',
        steps,
        interpolate: false,
      });
    },
    createLegend() {
      // Add LegendBox
      if (this.legend) {
        this.legend.dispose();
        this.legend = undefined;
      }
      this.legend = this.chart
        .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
        // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
        .setAutoDispose({
          type: 'max-width',
          maxWidth: 0.8,
        });
      if (this.dataSeries) this.legend.add(this.dataSeries);
      if (this.currentTimeLine) this.legend.add(this.currentTimeLine);
      if (this.selectedTimeLine) this.legend.add(this.selectedTimeLine);
    },
  },
};
</script>
<style scoped>
.fill {
  height: 100%;
}
</style>

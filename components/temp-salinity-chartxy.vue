<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
import {
  lightningChart,
  SolidFill,
  ColorHEX,
  translatePoint,
  AxisTickStrategies,
  emptyLine,
  UIOrigins,
} from '@arction/lcjs';
import dateToHMS from './utils.js';

export default {
  name: 'TrajectoryChart',
  props: {
    points: {
      required: true,
      type: Array,
    },
    startDate: {
      required: true,
      type: Date,
    },
    spectrograms: {
      type: Array,
      default: () => {
        return [];
      },
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
      selectedTime: null,
    };
  },
  computed: {},
  watch: {
    points() {
      this.createChart();
    },
    spectrograms() {
      this.addTimeMarkers();
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
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
    this.chart = undefined;
  },
  methods: {
    createChart() {
      console.log('create trajectory plot');
      // Create chartXY
      // documentation: https://lightningchart.com/lightningchart-js-api-documentation/v3.1.0/classes/dashboard.html#createchartxy
      this.chart = lightningChart()
        .ChartXY({ container: `${this.chartId}` })
        // Set chart title
        .setTitle('Temperature and Salinity')
        .setMouseInteractionWheelZoom(false);

      // set axes titles
      const axisX = this.chart
        .getDefaultAxisX()
        .setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) =>
          tickStrategy.setDateOrigin(this.startDate)
        ); // expects time in milliseconds
      const axisY1 = this.chart
        .getDefaultAxisY()
        .setTitle('Temperature (°C)')
        .setInterval(1, -1);

      const yAxis2 = this.chart
        .addAxisY({
          opposite: true,
        })
        .setTitle('Salinity (ppt)')
        // Hide tick grid-lines from second Y axis.
        .setTickStrategy(AxisTickStrategies.Numeric, (ticks) =>
          ticks
            .setMinorTickStyle((minor) => minor.setGridStrokeStyle(emptyLine))
            .setMajorTickStyle((major) => major.setGridStrokeStyle(emptyLine))
        );

      // Add line series to the chart for glider trajectory
      this.lineSeries = this.chart
        .addLineSeries()
        .setCursorResultTableFormatter((builder, series, x, y) =>
          builder
            .addRow('Time:', '', series.axisX.formatValue(x) + ' s')
            .addRow('Temperature:', '', series.axisY.formatValue(y) + ' °C')
        )
        .setName('Temperature (°C)')
        // Set stroke style of the line
        .setStrokeStyle((style) => style.setThickness(3))
        // Add data points to the line series
        .add(this.points);

      this.chart
        .addLineSeries({
          yAxis: yAxis2,
          // Specify index for automatic color selection. By default this would be 1, but a larger number is supplied to increase contrast between series.
          automaticColorIndex: 2,
        })
        .setCursorResultTableFormatter((builder, series, x, y) =>
          builder
            .addRow('Time:', '', series.axisX.formatValue(x) + ' s')
            .addRow('Salinity:', '', series.axisY.formatValue(y) + ' ppt')
        )
        .setName('Salinity (ppt)')
        // Data set contains PPM measurement values only. First measurement is from year 1880, and each consecutive measurement is 1 year after previous.
        .add(
          this.points.map((v) => ({
            x: v.x,
            y: v.z,
          }))
        );

      // Add legend.
      const legend = this.chart
        .addLegendBox(undefined, { x: axisX, y: axisY1 })
        .add(this.chart)
        // Move to non-default location, top left of chart.
        .setOrigin(UIOrigins.LeftTop)
        .setMargin(4);
      const positionLegendOnAxes = () =>
        legend.setPosition({
          x: axisX.getInterval().start,
          y: axisY1.getInterval().end,
        });
      positionLegendOnAxes();
      axisX.onScaleChange(positionLegendOnAxes);
      axisY1.onScaleChange(positionLegendOnAxes);

      this.addTimeMarkers();

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
        const selectedDate = this.plotTimeToDate(this.selectedTime);
        if (this.timeSelectedLine) this.timeSelectedLine.dispose();
        this.timeSelectedLine = this.setSelectedTime();
        this.$emit('date', selectedDate);
      });
    },
    /**
     * Add marker for clicked location
     */
    setSelectedTime() {
      if (this.selectedTime === null) {
        return;
      }

      // TODO: y axis doesn't update until clicked
      const yMin = this.chart.getDefaultAxisY().getInterval().start;
      return this.chart
        .addLineSeries()
        .setStrokeStyle((style) =>
          style
            .setThickness(3)
            .setFillStyle(new SolidFill({ color: ColorHEX('#F00') }))
        )
        .add([
          { x: this.selectedTime, y: yMin },
          { x: this.selectedTime, y: 0 },
        ]);
    },
    /**
     * Add markers for spectrogram start time
     */
    addTimeMarkers() {
      console.log(this.spectrograms);
      for (let i = 0; i < this.spectrograms.length; i++) {
        const timeData = [];
        const x = this.spectrograms[i].startTime - dateToHMS(this.startDate);
        console.log(x);
        timeData.push({ x, y: 0 });
        timeData.push({ x, y: 100 }); // TODO:fix y max
        this.chart
          .addLineSeries()
          .setStrokeStyle(
            (style) =>
              style
                .setThickness(3)
                .setFillStyle(new SolidFill({ color: ColorHEX('#0000FF') })) // blue
          )
          .add(timeData);
      }
    },
    plotTimeToDate(plotTime) {
      return new Date(plotTime + this.startDate.getTime());
    },
  },
};
</script>
<style scoped>
.fill {
  height: 100%;
}
</style>

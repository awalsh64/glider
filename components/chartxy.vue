<template>
  <div
    :id="chartId"
    class="fill"
    :class="{ 'hide-trajectory': hideTrajectory, 'hide-temp': hideTemp }"
  ></div>
</template>

<script>
import {
  lightningChart,
  SolidFill,
  SolidLine,
  ColorHEX,
  translatePoint,
  AxisTickStrategies,
  emptyLine,
  UIOrigins,
  AutoCursorModes,
  synchronizeAxisIntervals,
  UILayoutBuilders,
  UIElementBuilders,
  PalettedFill,
  LUT,
  ColorRGBA,
} from '@arction/lcjs';
import getTurboSteps from '@/components/turbo.js';

export default {
  name: 'TrajectoryChart',
  props: {
    // array of {x:time (milliseconds since start of first file), y:depth, value:soundSpeed, file:filename}
    points: {
      required: true,
      type: Array,
    },
    // array of {x:time (milliseconds since start of first file),y:temperature,z:salinity,value:soundSpeed, file:filename}
    points2: {
      required: true,
      type: Array,
    },
    // time of first file in GMT to offset start of data time to correct date
    // startDate = new Date(startTime + timezone * 60 * 1000);
    // where startTime is the unix timestamp in milliseconds and timezone is the offset from GMT in minutes
    startDate: {
      required: true,
      type: Date,
    },
    // array of spectrogram start dates
    // startDate = new Date(startTime + timezone * 60 * 1000);
    // where startTime is the unix timestamp in milliseconds and timezone is the offset from GMT in minutes
    spectrogramTimes: {
      type: Array,
      default: () => {
        return [];
      },
    },
    currentTime: {
      type: Number,
      default: -1,
    },
    hideTemp: {
      type: Boolean,
      default: false,
    },
    hideTrajectory: {
      type: Boolean,
      default: false,
    },
    minSoundSpeed: {
      type: Number,
      default: 1420,
    },
    maxSoundSpeed: {
      type: Number,
      default: 1570,
    },
  },
  data() {
    // Add the chart to the data in a way that Vue will not attach it's observers to it.
    // If the chart variable would be added in the return object, Vue would attach the observers and
    // every time LightningChart JS made a change to any of it's internal variables, vue would try to observe the change and update.
    // Observing would slow down the chart a lot .
    this.chart = null;
    return {
      legend: undefined,
      chartId: null,
      selectedTime: null,
      spectroTimeMarker: [],
      lineSeries1: undefined,
      lineSeries2: undefined,
      xAxis: null,
      timeSelectedLine: null,
      timeSelectedLine2: null,
      drag: false,
      turbo: {},
    };
  },
  watch: {
    points() {
      this.createColormap();
      this.createChart();
      // add points to charts
      this.addLinesToCharts();
      // add line for spectrogram times
      this.addTimeMarkers();
      // add cursors
      if (this.lineSeries1) this.addCustomCursor();
      // add line for clicked time
      this.addSelectedTimeMarker();
      // add legend
      this.addLegend();
    },
    spectrogramTimes() {
      this.addTimeMarkers();
      this.addLegend();
    },
    currentTime() {
      const currentDate = this.currentTime - this.startDate.getTime();
      if (this.timeSelectedLine) this.timeSelectedLine.dispose();
      if (this.timeSelectedLine2) this.timeSelectedLine2.dispose();
      this.timeSelectedLine = this.setSelectedTime(this.chart, currentDate);
      this.timeSelectedLine2 = this.setSelectedTime(this.chart2, currentDate);
      this.addLegend();
    },
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
  },

  mounted() {
    this.createColormap();
    // Chart can only be created when the component has mounted the DOM because
    // the chart needs the element with specified containerId to exist in the DOM
    this.createChart();

    // add line for spectrogram times
    this.addTimeMarkers();

    // add points to charts
    this.addLinesToCharts();

    // add cursors
    if (this.lineSeries1) this.addCustomCursor();

    // add line for clicked time
    this.addSelectedTimeMarker();

    // add legend
    this.addLegend();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
    this.chart = undefined;
    this.chart2.dispose();
    this.chart2 = undefined;
    this.dashboard.dispose();
    this.dashboard = undefined;
  },
  methods: {
    createColormap() {
      const steps = getTurboSteps(
        this.minSoundSpeed,
        this.maxSoundSpeed,
        this.minSoundSpeed,
        this.maxSoundSpeed
      );
      this.turbo = new LUT({
        units: 'm/s',
        steps,
        interpolate: false,
      });
    },
    createChart() {
      if (this.chart) {
        this.chart.dispose();
        this.chart = undefined;
      }
      if (this.chart2) {
        this.chart2.dispose();
        this.chart2 = undefined;
      }
      if (this.dashboard) {
        this.dashboard.dispose();
        this.dashboard = undefined;
      }
      // Create chartXY
      // documentation: https://lightningchart.com/lightningchart-js-api-documentation/v3.1.0/classes/dashboard.html#createchartxy
      this.dashboard = lightningChart().Dashboard({
        container: `${this.chartId}`,
        numberOfRows: 2,
        numberOfColumns: 1,
      });

      this.chart = this.dashboard
        .createChartXY({
          columnIndex: 0,
          rowIndex: 0,
          columnSpan: 1,
          rowSpan: 1,
        })
        // Set chart title
        .setTitle('Glider Trajectory')
        .setMouseInteractionWheelZoom(false)
        .setPadding({ right: 100 });

      this.chart
        .getDefaultAxisX()
        .setAnimationScroll(undefined)
        .setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) =>
          tickStrategy.setDateOrigin(this.startDate)
        ); // expects time in milliseconds

      // setup axis
      this.chart
        .getDefaultAxisY()
        .setAnimationScroll(undefined)
        .setTitle('Depth (meters)')
        .setInterval(1, -1);

      // Disable default auto cursor.
      this.chart.setAutoCursorMode(AutoCursorModes.disabled);

      /// //// Temperature and Salinity Chart

      this.chart2 = this.dashboard
        .createChartXY({
          columnIndex: 0,
          rowIndex: 1,
          columnSpan: 1,
          rowSpan: 1,
        })
        // Set chart title
        .setTitle('Temperature and Salinity')
        .setMouseInteractionWheelZoom(false);

      this.chart2
        .getDefaultAxisX()
        .setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) =>
          tickStrategy.setDateOrigin(this.startDate)
        ); // expects time in milliseconds

      // setup axis
      this.tempAxis = this.chart2
        .getDefaultAxisY()
        .setTitle('Temperature (°C)')
        .setTitleFillStyle(new SolidFill({ color: ColorHEX('#ffff5b') }))
        .setAnimationScroll(undefined);
      this.salinityAxis = this.chart2
        .addAxisY({
          opposite: true,
          color: 'orange',
        })
        .setAnimationScroll(undefined)
        .setTitle('Salinity (PSU)')
        .setTitleFillStyle(new SolidFill({ color: ColorHEX('#ff9b5b') }))
        // Hide tick grid-lines from second Y axis.
        .setTickStrategy(AxisTickStrategies.Numeric, (ticks) =>
          ticks
            .setMinorTickStyle((minor) => minor.setGridStrokeStyle(emptyLine))
            .setMajorTickStyle((major) => major.setGridStrokeStyle(emptyLine))
        );

      // Disable default auto cursor.
      this.chart2.setAutoCursorMode(AutoCursorModes.disabled);
    },
    addLinesToCharts() {
      // Add line series to the chart for glider trajectory
      if (this.lineSeries1) {
        this.lineSeries1.dispose();
        this.lineSeries1 = undefined;
      }
      this.lineSeries1 = this.chart
        .addLineSeries({ individualLookupValuesEnabled: true })
        .setName('Sound Speed')
        // Set stroke style of the line
        .setStrokeStyle((style) => style.setThickness(5))
        // Colormap line color
        .setStrokeStyle((stroke) =>
          stroke.setFillStyle(
            new PalettedFill({ lookUpProperty: 'value', lut: this.turbo })
          )
        )
        // Add data points to the line series
        .add(this.points);

      // Add line series to the temp salinity chart for temperature
      if (this.lineSeries2) {
        this.lineSeries2.dispose();
        this.lineSeries2 = undefined;
      }
      this.lineSeries2 = this.chart2
        .addLineSeries()
        .setName('Temperature (°C)')
        // Set stroke style of the line
        .setStrokeStyle((style) => style.setThickness(3))
        // Add data points to the line series
        .add(this.points2);

      // Add line series to the chart for salinity
      if (this.lineSeries3) this.lineSeries3.dispose();
      this.lineSeries3 = this.chart2
        .addLineSeries({
          yAxis: this.salinityAxis,
          // Specify index for automatic color selection. By default this would be 1, but a larger number is supplied to increase contrast between series.
          automaticColorIndex: 2,
        })
        .setName('Salinity (PSU)')
        // Data set contains PPM measurement values only. First measurement is from year 1880, and each consecutive measurement is 1 year after previous.
        .add(
          this.points2.map((v) => ({
            x: v.x,
            y: v.z,
          }))
        );
    },
    /**
     * add lines to legend
     */
    addLegend() {
      if (this.legend) {
        this.legend.dispose();
        this.legend = undefined;
      }

      if (this.lineSeries1) {
        this.legend = this.chart.addLegendBox().setPosition({ x: 100, y: 50 });
        this.legend.add(this.lineSeries1);
      }
      if (this.spectroTimeMarker.length > 0) {
        this.legend.add(this.spectroTimeMarker[0]);
      }
    },
    setDrag() {
      this.drag = true;
    },
    clickPlot(plot, line, event) {
      if (this.drag) {
        this.drag = false;
      } else {
        // Translate mouse location to Axis coordinate system.
        const curLocationAxis = translatePoint(
          plot.engine.clientLocation2Engine(event.clientX, event.clientY),
          plot.engine.scale,
          line.scale
        );
        this.selectedTime = curLocationAxis.x;
        const selectedDate = this.plotTimeToDate(this.selectedTime);
        if (this.timeSelectedLine) this.timeSelectedLine.dispose();
        if (this.timeSelectedLine2) this.timeSelectedLine2.dispose();
        this.timeSelectedLine = this.setSelectedTime(
          this.chart,
          this.selectedTime
        );
        this.timeSelectedLine2 = this.setSelectedTime(
          this.chart2,
          this.selectedTime
        );
        this.addLegend();
        this.$emit('date', selectedDate);
      }
    },
    /**
     * Add marker for selected location (clicked on any plots)
     */
    setSelectedTime(chart, time) {
      if (this.selectedTime === null) {
        return;
      }
      return (
        chart
          .getDefaultAxisX()
          .addConstantLine()
          // Position the band in the Axis Scale
          .setValue(time)
          .setName('Selected Time')
          .setMouseInteractions(false)
          .setStrokeStyle(
            new SolidLine({
              thickness: 2,
              fillStyle: new SolidFill({
                color: ColorHEX('#FF00FF'), // magenta
              }),
            })
          )
      );
    },
    /**
     * Set up custom cursor synced between plots
     */
    addCustomCursor() {
      // sync cursors between plots

      this.charts = [this.chart, this.chart2];

      // Add progressive line series to each chart.
      const seriesList = [this.lineSeries1, this.lineSeries2, this.lineSeries3];

      // Code for synchronizing all X Axis intervals in stacked XY charts.
      const syncedAxes = this.charts.map((chart) => chart.getDefaultAxisX());
      synchronizeAxisIntervals(...syncedAxes);

      // Create UI elements for custom cursor.
      const resultTable = this.dashboard
        .addUIElement(UILayoutBuilders.Column, this.dashboard.engine.scale)
        .setMouseInteractions(false)
        .setOrigin(UIOrigins.LeftBottom)
        .setMargin(5)
        .setBackground((background) =>
          background
            // Style same as Theme result table.
            .setFillStyle(this.dashboard.getTheme().resultTableFillStyle)
            .setStrokeStyle(this.dashboard.getTheme().resultTableStrokeStyle)
        );

      const resultTableTextBuilder = UIElementBuilders.TextBox
        // Style same as Theme result table text.
        .addStyler((textBox) =>
          textBox.setTextFillStyle(
            this.dashboard.getTheme().resultTableTextFillStyle
          )
        );

      const rowX = resultTable
        .addElement(UILayoutBuilders.Row)
        .addElement(resultTableTextBuilder);

      const rowsY = seriesList.map(() => {
        return resultTable
          .addElement(UILayoutBuilders.Row)
          .addElement(resultTableTextBuilder);
      });

      const ssLabel = resultTable
        .addElement(UILayoutBuilders.Row)
        .addElement(resultTableTextBuilder);

      const filename = resultTable
        .addElement(UILayoutBuilders.Row)
        .addElement(resultTableTextBuilder);

      const tickX = this.charts[1]
        .getDefaultAxisX()
        .addCustomTick()
        .setAllocatesAxisSpace(false);

      const ticksX = [];
      this.charts.forEach((chart, i) => {
        if (i !== 1) {
          ticksX.push(
            chart
              .getDefaultAxisX()
              .addConstantLine()
              .setValue(0)
              .setMouseInteractions(false)
              // Style according to Theme custom tick grid stroke.
              .setStrokeStyle(chart.getTheme().customTickGridStrokeStyle)
          );
        }
      });

      const ticksY = [];
      ticksY[0] = this.charts[0]
        .getDefaultAxisY()
        .addCustomTick()
        .setAllocatesAxisSpace(false);
      ticksY[1] = this.charts[1]
        .getDefaultAxisY()
        .addCustomTick()
        .setAllocatesAxisSpace(false);
      ticksY[2] = this.salinityAxis
        .addCustomTick()
        .setAllocatesAxisSpace(false);

      const setCustomCursorVisible = (visible) => {
        if (!visible) {
          resultTable.dispose();
          tickX.dispose();
          ticksY.forEach((el) => el.dispose());
          ticksX.forEach((el) => el.dispose());
        } else {
          resultTable.restore();
          tickX.restore();
          ticksY.forEach((el) => el.restore());
          ticksX.forEach((el) => el.restore());
        }
      };
      // Hide custom cursor components initially.
      setCustomCursorVisible(false);

      // Implement custom cursor logic with events.
      this.charts.forEach((chart, i) => {
        const AxisX = chart.getDefaultAxisX();

        chart.onSeriesBackgroundMouseMove((_, event) => {
          // mouse location in web page
          const mouseLocationClient = {
            x: event.clientX,
            y: event.clientY,
          };
          // Translate mouse location to LCJS coordinate system for solving data points from series, and translating to Axes.
          const mouseLocationEngine = chart.engine.clientLocation2Engine(
            mouseLocationClient.x,
            mouseLocationClient.y
          );

          // Find the nearest data point to the mouse.
          const nearestDataPoints = seriesList.map((el) =>
            el.solveNearestFromScreen(mouseLocationEngine)
          );

          // Abort operation if any of solved data points is `undefined`.
          if (nearestDataPoints.includes(undefined)) {
            setCustomCursorVisible(false);
            return;
          }

          // location of nearest point of current chart
          const nearestPointLocation = nearestDataPoints[i].location;

          // Translate mouse location to dashboard scale.
          const mouseLocationAxis = translatePoint(
            nearestPointLocation,
            // Source coordinate system.
            seriesList[i].scale,
            // Target coordinate system.
            this.dashboard.engine.scale
          );

          // Set custom cursor location.
          resultTable.setPosition({
            x: mouseLocationAxis.x,
            y: mouseLocationEngine.y,
          });

          // Change origin of result table based on cursor location.
          if (nearestPointLocation.x > AxisX.getInterval().end / 1.5) {
            resultTable.setOrigin(UIOrigins.RightBottom);
          } else {
            resultTable.setOrigin(UIOrigins.LeftBottom);
          }

          // Format result table text.
          rowX.setText(
            `Time: ${this.chart2
              .getDefaultAxisX()
              .formatValue(nearestDataPoints[i].location.x)}`
          );
          const titles = ['Depth', 'Temp', 'Salinity'];
          const units = ['m', '°C', 'PSU'];
          rowsY.forEach((rowY, i) => {
            let chart = i;
            if (i > 1) chart = 1;
            rowY.setText(
              `${titles[i]}: ${this.charts[chart]
                .getDefaultAxisY()
                .formatValue(nearestDataPoints[i].location.y)} ${units[i]}`
            );
          });

          ssLabel.setText(
            `Sound Speed: ${this.charts[0]
              .getDefaultAxisY()
              .formatValue(nearestDataPoints[i].location.value)} m/s`
          );
          filename.setText(`File: ` + nearestDataPoints[i].location.file);

          // Position custom ticks.
          tickX.setValue(nearestDataPoints[i].location.x);
          ticksX.forEach((tick) => {
            tick.setValue(tickX.getValue());
          });
          ticksY.forEach((tick, i) => {
            tick.setValue(nearestDataPoints[i].location.y);
          });

          // Display cursor.
          setCustomCursorVisible(true);
        });

        // hide custom cursor and ticks if mouse leaves chart area
        chart.onSeriesBackgroundMouseLeave(() => {
          setCustomCursorVisible(false);
        });

        // hide custom cursor and ticks on Drag
        chart.onSeriesBackgroundMouseDragStart(() => {
          setCustomCursorVisible(false);
        });
      });
    },
    /**
     * Add markers for spectrogram start time
     */
    addTimeMarkers() {
      if (this.spectroTimeMarker) {
        for (let i = 0; i < this.spectroTimeMarker.length; i++) {
          // remove previously made lines
          this.spectroTimeMarker[i].dispose();
          this.spectroTimeMarker[i] = undefined;
        }
        this.spectroTimeMarker = [];
      }
      for (let i = 0; i < this.spectrogramTimes.length; i++) {
        const x = this.spectrogramTimes[i].startDate - this.startDate;
        // Add a transparent band to the X Axis
        this.spectroTimeMarker[i] = this.chart
          .getDefaultAxisX()
          .addConstantLine()
          // Position the band in the Axis Scale
          .setValue(x)
          .setName('Acoustic Time')
          .setMouseInteractions(false)
          .setStrokeStyle(
            new SolidLine({
              thickness: 2,
              fillStyle: new SolidFill({
                color: ColorRGBA(0, 255, 255, 150), // cyan
              }),
            })
          );

        // add bands to temp salinity chart
        this.spectroTimeMarker[i + this.spectrogramTimes.length] = this.chart2
          .getDefaultAxisX()
          .addConstantLine()
          .setValue(x)
          .setName('Acoustic Time')
          .setMouseInteractions(false)
          .setStrokeStyle(
            new SolidLine({
              thickness: 2,
              fillStyle: new SolidFill({
                color: ColorRGBA(0, 255, 255, 150), // cyan
              }),
            })
          );
      }
    },
    /**
     * Add line for clicked time selection
     */
    addSelectedTimeMarker() {
      const selectedDate = this.plotTimeToDate(this.selectedTime);
      this.timeSelectedLine = this.setSelectedTime(this.chart, selectedDate);
      this.timeSelectedLine2 = this.setSelectedTime(this.chart2, selectedDate);

      this.chart.onSeriesBackgroundMouseUp((_, event) => {
        this.clickPlot(this.chart, this.lineSeries1, event);
      });

      this.chart2.onSeriesBackgroundMouseUp((_, event) => {
        this.clickPlot(this.chart2, this.lineSeries2, event);
      });

      this.chart.onSeriesBackgroundMouseDrag(() => {
        this.setDrag();
      });
      this.chart2.onSeriesBackgroundMouseDrag(() => {
        this.setDrag();
      });
    },
    /**
     * Convert the time from the plot axis format to the date format used for emitting
     */
    plotTimeToDate(plotTime) {
      return new Date(plotTime + this.startDate.getTime());
    },
  },
};
</script>
<style scoped>
.fill {
  height: 80vh;
  position: absolute;
}
.hide-trajectory {
  top: -40vh;
}
.hide-temp {
  top: 0;
}
</style>

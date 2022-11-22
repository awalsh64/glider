<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
// TODO: add bars for start and end time of spectrograms https://lightningchart.com/lightningchart-js-interactive-examples/examples/lcjs-example-0701-bandsConstantlines.html
// TODO-DONE: Disable click when zooming(mousedrag) when no spectrogram (crashes)
// TODO-DONE: Dashboard for trajectory and temp/sal https://lightningchart.com/lightningchart-js-interactive-examples/edit/lcjs-example-0704-customCursorStackedY.html?theme=lightNew&page-theme=light
// add click to temp sal
// TODO-DONE: Disable click when zooming(mousedrag)

import {
  lightningChart,
  SolidFill,
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
} from '@arction/lcjs';
import dateToHMS from './utils.js';
import getTurboSteps from '@/components/turbo.js';

export default {
  name: 'TrajectoryChart',
  props: {
    points: {
      required: true,
      type: Array,
    },
    points2: {
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
      legend: undefined,
      chartId: null,
      selectedTime: null,
      timeMarkerLine: [],
      xAxis: null,
      timeSelectedLine: null,
      timeSelectedLine2: null,
      drag: false,
    };
  },
  computed: {
    turbo() {
      const steps = getTurboSteps(1420, 1570, 1420, 1570);
      return new LUT({
        units: 'm/s',
        steps,
        interpolate: false,
      });
    },
  },
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
    this.chart2.dispose();
    this.chart2 = undefined;
    this.dashboard.dispose();
    this.dashboard = undefined;
  },
  methods: {
    createChart() {
      console.log('create trajectory plot');
      if (this.legend) {
        this.legend.dispose();
        this.legend = undefined;
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

      // set axes titles
      this.chart
        .getDefaultAxisX()
        .setAnimationScroll(undefined)
        .setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) =>
          tickStrategy.setDateOrigin(this.startDate)
        ); // expects time in milliseconds
      this.chart
        .getDefaultAxisY()
        .setAnimationScroll(undefined)
        .setTitle('Depth (ft)')
        .setInterval(1, -1);

      // Disable default auto cursor.
      this.chart.setAutoCursorMode(AutoCursorModes.disabled);
      // Add line series to the chart for glider trajectory
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

      this.legend = this.chart
        .addLegendBox()
        .add(this.chart)
        .setPosition({ x: 100, y: 50 });

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

      // set axes titles
      this.chart2
        .getDefaultAxisX()
        .setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) =>
          tickStrategy.setDateOrigin(this.startDate)
        ); // expects time in milliseconds
      const tempAxis = this.chart2
        .getDefaultAxisY()
        .setTitle('Temperature (°C)')
        .setTitleFillStyle(new SolidFill({ color: ColorHEX('#ffff5b') }))
        .setAnimationScroll(undefined);
      const salinityAxis = this.chart2
        .addAxisY({
          opposite: true,
          color: 'orange', // TODO: make Salinity title match line color so you don't need a legend
        })
        .setAnimationScroll(undefined)
        .setTitle('Salinity (ppt)')
        .setTitleFillStyle(new SolidFill({ color: ColorHEX('#ff9b5b') }))
        // Hide tick grid-lines from second Y axis.
        .setTickStrategy(AxisTickStrategies.Numeric, (ticks) =>
          ticks
            .setMinorTickStyle((minor) => minor.setGridStrokeStyle(emptyLine))
            .setMajorTickStyle((major) => major.setGridStrokeStyle(emptyLine))
        );

      // Disable default auto cursor.
      this.chart2.setAutoCursorMode(AutoCursorModes.disabled);

      // Add line series to the chart for temperature
      this.lineSeries2 = this.chart2
        .addLineSeries()
        .setName('Temperature (°C)')
        // Set stroke style of the line
        .setStrokeStyle((style) => style.setThickness(3))
        // Add data points to the line series
        .add(this.points2);
      // Add line series to the chart for salinity
      this.lineSeries3 = this.chart2
        .addLineSeries({
          yAxis: salinityAxis,
          // Specify index for automatic color selection. By default this would be 1, but a larger number is supplied to increase contrast between series.
          automaticColorIndex: 2,
        })
        .setName('Salinity (ppt)')
        // Data set contains PPM measurement values only. First measurement is from year 1880, and each consecutive measurement is 1 year after previous.
        .add(
          this.points2.map((v) => ({
            x: v.x,
            y: v.z,
          }))
        );

      console.log('points added');

      /// //////////// sync plots

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
      ticksY[2] = salinityAxis.addCustomTick().setAllocatesAxisSpace(false);

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
          const units = ['feet', '°C', 'ppt'];
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

      /// /////////////////

      this.addTimeMarkers();

      // Add line for time selection
      this.timeSelectedLine = this.setSelectedTime(this.chart);
      this.timeSelectedLine2 = this.setSelectedTime(this.chart2);

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
        this.timeSelectedLine = this.setSelectedTime(this.chart);
        this.timeSelectedLine2 = this.setSelectedTime(this.chart2);
        this.$emit('date', selectedDate);
      }
    },
    /**
     * Add marker for clicked location
     */
    setSelectedTime(chart) {
      if (this.selectedTime === null) {
        return;
      }

      // TODO: y axis doesn't update until clicked
      const yMin = chart.getDefaultAxisY().getInterval().start;
      const yMax = chart.getDefaultAxisY().getInterval().end;
      return chart
        .addLineSeries()
        .setStrokeStyle((style) =>
          style
            .setThickness(3)
            .setFillStyle(new SolidFill({ color: ColorHEX('#F00') }))
        )
        .add([
          { x: this.selectedTime, y: yMin },
          { x: this.selectedTime, y: yMax },
        ]);
    },
    /**
     * Add markers for spectrogram start time
     */
    addTimeMarkers() {
      for (let i = 0; i < this.timeMarkerLine.length; i++) {
        // remove previously made lines
        this.timeMarkerLine[i].dispose();
        this.timeMarkerLine[i] = undefined;
      }
      for (let i = 0; i < this.spectrograms.length; i++) {
        const x = this.spectrograms[i].startTime - dateToHMS(this.startDate);
        // Add a Constantline to the X Axis
        this.timeMarkerLine[i] = this.chart.getDefaultAxisX().addConstantLine();
        // Position the Constantline in the Axis Scale
        this.timeMarkerLine[i].setValue(x);
        // The name of the Constantline will be shown in the LegendBox
        this.timeMarkerLine[i].setName('Start Time');

        // add lines to temp salinity chart
        this.timeMarkerLine[i + this.spectrograms.length] = this.chart2
          .getDefaultAxisX()
          .addConstantLine();
        this.timeMarkerLine[i + this.spectrograms.length].setValue(x);
        this.timeMarkerLine[i + this.spectrograms.length].setName('Start Time');
        // TODO: change color
        // turn off drag
        // legend?

        // const timeData = [];
        // timeData.push({ x, y: 0 });
        // timeData.push({ x, y: 100 }); // TODO:fix y max
        // this.chart
        //   .addLineSeries()
        //   .setStrokeStyle(
        //     (style) =>
        //       style
        //         .setThickness(3)
        //         .setFillStyle(new SolidFill({ color: ColorHEX('#0000FF') })) // blue
        //   )
        //   .add(timeData);
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

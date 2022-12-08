<template>
  <div class="fill">
    <div :id="chartId" class="inner-plot"></div>
    <div :id="mapId" class="inner-plot"></div>
  </div>
</template>

<script>
// TODO: zoom to full view when click button https://lightningchart.com/lightningchart-js-interactive-examples/examples/lcjs-example-1111-covidDrillDownDashboard.html?theme=lightNew&page-theme=light
// dispose data when new data loaded
// change bathy to heatmap?
import {
  lightningChart,
  PointShape,
  PalettedFill,
  LUT,
  MapTypes,
  transparentFill,
  Themes,
  UIElementBuilders,
  UIOrigins,
  ColorRGBA,
  SolidFill,
} from '@arction/lcjs';
import getTurboSteps from '@/components/turbo.js';

export default {
  name: 'GeoChart',
  props: {
    points: {
      type: Array,
      required: true,
    },
    bathyPoints: {
      type: Array,
      default: () => {
        return [];
      },
    },
    maxDepth: {
      type: Number,
      default: 1000,
    },
  },
  data() {
    // Add the chart to the data in a way that Vue will not attach it's observers to it.
    // If the chart variable would be added in the return object, Vue would attach the observers and
    // every time LightningChart JS made a change to any of it's internal variables, vue would try to observe the change and update.
    // Observing would slow down the chart a lot.
    // https://github.com/Arction/lcjs-vue-template
    this.chart = null;
    this.mapChart = null;
    return {
      chartId: null,
      mapId: null,
      legend: undefined,
      drag: false,
      latRange: { start: 0, end: 0 },
      lonRange: { start: 0, end: 0 },
      pointsSeries: undefined,
      bathyPointsSeries: undefined,
      turbo: {},
    };
  },
  watch: {
    points() {
      this.addPointsToCharts();
      this.zoomOutToMap();
    },
    bathyPoints() {
      this.addPointsToCharts();
      this.zoomOutToMap();
    },
  },
  beforeMount() {
    // Generate random ID to us as the containerId for the chart and the target div id
    this.chartId = Math.trunc(Math.random() * 1000000);
    this.mapId = this.chartId + 1; // ensure different id numbers
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
    this.mapChart.dispose();
    this.mapChart = undefined;
  },
  methods: {
    createTurbo() {
      const steps = getTurboSteps(0, this.maxDepth, 0, this.maxDepth);
      this.turbo = new LUT({
        units: 'meters',
        steps,
        interpolate: false,
      });
    },
    createChart() {
      console.log('create geo');

      // create map
      this.mapChart = lightningChart()
        .Map({
          theme: Themes.lightNature,
          type: MapTypes.World,
          container: `${this.mapId}`,
        })
        .setTitle('')
        .setPadding({
          top: 30,
          bottom: 30,
          right: 0,
          left: 40,
        });

      // Create chart with customized settings
      this.chart = lightningChart()
        .ChartXY({
          theme: Themes.darkGold,
          container: `${this.chartId}`,
        })
        // .setMouseInteractions(false)
        .setTitle('Geo Location')
        .setBackgroundFillStyle(transparentFill)
        .setSeriesBackgroundFillStyle(transparentFill)
        .setAnimationsEnabled(false)
        .setMouseInteractionWheelZoom(false);
      this.chart.engine.setBackgroundFillStyle(transparentFill);

      // Hide axes
      // this.chart
      //   .getDefaultAxes()
      //   .forEach((axis) =>
      //     axis
      //       .setTickStrategy(AxisTickStrategies.Empty)
      //       .setStrokeStyle(emptyLine)
      //   );

      // Synchronize ChartXY with MapChart view.
      this.mapChart.onViewChange((view) => {
        const { latitudeRange, longitudeRange } = view;
        this.latRange = latitudeRange;
        this.lonRange = longitudeRange;
        this.chart
          .getDefaultAxisX()
          .setInterval(longitudeRange.start, longitudeRange.end, false, true);
        this.chart
          .getDefaultAxisY()
          .setInterval(latitudeRange.start, latitudeRange.end, false, true);

        this.chart.setPadding(0);
      });

      this.chart.onSeriesBackgroundMouseClick(() => {
        this.zoomToFit();
      });

      this.chart.onSeriesBackgroundMouseDrag(() => {
        this.setDrag();
      });

      this.chart.onSeriesBackgroundMouseDoubleClick(() => {
        this.zoomOutToMap();
      });

      // Style Map div
      const divMap = document.getElementById(`${this.mapId}`);
      const divOverlay = document.getElementById(`${this.chartId}`);
      divMap.style.width = '100%';
      divMap.style.height = '100%';
      divMap.style.position = 'absolute';
      divMap.style.left = '0px';
      divMap.style.top = '0px';
      divMap.style.zIndex = '1';
      this.mapChart.engine.layout();

      // Style Chart div
      divOverlay.style.width = '100%';
      divOverlay.style.height = '100%';
      divOverlay.style.position = 'absolute';
      divOverlay.style.left = '0px';
      divOverlay.style.top = '0px';
      divOverlay.style.zIndex = '2';
      this.chart.engine.layout();

      // add instructional text
      this.chart
        .addUIElement(UIElementBuilders.TextBox)
        .setTextFont((font) => font.setSize(10))
        .setOrigin(UIOrigins.LeftBottom)
        .setPosition({ x: 8, y: 90 })
        .setText('Left click to zoom in to glider trajectory.');
      this.chart
        .addUIElement(UIElementBuilders.TextBox)
        .setTextFont((font) => font.setSize(10))
        .setOrigin(UIOrigins.LeftBottom)
        .setPosition({ x: 8, y: 80 })
        .setText('Double click to zoom out to map.');

      // add data line for points
      this.addPointsToCharts();
    },
    addPointsToCharts() {
      this.createTurbo();
      // add bathy
      if (this.bathyPoints.length > 0) {
        if (this.bathyPointsSeries) this.bathyPointsSeries.dispose();
        this.bathyPointsSeries = this.chart
          .addPointSeries({ pointShape: PointShape.Circle })
          .setPointSize(5)
          .setName('Bathy Depth')
          .setPointFillStyle(
            new PalettedFill({ lookUpProperty: 'value', lut: this.turbo })
          )
          .setIndividualPointValueEnabled(true);

        this.bathyPoints.forEach((v) => {
          this.bathyPointsSeries.add({
            x: v.x,
            y: v.y,
            value: v.value,
          });
        });

        this.bathyPointsSeries.setCursorResultTableFormatter(
          (builder, _, x, y, value) =>
            builder
              .addRow('Bathy Data')
              .addRow('latitude:', '', y.toFixed(4) + '  deg')
              .addRow('longitude:', '', x.toFixed(4) + ' deg')
              .addRow('depth:', '', value.value + ' m')
        );
      }
      // add line
      if (this.pointsSeries) {
        this.pointsSeries.dispose();
        this.pointsSeries = undefined;
      }
      this.pointsSeries = this.chart
        .addPointSeries({ pointShape: PointShape.Circle })
        .setPointSize(5)
        .setName('Glider Depth')
        .setPointFillStyle(
          new PalettedFill({ lookUpProperty: 'value', lut: this.turbo })
        )
        .setIndividualPointValueEnabled(true);

      this.points.forEach((v) => {
        this.pointsSeries.add({
          x: v.x,
          y: v.y,
          value: v.value,
          speed: v.speed,
        });
      });
      this.pointsSeries.setCursorResultTableFormatter(
        (builder, _, x, y, value) => {
          return builder
            .addRow('Glider Trajectory')
            .addRow('latitude:', '', y.toFixed(4) + '  deg')
            .addRow('longitude:', '', x.toFixed(4) + ' deg')
            .addRow('depth:', '', value.value.toFixed(2) + ' m')
            .addRow('speed:', '', value.speed.toFixed(2) + ' cm/s');
        }
      );

      // add legend
      if (this.legend) {
        this.legend.dispose();
        this.legend = undefined;
      }
      if (this.bathyPoints.length > 0 || this.points.length > 0) {
        this.legend = this.chart
          .addLegendBox()
          .add(this.chart)
          .setPosition({ x: 100, y: 50 });
      }
    },
    setDrag() {
      this.drag = true;
    },
    zoomToFit() {
      if (this.drag) {
        this.drag = false;
      } else {
        this.chart.engine.setBackgroundFillStyle(
          new SolidFill({ color: ColorRGBA(25, 25, 25) }) // background
        );
        this.chart.getDefaultAxisX().fit();
        this.chart.getDefaultAxisY().fit();
      }
    },
    zoomOutToMap() {
      this.chart
        .getDefaultAxisX()
        .setInterval(this.lonRange.start, this.lonRange.end, false, true);
      this.chart
        .getDefaultAxisY()
        .setInterval(this.latRange.start, this.latRange.end, false, true);
      this.chart.engine.setBackgroundFillStyle(transparentFill);
    },
  },
};
</script>
<style scoped>
.fill {
  height: 100%;
  position: relative;
}
.inner-plot {
  position: relative;
}
</style>

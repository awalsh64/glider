<template>
  <div class="fill">
    <div :id="chartId" class="inner-plot"></div>
    <div :id="mapId" class="inner-plot"></div>
  </div>
</template>

<script>
// TODO: zoom https://lightningchart.com/lightningchart-js-interactive-examples/examples/lcjs-example-1111-covidDrillDownDashboard.html?theme=lightNew&page-theme=light

import {
  lightningChart,
  AxisTickStrategies,
  ColorRGBA,
  PointShape,
  PalettedFill,
  LUT,
  emptyLine,
  MapTypes,
  transparentFill,
  Themes,
} from '@arction/lcjs';
import getTurboSteps from '@/components/turbo.js';

export default {
  name: 'GeoChart',
  props: {
    points: {
      type: Array,
      required: true,
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
      lut: new LUT({
        steps: [
          {
            value: 0,
            color: ColorRGBA(255, 0, 0, 0),
            label: '0%',
          },
          {
            value: 1,
            color: ColorRGBA(255, 0, 0),
            label: '0%',
          },
          {
            value: 20,
            color: ColorRGBA(150, 0, 0),
            label: '20%',
          },
          {
            value: 40,
            color: ColorRGBA(50, 0, 0, 80),
            label: '40%',
          },
          {
            value: 60,
            color: ColorRGBA(0, 0, 200, 45),
            label: '60%',
          },
          {
            value: 80,
            color: ColorRGBA(0, 200, 0, 50),
            label: '80%',
          },
          {
            value: 100,
            color: ColorRGBA(0, 255, 0, 40),
            label: '100%',
          },
        ],
      }),
    };
  },
  computed: {
    turbo() {
      const steps = getTurboSteps(0, 1000);
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
    this.mapChart.dispose();
  },
  methods: {
    createChart() {
      console.log('create geo');
      if (this.legend) {
        this.legend.dispose();
        this.legend = undefined;
      }
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
          bottom: 0,
          right: 0,
          left: 0,
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
        .setSeriesBackgroundFillStyle(transparentFill);
      this.chart.engine.setBackgroundFillStyle(transparentFill);

      const pointsSeries = this.chart
        .addPointSeries({ pointShape: PointShape.Circle })
        .setPointSize(5)
        .setPointFillStyle(
          new PalettedFill({ lookUpProperty: 'value', lut: this.turbo })
        )
        .setIndividualPointValueEnabled(true);

      this.points.forEach((v) => {
        pointsSeries.add({
          x: v.x,
          y: v.y,
          value: v.value,
        });
      });

      // Hide axes
      this.chart
        .getDefaultAxes()
        .forEach((axis) =>
          axis
            .setTickStrategy(AxisTickStrategies.Empty)
            .setStrokeStyle(emptyLine)
        );

      // Synchronize ChartXY with MapChart view.
      this.mapChart.onViewChange((view) => {
        const { latitudeRange, longitudeRange, margin } = view;

        this.chart
          .getDefaultAxisX()
          .setInterval(longitudeRange.start, longitudeRange.end, false, true);
        this.chart
          .getDefaultAxisY()
          .setInterval(latitudeRange.start, latitudeRange.end, false, true);

        this.chart.setPadding(0);
      });

      this.legend = this.chart
        .addLegendBox()
        .add(this.chart)
        .setPosition({ x: 100, y: 50 });

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

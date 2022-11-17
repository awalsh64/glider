<template>
  <div :id="chartId" class="fill"></div>
</template>

<script>
// TODO: axis.addBand for current song playing location
// Extract required parts from LightningChartJS.
// Add instruction for manipulating plots
// convert x axis from seconds to milliseconds for use with Time axis
// fix legend
// change x axis range on file load

// plot interactions:
// zoom in with left click drag left to right rectangle
// reset zoom with left click drag rectangle right to left
// zoom on axis selection
// scroll on axis
// adjust axis bounds at edge
// pan with right click
// move legend
// You can also remove an axis from the panning interaction by calling axis.setChartInteractionPanByDrag(false).
// time scrolling? https://lightningchart.com/lightningchart-js-interactive-examples/examples/lcjs-example-0013-timeTickStrategyScrolling.html
// key in axis bounds?

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
  AxisTickStrategies,
  ColorRGBA,
} from '@arction/lcjs';

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
    index: {
      type: Number,
      default: 0,
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
    };
  },
  computed: {
    turbo() {
      // Reference:https://gist.github.com/mikhailov-work/ee72ba4191942acecc03fe6da94fc73f
      const turboColormapData = [
        [0.18995, 0.07176, 0.23217],
        [0.19483, 0.08339, 0.26149],
        [0.19956, 0.09498, 0.29024],
        [0.20415, 0.10652, 0.31844],
        [0.2086, 0.11802, 0.34607],
        [0.21291, 0.12947, 0.37314],
        [0.21708, 0.14087, 0.39964],
        [0.22111, 0.15223, 0.42558],
        [0.225, 0.16354, 0.45096],
        [0.22875, 0.17481, 0.47578],
        [0.23236, 0.18603, 0.50004],
        [0.23582, 0.1972, 0.52373],
        [0.23915, 0.20833, 0.54686],
        [0.24234, 0.21941, 0.56942],
        [0.24539, 0.23044, 0.59142],
        [0.2483, 0.24143, 0.61286],
        [0.25107, 0.25237, 0.63374],
        [0.25369, 0.26327, 0.65406],
        [0.25618, 0.27412, 0.67381],
        [0.25853, 0.28492, 0.693],
        [0.26074, 0.29568, 0.71162],
        [0.2628, 0.30639, 0.72968],
        [0.26473, 0.31706, 0.74718],
        [0.26652, 0.32768, 0.76412],
        [0.26816, 0.33825, 0.7805],
        [0.26967, 0.34878, 0.79631],
        [0.27103, 0.35926, 0.81156],
        [0.27226, 0.3697, 0.82624],
        [0.27334, 0.38008, 0.84037],
        [0.27429, 0.39043, 0.85393],
        [0.27509, 0.40072, 0.86692],
        [0.27576, 0.41097, 0.87936],
        [0.27628, 0.42118, 0.89123],
        [0.27667, 0.43134, 0.90254],
        [0.27691, 0.44145, 0.91328],
        [0.27701, 0.45152, 0.92347],
        [0.27698, 0.46153, 0.93309],
        [0.2768, 0.47151, 0.94214],
        [0.27648, 0.48144, 0.95064],
        [0.27603, 0.49132, 0.95857],
        [0.27543, 0.50115, 0.96594],
        [0.27469, 0.51094, 0.97275],
        [0.27381, 0.52069, 0.97899],
        [0.27273, 0.5304, 0.98461],
        [0.27106, 0.54015, 0.9893],
        [0.26878, 0.54995, 0.99303],
        [0.26592, 0.55979, 0.99583],
        [0.26252, 0.56967, 0.99773],
        [0.25862, 0.57958, 0.99876],
        [0.25425, 0.5895, 0.99896],
        [0.24946, 0.59943, 0.99835],
        [0.24427, 0.60937, 0.99697],
        [0.23874, 0.61931, 0.99485],
        [0.23288, 0.62923, 0.99202],
        [0.22676, 0.63913, 0.98851],
        [0.22039, 0.64901, 0.98436],
        [0.21382, 0.65886, 0.97959],
        [0.20708, 0.66866, 0.97423],
        [0.20021, 0.67842, 0.96833],
        [0.19326, 0.68812, 0.9619],
        [0.18625, 0.69775, 0.95498],
        [0.17923, 0.70732, 0.94761],
        [0.17223, 0.7168, 0.93981],
        [0.16529, 0.7262, 0.93161],
        [0.15844, 0.73551, 0.92305],
        [0.15173, 0.74472, 0.91416],
        [0.14519, 0.75381, 0.90496],
        [0.13886, 0.76279, 0.8955],
        [0.13278, 0.77165, 0.8858],
        [0.12698, 0.78037, 0.8759],
        [0.12151, 0.78896, 0.86581],
        [0.11639, 0.7974, 0.85559],
        [0.11167, 0.80569, 0.84525],
        [0.10738, 0.81381, 0.83484],
        [0.10357, 0.82177, 0.82437],
        [0.10026, 0.82955, 0.81389],
        [0.0975, 0.83714, 0.80342],
        [0.09532, 0.84455, 0.79299],
        [0.09377, 0.85175, 0.78264],
        [0.09287, 0.85875, 0.7724],
        [0.09267, 0.86554, 0.7623],
        [0.0932, 0.87211, 0.75237],
        [0.09451, 0.87844, 0.74265],
        [0.09662, 0.88454, 0.73316],
        [0.09958, 0.8904, 0.72393],
        [0.10342, 0.896, 0.715],
        [0.10815, 0.90142, 0.70599],
        [0.11374, 0.90673, 0.69651],
        [0.12014, 0.91193, 0.6866],
        [0.12733, 0.91701, 0.67627],
        [0.13526, 0.92197, 0.66556],
        [0.14391, 0.9268, 0.65448],
        [0.15323, 0.93151, 0.64308],
        [0.16319, 0.93609, 0.63137],
        [0.17377, 0.94053, 0.61938],
        [0.18491, 0.94484, 0.60713],
        [0.19659, 0.94901, 0.59466],
        [0.20877, 0.95304, 0.58199],
        [0.22142, 0.95692, 0.56914],
        [0.23449, 0.96065, 0.55614],
        [0.24797, 0.96423, 0.54303],
        [0.2618, 0.96765, 0.52981],
        [0.27597, 0.97092, 0.51653],
        [0.29042, 0.97403, 0.50321],
        [0.30513, 0.97697, 0.48987],
        [0.32006, 0.97974, 0.47654],
        [0.33517, 0.98234, 0.46325],
        [0.35043, 0.98477, 0.45002],
        [0.36581, 0.98702, 0.43688],
        [0.38127, 0.98909, 0.42386],
        [0.39678, 0.99098, 0.41098],
        [0.41229, 0.99268, 0.39826],
        [0.42778, 0.99419, 0.38575],
        [0.44321, 0.99551, 0.37345],
        [0.45854, 0.99663, 0.3614],
        [0.47375, 0.99755, 0.34963],
        [0.48879, 0.99828, 0.33816],
        [0.50362, 0.99879, 0.32701],
        [0.51822, 0.9991, 0.31622],
        [0.53255, 0.99919, 0.30581],
        [0.54658, 0.99907, 0.29581],
        [0.56026, 0.99873, 0.28623],
        [0.57357, 0.99817, 0.27712],
        [0.58646, 0.99739, 0.26849],
        [0.59891, 0.99638, 0.26038],
        [0.61088, 0.99514, 0.2528],
        [0.62233, 0.99366, 0.24579],
        [0.63323, 0.99195, 0.23937],
        [0.64362, 0.98999, 0.23356],
        [0.65394, 0.98775, 0.22835],
        [0.66428, 0.98524, 0.2237],
        [0.67462, 0.98246, 0.2196],
        [0.68494, 0.97941, 0.21602],
        [0.69525, 0.9761, 0.21294],
        [0.70553, 0.97255, 0.21032],
        [0.71577, 0.96875, 0.20815],
        [0.72596, 0.9647, 0.2064],
        [0.7361, 0.96043, 0.20504],
        [0.74617, 0.95593, 0.20406],
        [0.75617, 0.95121, 0.20343],
        [0.76608, 0.94627, 0.20311],
        [0.77591, 0.94113, 0.2031],
        [0.78563, 0.93579, 0.20336],
        [0.79524, 0.93025, 0.20386],
        [0.80473, 0.92452, 0.20459],
        [0.8141, 0.91861, 0.20552],
        [0.82333, 0.91253, 0.20663],
        [0.83241, 0.90627, 0.20788],
        [0.84133, 0.89986, 0.20926],
        [0.8501, 0.89328, 0.21074],
        [0.85868, 0.88655, 0.2123],
        [0.86709, 0.87968, 0.21391],
        [0.8753, 0.87267, 0.21555],
        [0.88331, 0.86553, 0.21719],
        [0.89112, 0.85826, 0.2188],
        [0.8987, 0.85087, 0.22038],
        [0.90605, 0.84337, 0.22188],
        [0.91317, 0.83576, 0.22328],
        [0.92004, 0.82806, 0.22456],
        [0.92666, 0.82025, 0.2257],
        [0.93301, 0.81236, 0.22667],
        [0.93909, 0.80439, 0.22744],
        [0.94489, 0.79634, 0.228],
        [0.95039, 0.78823, 0.22831],
        [0.9556, 0.78005, 0.22836],
        [0.96049, 0.77181, 0.22811],
        [0.96507, 0.76352, 0.22754],
        [0.96931, 0.75519, 0.22663],
        [0.97323, 0.74682, 0.22536],
        [0.97679, 0.73842, 0.22369],
        [0.98, 0.73, 0.22161],
        [0.98289, 0.7214, 0.21918],
        [0.98549, 0.7125, 0.2165],
        [0.98781, 0.7033, 0.21358],
        [0.98986, 0.69382, 0.21043],
        [0.99163, 0.68408, 0.20706],
        [0.99314, 0.67408, 0.20348],
        [0.99438, 0.66386, 0.19971],
        [0.99535, 0.65341, 0.19577],
        [0.99607, 0.64277, 0.19165],
        [0.99654, 0.63193, 0.18738],
        [0.99675, 0.62093, 0.18297],
        [0.99672, 0.60977, 0.17842],
        [0.99644, 0.59846, 0.17376],
        [0.99593, 0.58703, 0.16899],
        [0.99517, 0.57549, 0.16412],
        [0.99419, 0.56386, 0.15918],
        [0.99297, 0.55214, 0.15417],
        [0.99153, 0.54036, 0.1491],
        [0.98987, 0.52854, 0.14398],
        [0.98799, 0.51667, 0.13883],
        [0.9859, 0.50479, 0.13367],
        [0.9836, 0.49291, 0.12849],
        [0.98108, 0.48104, 0.12332],
        [0.97837, 0.4692, 0.11817],
        [0.97545, 0.4574, 0.11305],
        [0.97234, 0.44565, 0.10797],
        [0.96904, 0.43399, 0.10294],
        [0.96555, 0.42241, 0.09798],
        [0.96187, 0.41093, 0.0931],
        [0.95801, 0.39958, 0.08831],
        [0.95398, 0.38836, 0.08362],
        [0.94977, 0.37729, 0.07905],
        [0.94538, 0.36638, 0.07461],
        [0.94084, 0.35566, 0.07031],
        [0.93612, 0.34513, 0.06616],
        [0.93125, 0.33482, 0.06218],
        [0.92623, 0.32473, 0.05837],
        [0.92105, 0.31489, 0.05475],
        [0.91572, 0.3053, 0.05134],
        [0.91024, 0.29599, 0.04814],
        [0.90463, 0.28696, 0.04516],
        [0.89888, 0.27824, 0.04243],
        [0.89298, 0.26981, 0.03993],
        [0.88691, 0.26152, 0.03753],
        [0.88066, 0.25334, 0.03521],
        [0.87422, 0.24526, 0.03297],
        [0.8676, 0.2373, 0.03082],
        [0.86079, 0.22945, 0.02875],
        [0.8538, 0.2217, 0.02677],
        [0.84662, 0.21407, 0.02487],
        [0.83926, 0.20654, 0.02305],
        [0.83172, 0.19912, 0.02131],
        [0.82399, 0.19182, 0.01966],
        [0.81608, 0.18462, 0.01809],
        [0.80799, 0.17753, 0.0166],
        [0.79971, 0.17055, 0.0152],
        [0.79125, 0.16368, 0.01387],
        [0.7826, 0.15693, 0.01264],
        [0.77377, 0.15028, 0.01148],
        [0.76476, 0.14374, 0.01041],
        [0.75556, 0.13731, 0.00942],
        [0.74617, 0.13098, 0.00851],
        [0.73661, 0.12477, 0.00769],
        [0.72686, 0.11867, 0.00695],
        [0.71692, 0.11268, 0.00629],
        [0.7068, 0.1068, 0.00571],
        [0.6965, 0.10102, 0.00522],
        [0.68602, 0.09536, 0.00481],
        [0.67535, 0.0898, 0.00449],
        [0.66449, 0.08436, 0.00424],
        [0.65345, 0.07902, 0.00408],
        [0.64223, 0.0738, 0.00401],
        [0.63082, 0.06868, 0.00401],
        [0.61923, 0.06367, 0.0041],
        [0.60746, 0.05878, 0.00427],
        [0.5955, 0.05399, 0.00453],
        [0.58336, 0.04931, 0.00486],
        [0.57103, 0.04474, 0.00529],
        [0.55852, 0.04028, 0.00579],
        [0.54583, 0.03593, 0.00638],
        [0.53295, 0.03169, 0.00705],
        [0.51989, 0.02756, 0.0078],
        [0.50664, 0.02354, 0.00863],
        [0.49321, 0.01963, 0.00955],
        [0.4796, 0.01583, 0.01055],
      ];
      const steps = [];
      for (let i = 0; i < 255; i++) {
        steps.push({
          value: 255 * (i / 255),
          color: ColorRGBA(
            turboColormapData[i][0] * 255,
            turboColormapData[i][1] * 255,
            turboColormapData[i][2] * 255
          ),
          label: ``,
        });
      }
      return new LUT({
        units: 'dB',
        steps,
        interpolate: false,
      });
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
            label: '', // `${Math.round(this.intensityDataToDb(255 * (1 / 8)))}`,
          },
          {
            value: 255 * (2 / 8),
            color: ColorHEX('#0090ff'),
            label: `${Math.round(this.intensityDataToDb(255 * (2 / 8)))}`,
          },
          {
            value: 255 * (3 / 8),
            color: ColorHEX('#0fffee'),
            label: '', // `${Math.round(this.intensityDataToDb(255 * (3 / 8)))}`,
          },
          {
            value: 255 * (4 / 8),
            color: ColorHEX('#90ff70'),
            label: `${Math.round(this.intensityDataToDb(255 * (4 / 8)))}`,
          },
          {
            value: 255 * (5 / 8),
            color: ColorHEX('#ffee00'),
            label: '', // `${Math.round(this.intensityDataToDb(255 * (5 / 8)))}`,
          },
          {
            value: 255 * (6 / 8),
            color: ColorHEX('#ff7000'),
            label: `${Math.round(this.intensityDataToDb(255 * (6 / 8)))}`,
          },
          {
            value: 255 * (7 / 8),
            color: ColorHEX('#ee0000'),
            label: '', // `${Math.round(this.intensityDataToDb(255 * (7 / 8)))}`,
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
    selectedTime() {
      // this.setSelectedTime();
      this.selectedTimeLine.setValue(this.selectedTime);
    },
    index() {
      if (this.index < 0) return; // selected time before spectrogram start time
      // this.createChart();
      this.addDataToChart();
      // this.setCurrentTime();
      this.currentTimeLine.setValue(this.currentTime);
    },
    currentTime() {
      // this.setCurrentTime();
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
    this.addDataToChart();
    this.setCurrentTime();
    this.setSelectedTime();
    this.createLegend();
  },
  beforeUnmount() {
    // "dispose" should be called when the component is unmounted to free all the resources used by the chart
    this.chart.dispose();
  },
  methods: {
    // Define function that maps Uint8 [0, 255] to Decibels.
    //
    intensityDataToDb(intensity) {
      const dataMinDecibel = this.minDecibel;
      const dataMaxDecibel = this.maxDecibel;
      const gliderMaxSPL = 164.08; // dB re 1 μPa
      const minDecibels = dataMinDecibel; // + gliderMaxSPL;
      const maxDecibels = dataMaxDecibel; // + gliderMaxSPL;
      return minDecibels + (intensity / 255) * (maxDecibels - minDecibels);
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
        .setTitle(
          'Spectrogram                                                       '
        )
        .setPadding({ top: 40 })
        .setMouseInteractionWheelZoom(false);

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
      console.log('add data');
      if (this.dataSeries) this.dataSeries.dispose();
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
        console.log('spectrogram added');
      }
    },
    setSelectedTime() {
      // Add a Constantline to the X Axis
      if (this.selectedTimeLine) {
        this.selectedTimeLine.dispose();
      }
      this.selectedTimeLine = this.xAxis.addConstantLine();
      // Position the Constantline in the Axis Scale
      this.selectedTimeLine.setValue(this.selectedTime);
      // The name of the Constantline will be shown in the LegendBox
      this.selectedTimeLine.setName('Selected Time');
      // TODO: change color
      // emit drag time and set audio time or turn off drag

      // if (this.selectedTimeLine) this.selectedTimeLine.dispose();
      // this.selectedTimeLine = this.chart
      //   .addLineSeries()
      //   .setStrokeStyle(
      //     (style) =>
      //       style
      //         .setThickness(10)
      //         .setFillStyle(new SolidFill({ color: ColorHEX('#000000') })) // black
      //   )
      //   .setName('Selected Time')
      //   .add([
      //     { x: this.selectedTime, y: 0 },
      //     { x: this.selectedTime, y: 64000 },
      //   ]);
    },
    setCurrentTime() {
      // Add a Constantline to the X Axis
      if (this.currentTimeLine) {
        this.currentTimeLine.dispose();
      }
      this.currentTimeLine = this.xAxis.addConstantLine();
      // Position the Constantline in the Axis Scale
      this.currentTimeLine.setValue(this.currentTime);
      // The name of the Constantline will be shown in the LegendBox
      this.currentTimeLine.setName('Audio Time');
      // TODO: change color
      // emit drag time and set audio time or turn off drag

      // Add a Band to the X Axis
      // const xAxisBand = this.xAxis.addBand();
      // // Set the start and end values of the Band.
      // xAxisBand
      //   .setValueStart(55300000) // 55261699)
      //   .setValueEnd(55310000) // 55261999)
      //   // Set the name of the Band
      //   .setName('X Axis Band');
    },
    createLegend() {
      // TODO: fix legend memory leak when creating new plot - added this.legend = undefined from LCJS example, might help?
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

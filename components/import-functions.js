import { NetCDFReader } from 'netcdfjs';

// TODO: window, overlap, nfft, https://www.npmjs.com/package/fft-windowing-ts

/**
 * Return needed variables for trajectory path from NetCDF file
 * @param file loaded nc file
 * @param vars array of variable names
 * @return [{name, data}]
 */
export function getNetCDFVariables(file, vars) {
  return new Promise(function (resolve) {
    const request = new XMLHttpRequest();
    request.open('GET', file, true);
    // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    request.responseType = 'arraybuffer';
    request.onload = () => {
      // wait for file to load using promise
      const data = request.response;
      const reader = new NetCDFReader(data);
      // Documentation: https://cheminfo.github.io/netcdfjs/
      let dataset = [];
      // Use NetCDF file reader to get variable data
      if (vars.length === 0) {
        dataset = reader.variables;
      } else {
        for (let i = 0; i < vars.length; i++) {
          dataset.push(reader.getDataVariable(vars[i]));
        }
      }
      resolve(dataset);
    };
    request.send();
  });
}

export function posixToDate(name) {
  const hours = parseInt(name.substr(0, 2));
  const minutes = name.substr(2, 2);
  const secs = name.substr(4, 2);
  console.log({ hours, minutes, secs });
  const startTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
  if (isNaN(startTime)) return 0;
  return startTime;
}

export function getStartTimeFromFilename(name) {
  let year = name.substr(15, 2);
  year = '20'.concat(year);
  // months are from 0-11
  const month = parseInt(name.substr(17, 2)) - 1;
  // TODO: Double check that 9 = September?
  const day = name.substr(19, 2);
  // TODO: convert time to GMT (4 can't be hard coded)
  const hours = parseInt(name.substr(22, 2));
  const minutes = name.substr(24, 2);
  const secs = name.substr(26, 2);
  console.log({ hours, minutes, secs });
  // const date = new Date(year, month, day, hours, minutes, secs);
  const startTime = hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
  if (isNaN(startTime)) return 0;
  return startTime;
}

/**
 *
 * @param {File} file wav or mp3 audio file
 * @param {Object} config {fftResolution,smoothingTimeConstant,processorBufferSize,sampleRate,minDecibels,maxDecibels}
 * @returns processed spectrogram data
 */
export function loadAudioData(file, config) {
  const audioCtx = new AudioContext({ sampleRate: config.sampleRate });

  // create URL to reference imported audio file
  const myAudio = URL.createObjectURL(file);

  // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData#examples
  // decode audio data loaded from an XMLHttpRequest
  console.log('XML HTTP');
  return new Promise(function (resolve) {
    const request = new XMLHttpRequest();
    request.open('GET', myAudio, true);
    // Documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    request.responseType = 'arraybuffer';
    request.onload = () => {
      console.log('loaded');
      // wait for file to load using promise
      const audioData = request.response;
      audioCtx.decodeAudioData(audioData).then((decodedData) => {
        // use the decoded data here
        console.log('decoded');
        resolve(processWaveform(decodedData, config));
        console.log('processed');
      });
    };
    request.send();
  });
}

/**
 * Process a AudioBuffer and create FFT Data for Spectrogram from it.
 * @param   {AudioBuffer}     audioBuffer   AudioBuffer to process into FFT data.
 * @returns {WaveFormData}                  Processed data
 */
async function processWaveform(audioBuffer, config) {
  console.log('process');
  // Create a new OfflineAudioContext with information from the pre-created audioBuffer
  // The OfflineAudioContext can be used to process a audio file as fast as possible.
  // Normal AudioContext would process the file at the speed of playback.
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  // Create a new source, in this case we have a AudioBuffer to create it for, so we create a buffer source
  const source = offlineCtx.createBufferSource();
  // Set the buffer to the audio buffer we are using
  source.buffer = audioBuffer;

  // Create a analyzer node for the full context
  const generalAnalyzer = offlineCtx.createAnalyser();
  generalAnalyzer.fftSize = config.fftResolution;
  generalAnalyzer.smoothingTimeConstant = config.smoothingTimeConstant;

  // Prepare buffer and analyzer
  // this is the length of the audio buffer if the processorBufferSize is half the fftResolution
  const channelFFtDataBuffer = new Uint8Array(
    (audioBuffer.length / config.processorBufferSize) *
      (config.fftResolution / 2)
  );

  // Setup analyzer for this channel
  const analyzer = offlineCtx.createAnalyser();
  analyzer.smoothingTimeConstant = config.smoothingTimeConstant;
  analyzer.fftSize = config.fftResolution;
  analyzer.maxDecibels = config.maxDecibels;
  analyzer.minDecibels = config.minDecibels;
  // TODO: figure out what decibel range to use
  // 0dB is loudest possible sound
  // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/minDecibels
  // Connect the created analyzer to the source
  source.connect(analyzer);
  const channelDbRanges = {
    minDecibels: analyzer.minDecibels,
    maxDecibels: analyzer.maxDecibels,
  };

  // Script processor is used to process all of the audio data in fftSize sized blocks
  // Script processor is a deprecated API but the replacement APIs have really poor browser support
  offlineCtx.createScriptProcessor =
    offlineCtx.createScriptProcessor || offlineCtx.createJavaScriptNode;
  const processor = offlineCtx.createScriptProcessor(
    config.processorBufferSize,
    1,
    1
  );
  let offset = 0;
  // Documentation https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode/audioprocess_event
  processor.onaudioprocess = () => {
    // Run FFT for each channel
    /// //////slow
    const freqData = new Uint8Array(
      channelFFtDataBuffer.buffer,
      offset,
      analyzer.frequencyBinCount
    );
    analyzer.getByteFrequencyData(freqData);
    // TODO: change getByteFrequencyData to getFloatFrequencyData for better precision, need to fix remap
    // Documentation: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData
    // const freqArrayData = new Float32Array(
    //   channelFFtDataBuffer.buffer,
    //   offset,
    //   analyzer.frequencyBinCount
    // );
    // analyzer.getFloatFrequencyData(freqArrayData);
    offset += generalAnalyzer.frequencyBinCount;
  };
  // Connect source buffer to correct nodes,
  // source feeds to:
  // processor, to do the actual processing
  // generalAnalyzer, to get collective information
  source.connect(processor);
  processor.connect(offlineCtx.destination);
  source.connect(generalAnalyzer);
  // Start the source, other wise start rendering would not process the source
  source.start(0);

  // Process the audio buffer when loaded
  await offlineCtx.startRendering();
  const processed = {
    channel: channelFFtDataBuffer,
    channelDbRanges,
    stride: config.fftResolution / 2,
    tickCount: Math.ceil(audioBuffer.length / config.processorBufferSize),
    maxFreq: offlineCtx.sampleRate / 2, // max freq is always half the sample rate
    duration: audioBuffer.duration,
  };

  console.log('format');
  return formatSpectrogram(processed);
}

/**
 * Create data matrix for heatmap from one dimensional array
 * @param {Uint8Array}  data        FFT Data
 * @param {number}      strideSize  Single data block width
 * @param {number}      tickCount    Data row count
 */
function remapDataToTwoDimensionalMatrix(data, strideSize, tickCount) {
  /**
   * @type {Array<number>}
   */
  // Map the one dimensional data to two dimensional data where data goes from right to left
  // [1, 2, 3, 4, 5, 6]
  // -> strideSize = 2
  // -> rowCount = 3
  // maps to
  // [1, 4]
  // [2, 5]
  // [3, 6]
  // const output = Array.from(Array(strideSize)).map(() =>
  // Array.from(Array(tickCount))
  // );
  console.log('remap data');
  const output2 = Array(tickCount)
    .fill()
    .map((_, i) => {
      return data.slice(i * strideSize, i * strideSize + strideSize);
    });
  // const output = [];
  // for (let row = 0; row < strideSize; row += 1) {
  //   output[row] = [];
  //   for (let col = 0; col < tickCount; col += 1) {
  //     output[row][col] = data[col * strideSize + row];
  //   }
  // }
  console.log('done remapped');
  return output2;
}
/**
 * Setup data for the chart
 * */
function formatSpectrogram(data) {
  // Set data for each channel
  // Setup the data for the chart
  const remappedData = remapDataToTwoDimensionalMatrix(
    data.channel,
    data.stride,
    data.tickCount
  );
  // DONE - TODO: duration should be different units than seconds so you don't have to round
  return {
    duration: Math.floor(data.duration),
    maxFreq: Math.ceil(data.maxFreq),
    spectrogramData: remappedData,
  };
}

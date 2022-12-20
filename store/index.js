export const state = () => ({
  counter: 0,
  spectrogramData: [],
  minDecibels: -160,
  maxDecibels: -60,
  audioFiles: [],
  ncFiles: [],
  ncData: [],
  readVar: { name: '', variable: null },
  gliderData: [], // [{ time: [], latitude: [], longitude: [], depth: [] }], // length num files
});

export const getters = {
  getCounter(state) {
    return state.counter;
  },
  getSpectrogramData: (state) => (ind) => {
    return state.spectrogramData[ind];
  },
  getNumSpectrograms(state) {
    return state.spectrogramData.length;
  },
  getNumAudioFiles(state) {
    return state.audioFiles.length;
  },
  getNumNCFiles(state) {
    return state.ncFiles.length;
  },
  getNCData: (state) => (ind) => {
    return state.ncData[ind];
  },
};

export const mutations = {
  increment(state) {
    state.counter++;
  },
  addSpectrogramData(state, data) {
    state.spectrogramData.push(data);
  },
  addAudioFilesToStore(state, files) {
    state.audioFiles.push(files);
  },
  removeAudioFilesFromStore(state, ind) {
    state.audioFiles.splice(ind, 1);
    state.spectrogramData.splice(ind, 1);
  },
  addNCFilesToStore(state, files) {
    state.ncFiles.push(files);
  },
  removeNCFilesFromStore(state, ind) {
    state.ncFiles.splice(ind, 1);
    state.ncData.splice(ind, 1);
  },
  addNCDataToStore(state, data) {
    state.ncData.push(data);
  },
  readVariable(state, props) {
    state.readVar.variable = state.ncData[props.ind].getDataVariable(
      props.name
    );
    state.readVar.name = props.name;
  },
  addGliderData(state, data) {
    state.gliderData.push(data);
  },
};

export const actions = {};

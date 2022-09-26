export const state = () => ({
  counter: 0,
  spectrogramData: [],
  minDecibels: -100,
  maxDecibels: -40,
  audioFiles: [],
  ncFiles: [],
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
};

export const mutations = {
  increment(state) {
    state.counter++;
  },
  addSpectrogramData(state, data) {
    state.spectrogramData.push(data);
  },
  addAudioFilesToStore(state, file) {
    state.audioFiles.push(file);
    console.log(state.audioFiles);
  },
  removeAudioFilesFromStore(state, ind) {
    state.audioFiles.splice(ind, 1);
    state.spectrogramData.splice(ind, 1);
  },
  addNCFilesToStore(state, file) {
    state.ncFiles.push(file);
  },
  removeNCFilesFromStore(state, ind) {
    state.ncFiles.splice(ind, 1);
    // remove stored nc data
  },
};

export const actions = {};

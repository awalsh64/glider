export const state = () => ({
  counter: 0,
  spectrogramData: [],
  minDecibels: -100,
  maxDecibels: -40,
  files: [],
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
  addFilesToStore(state, file) {
    state.files.push(file);
  },
  removeFilesFromStore(state, ind) {
    state.files.splice(ind, 1);
    state.spectrogramData.splice(ind, 1);
  },
};

export const actions = {};

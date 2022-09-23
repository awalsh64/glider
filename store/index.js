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
  removeSpectrogramData(state, ind) {
    state.spectrogramData.splice(ind, 1);
  },
  addFilesToStore(state, file) {
    state.files.push(file);
  },
  removeFilesFromStore(state, ind) {
    state.files.splice(ind, 1);
  },
};

export const actions = {
  async fetchCounter({ state }) {
    // make request
    const res = { data: 10 };
    state.counter = res.data;
    return res.data;
  },
};

<template>
  <!-- File List -->
  <div class="file-holder">
    <label
      >{{ fileType }} Files:
      <!-- Add Files -->
      <v-btn v-if="!hideButtons" @click="addFiles()">Add Files</v-btn>
      <input
        id="files"
        ref="files"
        type="file"
        multiple
        @change="handleFilesUpload()"
      />
    </label>
    <div>
      <div v-for="(file, key) in files" :key="key">
        {{ file.name }}
        <v-btn v-if="!hideButtons" class="select-file" @click="select(key)"
          >Select</v-btn
        >
        <v-btn v-if="!hideButtons" class="remove-file" @click="removeFile(key)"
          >Remove</v-btn
        >
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    addFilesToStore: {
      type: Function,
      required: true,
    },
    removeFilesFromStore: {
      type: Function,
      required: true,
    },
    fileSelected: {
      type: Number,
      default: -1,
    },
    fileType: {
      type: String,
      default: 'Audio',
    },
    hideButtons: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      files: [],
    };
  },

  methods: {
    /**
     * Open file explorer to add files
     */
    addFiles() {
      this.$refs.files.click();
    },
    /**
     * Removes a select file the user has uploaded
     */
    removeFile(key) {
      this.removeFilesFromStore(key);
      this.files.splice(key, 1);
      if (this.fileSelected === key) {
        this.select(this.fileSelected);
        // TODO: This won't trigger a replot when fileSelected===0 because fileSelected isn't changing
      }
    },
    /**
     * Select a file with the Select button
     */
    select(key) {
      this.$emit('update:fileSelected', key);
    },
    /**
     * Handles the uploading of files
     */
    handleFilesUpload() {
      const uploadedFiles = this.$refs.files.files;

      // Adds the uploaded file to the files array
      for (let i = 0; i < uploadedFiles.length; i++) {
        this.addFilesToStore(uploadedFiles[i]);
        this.files.push(uploadedFiles[i]);
      }
    },
  },
};
</script>

<style scoped>
.file-holder {
  height: 30vh;
  max-height: 30vh;
  overflow-y: scroll;
}
</style>

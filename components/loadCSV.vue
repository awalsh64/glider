<template>
  <!-- File List -->
  <div class="file-holder">
    <label>
      You can load a csv file of timestamps associated with the audio files. If
      no file is loaded, the timestamps will default to the file name.
      <!-- Add Files -->
      <v-btn
        v-if="!hideButtons"
        id="drop_zone"
        @drop="dropHandler"
        @dragover.prevent
        @click="openFileExplorer()"
      >
        <v-icon color="primary">mdi-folder-upload-outline</v-icon>
        Drag CSV file here to import or click to open file explorer.
      </v-btn>
      <input id="files" ref="files" type="file" @change="handleFilesUpload()" />
    </label>
    <div>
      <div v-for="(file, key) in innerFiles" :key="key">
        {{ file.name }}
        <v-btn
          v-if="!hideButtons && showSelect > key"
          class="select-file"
          :color="fileSelected === key ? 'primary' : ''"
          @click="select(key)"
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
    allowedExtensions: {
      type: RegExp,
      required: true,
    },
    files: {
      type: Array,
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
    showSelect: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      innerFiles: [],
    };
  },
  methods: {
    /**
     * Open file explorer to add files
     */
    openFileExplorer() {
      this.$refs.files.click();
    },

    /**
     * Add files to app
     */
    addFiles(files) {
      const reader = new FileReader();
      const self = this;
      reader.onload = function (e) {
        const str = e.target.result;
        // removes the text header from the first line if there is one
        // slice from \n index + 1 to the end of the text
        // use split to create an array of each csv value row
        const rows = str.split('\n');
        const rows2 = rows.map((v) => {
          // remove the \r at the end of each number and make it an integer
          return parseInt(v.slice(0, v.indexOf('\r')));
        });
        if (isNaN(rows2[0])) rows2.shift();
        // return the contents of the file
        self.$emit('update:files', rows2);
      };
      this.innerFiles = files;
      reader.readAsText(files[0]);
    },
    /**
     * Removes a select file the user has uploaded
     */
    removeFile(key) {
      this.innerFiles.splice(key, 1);
      this.$emit('update:files', this.innerFiles);
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
      const files = [];
      for (let i = 0; i < uploadedFiles.length; i++) {
        if (this.checkFileType(uploadedFiles[i])) {
          files.push(uploadedFiles[i]);
        }
      }
      this.addFiles(files);
    },
    /**
     * Check allowed file types
     */
    checkFileType(newFile) {
      if (!this.allowedExtensions.exec(newFile.name)) {
        console.log(newFile.name);
        alert('Invalid file type');
        return false;
      } else {
        return true;
      }
    },
    /**
     * Drop files into uploader
     * check file type
     * add to app
     */
    dropHandler(ev) {
      // Prevent default behavior (Prevent file from being opened)
      ev.preventDefault();
      const files = [];
      if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        [...ev.dataTransfer.items].forEach((item) => {
          // If dropped items aren't files, reject them
          if (item.kind === 'file') {
            const newFile = item.getAsFile();
            if (this.checkFileType(newFile)) {
              files.push(newFile);
            }
          }
        });
      } else {
        // Use DataTransfer interface to access the file(s)
        [...ev.dataTransfer.files].forEach((file) => {
          if (this.checkFileType(file)) {
            files.push(file);
          }
        });
      }
      this.addFiles(files);
    },
    dragOverHandler(ev) {
      // Prevent default behavior (Prevent file from being opened)
      ev.preventDefault();
    },
  },
};
</script>

<style scoped>
.file-holder {
  height: 20vh;
}
#drop_zone {
  border: 5px solid #00dc82;
  height: 60px;
}
</style>

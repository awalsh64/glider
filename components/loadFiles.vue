<template>
  <!-- File List -->
  <div class="file-holder">
    <label>
      <span v-if="singleFile">{{ fileType }} File:</span>
      <span v-else>{{ fileType }} Files:</span>
      <!-- Add Files -->
      <v-btn
        v-if="!hideButtons"
        id="drop_zone"
        @drop="dropHandler"
        @dragover.prevent
        @click="openFileExplorer()"
      >
        <v-icon color="primary">mdi-folder-upload-outline</v-icon>
        <span v-if="singleFile"
          >Drag file here to import or click to open file explorer.
        </span>
        <span v-else>
          Drag one or more files here to import or click to open file explorer.
        </span>
      </v-btn>
      <input
        id="files"
        ref="files"
        type="file"
        :multiple="!singleFile"
        @change="handleFilesUpload()"
      />
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
    singleFile: {
      type: Boolean,
      default: false,
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
      for (let i = 0; i < files.length; i++) {
        this.innerFiles.push(files[i]);
      }
      this.innerFiles.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        } else if (a.name > b.name) {
          return 1;
        } else return 0;
      });
      // TODO: remove duplicate files
      this.$emit('update:files', this.innerFiles);
    },
    /**
     * Removes a select file the user has uploaded
     */
    removeFile(key) {
      this.innerFiles.splice(key, 1);
      this.$emit('update:files', this.innerFiles);
      this.$emit('index-removed', key);
      if (this.fileSelected === key) {
        // if removing current selection, select previous file
        if (this.innerFiles.length === 0 || this.fileSelected > 0) {
          this.select(this.fileSelected - 1);
        }
        // unless there is only one file left in the list, the index will still be 0
      }
    },
    /**
     * Select a file with the Select button
     */
    select(key) {
      this.$emit('update:file-selected', key);
    },
    /**
     * Handles the uploading of files
     */
    handleFilesUpload() {
      // TODO: does not get triggered if you remove and add same file
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
  height: 30vh;
  max-height: 30vh;
  overflow-y: scroll;
}
#drop_zone {
  border: 5px solid #00dc82;
  width: 95%;
  height: 60px;
}
</style>

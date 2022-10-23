<template>
  <!-- File List -->
  <div class="file-holder">
    <label
      >{{ fileType }} Files:
      <!-- Add Files -->
      <v-btn
        v-if="!hideButtons"
        id="drop_zone"
        @drop="dropHandler"
        @dragover.prevent
        @click="openFileExplorer()"
      >
        Drag one or more files here to import or click to open file explorer.
      </v-btn>
      <input
        id="files"
        ref="files"
        type="file"
        multiple
        @change="handleFilesUpload()"
      />
    </label>
    <div>
      <div v-for="(file, key) in innerFiles" :key="key">
        {{ file.name }}
        <v-btn
          v-if="!hideButtons && showSelect > key"
          class="select-file"
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
      this.$emit('update:files', this.innerFiles);
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
      this.addFiles(uploadedFiles);
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
  border: 5px solid rgb(103, 103, 172);
  width: 95vw;
  height: 60px;
}
</style>

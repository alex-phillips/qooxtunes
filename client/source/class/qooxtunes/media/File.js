qx.Class.define("qooxtunes.media.File",
  {
    extend: qx.core.Object,

    construct: function() {
      this.base(arguments);
      this.init();
    },

    members: {
      processBuffer: function(bufferHandler) {
        if (this.url) {
          var oReq = new XMLHttpRequest();
          oReq.open('GET', this.url, true);
          oReq.responseType = 'arraybuffer';

          oReq.onload = function() {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            bufferHandler(arrayBuffer);
          };

          oReq.send(null);
          return true;

        } else if (this.fileReference) {
          this.reader.onload = function(e) {
            var arrayBuffer = e.target.result;
            bufferHandler(arrayBuffer);
          };
          this.reader.onerror = function(e) {
            console.error(e);
          };

          this.reader.readAsArrayBuffer(this.fileReference);
          return true;
        }

        console.error('Tried to process an unpopulated file object');
        return false;
      },

      setUrl: function(url) {
        this.url = url;
      },

      setFileReference: function(fileReference) {
        this.fileReference = fileReference;
      },

      init: function() {
        this.reader = new FileReader();
        this.url = null;
        this.fileReference = null;
      }
    }
  }
);

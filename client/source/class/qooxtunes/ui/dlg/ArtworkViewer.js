qx.Class.define("qooxtunes.ui.dlg.ArtworkViewer",
  {
    extend: qx.ui.window.Window,

    type: "singleton",

    statics: {
      go: function(artworkSource) {
        var dlg = qooxtunes.ui.dlg.ArtworkViewer.getInstance();
        dlg.__artwork.setSource(artworkSource);
        dlg.center();
        dlg.open();
      }
    },

    construct: function() {
      /*
       #asset(qx/icon/${qx.icontheme}/16/mimetypes/media-audio.png)
       */
      this.base(arguments, this.tr("Artwork"), "icon/16/mimetypes/media-audio.png");
      this.init();
    },

    members: {
      __artwork: null,

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.close();
        }
      },

      setSource: function(source) {
        this.__artwork.setSource(source);
      },

      init: function() {
        this.setLayout(new qx.ui.layout.Canvas());
        this.set({
          showMinimize: false,
          showMaximize: false,
          resizable: false,
          showStatusbar: false
        });
        this.__artwork = new qx.ui.basic.Image('');
        this.__artwork.setScale(true);
        this.__artwork.setWidth(600);
        this.__artwork.setHeight(600);
        this.add(this.__artwork, {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        });

        this.addListener('keypress', this.onKeypress, this);
      }
    }
  });

qx.Class.define("qooxtunes.ui.dlg.NewPlaylistForm",
  {
    extend: qooxtunes.ui.dlg.Standard,

    type: 'singleton',

    statics: {

      go: function(caption, html, w, h) {
        if ('undefined' == typeof w) {
          w = 400;
        }
        if ('undefined' == typeof h) {
          h = 110;
        }

        var dlg = qooxtunes.ui.dlg.NewPlaylistForm.getInstance();

        dlg.set({width: w, height: h, 'caption': caption});

        dlg.__htmlMessage.setHtml(html);

        dlg.__playlistNameField.setValue('');

        dlg.open();
      }
    },

    construct: function(vCaption, vIcon, vWindowManager) {
      this.base(arguments, "icon/22/status/dialog_information.png");
      this.init();
    },

    members: {
      __api: null,
      __htmlMessage: null,

      init: function() {
        this.__api = qooxtunes.api.API.get();

        var xfont = new qx.bom.Font(11, ['Tahoma', 'Lucida Sans Unicode', 'sans-serif']);

        this.__htmlMessage = new qx.ui.embed.Html('');

        this.__playlistNameField = new qx.ui.form.TextField();
        this.add(this.__playlistNameField, {
          left: 10,
          right: 10,
          top: 10
        });

        var self = this;

        var okButton = new qx.ui.form.Button("OK");
        okButton.addListener("execute", function(e) {
          self.submitForm();
        });
        this.add(okButton, {right: 10, bottom: 10});

        var cancelButton = new qx.ui.form.Button("Cancel");
        cancelButton.addListener("execute", function(e) {
          self.close()
        });
        this.add(cancelButton, {right: 50, bottom: 10});

        this.addListener('appear', function() {
          this.__playlistNameField.focus();
        }, this);

        this.addListener("keypress", this.onKeypress, this);
      },

      submitForm: function() {
        var playlistName = this.__playlistNameField.getValue();
        if (!playlistName) {
          qooxtunes.ui.dlg.MsgBox.go('Error', 'Invalid playlist name');
        } else {
          this.__api.createPlaylist(playlistName);
          this.close();
        }
      },

      /*
       -------------------------------------------------------------------------
       Event listeners
       -------------------------------------------------------------------------
       */

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          // enter
          this.submitForm();
        }
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.close();
        }
      }
    }
  });

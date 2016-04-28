qx.Class.define("qooxtunes.ui.dlg.MsgBox",
  {
    extend: qooxtunes.ui.dlg.Standard,

    type: 'singleton',

    statics: {

      go: function(caption, html, w, h) {
        if ('undefined' == typeof w) {
          w = 400;
        }
        if ('undefined' == typeof h) {
          h = 200;
        }

        var dlg = qooxtunes.ui.dlg.MsgBox.getInstance();

        dlg.set({width: w, height: h, 'caption': caption});

        dlg.h_msg.setHtml(html);

        dlg.open();
      }
    },

    construct: function(vCaption, vIcon, vWindowManager) {
      this.base(arguments, "icon/22/status/dialog_information.png");
      this.init();
    },

    members: {

      init: function() {
        var xfont = new qx.bom.Font(11, ['Tahoma', 'Lucida Sans Unicode', 'sans-serif']);

        this.h_msg = new qx.ui.embed.Html('');

        this.h_msg.setFont(xfont);
        this.add(this.h_msg, {left: 10, top: 10, right: 10, bottom: 43});

        var okButton = new qx.ui.form.Button("OK");
        var me = this;
        okButton.addListener("execute", function(e) {
          me.close();
        });
        this.add(okButton, {right: 10, bottom: 10});


        this.addListener("keypress", this.onKeypress, this);
      },

      /*
       -------------------------------------------------------------------------
       Event listeners
       -------------------------------------------------------------------------
       */

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          // enter
          this.close();
        }
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.close();
        }
      }
    }
  });



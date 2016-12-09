qx.Class.define("qooxtunes.ui.dlg.WaitPopup", {
  extend: qx.ui.popup.Popup,

  type: 'singleton',

  statics: {

    show: function(message) {
      var dlg = qooxtunes.ui.dlg.WaitPopup.getInstance();
      dlg.__message.setLabel(message);
      dlg.__blocker.block();
      dlg.show();
    },

    hide: function() {
      var dlg = qooxtunes.ui.dlg.WaitPopup.getInstance();
      dlg.__blocker.unblock();
      dlg.hide();
    }
  },

  construct: function() {
    this.base(arguments);

    this.__blocker = new qx.bom.Blocker();
    // this.__blocker.setBlockerColor("#D5D5D5");
    this.__blocker.setBlockerOpacity(0);

    this.set({
      height: 64,
      width: 140,
      autoHide: false,
      layout: new qx.ui.layout.Canvas()
    });

    this.set({
      height: 64,
      width: 200,
      autoHide: false,
      layout: new qx.ui.layout.Canvas(),
      opacity: 0.8
    });

    this.__message = new qx.ui.basic.Atom(this.tr('Please wait...'), 'qooxtunes/loader.gif');
    this.__message.set({
      height: 64,
      width: 200,
      backgroundColor: '#000',
      textColor: '#fff',
      center: true
    });

    this.add(this.__message, {
      top: 0,
      left: 0
    });

    this.addListener('appear', this.center, this);
  },

  members: {
    __blocker: null,

    center: function() {
      var parent = this.getLayoutParent();
      if (parent) {
        var bounds = parent.getBounds();
        if (bounds) {
          var hint = this.getSizeHint();

          var left = Math.round((bounds.width - hint.width) / 2);
          var top = Math.round((bounds.height - hint.height) / 2);

          if (top < 0) {
            top = 0;
          }

          this.moveTo(left, top);
        }
      }
    }
  }

});

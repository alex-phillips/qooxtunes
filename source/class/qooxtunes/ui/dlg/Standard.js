qx.Class.define("qooxtunes.ui.dlg.Standard", {
  extend: qx.ui.window.Window,

  construct(caption, icon, center) {
    super(caption, icon);

    this.set({
      modal: true,
      allowMinimize: false,
      allowMaximize: false,
      showClose: false,
      showMaximize: false,
      showMinimize: false,
      resizable: false,
      contentPadding: 0,
      layout: new qx.ui.layout.Canvas(),
    });

    if (center || center == null) {
      this.addListener("appear", this.center, this);
    }
  },
});

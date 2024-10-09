qx.Class.define("qooxtunes.ui.tabview.Main", {
  extend: qx.ui.tabview.TabView,

  construct() {
    super();
    this.init();
  },

  members: {
    init() {
      var p;

      p = new qooxtunes.ui.tabview.page.Music();
      this.add(p);
      /*
       p = new qooxtunes.ui.tabview.page.video ();
       this.add (p);
       p = new qooxtunes.ui.tabview.page.photos ();
       this.add (p);
       */
    },
  },
});

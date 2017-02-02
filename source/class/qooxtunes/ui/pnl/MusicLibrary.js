qx.Class.define("qooxtunes.ui.pnl.MusicLibrary",
  {
    extend: qx.ui.container.Composite,

    construct: function() {
      this.base(arguments);
      this.init();
    },

    events: {
      doneEditingPlaylist: 'qx.event.type.Data'
    },

    members: {
      __libraryTable: null,

      getTable: function() {
        return this.__libraryTable;
      },

      clear_table_selection: function() {
        this.__libraryTable.resetSelection();
      },

      init: function() {
        this.setLayout(new qx.ui.layout.Canvas());

        var pane = new qx.ui.splitpane.Pane("horizontal");

        this.__spc_library = new qx.ui.container.Composite(new qx.ui.layout.Canvas()).set({
          decorator: "main"
        });

        this.__libraryTable = new qooxtunes.ui.ctl.table.Songs();
        this.__spc_library.add(this.__libraryTable, {edge: 0});

        this.__spc_playlist = new qx.ui.container.Composite(new qx.ui.layout.VBox()).set({
          width: 300,
          maxWidth: 500,
          decorator: "main"
        });

        this.__tb_playlist = new qx.ui.toolbar.ToolBar();
        this.__tb_playlist.setSpacing(4);

        this.__lb_playlist = new qx.ui.basic.Label('');
        this.__lb_playlist.setFont(new qx.bom.Font(24, ['Tahoma', 'Lucida Sans Unicode', 'sans-serif']));
        this.__lb_playlist.setAlignY("middle");
        this.__tb_playlist.add(this.__lb_playlist, {flex: 1});

        this.__tb_playlist.addSpacer();

        var p1 = new qx.ui.toolbar.Part();
        this.__b_done = new qx.ui.toolbar.Button(this.tr("Done"));
        // this.__b_done.addListener('execute', this.on_b_done_execute, this);

        p1.add(this.__b_done);
        this.__tb_playlist.add(p1);
        this.__spc_playlist.add(this.__tb_playlist);

        pane.add(this.__spc_library, 1);
        pane.add(this.__spc_playlist, 0);

        this.__spc_playlist.exclude();

        this.add(pane, {edge: 0});

        this.__libraryTable.loadAll();
      }
    }

  });

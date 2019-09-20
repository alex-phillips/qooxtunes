qx.Class.define("qooxtunes.ui.tabview.page.Music",
  {
    extend: qx.ui.tabview.Page,

    construct: function() {
      this.base(arguments, this.tr("Music"), "qooxtunes/icon/16/music.png");
      this.init();
    },

    members: {
      __api: null,

      __filterTimeout: null,
      __searchField: null,

      onSearchFieldInput: function(e) {
        this.__searchField.setValue(e.getData());
        if (this.__filterTimeout != null) {
          clearTimeout(this.__filterTimeout);
        }

        var self = this;
        this.__filterTimeout = setTimeout(function() {
          self.performSearch();
        }, 300);
      },

      performSearch: function() {
        var searchValue = this.__searchField.getValue(),
          column = null,
          matches = null;
        if ((matches = searchValue.match(/artist\s*=(.+)/)) != null) {
          searchValue = matches[1].trim();
          column = 'artist';
        } else if ((matches = searchValue.match(/album\s*=(.+)/)) != null) {
          searchValue = matches[1].trim();
          column = 'album';
        } else if ((matches = searchValue.match(/title\s*=(.+)/)) != null) {
          searchValue = matches[1].trim();
          column = 'title';
        } else if ((matches = searchValue.match(/genre\s*=(.+)/)) != null) {
          searchValue = matches[1].trim();
          column = 'genre';
        }

        this.__libraryPanel.getTable().search(searchValue, column);
      },

      onPlaylistSelected: function(e) {
        var id = e.getData();
        if (id === null) {
          this.__libraryPanel.getTable().loadAll();
        } else {
          this.__libraryPanel.getTable().loadPlaylist(id);
        }
        this.performSearch();
      },

      init: function() {
        this.__api = qooxtunes.api.API.get();

        this.setLayout(new qx.ui.layout.VBox());

        this.__toolbar = new qx.ui.toolbar.ToolBar();

        var p1 = new qx.ui.toolbar.Part();

        this.__playlistsButton = new qx.ui.form.ToggleButton(this.tr("Playlists"));
        this.__playlistsButton.setValue(true);
        this.__playlistsButton.addListener("changeValue", function(e) {
          if (e.getData()) {
            this.__playlistsPanel.show();
          } else {
            this.__playlistsPanel.exclude();
          }
        }, this);
        this.__playlistsButton.setMarginLeft(8);

        this.__toolbar.add(this.__playlistsButton);
        this.__toolbar.addSpacer();

        this.__searchField = new qx.ui.form.TextField();
        this.__searchField.setValue('');
        this.__searchField.setWidth(200);
        this.__searchField.addListener('input', this.onSearchFieldInput, this);
        this.__searchField.setAlignY("middle");
        this.__searchField.setMarginRight(8);
        this.__searchField.setPlaceholder('Search');
        this.__toolbar.add(this.__searchField);

        this.__searchField.addListener('focusin', function() {

        }, this);
        this.__searchField.addListener('focusout', function() {

        }, this);

        this.add(this.__toolbar);

        var c = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        var pane = new qx.ui.splitpane.Pane('horizontal');

        var self = this;
        qooxtunes.ui.dlg.WaitPopup.show("Loading music library...");
        this.__api.getData(function(data) {
          qooxtunes.ui.dlg.WaitPopup.hide();

          self.__playlistsPanel = new qooxtunes.ui.pnl.Playlists();
          self.__playlistsPanel.addListener('playlistSelected', self.onPlaylistSelected, self);

          self.__libraryPanel = new qooxtunes.ui.pnl.MusicLibrary();
          self.__libraryPanel.getTable().addListener('searchChanged', self.onSearchFieldInput, self);

          pane.add(self.__playlistsPanel, 0);
          pane.add(self.__libraryPanel, 1);

          self.add(pane, {flex: 1});
        });
      }
    }
  });

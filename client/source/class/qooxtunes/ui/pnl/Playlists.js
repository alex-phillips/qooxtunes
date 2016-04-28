qx.Class.define("qooxtunes.ui.pnl.Playlists",
  {
    extend: qx.ui.container.Composite,

    construct: function() {
      this.base(arguments);
      this.init();
    },

    events: {
      playlistSelected: "qx.event.type.Data"
    },

    members: {
      __playlistList: null,
      __list: null,
      __currentSelection: null,

      onPlaylistSelect: function(e) {
        var model = e.getData().added[0];
        this.fireDataEvent('playlistSelected', model.getId());
      },

      init: function() {
        this.setLayout(new qx.ui.layout.Canvas());
        this.set({
          width: 200
        });

        var playlists = qooxtunes.api.Koel.getPlaylists();
        playlists.unshift({
          id: null,
          name: "Music",
          songs: []
        });

        this.__list = new qx.ui.list.List(qx.data.marshal.Json.createModel(playlists, true));
        this.__list.set({
          selectionMode: "one",
          labelPath: "name",
          delegate: {
            group: function(model) {
              if (model.getId() === null) {
                return 'Library';
              }

              return 'Playlists';
            }
          }
        });

        this.__list.getSelection().addListener('change', this.onPlaylistSelect, this);

        this.add(this.__list, {edge: 0});
      }
    }

  });

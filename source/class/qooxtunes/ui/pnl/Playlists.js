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
      __api: null,

      __playlistList: null,
      __list: null,
      __currentSelection: null,
      __currentPlaylistId: null,

      onPlaylistSelect: function(e) {
        this.__currentPlaylist = e.getData().added[0];
        this.fireDataEvent('playlistSelected', this.__currentPlaylist.getId());
      },

      buildList: function() {
        var playlists = JSON.parse(JSON.stringify(this.__api.getPlaylists()));
        playlists.unshift({
          id: null,
          name: "Music",
          songs: []
        });

        this.__list.setModel(qx.data.marshal.Json.createModel(playlists, true));
      },

      handleDropRequest: function(e) {
        var playlist = e.getOriginalTarget().getModel();
        if (playlist.getId() === null) {
          return;
        }

        var songs = e.getRelatedTarget().getDraggingItems();
        var songIds = [];
        for (var i = 0; i < songs.length; i++) {
          songIds.push(songs[i].songId);
        }

        this.__api.addSongsToPlaylist(playlist.getId(), songIds, function(result) {
          if (!result) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'Failed to save playlist changes');
          }
        });
      },

      deletePlaylist: function(e) {
        var list = this.__list.getSelection();
        var playlist = list.toArray()[0];
        if (playlist.getId() === null) {
          return qooxtunes.ui.dlg.MsgBox.go("Error", "You can't delete your music library!");
        }

        var self = this;
        qooxtunes.ui.dlg.Confirm.go("Are you sure you want to delete playlist '" + playlist.getName() + "'?", function() {
          self.__api.deletePlaylist(playlist.getId(), function(result) {
            if (!result) {
              return qooxtunes.ui.dlg.MsgBox.go('Error', 'There was an error deleting the playlist');
            }

            self.buildList();
            if (self.__currentPlaylist.getId() === playlist.getId()) {
              self.fireDataEvent("playlistSelected", null);
            }
          });
        }, function() {});
      },

      init: function() {
        this.__api = qooxtunes.api.API.get();

        this.setLayout(new qx.ui.layout.Canvas());
        this.set({
          width: 200
        });

        this.__list = new qx.ui.list.List();
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
        this.buildList();
        this.__list.getSelection().addListener('change', this.onPlaylistSelect, this);

        this.__api.addListener('playlistCreated', this.buildList, this);

        this.setDroppable(true);
        this.addListener('drop', this.handleDropRequest, this);

        this.__contextMenu = new qx.ui.menu.Menu();
        this.__deletePlaylistCommand = new qx.ui.command.Command("");
        this.__deletePlaylistCommand.addListener("execute", this.deletePlaylist, this);

        this.__deletePlaylistButton = new qx.ui.menu.Button(this.tr("Delete Playlist"), "", this.__deletePlaylistCommand);
        this.__contextMenu.add(this.__deletePlaylistButton);

        this.__list.setContextMenu(this.__contextMenu);

        this.add(this.__list, {edge: 0});
      }
    }

  });

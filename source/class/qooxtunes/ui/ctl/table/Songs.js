qx.Class.define("qooxtunes.ui.ctl.table.Songs",
  {
    extend: qooxtunes.ui.ctl.Table,

    construct: function() {
      this.buildTableModel();

      var custom = {
        tableColumnModel: function(obj) {
          return new qx.ui.table.columnmodel.Basic(obj);
        }
      };

      this.base(arguments, this.__tableModel, custom);

      this.init();
    },

    events: {
      'searchChanged': "qx.event.type.Data"
    },

    members: {
      /*
       -------------------------------------------------------------------------
       Class variables
       -------------------------------------------------------------------------
       */

      /**
       * Backend API
       * @type {Koel}
       */
      __api: null,

      /**
       * All songs retrieved from the API
       * @type {Array}
       */
      __allSongs: [],

      /**
       * Currently playing song
       * @type {Object}
       */
      __currentSong: null,

      /**
       * Currently selected playlist
       * @type {Object}
       */
      __currentPlaylist: null,

      /**
       * Items being dragged
       * @type {Array}
       */
      __draggingItems: [],

      /**
       * String of characters to search for by keyboard presses
       * @type {String}
       */
      __typeSearchText: '',

      /**
       * Type search timeout
       * @type {Timeout}
       */
      __typeSearchTimeout: null,

      /**
       * Boolean if we are currently loading the column state
       * @type {Boolean}
       */
      __loadingColumnState: false,

      /**
       * Perform a search through all available songs and set the table contents
       * to the result.
       * @param  {String} searchValue Search string to apply to each row
       * @param  {String} column      Column name to check the search string against
       */
      search: function(searchValue, column) {
        this.resetSelection();
        var sortColumn = this.__tableModel.getSortColumnIndex(),
          sortAscending = this.__tableModel.isSortAscending(),
          matches = this.__availableSongs;

        if (searchValue) {
          matches = [];
          if (!column) {
            column = 'searchValue';
          }

          searchValue = searchValue.split(' ');
          for (var i = 0; i < searchValue.length; i++) {
            searchValue[i] = searchValue[i].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\$&");
          }

          for (i = 0; i < this.__availableSongs.length; i++) {
            if (!this.__availableSongs[i][column]) {
              continue;
            }

            var searchField = this.__availableSongs[i][column].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\$&");
            var match = true;
            for (var j = 0; j < searchValue.length; j++) {
              if (!searchField.match(new RegExp(searchValue[j], 'gi'))) {
                match = false;
                break;
              }
            }
            if (match) {
              matches.push(this.__availableSongs[i]);
            }
          }
        }

        this.__tableModel.setDataAsMapArray(matches, false, false);
        this.__tableModel.sortByColumn(sortColumn, sortAscending);
        this.updateTotalDuration();
      },

      updateTotalDuration: function() {
        var totalTime = 0;

        if (this.getSelectionModel().getSelectedCount() <= 1) {
          var items = this.__tableModel.getDataAsMapArray()
        } else {
          var items = this.getSelectedItems();
        }

        for (var i = 0; i < items.length; i++) {
          totalTime += qooxtunes.util.Time.durationStringToInt(items[i].duration);
        }

        this.setAdditionalStatusBarText(': ' + qooxtunes.util.Time.totalDurationString(totalTime));
      },

      buildTableModel: function() {
        this.__tableModel = new qx.ui.table.model.Simple();
        this.__columnIndex = {};

        this.__tableModel.setColumns(
          [
            "_SongID",
            "_SearchValue",
            "",
            this.tr("Title"),
            this.tr("Artist"),
            this.tr("Album Artist"),
            this.tr("Album"),
            this.tr("Disc"),
            this.tr("Track"),
            this.tr("Genre"),
            this.tr("Year"),
            this.tr("Compilation"),
            this.tr("Duration"),
            this.tr("Plays"),
            this.tr("Date Added"),
            this.tr("Favorite")
          ],
          [
            'songId',
            'searchValue',
            'nowPlaying',
            'title',
            'artist',
            'albumArtist',
            'album',
            'disc',
            'track',
            'genre',
            'year',
            'compilation',
            'duration',
            'playCount',
            'dateAdded',
            'liked',
          ]
        );

        this.__columnIndex['songId'] = 0;
        this.__columnIndex['searchValue'] = 1;
        this.__columnIndex['nowPlaying'] = 2;
        this.__columnIndex['title'] = 3;
        this.__columnIndex['artist'] = 4;
        this.__columnIndex['albumArtist'] = 5;
        this.__columnIndex['album'] = 6;
        this.__columnIndex['disc'] = 7;
        this.__columnIndex['track'] = 8;
        this.__columnIndex['genre'] = 9;
        this.__columnIndex['year'] = 10;
        this.__columnIndex['compilation'] = 11;
        this.__columnIndex['duration'] = 12;
        this.__columnIndex['playCount'] = 13;
        this.__columnIndex['dateAdded'] = 14;
        this.__columnIndex['liked'] = 15;

        var self = this;

        function multiSort(a, b, sortKey) {
          if (!sortKey) {
            return 0;
          }

          var diff = 0;
          for (var i = 0; i < sortKey.length; i++) {
            var aVal = a[sortKey[i]];
            var bVal = b[sortKey[i]];

            if (sortKey[i] === self.__columnIndex['duration']) {
              aVal = qooxtunes.util.Time.durationStringToInt(aVal);
              bVal = qooxtunes.util.Time.durationStringToInt(bVal);
            }

            if (aVal && isNaN(aVal)) {
              aVal = aVal.toLowerCase().replace(/^(a|an|the)\s+/, '');
            }
            if (bVal && isNaN(bVal)) {
              bVal = bVal.toLowerCase().replace(/^(a|an|the)\s+/, '');
            }

            if (aVal != bVal) {
              return (aVal < bVal) ? -1 : ((aVal > bVal) ? 1 : 0);
            }
          }

          return diff;
        }

        // sort song titles, ignoring leading articles
        this.__tableModel.setSortMethods(self.__columnIndex['name'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['title']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['title']
            ]);
          }
        });

        // sort artists with a subsort of album and track number (with songid as fallback)
        this.__tableModel.setSortMethods(self.__columnIndex['artist'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['artist'],
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['artist'],
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        this.__tableModel.setSortMethods(self.__columnIndex['albumArtist'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['albumArtist'],
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['albumArtist'],
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        // sort albums with a subsort of track number (with songid as fallback)
        this.__tableModel.setSortMethods(self.__columnIndex['album'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        this.__tableModel.setSortMethods(self.__columnIndex['genre'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['genre'],
              self.__columnIndex['artist'],
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['genre'],
              self.__columnIndex['artist'],
              self.__columnIndex['album'],
              self.__columnIndex['year'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        this.__tableModel.setSortMethods(self.__columnIndex['year'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['year'],
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['year'],
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        this.__tableModel.setSortMethods(self.__columnIndex['duration'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['duration']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['duration']
            ]);
          }
        });
      },

      loadAll: function() {
        this.resetSelection();
        this.__currentPlaylist = null;
        if (this.__allSongs.length !== 0) {
          var sortColumn = this.__tableModel.getSortColumnIndex(),
            ascending = this.__tableModel.isSortAscending();
          this.__availableSongs = this.__allSongs;
          this.__tableModel.setDataAsMapArray(this.__allSongs, false, false);
          this.__tableModel.sortByColumn(sortColumn, ascending);

          return;
        }

        var self = this;
        qooxtunes.ui.dlg.WaitPopup.show(this.tr("Loading library..."));
        this.__api.getData(function(result) {
          var rowData = [];
          var playData = {};

          for (var i = 0; i < result.interactions.length; i++) {
            var interaction = result.interactions[i];

            // For some reason, saw a user run into an issue where 'interaction' was
            // undefined here. So just doing some sanity checking...
            if (!interaction) {
              continue;
            }

            if (!playData[interaction.song_id]) {
              playData[interaction.song_id] = {
                playCount: 0,
                liked: false
              };
            }

            playData[interaction.song_id].playCount += interaction.play_count;
            playData[interaction.song_id].liked = interaction.liked;
          }

          var songs = self.__api.getSongs();
          for (var id in songs) {
            var song = songs[id],
              artist = song.album.artist;
            // if (song.album.compilationState) {
              artist = self.__api.getArtistById(song.artist_id);
            // }

            rowData.push({
              songId: song.id,
              searchValue: [song.title, artist.name, song.album.artist.name, song.album.name, song.genre].join(' '),
              nowPlaying: null,
              title: song.title,
              artist: artist.name,
              albumArtist: song.album.artist.name,
              album: song.album.name,
              disc: song.disc,
              track: song.track,
              genre: song.genre,
              year: song.album.year,
              compilation: Boolean(song.album.compilationState),
              duration: qooxtunes.util.Time.intToStr(song.length),
              playCount: playData[song.id] && playData[song.id].playCount ? playData[song.id].playCount : '',
              dateAdded: song.date_added,
              liked: playData[song.id] && playData[song.id].liked ? qx.util.ResourceManager.getInstance().toUri('qooxtunes/icon/16/favorite.png') : ''
            });
          }

          self.__tableModel.setDataAsMapArray(rowData, false, false);
          self.__tableModel.sortByColumn(self.__columnIndex['artist'], true);
          self.__allSongs = rowData;
          self.__availableSongs = self.__allSongs;
          self.updateTotalDuration();
          qooxtunes.ui.dlg.WaitPopup.hide();
        });
      },

      loadPlaylist: function(id) {
        this.resetSelection();
        var rows = [];

        if (id === null) {
          return this.__currentPlaylist = null;
        }

        this.__currentPlaylist = this.__api.getPlaylistById(id);
        for (var i = 0; i < this.__allSongs.length; i++) {
          if (this.__currentPlaylist.songs.indexOf(this.__allSongs[i].songId) > -1) {
            // in playlist
            rows.push(this.__allSongs[i]);
          }
        }

        this.__availableSongs = rows;
        this.__tableModel.setDataAsMapArray(rows, false, false);
      },

      clear: function() {
        this.__tableModel.setData([], false);
      },

      on_dragstart: function(e) {
        var selectedItems = this.getSelectedItems();
        if (selectedItems.length === 0) {
          selectedItems = [this.__tableModel.getRowDataAsMap(this.getFocusedRow())];
        }

        this.__draggingItems = selectedItems;
        e.addAction("copy");
      },

      getDraggingItems: function() {
        return this.__draggingItems;
      },

      on_columnVisibilityMenuCreateEnd: function(e) {
        // remove hidden columns from the column visibility menu
        var edata = e.getData();
        var xary = edata.menu.getChildren();
        var rmary = [];
        for (var i = 0; i < xary.length; i++) {
          var mb = xary[i];

          // there are some non MenuButton items in the child list...
          if (!mb.getLabel) {
            continue;
          }

          var lb = mb.getLabel();
          if ((lb.length == 0) || (lb.substr(0, 1) == '_')) {
            rmary.push(mb);
          }
        }

        for (var i = 0; i < rmary.length; i++) {
          edata.menu.remove(rmary[i]);
        }
      },


      update_row: function(data, only_modified) {
        if (typeof only_modified === 'undefined') {
          only_modified = false;
        }

        var row = [];

        for (var i = 0; i < this.__tableModel.getColumnCount(); i++) {
          row[i] = null;
        }

        // find row by song ID
        var row_idx = this.__tableModel.locate(this.__columnIndex['song_id'], data[0], 0);

        if (typeof row_idx === 'undefined') {
          return;
        }

        row[this.__columnIndex['song_id']] = data[0]; // id
        row[this.__columnIndex['search_data']] = '';

        if (this.__limited_columns) {
          row[this.__columnIndex['track']] = this.__tableModel.getValue(this.__columnIndex['track'], row_idx, 0);
        }

        row[this.__columnIndex['name']] = data[1];

        if (data[2] != null) {
          row[this.__columnIndex['artist']] = data[2][0];
        }
        else {
          row[this.__columnIndex['artist']] = null;
        }

        row[this.__columnIndex['album']] = data[7];
        row[this.__columnIndex['disc']] = data[9];

        var id = row[0];
        // skip columns 0 and 1 (ID and search value)
        for (var i = 2; i < this.__tableModel.getColumnCount(); i++) {
          if (!only_modified || row[i] !== null) {
            // note that we have to locate our row each time we set a value, because setting the
            // value could move the row due to sorting...
            row_idx = this.__tableModel.locate(this.__columnIndex['song_id'], id, 0);
            //console.log ("setting row " + row_idx + ", column " + i + " to '" + row[i] + "'");
            this.__tableModel.setValue(i, row_idx, row[i], 0);
          }
        }

        // now set the search value
        row_idx = this.__tableModel.locate(this.__columnIndex['song_id'], id, 0);

        search_value = this.__tableModel.getValue(this.__columnIndex['name'], row_idx, 0) + ' '
          + this.__tableModel.getValue(this.__columnIndex['artist'], row_idx, 0) + ' '
          + this.__tableModel.getValue(this.__columnIndex['album'], row_idx, 0) + ' '
          + this.__tableModel.getValue(this.__columnIndex['genre'], row_idx, 0);

        console.log("new search value: " + search_value);
        this.__tableModel.setValue(this.__columnIndex['search_value'], row_idx, search_value, 0);
      },

      on_multi_editor_ok: function(songids, data) {
        for (var i = 0; i < songids.length; i++) {
          data[0] = songids[i];
          this.update_row(data, true);
        }
      },


      on_editor_ok: function(data) {
        if (data != null) {
          this.update_row(data);
        }
      },

      on_editor_next: function(data) {
        var newSelectedIndex = this.getFirstSelectedIndex() + 1;

        if (data != null) {
          this.update_row(data);
        }

        // something may have happened to our selected row to push it out past
        // what would have been our next selection; if that happens, we'll drop
        // our new selection back by one.
        if (this.getFirstSelectedIndex() > newSelectedIndex) {
          newSelectedIndex--;
        }

        this.setSelectedIndex(newSelectedIndex);

        var result = {};
        var selectedItem = this.getSelectedItems()[0];
        result.row = selectedItem;
        result.songId = selectedItem.songId;
        result.songIndex = newSelectedIndex;

        return result;
      },

      on_editor_prev: function(data) {
        var newSelectedIndex = this.getFirstSelectedIndex() - 1;

        if (data != null) {
          // this.update_row(data);
        }

        // something may have happened to our selected row to push it out past
        // what would have been our next selection; if that happens, we'll drop
        // our new selection back by one.
        if (this.getFirstSelectedIndex() < newSelectedIndex) {
          newSelectedIndex++;
        }

        this.setSelectedIndex(newSelectedIndex);

        var result = {};
        var selectedItem = this.getSelectedItems()[0];
        result.row = selectedItem;
        result.songId = selectedItem.songId;
        result.songIndex = newSelectedIndex;

        return result;
      },

      onSelectAllCommand: function(e) {
        var num_rows = this.__tableModel.getRowCount();
        var m = this.getSelectionModel();
        m.setSelectionInterval(0, num_rows - 1);
      },

      updateRowById: function(id, data) {
        for (var i = 0; i < this.__allSongs.length; i++) {
          if (this.__allSongs[i].songId === id) {

            break;
          }
        }
      },

      playSelected: function(songs) {
        qooxtunes.ui.ctl.PlaybackControl.getInstance().play(songs);
      },

      queueSelected: function(songs) {
        qooxtunes.ui.ctl.PlaybackControl.getInstance().queue(songs);
      },

      queueNext: function(songs) {
        qooxtunes.ui.ctl.PlaybackControl.getInstance().queueNext(songs);
      },

      replaceQueue: function(songs) {
        qooxtunes.ui.ctl.PlaybackControl.getInstance().replaceQueue(songs);
      },

      onPlayCommand: function(e) {
        // Skip if nothing is selected
        var songs = this.getSelectedItems();
        if (songs.length < 1) {
          return;
        } else if (songs.length === 1) {
          var index = this.getSelectedIndices()[0];
          songs = this.__tableModel.getDataAsMapArray().slice(index);
        }

        this.playSelected(songs);
      },

      on_cmd_queue: function(e) {
        var songs = this.getSelectedItems();
        if (songs.length < 1) {
          return;
        }

        this.queueSelected(songs);
      },

      onPlayNextCommand: function(e) {
        var songs = this.getSelectedItems();
        if (songs.length < 1) {
          return;
        }

        this.queueNext(songs);
      },

      onReplaceQueueCommand: function(e) {
        var songs = this.getSelectedItems();
        if (songs.length < 1) {
          return;
        }

        this.replaceQueue(songs);
      },

      onFilterForArtistCommand: function(e) {
        var items = this.getSelectedItems();

        if (items.length != 1) {
          return;
        }

        this.fireDataEvent('searchChanged', 'artist=' + items[0].artist);
      },

      onFilterForAlbumCommand: function(e) {
        var items = this.getSelectedItems();

        if (items.length != 1) {
          return;
        }

        this.fireDataEvent('searchChanged', 'album=' + items[0].album);
      },

      onEditCommand: function(e) {
        var selectedItems = this.getSelectedItems(),
          selectionRange = this.getSelectedIndices();

        if (selectedItems.length < 1) {
          return;
        }

        var self = this;
        if (selectedItems.length == 1) {
          var numSongs = this.__tableModel.getRowCount();

          qooxtunes.ui.dlg.SongInfo.go(selectedItems[0], selectionRange[0], numSongs,
            function(data) {
              return self.on_editor_ok(data);
            },
            function(data) {
              return self.on_editor_next(data);
            },
            function(data) {
              return self.on_editor_prev(data);
            },
            numSongs
          );
        }
        else {
          qooxtunes.ui.dlg.multi_song_editor.go(song_ids,
            function(song_ids, data) {
              return self.on_multi_editor_ok(song_ids, data);
            }
          );
        }
      },

      onFavoriteCommand: function(e) {
        qooxtunes.ui.dlg.WaitPopup.show(this.tr("Please wait..."));
        var selectedItems = this.getSelectedItems(),
          selectionRange = this.getSelectedIndices(),
          favoriteIds = {};

        for (var i = 0; i < selectedItems.length; i++) {
          favoriteIds[selectedItems[i].songId] = selectionRange[i];
        }

        var self = this;

        this.__api[this.__favoriteButton.getLabel().toLowerCase()](Object.keys(favoriteIds), function(result) {
          if (result) {
            if (result === true) {
              for (var id in favoriteIds) {
                self.__tableModel.setValue(self.__columnIndex['liked'], favoriteIds[id], '');
              }

              for (i = 0; i < self.__allSongs.length; i++) {
                if (favoriteIds[self.__allSongs[i].songId] !== undefined) {
                  self.__allSongs[i].liked = '';
                  delete(favoriteIds[self.__allSongs[i].songId]);

                  if (Object.keys(favoriteIds).length === 0) {
                    break;
                  }
                }
              }
            } else {
              for (var j = 0; j < result.length; j++) {
                self.__tableModel.setValue(self.__columnIndex['liked'], favoriteIds[result[j].song_id], 'qooxtunes/icon/16/favorite.png');
              }

              for (i = 0; i < self.__allSongs.length; i++) {
                if (favoriteIds[self.__allSongs[i].songId] !== undefined) {
                  self.__allSongs[i].liked = "qooxtunes/icon/16/favorite.png";
                  delete(favoriteIds[self.__allSongs[i].songId]);

                  if (Object.keys(favoriteIds).length === 0) {
                    break;
                  }
                }
              }
            }

            self.onChangeSelection();
          }

          qooxtunes.ui.dlg.WaitPopup.hide();
        });
      },

      onDownloadCommand: function(e) {
        var sel_items = this.getSelectedItems();

        if (sel_items.length < 1) {
          return;
        }

        var ids = [];
        for (var i = 0; i < sel_items.length; i++) {
          ids.push(sel_items[i].songId);
        }

        this.__api.downloadSongs(ids);
      },

      onChangeSelection: function(e) {
        var num_selected = this.getSelectionModel().getSelectedCount();

        if (num_selected == 0) {
          this.__playButton.setEnabled(false);
          this.__queueButton.setEnabled(false);
          this.__filterForArtistButton.setEnabled(false);
          this.__filterForAlbumButton.setEnabled(false);
          this.__editButton.setEnabled(false);
          this.__downloadButton.setEnabled(false);
          this.__downloadButton.setLabel(this.tr('Download song'));

          this.__favoriteButton.setEnabled(false);
          this.__favoriteButton.setLabel('Favorite');
        } else if (num_selected == 1) {
          this.__playButton.setEnabled(true);
          this.__queueButton.setEnabled(true);
          this.__filterForArtistButton.setEnabled(true);
          this.__filterForAlbumButton.setEnabled(true);
          this.__editButton.setEnabled(true);
          this.__downloadButton.setEnabled(true);
          this.__downloadButton.setLabel(this.tr('Download song'));

          var selectedItems = this.getSelectedItems(),
            favoriteText = 'Unfavorite';
          for (var i = 0; i < selectedItems.length; i++) {
            if (selectedItems[i].liked === '') {
              favoriteText = 'Favorite';
            }
          }
          this.__favoriteButton.setEnabled(true);
          this.__favoriteButton.setLabel(favoriteText);
        } else {
          this.__playButton.setEnabled(true);
          this.__queueButton.setEnabled(true);
          this.__filterForArtistButton.setEnabled(false);
          this.__filterForAlbumButton.setEnabled(false);
          this.__editButton.setEnabled(false);
          this.__downloadButton.setEnabled(true);
          this.__downloadButton.setLabel(this.tr('Download songs'));

          var selectedItems = this.getSelectedItems(),
            favoriteText = 'Unfavorite';
          for (var i = 0; i < selectedItems.length; i++) {
            if (selectedItems[i].liked === '') {
              favoriteText = 'Favorite';
            }
          }
          this.__favoriteButton.setEnabled(true);
          this.__favoriteButton.setLabel(favoriteText);
        }

        this.updateTotalDuration();
      },

      loadColumnState: function() {
        this.__loadingColumnState = true;

        var state = qooxtunes.util.Preferences.getInstance().get('songs.table.state', false);
        if (!state) {
          console.log('no preferences found for table state');
          this.__loadingColumnState = false;
          return;
        }

        var tcm = this.getTableColumnModel();
        var num_cols = tcm.getOverallColumnCount();

        // if the application code has changed and the number of columns is different since
        // the time we saved the cookie, just ignore the cookie
        if (state.col_order.length != num_cols) {
          this.__loadingColumnState = false;
          return;
        }

        tcm.setColumnsOrder(state.col_order);

        for (var i = 0; i < num_cols; i++) {
          tcm.setColumnVisible(i, (state.col_visible[i] == 1));
          tcm.setColumnWidth(i, state.col_widths[i]);
        }

        this.__loadingColumnState = false;
      },

      saveColumnState: function() {
        if (this.__loadingColumnState) {
          return;
        }

        var tcm = this.getTableColumnModel();

        var num_cols = tcm.getOverallColumnCount();

        var hidden_cols = [];

        var state = {};
        state.col_widths = [];
        state.col_visible = [];
        for (var i = 0; i < num_cols; i++) {
          state.col_visible.push(tcm.isColumnVisible(i) ? 1 : 0);
          state.col_widths.push(tcm.getColumnWidth(i));

          if (!tcm.isColumnVisible(i)) {
            hidden_cols.push(i);
          }

        }
        var vis_cols = tcm.getVisibleColumns();

        state.col_order = [];

        for (var i = 0; i < vis_cols.length; i++) {
          state.col_order.push(vis_cols[i]);
        }

        for (var i = 0; i < hidden_cols.length; i++) {
          state.col_order.push(hidden_cols[i]);
        }

        qooxtunes.util.Preferences.getInstance().set('songs.table.state', state);
      },

      onRemoveSongs: function() {
        if (this.__currentPlaylist === null) {
          return;
        }

        var songs = this.getSelectedItems(),
          self = this;
        this.__api.removeSongsFromPlaylist(this.__currentPlaylist.id, songs, function(result) {
          if (!result) {
            qooxtunes.ui.dlg.MsgBox.go("Error", "There was a problem removing the songs from the playlist");
          }

          self.loadPlaylist(self.__currentPlaylist.id);
        });
      },

      onKeypress: function(e) {
        var key = e.getKeyIdentifier().toLowerCase(),
          self = this;

        switch (key) {
          case 'delete':
          case 'backspace':
            e.preventDefault();
            this.onRemoveSongs();
            break;
          case 'enter':
            this.onPlayCommand();
            break;
          case 'space':
            if (this.__typeSearchTimeout === null) {
              qooxtunes.ui.ctl.PlaybackControl.getInstance().onPlayButtonPress();
              break;
            }
          default:
            if (key.length > 1 && key !== 'space') {
              break;
            }

            clearTimeout(this.__typeSearchTimeout);

            switch (key) {
              case 'space':
                key = ' ';
                break;
            }

            this.__typeSearchText += key;
            this.__typeSearchTimeout = setTimeout(function() {
              self.__typeSearchTimeout = null;
              var searchColumn = self.__tableModel.getSortColumnIndex(),
                rows = self.__tableModel.getData(),
                found = false,
                regex = new RegExp('^' + self.__typeSearchText, 'gi');
              for (var i = 0; i < rows.length; i++) {
                if (rows[i][searchColumn].match(regex)) {
                  found = true;
                  break;
                }
              }

              if (found) {
                self.scrollCellVisible(searchColumn, i, true);
                self.setFocusedCell(searchColumn, i);
              }

              self.__typeSearchText = '';
            }, 1000);
            break;
        }
      },

      init: function() {
        this.__api = qooxtunes.api.API.get();

        var sm = this.getSelectionModel();

        sm.setSelectionMode(qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);

        sm.addListener('changeSelection', this.onChangeSelection, this);

        // this.__tableModel.indexedSelection (0, sm);

        var tcm = this.getTableColumnModel();
        tcm.setColumnVisible(0, false);
        tcm.setColumnVisible(1, false);

        var cr = new qx.ui.table.cellrenderer.Number();
        var nf = new qx.util.format.NumberFormat();
        nf.setGroupingUsed(false);
        cr.setNumberFormat(nf);

        var dateRenderer = new qx.ui.table.cellrenderer.Date();
        dateRenderer.setDateFormat(new qx.util.format.DateFormat('M/d/yy, h:mm a'));

        tcm.setDataCellRenderer(this.__columnIndex['nowPlaying'], new qx.ui.table.cellrenderer.Image());
        tcm.setDataCellRenderer(this.__columnIndex['year'], cr);
        tcm.setDataCellRenderer(this.__columnIndex['compilation'], new qx.ui.table.cellrenderer.Boolean());
        tcm.setDataCellRenderer(this.__columnIndex['dateAdded'], dateRenderer);
        tcm.setDataCellRenderer(this.__columnIndex['liked'], new qx.ui.table.cellrenderer.Image());

        var self = this;
        tcm.addListener('widthChanged', function(e) {
          switch (e.getData().col) {
            case self.__columnIndex['nowPlaying']:
              tcm.setColumnWidth(e.getData().col, 22);
              break;
          }
        });

        // Set default column widths
        tcm.setColumnWidth(this.__columnIndex['nowPlaying'], 22);
        tcm.setColumnWidth(this.__columnIndex['title'], 200);
        tcm.setColumnWidth(this.__columnIndex['artist'], 200);
        tcm.setColumnWidth(this.__columnIndex['album'], 200);
        tcm.setColumnWidth(this.__columnIndex['disc'], 50);
        tcm.setColumnWidth(this.__columnIndex['track'], 50);
        tcm.setColumnWidth(this.__columnIndex['genre'], 100);
        tcm.setColumnWidth(this.__columnIndex['duration'], 70);
        tcm.setColumnWidth(this.__columnIndex['compilation'], 70);
        tcm.setColumnWidth(this.__columnIndex['playCount'], 50);
        tcm.setColumnWidth(this.__columnIndex['year'], 50);
        tcm.setColumnWidth(this.__columnIndex['dateAdded'], 150);
        tcm.setColumnWidth(this.__columnIndex['liked'], 60);

        this.addListener("keypress", this.onKeypress, this);
        this.addListener("columnVisibilityMenuCreateEnd", this.on_columnVisibilityMenuCreateEnd, this);
        this.addListener("dragstart", this.on_dragstart, this);

        /*
         -------------------------------------------------------------------------
         Context Menu
         -------------------------------------------------------------------------
         */

        this.__songsContextMenu = new qx.ui.menu.Menu();
        this.__selectAllCommand = new qx.ui.command.Command("Ctrl+A");
        this.__selectAllCommand.addListener("execute", this.onSelectAllCommand, this);

        this.__selectAllButton = new qx.ui.menu.Button(this.tr("Select All"), "", this.__selectAllCommand);
        this.__songsContextMenu.add(this.__selectAllButton);

        this.__songsContextMenu.add(new qx.ui.menu.Separator());

        this.__playCommand = new qx.ui.command.Command("Ctrl+P");
        this.__playCommand.addListener("execute", this.onPlayCommand, this);

        this.addListener('dblclick', this.onPlayCommand, this);

        this.__playButton = new qx.ui.menu.Button(this.tr("Play"), "", this.__playCommand);
        this.__songsContextMenu.add(this.__playButton);

        this.__playNextCommand = new qx.ui.command.Command('');
        this.__playNextCommand.addListener('execute', this.onPlayNextCommand, this);

        this.__playNextButton = new qx.ui.menu.Button(this.tr("Play Next"), "", this.__playNextCommand);
        this.__songsContextMenu.add(this.__playNextButton);

        this.__queueCommand = new qx.ui.command.Command("Ctrl+Q");
        this.__queueCommand.addListener("execute", this.on_cmd_queue, this);

        this.__queueButton = new qx.ui.menu.Button(this.tr("Queue"), "", this.__queueCommand);
        this.__songsContextMenu.add(this.__queueButton);

        this.__replaceQueueCommand = new qx.ui.command.Command("Ctrl+R");
        this.__replaceQueueCommand.addListener("execute", this.onReplaceQueueCommand, this);

        this.__replaceQueueButton = new qx.ui.menu.Button(this.tr("Replace Queue"), "", this.__replaceQueueCommand);
        this.__songsContextMenu.add(this.__replaceQueueButton);

        this.__songsContextMenu.add(new qx.ui.menu.Separator());

        this.__filterForArtistCommand = new qx.ui.command.Command();
        this.__filterForArtistCommand.addListener("execute", this.onFilterForArtistCommand, this);

        this.__filterForArtistButton = new qx.ui.menu.Button(this.tr("Filter for Artist"), "", this.__filterForArtistCommand);
        this.__songsContextMenu.add(this.__filterForArtistButton);

        this.__filterForAlbumCommand = new qx.ui.command.Command();
        this.__filterForAlbumCommand.addListener("execute", this.onFilterForAlbumCommand, this);

        this.__filterForAlbumButton = new qx.ui.menu.Button(this.tr("Filter for Album"), "", this.__filterForAlbumCommand);
        this.__songsContextMenu.add(this.__filterForAlbumButton);

        this.__songsContextMenu.add(new qx.ui.menu.Separator());

        this.__downloadCommand = new qx.ui.command.Command("Ctrl+F");
        this.__downloadCommand.addListener("execute", this.onDownloadCommand, this);

        this.__downloadButton = new qx.ui.menu.Button(this.tr("Download Song"), "", this.__downloadCommand);
        this.__songsContextMenu.add(this.__downloadButton);

        this.__songsContextMenu.add(new qx.ui.menu.Separator());

        this.__favoriteCommand = new qx.ui.command.Command();
        this.__favoriteCommand.addListener('execute', this.onFavoriteCommand, this);

        this.__favoriteButton = new qx.ui.menu.Button(this.tr("Favorite"), "", this.__favoriteCommand);
        this.__songsContextMenu.add(this.__favoriteButton);

        this.__editCommand = new qx.ui.command.Command("Ctrl+I");
        this.__editCommand.addListener("execute", this.onEditCommand, this);

        this.__editButton = new qx.ui.menu.Button(this.tr("Info"), "", this.__editCommand);
        this.__songsContextMenu.add(this.__editButton);

        this.setContextMenu(this.__songsContextMenu);

        this.setDraggable(true);
        this.setFocusCellOnPointerMove(true);

        qooxtunes.ui.ctl.PlaybackControl.getInstance().addListener('play', function(e) {
          var id = e.getData(),
            rows = this.__tableModel.getDataAsMapArray();
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].songId === id) {
              this.__tableModel.setValue(this.__columnIndex['nowPlaying'], i, "qooxtunes/icon/16/now-playing-github.png");
              if (!rows[i].playCount) {
                rows[i].playCount = 0;
              }
              this.__tableModel.setValue(this.__columnIndex['playCount'], i, parseInt(rows[i].playCount) + 1);

              this.scrollCellVisible(this.__columnIndex['nowPlaying'], i, true);
              this.setFocusedCell(this.__columnIndex['nowPlaying'], i);
            } else {
              this.__tableModel.setValue(this.__columnIndex['nowPlaying'], i, "");
            }
          }

          for (i = 0; i < this.__allSongs.length; i++) {
            if (this.__allSongs[i].songId === id) {
              this.__allSongs[i].nowPlaying = "qooxtunes/icon/16/now-playing-github.png";
              if (!this.__allSongs[i].playCount) {
                this.__allSongs[i].playCount = 0;
              }
              this.__allSongs[i].playCount = parseInt(this.__allSongs[i].playCount) + 1;
            } else {
              this.__allSongs[i].nowPlaying = "";
            }
          }

          this.__currentSong = id;
        }, this);

        this.addListener('appear', function(e) {
          this.loadColumnState();

          tcm.addListener('widthChanged', function(e) {
            this.saveColumnState();
          }, this);
          tcm.addListener('orderChanged', function(e) {
            this.saveColumnState();
          }, this);
          tcm.addListener('visibilityChanged', function(e) {
            this.saveColumnState();
          }, this);
        }, this);
      }
    }
  });

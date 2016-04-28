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
      __search_expression: '',
      __search_regex: '',
      __search_case_sensitive: false,
      __allSongs: [],
      __currentPlaylist: null,

      search: function(searchValue, column) {
        var sortColumn = this.__tableModel.getSortColumnIndex(),
          sortAscending = this.__tableModel.isSortAscending(),
          matches = [];

        if (!searchValue) {
          matches = this.__availableSongs;
        } else {
          if (!column) {
            column = 'searchValue';

          }

          searchValue = searchValue.split(' ');
          for (var i = 0; i < searchValue.length; i++) {
            searchValue[i] = searchValue[i].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
          }

          var matches = [];
          for (var i = 0; i < this.__availableSongs.length; i++) {
            var searchField = this.__availableSongs[i][column].replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
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

        this.__tableModel.setDataAsMapArray(matches);
        this.__tableModel.sortByColumn(sortColumn, sortAscending);
      },

      buildTableModel: function() {
        this.__tableModel = new qx.ui.table.model.Simple();
        this.__columnIndex = {};

        this.__tableModel.setColumns(
          [
            "_SongID",
            "_SearchValue",
            this.tr("Title"),
            this.tr("Artist"),
            this.tr("Album"),
            this.tr("Disc"),
            this.tr("Track"),
            this.tr("Genre"),
            this.tr("Year"),
            this.tr("Duration"),
            this.tr("Plays"),
            this.tr("Rating")
          ],
          [
            'songId',
            'searchValue',
            'title',
            'artist',
            'album',
            'disc',
            'track',
            'genre',
            'year',
            'duration',
            'playCount',
            'rating'
          ]
        );

        this.__columnIndex['song_id'] = 0;
        this.__columnIndex['search_value'] = 1;
        this.__columnIndex['title'] = 2;
        this.__columnIndex['artist'] = 3;
        this.__columnIndex['album'] = 4;
        this.__columnIndex['disc'] = 5;
        this.__columnIndex['track'] = 6;
        this.__columnIndex['genre'] = 7;
        this.__columnIndex['year'] = 8;
        this.__columnIndex['duration'] = 9;
        this.__columnIndex['playCount'] = 10;
        this.__columnIndex['rating'] = 11;

        var self = this;
        function multiSort(a, b, sortKey) {
          if (!sortKey) {
            return 0;
          }

          var diff = 0;
          for (var i = 0; i < sortKey.length; i++) {
            var aVal = a[sortKey[i]];
            var bVal = b[sortKey[i]];

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

        // sort albums with a subsort of track number (with songid as fallback)
        this.__tableModel.setSortMethods(self.__columnIndex['album'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['album'],
              self.__columnIndex['track'],
              self.__columnIndex['disc'],
              self.__columnIndex['songId']
            ]);
          }
        });

        this.__tableModel.setSortMethods(self.__columnIndex['genre'], {
          ascending: function(row1, row2) {
            return multiSort(row1, row2, [
              self.__columnIndex['genre']
            ]);
          },
          descending: function(row1, row2) {
            return -multiSort(row1, row2, [
              self.__columnIndex['genre']
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
      },

      loadAll: function() {
        this.__currentPlaylist = null;
        if (this.__allSongs.length !== 0) {
          var sortColumn = this.__tableModel.getSortColumnIndex(),
            ascending = this.__tableModel.isSortAscending();
          this.__availableSongs = this.__allSongs;
          this.__tableModel.setDataAsMapArray(this.__allSongs, false);
          this.__tableModel.sortByColumn(sortColumn, ascending);
          return;
        }

        var self = this;
        qooxtunes.ui.dlg.WaitPopup.show(this.tr("Loading library..."));
        qooxtunes.api.Koel.getData(function(result) {
          var rowData = [];
          var playData = {};

          for (var i = 0; i < result.interactions.length; i++) {
            var interaction = result.interactions[i];
            if (!playData[interaction.song_id]) {
              playData[interaction.song_id] = 0;
            }

            playData[interaction.song_id] += interaction.play_count;
          }

          for (var i = 0; i < result.artists.length; i++) {
            var artist = result.artists[i];
            for (var j = 0; j < artist.albums.length; j++) {
              var album = artist.albums[j];
              for (var k = 0; k < album.songs.length; k++) {
                var song = album.songs[k],
                  year = album.year,
                  disc = song.disc === 0 ? '' : song.disc,
                  track = song.track,
                  playCount = playData[song.id] ? playData[song.id] : 0,
                  rating = null,
                  search_value = song.title + ' ' + artist.name + ' ' + album.name,
                  genre = song.genre;
                rowData.push({
                  songId: song.id,
                  searchValue: search_value,
                  title: song.title,
                  artist: artist.name,
                  album: album.name,
                  disc: disc,
                  track: track,
                  genre: genre,
                  year: year,
                  duration: qooxtunes.util.Time.intToStr(song.length),
                  playCount: playCount,
                  rating: rating
                });
              }
            }
          }
          self.__tableModel.setDataAsMapArray(rowData, false);
          self.__tableModel.sortByColumn(3, true);
          self.__allSongs = rowData;
          self.__availableSongs = self.__allSongs;
          qooxtunes.ui.dlg.WaitPopup.hide();
        });
      },

      loadPlaylist: function(id) {
        var sortColumn = this.__tableModel.getSortColumnIndex(),
          ascending = this.__tableModel.isSortAscending(),
          rows = [];
        this.__currentPlaylist = qooxtunes.api.Koel.getPlaylistById(id);
        for (var i = 0; i < this.__allSongs.length; i++) {
          if (this.__currentPlaylist.songs.indexOf(this.__allSongs[i].songId) > -1) {
            // in playlist
            rows.push(this.__allSongs[i]);
          }
        }

        this.__availableSongs = rows;
        this.__tableModel.setDataAsMapArray(rows, false);
        this.__tableModel.sortByColumn(sortColumn, ascending);
      },

      clear: function() {
        this.__tableModel.setData([]);
      },

      on_dragstart: function(e) {
        e.addAction("copy");
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

        if (data[3] != null) {
          row[this.__columnIndex['albumartist']] = data[3][0];
        }
        else {
          row[this.__columnIndex['albumartist']] = null;
        }

        row[this.__columnIndex['album']] = data[7];
        row[this.__columnIndex['disc']] = data[9];

        var search_value = '';
        if (!this.__limited_columns) {
          // track
          row[this.__columnIndex['track']] = (data[8] !== null) ? parseInt(data[8]) : null;
          row[this.__columnIndex['genre']] = (data[4] !== null) ? data[4][0] : null;
          row[this.__columnIndex['year']] = (data[5] !== null) ? parseInt(data[5]) : null;

          row[this.__columnIndex['duration']] = this.__tableModel.getValue(this.__columnIndex['duration'], row_idx, 0);
          row[this.__columnIndex['playCount']] = this.__tableModel.getValue(this.__columnIndex['playCount'], row_idx, 0);

          row[this.__columnIndex['rating']] = (data[6] !== null) ? parseInt(data[6]) : null;
        }

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

      on_cmd_select_all: function(e) {
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

      on_cmd_play: function(e) {
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

      on_cmd_filter_for_artist: function(e) {
        var items = this.getSelectedItems();

        if (items.length != 1) {
          return;
        }

        this.fireDataEvent('searchChanged', 'artist=' + items[0].artist);
      },

      on_cmd_filter_for_album: function(e) {
        var items = this.getSelectedItems();

        if (items.length != 1) {
          return;
        }

        this.fireDataEvent('searchChanged', 'album=' + items[0].album);
      },

      on_cmd_edit: function(e) {
        var selectedItems = this.getSelectedItems(),
          selectionRange = this.getSelectedIndices();

        if (selectedItems.length < 1) {
          return;
        }

        var self = this;
        if (selectedItems.length == 1) {
          var numSongs = this.__tableModel.getRowCount();

          qooxtunes.ui.dlg.SongInfo.go(selectedItems[0], selectionRange[0],
            function(data) {
              return self.on_editor_ok(data);
            },
            function(data) {
              return self.on_editor_next(data);
            },
            function(data) {
              return self.on_editor_prev(data);
            });
        }
        else {
          qooxtunes.ui.dlg.multi_song_editor.go(song_ids,
            function(song_ids, data) {
              return self.on_multi_editor_ok(song_ids, data);
            }
          );
        }

      },

      on_cmd_download: function(e) {
        var sel_items = this.getSelectedItems();

        if (sel_items.length < 1) {
          return;
        }

        var ids = [];
        for (var i = 0; i < sel_items.length; i++) {
          ids.push(sel_items[i][0]);
        }

        var host = this.__rpc_ext.get_hostname();
        var port = this.__rpc_ext.get_port();
        this.__rpc_ext.callAsync("get_download_songs_url", [
            ids
          ],
          function(path) {
            var url = '//' + host + ":" + port + path;

            window.navigate_away = true;
            window.location = url;
          }
        );

      },

      on_cmd_export: function(e) {
        var sel_items = this.getSelectedItems();

        if (sel_items.length < 1) {
          return;
        }

        var ids = [];
        for (var i = 0; i < sel_items.length; i++) {
          ids.push(sel_items[i][0]);
        }

        qooxtunes.ui.dlg.WaitPopup.show(this.tr("Exporting..."));

        var self = this;
        this.__rpc_ext.callAsync("export_songs", [
            ids
          ],
          function(result) {
            qooxtunes.ui.dlg.WaitPopup.hide();

            if (result == false) {
              qooxtunes.ui.dlg.MsgBox.go(self.tr("Export"), self.tr("Error exporting to export folder."));
            }
            else {
              var msg = '';
              if (sel_items.length == 1) {
                msg = self.tr('Successfully exported song to export folder.');
              }
              else {
                msg = self.tr('Successfully exported songs to export folder.');
              }
              qooxtunes.ui.dlg.MsgBox.go(self.tr("Export"), msg);
            }
          }
        );

      },

      on_changeSelection: function(e) {
        var num_selected = this.getSelectionModel().getSelectedCount();

        if (num_selected == 0) {
          this.__btn_play.setEnabled(false);
          this.__btn_queue.setEnabled(false);
          this.__btn_filter_for_artist.setEnabled(false);
          this.__btn_filter_for_album.setEnabled(false);
          this.__btn_edit.setEnabled(false);
          this.__btn_export.setEnabled(false);
          this.__btn_download.setEnabled(false);
          this.__btn_export.setLabel(this.tr('Export song'));
          this.__btn_download.setLabel(this.tr('Download song'));
        }
        else if (num_selected == 1) {
          this.__btn_play.setEnabled(true);
          this.__btn_queue.setEnabled(true);
          this.__btn_filter_for_artist.setEnabled(true);
          this.__btn_filter_for_album.setEnabled(true);
          this.__btn_edit.setEnabled(true);
          this.__btn_export.setEnabled(true);
          this.__btn_download.setEnabled(true);
          this.__btn_download.setLabel(this.tr('Download song'));
          this.__btn_export.setLabel(this.tr('Export song'));
        }
        else {
          this.__btn_play.setEnabled(true);
          this.__btn_queue.setEnabled(true);
          this.__btn_filter_for_artist.setEnabled(false);
          this.__btn_filter_for_album.setEnabled(false);
          this.__btn_edit.setEnabled(true);
          this.__btn_export.setEnabled(true);
          this.__btn_download.setEnabled(true);
          this.__btn_export.setLabel(this.tr('Export songs'));
          this.__btn_download.setLabel(this.tr('Download songs'));
        }
      },

      get_cookie_name: function() {
        var str_cookie_name = (this.__limited_columns)
          ? 'songs_table_column_state_limited'
          : 'songs_table_column_state';

        return str_cookie_name;
      },

      __loading_column_state: false,

      load_column_state: function() {
        this.__loading_column_state = true;

        var str_cookie_name = this.get_cookie_name();

        var str_state = qx.module.Cookie.get(str_cookie_name);

        if (str_state === null) {
          this.__loading_column_state = false;
          return;
        }

        var state = JSON.parse(str_state);

        var tcm = this.getTableColumnModel();
        var num_cols = tcm.getOverallColumnCount();

        // if the application code has changed and the number of columns is different since
        // the time we saved the cookie, just ignore the cookie
        if (state.col_order.length != num_cols) {
          this.__loading_column_state = false;
          return;
        }

        tcm.setColumnsOrder(state.col_order);

        for (var i = 0; i < num_cols; i++) {
          tcm.setColumnVisible(i, (state.col_visible[i] == 1));
          tcm.setColumnWidth(i, state.col_widths[i]);
        }

        this.__loading_column_state = false;
      },

      save_column_state: function() {
        if (this.__loading_column_state) {
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

        var str_state = JSON.stringify(state);

        var str_cookie_name = this.get_cookie_name();

        qx.module.Cookie.set(str_cookie_name, str_state, 1000);
      },


      init: function() {
        // this.__rpc = qooxtunes.io.remote.xbmc.getInstance ();
        // this.__rpc_ext = qooxtunes.io.remote.xbmc_ext.getInstance ();

        var sm = this.getSelectionModel();

        sm.setSelectionMode(qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);

        sm.addListener('changeSelection', this.on_changeSelection, this);

        // this.__tableModel.indexedSelection (0, sm);

        var tcm = this.getTableColumnModel();
        tcm.setColumnVisible(0, false);
        tcm.setColumnVisible(1, false);

        // Set default column widths
        tcm.setColumnWidth(this.__columnIndex['title'], 200);
        tcm.setColumnWidth(this.__columnIndex['artist'], 200);
        tcm.setColumnWidth(this.__columnIndex['album'], 200);
        tcm.setColumnWidth(this.__columnIndex['disc'], 50);
        tcm.setColumnWidth(this.__columnIndex['track'], 50);
        tcm.setColumnWidth(this.__columnIndex['genre'], 100);
        tcm.setColumnWidth(this.__columnIndex['duration'], 70);
        tcm.setColumnWidth(this.__columnIndex['playCount'], 50);
        tcm.setColumnWidth(this.__columnIndex['year'], 50);

        // fix the year so it doesn't show up as "2,014".
        if (!this.__limited_columns) {
          var cr = new qx.ui.table.cellrenderer.Number();
          var nf = new qx.util.format.NumberFormat();
          nf.setGroupingUsed(false);
          cr.setNumberFormat(nf);
          tcm.setDataCellRenderer(this.__columnIndex['year'], cr);
        }

        this.addListener("columnVisibilityMenuCreateEnd", this.on_columnVisibilityMenuCreateEnd, this);
        this.addListener("dragstart", this.on_dragstart, this);

        /*
         -------------------------------------------------------------------------
         Context Menu
         -------------------------------------------------------------------------
         */

        this.__cm_songs = new qx.ui.menu.Menu();
        this.__cmd_select_all = new qx.ui.command.Command("Ctrl+A");
        this.__cmd_select_all.addListener("execute", this.on_cmd_select_all, this);

        this.__btn_select_all = new qx.ui.menu.Button(this.tr("Select All"), "", this.__cmd_select_all);
        this.__cm_songs.add(this.__btn_select_all);

        this.__cm_songs.add(new qx.ui.menu.Separator());

        this.__cmd_play = new qx.ui.command.Command("Ctrl+P");
        this.__cmd_play.addListener("execute", this.on_cmd_play, this);

        this.addListener('dblclick', this.on_cmd_play, this);

        this.__btn_play = new qx.ui.menu.Button(this.tr("Play"), "", this.__cmd_play);
        this.__cm_songs.add(this.__btn_play);

        this.__cmd_queue = new qx.ui.command.Command("Ctrl+Q");
        this.__cmd_queue.addListener("execute", this.on_cmd_queue, this);

        this.__btn_queue = new qx.ui.menu.Button(this.tr("Queue"), "", this.__cmd_queue);
        this.__cm_songs.add(this.__btn_queue);

        this.__cm_songs.add(new qx.ui.menu.Separator());

        this.__cmd_filter_for_artist = new qx.ui.command.Command();
        this.__cmd_filter_for_artist.addListener("execute", this.on_cmd_filter_for_artist, this);

        this.__btn_filter_for_artist = new qx.ui.menu.Button(this.tr("Filter for Artist"), "", this.__cmd_filter_for_artist);

        this.__cmd_filter_for_album = new qx.ui.command.Command();
        this.__cmd_filter_for_album.addListener("execute", this.on_cmd_filter_for_album, this);

        this.__btn_filter_for_album = new qx.ui.menu.Button(this.tr("Filter for Album"), "", this.__cmd_filter_for_album);

        if (!this.__limited_columns) {
          this.__cm_songs.add(this.__btn_filter_for_artist);
          this.__cm_songs.add(this.__btn_filter_for_album);
          this.__cm_songs.add(new qx.ui.menu.Separator());
        }

        this.__cmd_edit = new qx.ui.command.Command("Ctrl+I");
        this.__cmd_edit.addListener("execute", this.on_cmd_edit, this);

        this.__btn_edit = new qx.ui.menu.Button(this.tr("Info"), "", this.__cmd_edit);
        this.__cm_songs.add(this.__btn_edit);

        this.__cm_songs.add(new qx.ui.menu.Separator());

        this.__cmd_export = new qx.ui.command.Command("Ctrl+E");
        this.__cmd_export.addListener("execute", this.on_cmd_export, this);

        this.__btn_export = new qx.ui.menu.Button(this.tr("Export Song"), "", this.__cmd_export);
        this.__cm_songs.add(this.__btn_export);

        this.__cmd_download = new qx.ui.command.Command("Ctrl+F");
        this.__cmd_download.addListener("execute", this.on_cmd_download, this);

        this.__btn_download = new qx.ui.menu.Button(this.tr("Download Song"), "", this.__cmd_download);
        this.__cm_songs.add(this.__btn_download);

        this.setContextMenu(this.__cm_songs);

        this.addListener('appear', function(e) {
          this.load_column_state();

          tcm.addListener('widthChanged', function(e) {
            this.save_column_state();
          }, this);
          tcm.addListener('orderChanged', function(e) {
            this.save_column_state();
          }, this);
          tcm.addListener('visibilityChanged', function(e) {
            this.save_column_state();
          }, this);
        }, this);
      }
    }
  });

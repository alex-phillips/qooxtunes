qx.Class.define("qooxtunes.ui.dlg.SongInfo",
  {
    extend: qooxtunes.ui.dlg.Standard,

    type: "singleton",

    statics: {
      go: function(song, songIndex, okCallback, nextCallback, previousCallback) {
        var dlg = qooxtunes.ui.dlg.SongInfo.getInstance();
        dlg.__songRow = song;
        dlg.__songIndex = songIndex;
        dlg.__okCallback = okCallback;
        dlg.__nextCallback = nextCallback;
        dlg.__previousCallback = previousCallback;
        dlg.loadSongDetails(function() {
          dlg.open();
        });
      }
    },

    construct: function() {
      /*
       #asset(qx/icon/${qx.icontheme}/16/mimetypes/media-audio.png)
       */
      this.base(arguments, this.tr("Song Info"), "icon/16/mimetypes/media-audio.png");
      this.init();
    },

    members: {
      __song: -1,

      // used when stepping through library with next/prev
      __songIndex: -1,
      __num_songs: 0,

      __ok_callback: null,
      __nextCallback: null,
      __previousCallback: null,

      __clean: true,

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          // enter
          this.on_btn_ok_execute();
        }
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.on_btn_cancel_execute();
        }
      },

      validate: function() {
        var title = this.__tf_title.getValue().trim();
        if (title == '') {
          qooxtunes.ui.dlg.msgbox.go(this.tr("Error"), this.tr("Title cannot be empty."));
          return false;
        }

        var artist = this.__tf_artist.getValue().trim();
        if (artist == '') {
          qooxtunes.ui.dlg.msgbox.go(this.tr("Error"), this.tr("Artist cannot be empty."));
          return false;
        }

        return true;
      },


      go_previous: function() {
        var previous = this.__previousCallback();

        this.__songRow = previous.row;
        this.__songIndex = [previous.songIndex];

        this.loadSongDetails();
      },

      on_btn_previous_execute: function() {
        var me = this;
        // if (!this.__clean) {
        //   if (!this.validate()) {
        //     return;
        //   }
        //   this.save_songdetails(function() {
        //     me.go_previous();
        //   });
        //   return;
        // }

        this.go_previous();
      },

      go_next: function() {
        var next = this.__nextCallback();

        this.__songRow = next.row;
        this.__songIndex = [next.songIndex];

        this.loadSongDetails();
      },


      on_btn_next_execute: function() {
        var me = this;
        if (!this.__clean) {
          // if (!this.validate()) {
          //   return;
          // }
          // this.save_songdetails(function() {
          //   me.go_next();
          // });
          // return;
        }

        this.go_next();
      },

      on_btn_ok_execute: function() {
        if (this.__clean) {
          this.close();
        }

        if (!this.validate()) {
          return;
        }

        var me = this;
        this.save_songdetails(function() {
          me.__ok_callback(me.gather_song_data());
          me.close();
        });
      },

      on_btn_cancel_execute: function() {
        this.close();
      },

      on_input: function() {
        this.__clean = false;
      },


      on_tf_title_input: function() {
        this.updateSongSummary();
      },

      on_tf_albumartist_input: function() {
        this.updateSongSummary();
      },

      on_tf_album_input: function() {
        this.updateSongSummary();
      },

      update_ui: function() {
        if (this.__songIndex > 0) {
          this.__btn_previous.setEnabled(true);
        }
        else {
          this.__btn_previous.setEnabled(false);
        }

        if (this.__songIndex < this.__num_songs - 1) {
          this.__btn_next.setEnabled(true);
        }
        else {
          this.__btn_next.setEnabled(false);
        }
      },

      request_songdetails: function(song_id, open_after_load) {
        if (typeof open_after_load === 'undefined') {
          open_after_load = false;
        }

        var rpc = qooxtunes.io.remote.xbmc.getInstance();

        // note: there seems to be a bug in the GetSongDetails call that 'file' doesn't
        // work as documented

        var me = this;
        rpc.callAsync('AudioLibrary.GetSongDetails',
          [song_id,
            ['title', 'artist', 'albumartist', 'genre',
              'year', 'rating', 'album', 'track', 'duration',
              'comment', 'lyrics', 'musicbrainztrackid', 'musicbrainzartistid',
              'musicbrainzalbumid', 'musicbrainzalbumartistid', 'playcount',
              'fanart', 'thumbnail', 'file', 'albumid', 'lastplayed',
              'disc', 'genreid', 'artistid', 'displayartist', 'albumartistid']
          ],
          function(result) {

            var songdetails = result.songdetails;

            me.loadSongDetails(songdetails);
            me.__current_song_id = song_id;
            me.update_ui();

            if (open_after_load) {
              me.open();
            }

          });
      },

      gather_song_data: function() {
        if (this.__clean) {
          return null;
        }

        return null;

        return {
          songId: this.__songInfo.songId,
          title: this.__tf_title.getValue().trim(),
          artist: this.__tf_artist.getValue().trim(),
          album: this.__tf_album.getValue().trim(),
          track: this.__tf_track_number.getValue().trim(),
          disc: this.__tf_disc_number.getValue().trim(),
          genre: this.__tf_genre.getValue().trim(),
          year: this.__tf_year.getValue().trim()
        };
      },


      save_songdetails: function(callback) {
        var params = this.gather_song_data();

        var rpc = qooxtunes.io.remote.xbmc.getInstance();

        var me = this;
        rpc.callAsync('AudioLibrary.SetSongDetails',
          params,
          function(result) {
            callback();
          });
      },

      updateSongSummary: function() {
        var str_duration = qooxtunes.util.Time.intToStr(this.__songInfo.info.song.length);

        this.__l_title.setValue(this.__tf_title.getValue() + " (" + str_duration + ")");
        this.__l_artist.setValue(this.__tf_artist.getValue());
        this.__l_album.setValue(this.__tf_album.getValue());

        this.__l_plays.setValue("" + this.__songInfo.info.play_count);
      },

      loadSongDetails: function(callback) {
        var self = this;
        qooxtunes.ui.dlg.WaitPopup.show("Loading song info...");
        qooxtunes.api.Koel.getAllSongInfo(this.__songRow.songId, function(data) {
          qooxtunes.ui.dlg.WaitPopup.hide();
          if (!data) {
            return callback();
          }

          self.__songInfo = data;
          self.__artworkImage.setSource(self.__songInfo.info.song.album.cover);

          self.__tf_title.setValue(self.__songInfo.info.song.title);

          // @TODO -- handle multiple artists
          self.__tf_artist.setValue(self.__songInfo.info.song.album.artist.name);

          self.__tf_album.setValue(self.__songInfo.info.song.album.name);

          self.__tf_year.setValue("" + self.__songInfo.info.song.album.year);

          // @TODO - handle multiple genres
          self.__tf_genre.setValue(self.__songInfo.info.song.genre);

          self.__tf_rating.setValue("");
          self.__tf_disc_number.setValue("" + self.__songInfo.info.song.disc);
          self.__tf_track_number.setValue("" + self.__songInfo.info.song.track);

          if (!self.__songInfo.details.lyrics) {
            self.__songInfo.details.lyrics = '';
          }
          self.__lyricsField.setValue(self.__songInfo.details.lyrics.replace(/<br\s*[\/]?>/gi, '\n'));

          self.updateSongSummary.call(self);
          if (callback) {
            callback();
          }
        });
      },

      buildLabel: function(value, bold) {
        var lb;

        lb = new qx.ui.basic.Label(value);

        if (typeof bold === "undefined") {
          bold = false;
        }

        if (bold) {
          lb.setFont(qx.bom.Font.fromString("11px sans-serif bold"));
        }
        else {
          lb.setFont(qx.bom.Font.fromString("11px sans-serif"));
        }

        return lb;
      },

      init: function() {
        this.set({width: 534, height: 593});

        this.__tv_editor = new qx.ui.tabview.TabView();

        this.__tvp_summary = new qx.ui.tabview.Page(this.tr("Summary"));
        this.__tvp_summary.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__tvp_summary);

        var y = 16;

        this.__artworkImage = new qx.ui.basic.Image("");
        // this.__artworkImage.setDecorator(qx.ui.decoration.MSingleBorder);
        this.__artworkImage.setScale(true);
        this.__artworkImage.setWidth(120);
        this.__artworkImage.setHeight(120);
        this.__tvp_summary.add(this.__artworkImage, {left: 16, top: y});

        this.__l_title = new qx.ui.basic.Label('');
        this.__tvp_summary.add(this.__l_title, {left: 152, top: y});

        y += 20;

        this.__l_artist = new qx.ui.basic.Label('');
        this.__tvp_summary.add(this.__l_artist, {left: 152, top: y});

        y += 20;

        this.__l_album = new qx.ui.basic.Label('');
        this.__tvp_summary.add(this.__l_album, {left: 152, top: y});

        y += 88;

        var lb;

        /*
         lb = this.buildLabel ('Kind:', true);
         this.__tvp_summary.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Size:', true);
         this.__tvp_summary.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Bit Rate:', true);
         this.__tvp_summary.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Sample Rate:', true);
         this.__tvp_summary.add (lb, { right: 380, top: y});

         y += 16;
         */

        lb = this.buildLabel ('Date Modified:', true);
        this.__tvp_summary.add (lb, { right: 380, top: y});

        y += 16;

        lb = this.buildLabel(this.tr('Plays:'), true);
        this.__tvp_summary.add(lb, {right: 380, top: y});

        this.__l_plays = this.buildLabel('');
        this.__tvp_summary.add(this.__l_plays, {left: 100, top: y});

        y += 16;

        lb = this.buildLabel(this.tr('Last Played:'), true);
        this.__tvp_summary.add(lb, {right: 380, top: y});

        this.__tvp_info = new qx.ui.tabview.Page(this.tr("Info"));
        this.__tvp_info.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__tvp_info);

        this.addListener('keypress', this.onKeypress, this);

        var y = 16;

        lb = this.buildLabel(this.tr('Name'));
        this.__tvp_info.add(lb, {top: y, left: 16});
        y += 14;

        this.__tf_title = new qx.ui.form.TextField();
        this.__tvp_info.add(this.__tf_title, {top: y, left: 16, right: 16});
        this.__tf_title.addListener("input", this.on_tf_title_input, this);
        this.__tf_title.addListener("input", this.on_input, this);
        y += 40;

        lb = this.buildLabel(this.tr('Artist'));
        this.__tvp_info.add(lb, {top: y, left: 16});

        lb = this.buildLabel(this.tr('Year'));
        this.__tvp_info.add(lb, {top: y, left: 410});

        y += 14;

        this.__tf_artist = new qx.ui.form.TextField();
        this.__tf_artist.setWidth(378);
        this.__tf_artist.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_artist, {top: y, left: 16});

        this.__tf_year = new qx.ui.form.TextField();
        this.__tf_year.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_year, {top: y, left: 410, right: 16});

        y += 40;

        lb = this.buildLabel(this.tr('Album'));
        this.__tvp_info.add(lb, {top: y, left: 16});
        y += 14;

        this.__tf_album = new qx.ui.form.TextField();
        this.__tf_album.addListener("input", this.on_tf_album_input, this);
        this.__tf_album.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_album, {top: y, left: 16, right: 16});
        y += 40;

        lb = this.buildLabel(this.tr('Comments'));
        this.__tvp_info.add(lb, {top: y, left: 16});
        y += 14;

        this.__ta_comment = new qx.ui.form.TextArea();
        this.__ta_comment.setHeight(60);
        this.__ta_comment.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__ta_comment, {top: y, left: 16, right: 16});

        y += 73;

        lb = this.buildLabel(this.tr('Genre'));
        this.__tvp_info.add(lb, {top: y, left: 16});
        y += 14;

        this.__tf_genre = new qx.ui.form.TextField();
        this.__tf_genre.addListener("changeValue", this.on_input, this);
        this.__tvp_info.add(this.__tf_genre, {top: y, left: 16, right: 16});

        y += 40;

        lb = this.buildLabel(this.tr('Rating'));
        this.__tvp_info.add(lb, {top: y, left: 16});

        lb = this.buildLabel(this.tr('Disc #'));
        this.__tvp_info.add(lb, {top: y, left: 224});

        lb = this.buildLabel(this.tr('Track #'));
        this.__tvp_info.add(lb, {top: y, right: 16});

        y += 14;

        this.__tf_rating = new qx.ui.form.TextField();
        this.__tf_rating.setWidth(40);
        this.__tf_rating.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_rating, {top: y, left: 16});

        this.__tf_disc_number = new qx.ui.form.TextField();
        this.__tf_disc_number.setWidth(40);
        this.__tf_disc_number.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_disc_number, {top: y, left: 224});

        this.__tf_track_number = new qx.ui.form.TextField();
        this.__tf_track_number.setWidth(40);
        this.__tf_track_number.addListener("input", this.on_input, this);
        this.__tvp_info.add(this.__tf_track_number, {top: y, right: 16});

        y += 40;

        this.__tvp_lyrics = new qx.ui.tabview.Page(this.tr("Lyrics"));
        this.__tvp_lyrics.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__tvp_lyrics);

        this.__lyricsField = new qx.ui.form.TextArea();
        // this.__lyricsField.setHeight(60);
        this.__lyricsField.addListener("input", this.on_input, this);
        this.__tvp_lyrics.add(this.__lyricsField, {top: 0, left: 0, right: 0, bottom: 0});

        this.add(this.__tv_editor, {top: 16, left: 16, right: 16, bottom: 62});

        var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

        // prev/next buttons
        this.__btn_previous = new qx.ui.form.Button(this.tr("Previous"));
        this.__btn_previous.set({width: 100});
        this.__btn_previous.addListener("execute", this.on_btn_previous_execute, this);
        bl1.add(this.__btn_previous);

        this.__btn_next = new qx.ui.form.Button(this.tr("Next"));
        this.__btn_next.set({width: 100});
        this.__btn_next.addListener("execute", this.on_btn_next_execute, this);
        bl1.add(this.__btn_next);

        this.add(bl1, {left: 16, bottom: 16});


        var bl2 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

        // ok and cancel buttons
        this.__btn_ok = new qx.ui.form.Button(this.tr("OK"));
        this.__btn_ok.set({width: 100});
        this.__btn_ok.addListener("execute", this.on_btn_ok_execute, this);
        bl2.add(this.__btn_ok);

        this.__btn_cancel = new qx.ui.form.Button(this.tr("Cancel"));
        this.__btn_cancel.set({width: 100});
        this.__btn_cancel.addListener("execute", this.on_btn_cancel_execute, this);
        bl2.add(this.__btn_cancel);

        this.add(bl2, {right: 16, bottom: 16});

        this.addListener('appear', function() {
          this.__tf_title.focus();
          this.__tf_title.setTextSelection(0);
        }, this);
      }
    }
  });

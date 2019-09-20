qx.Class.define("qooxtunes.ui.dlg.SongInfo",
  {
    extend: qooxtunes.ui.dlg.Standard,

    type: "singleton",

    statics: {
      go: function(song, songIndex, okCallback, numSongs, nextCallback, previousCallback) {
        var dlg = qooxtunes.ui.dlg.SongInfo.getInstance();
        dlg.__songRow = song;
        dlg.__songIndex = songIndex;
        dlg.__numSongs = numSongs;
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
      __api: null,

      /**
       * Used when stepping through library with next/prev
       */
      __songIndex: -1,
      __numSongs: 0,

      __song: -1,
      __okCallback: null,
      __nextCallback: null,
      __previousCallback: null,
      __clean: true,

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          // enter
          this.onOkButtonExecute();
        }
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.onCancelButtonExecute();
        }
      },

      validate: function() {
        var title = this.__titleField.getValue().trim();
        if (title == '') {
          qooxtunes.ui.dlg.MsgBox.go(this.tr("Error"), this.tr("Title cannot be empty."));
          return false;
        }

        var artist = this.__artistField.getValue().trim();
        if (artist == '') {
          qooxtunes.ui.dlg.MsgBox.go(this.tr("Error"), this.tr("Artist cannot be empty."));
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

      onPreviousButtonExecute: function() {
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


      onNextButtonExecute: function() {
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

      onOkButtonExecute: function() {
        if (this.__clean) {
          this.close();
        }

        if (!this.validate()) {
          return;
        }

        var self = this;
        this.__api.updateSong({
            songs: [
              this.__song.id
            ],
            data: {
              albumName: this.__albumField.getValue(),
              albumYear: this.__yearField.getValue(),
              artistName: this.__artistField.getValue(),
              compilationState: this.__song.album.compilationState,
              disc: this.__discNumberField.getValue(),
              genre: this.__genreField.getValue(),
              lyrics: this.__lyricsField.getValue(),
              title: this.__titleField.getValue(),
              track: this.__trackNumberField.getValue()
            }
          },
          function() {
            // self.__okCallback(self.gather_song_data());
            self.close();
          }
        );
      },

      onCancelButtonExecute: function() {
        this.close();
      },

      onInput: function() {
        this.__clean = false;
      },

      update_ui: function() {
        if (this.__songIndex > 0) {
          this.__previousButton.setEnabled(true);
        }
        else {
          this.__previousButton.setEnabled(false);
        }

        if (this.__songIndex < this.__numSongs - 1) {
          this.__nextButton.setEnabled(true);
        }
        else {
          this.__nextButton.setEnabled(false);
        }
      },

      gather_song_data: function() {
        if (this.__clean) {
          return null;
        }

        return null;

        return {
          songId: this.__songInfo.songId,
          title: this.__titleField.getValue().trim(),
          artist: this.__artistField.getValue().trim(),
          album: this.__albumField.getValue().trim(),
          track: this.__trackNumberField.getValue().trim(),
          disc: this.__discNumberField.getValue().trim(),
          genre: this.__genreField.getValue().trim(),
          year: this.__yearField.getValue().trim()
        };
      },


      save_songdetails: function(callback) {
        // var params = this.gather_song_data();
        //
        // var rpc = qooxtunes.io.remote.xbmc.getInstance();
        //
        // var me = this;
        // rpc.callAsync('AudioLibrary.SetSongDetails',
        //   params,
        //   function(result) {
        //     callback();
        //   });
      },

      updateSongSummary: function() {
        this.__titleLabel.setValue(this.__titleField.getValue() + " (" + this.__songRow.duration + ")");
        this.__artistLabel.setValue(this.__artistField.getValue());
        this.__albumLabel.setValue(this.__albumField.getValue());
        this.__playsLabel.setValue("" + this.__songRow.playCount);
        this.__yearLabel.setValue("" + (this.__songRow.year ? this.__songRow.year : ''));
        this.__discLabel.setValue("" + (this.__songRow.disc ? this.__songRow.disc : ''));
        this.__trackLabel.setValue("" + (this.__songRow.track ? this.__songRow.track : ''));
      },

      updateArtistSummary: function() {
        if (!this.__songInfo.artist_info.bio) {
          return;
        }

        var image = '<div style="padding: 0 10px 0 0; float: left;"><img src="' + this.__songInfo.artist_info.image + '" alt="artist image" width="200px"/></div>';
        this.__artistSummary.setHtml(image + this.__songInfo.artist_info.bio.full);
      },

      loadSongDetails: function(callback) {
        var self = this;
        qooxtunes.ui.dlg.WaitPopup.show("Loading song info...");
        this.__api.getSongInfo(this.__songRow.songId, function(data) {
          qooxtunes.ui.dlg.WaitPopup.hide();
          if (!data) {
            return callback();
          }

          self.__songInfo = data;
          self.__song = self.__api.getSongById(self.__songRow.songId);
          self.__artworkImage.setSource(self.__song.album.cover);

          self.__titleField.setValue(self.__song.title);
          self.__artistField.setValue(self.__song.album.artist.name);
          self.__albumField.setValue(self.__song.album.name);
          self.__yearField.setValue("" + (self.__song.album.year ? self.__song.album.year : ''));
          self.__genreField.setValue(self.__song.genre ? self.__song.genre : '');
          self.__discNumberField.setValue("" + (self.__song.disc ? self.__song.disc : ''));
          self.__trackNumberField.setValue("" + self.__song.track);

          if (!self.__songInfo.lyrics) {
            self.__songInfo.lyrics = '';
          }
          self.__lyricsField.setValue(self.__songInfo.lyrics.replace(/<br\s*[\/]?>/gi, '\n'));

          self.updateSongSummary.call(self);
          self.updateArtistSummary.call(self);
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
        this.__api = qooxtunes.api.API.get();

        this.set({width: 534, height: 593});

        this.__tv_editor = new qx.ui.tabview.TabView();

        this.__summaryPage = new qx.ui.tabview.Page(this.tr("Summary"));
        this.__summaryPage.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__summaryPage);

        var y = 16;

        this.__artworkImage = new qx.ui.basic.Image("");
        // this.__artworkImage.setDecorator(qx.ui.decoration.MSingleBorder);
        this.__artworkImage.setScale(true);
        this.__artworkImage.setWidth(120);
        this.__artworkImage.setHeight(120);
        this.__summaryPage.add(this.__artworkImage, {left: 16, top: y});

        this.__titleLabel = new qx.ui.basic.Label('');
        this.__summaryPage.add(this.__titleLabel, {left: 152, top: y});

        y += 20;

        this.__artistLabel = new qx.ui.basic.Label('');
        this.__summaryPage.add(this.__artistLabel, {left: 152, top: y});

        y += 20;

        this.__albumLabel = new qx.ui.basic.Label('');
        this.__summaryPage.add(this.__albumLabel, {left: 152, top: y});

        y += 88;

        var lb;

        /*
         lb = this.buildLabel ('Kind:', true);
         this.__summaryPage.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Size:', true);
         this.__summaryPage.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Bit Rate:', true);
         this.__summaryPage.add (lb, { right: 380, top: y});

         y += 16;

         lb = this.buildLabel ('Sample Rate:', true);
         this.__summaryPage.add (lb, { right: 380, top: y});

         y += 16;
         */

        lb = this.buildLabel('Year:', true);
        this.__summaryPage.add(lb, {right: 380, top: y});

        this.__yearLabel = this.buildLabel('');
        this.__summaryPage.add(this.__yearLabel, {left: 100, top: y});

        y += 16;

        lb = this.buildLabel(this.tr('Plays:'), true);
        this.__summaryPage.add(lb, {right: 380, top: y});

        this.__playsLabel = this.buildLabel('');
        this.__summaryPage.add(this.__playsLabel, {left: 100, top: y});

        y += 16;

        lb = this.buildLabel(this.tr('Disc:'), true);
        this.__summaryPage.add(lb, {right: 380, top: y});

        this.__discLabel = this.buildLabel('');
        this.__summaryPage.add(this.__discLabel, {left: 100, top: y});

        y += 16;

        lb = this.buildLabel(this.tr('Track:'), true);
        this.__summaryPage.add(lb, {right: 380, top: y});

        this.__trackLabel = this.buildLabel('');
        this.__summaryPage.add(this.__trackLabel, {left: 100, top: y});

        this.__infoPage = new qx.ui.tabview.Page(this.tr("Info"));
        this.__infoPage.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__infoPage);

        this.addListener('keypress', this.onKeypress, this);

        var y = 16;

        lb = this.buildLabel(this.tr('Name'));
        this.__infoPage.add(lb, {top: y, left: 16});
        y += 14;

        this.__titleField = new qx.ui.form.TextField();
        this.__infoPage.add(this.__titleField, {top: y, left: 16, right: 16});
        this.__titleField.addListener("input", this.onInput, this);
        y += 40;

        lb = this.buildLabel(this.tr('Artist'));
        this.__infoPage.add(lb, {top: y, left: 16});

        lb = this.buildLabel(this.tr('Year'));
        this.__infoPage.add(lb, {top: y, left: 410});

        y += 14;

        this.__artistField = new qx.ui.form.TextField();
        this.__artistField.setWidth(378);
        this.__artistField.addListener("input", this.onInput, this);
        this.__infoPage.add(this.__artistField, {top: y, left: 16});

        this.__yearField = new qx.ui.form.TextField();
        this.__yearField.addListener("input", this.onInput, this);
        this.__infoPage.add(this.__yearField, {top: y, left: 410, right: 16});

        y += 40;

        lb = this.buildLabel(this.tr('Album'));
        this.__infoPage.add(lb, {top: y, left: 16});
        y += 14;

        this.__albumField = new qx.ui.form.TextField();
        this.__albumField.addListener("input", this.onInput, this);
        this.__infoPage.add(this.__albumField, {top: y, left: 16, right: 16});
        y += 40;

        // lb = this.buildLabel(this.tr('Comments'));
        // this.__infoPage.add(lb, {top: y, left: 16});
        // y += 14;
        //
        // this.__ta_comment = new qx.ui.form.TextArea();
        // this.__ta_comment.setHeight(60);
        // this.__ta_comment.addListener("input", this.onInput, this);
        // this.__infoPage.add(this.__ta_comment, {top: y, left: 16, right: 16});
        //
        // y += 73;

        lb = this.buildLabel(this.tr('Genre'));
        this.__infoPage.add(lb, {top: y, left: 16});
        y += 14;

        this.__genreField = new qx.ui.form.TextField();
        this.__genreField.addListener("changeValue", this.onInput, this);
        this.__infoPage.add(this.__genreField, {top: y, left: 16, right: 16});

        y += 40;

        lb = this.buildLabel(this.tr('Disc #'));
        this.__infoPage.add(lb, {top: y, left: 224});

        lb = this.buildLabel(this.tr('Track #'));
        this.__infoPage.add(lb, {top: y, right: 16});

        y += 14;

        this.__discNumberField = new qx.ui.form.TextField();
        this.__discNumberField.setWidth(40);
        this.__discNumberField.addListener("input", this.onInput, this);
        this.__infoPage.add(this.__discNumberField, {top: y, left: 224});

        this.__trackNumberField = new qx.ui.form.TextField();
        this.__trackNumberField.setWidth(40);
        this.__trackNumberField.addListener("input", this.onInput, this);
        this.__infoPage.add(this.__trackNumberField, {top: y, right: 16});

        y += 40;

        this.__artistPage = new qx.ui.tabview.Page(this.tr("Artist"));
        this.__artistPage.setLayout(new qx.ui.layout.Canvas());
        this.__artistSummary = new qx.ui.embed.Html();
        this.__artistSummary.setOverflow("auto", "auto");
        this.__artistSummary.setDecorator("main");
        this.__artistSummary.setBackgroundColor("white");

        this.__artistPage.add(this.__artistSummary, {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        });
        this.__tv_editor.add(this.__artistPage);

        this.__lyricsPage = new qx.ui.tabview.Page(this.tr("Lyrics"));
        this.__lyricsPage.setLayout(new qx.ui.layout.Canvas());
        this.__tv_editor.add(this.__lyricsPage);

        this.__lyricsField = new qx.ui.form.TextArea();
        this.__lyricsField.addListener("input", this.onInput, this);
        this.__lyricsPage.add(this.__lyricsField, {top: 0, left: 0, right: 0, bottom: 0});

        this.add(this.__tv_editor, {top: 16, left: 16, right: 16, bottom: 62});

        var bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

        // prev/next buttons
        this.__previousButton = new qx.ui.form.Button(this.tr("Previous"));
        this.__previousButton.set({width: 100});
        this.__previousButton.addListener("execute", this.onPreviousButtonExecute, this);
        bl1.add(this.__previousButton);

        this.__nextButton = new qx.ui.form.Button(this.tr("Next"));
        this.__nextButton.set({width: 100});
        this.__nextButton.addListener("execute", this.onNextButtonExecute, this);
        bl1.add(this.__nextButton);

        this.add(bl1, {left: 16, bottom: 16});


        var bl2 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

        // ok and cancel buttons
        this.__okButton = new qx.ui.form.Button(this.tr("OK"));
        this.__okButton.set({width: 100});
        this.__okButton.addListener("execute", this.onOkButtonExecute, this);
        bl2.add(this.__okButton);

        this.__cancelButton = new qx.ui.form.Button(this.tr("Cancel"));
        this.__cancelButton.set({width: 100});
        this.__cancelButton.addListener("execute", this.onCancelButtonExecute, this);
        bl2.add(this.__cancelButton);

        this.add(bl2, {right: 16, bottom: 16});

        this.addListener('appear', function() {
          this.__titleField.focus();
          this.__titleField.setTextSelection(0);
        }, this);
      }
    }
  });

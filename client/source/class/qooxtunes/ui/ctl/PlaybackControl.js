qx.Class.define("qooxtunes.ui.ctl.PlaybackControl", {
  type: 'singleton',
  extend: qx.ui.container.Composite,

  construct: function() {
    this.base(arguments);
    this.init();
  },

  members: {
    __player: null,
    __playing: false,
    __shuffled: false,
    __repeat: false,
    __current_song_id: null,
    __manipulatingScrubber: false,
    __update_interval: 500,
    __update_timeout: null,

    __active_track: null,
    __current_playlist_id: -1,
    __current_playlist_position: -1,
    __repeatOne: false,

    onBackButtonPress: function(e) {
      if (this.__player.getCurrentTime() > 5) {
        this.__player.setCurrentTime(0);
        return;
      }

      var song = this.__nowPlaying.getPrevious();
      if (song) {
        this.playSong(song.songId);
      }
    },

    onForwardButtonPress: function(e) {
      var song = this.__nowPlaying.getNext();
      if (song) {
        this.playSong(song.songId);
      }
    },

    updateControls: function() {
      if (this.__player.isPaused()) {
        this.__playButton.setIcon('qooxtunes/icon/32/play.png');
      } else {
        this.__playButton.setIcon('qooxtunes/icon/32/pause.png');
      }
    },

    songEnded: function() {
      var song = this.__nowPlaying.getNext();
      if (song) {
        this.playSong(song.songId);
      } else {
        this.__player.setSource('');
      }
    },

    getPlayer: function() {
      return this.__player;
    },

    play: function(songs) {
      if (songs) {
        if (songs instanceof Array) {
          this.__nowPlaying.setQueue(songs);
          this.playSong(this.__nowPlaying.getNext().songId);
        } else {
          this.playSong(songs.songId);
        }
      } else {
        var song = this.__nowPlaying.getNext();
        if (song) {
          this.playSong(song.songId);
        }
      }
    },

    queue: function(songs) {
      if (!songs) {
        return;
      }

      this.__nowPlaying.append(songs);
    },

    playSong: function(id) {
      if (!id) {
        return;
      }

      this.__titleLabel.setValue('Loading');
      this.__artistLabel.setValue('-');
      this.__scrubber.setValue(0);
      this.__scrubber.setEnabled(false);

      var self = this;
      qooxtunes.api.Koel.getSongInfo(id, function(data) {
        if (!data) {
          console.error(Error('Error fetching song data'));
        } else {
          self.__titleLabel.setValue(data.song.title);
          self.__artistLabel.setValue(data.song.album.artist.name + ' - ' + data.song.album.name);
          self.__totalTimeLabel.setValue(qooxtunes.util.Time.intToStr(data.song.length));
          self.__artworkImage.setSource(data.song.album.cover);
          qooxtunes.ui.dlg.ArtworkViewer.getInstance().setSource(data.song.album.cover);
        }
      });
      self.__player.setSource(qooxtunes.api.Koel.getSongUrl(id));
      self.__player.play();
    },

    onPlayButtonPress: function(e) {
      if (this.__player.getSource().match(/index\.html/)) {
        var next = this.__nowPlaying.getNext();
        if (next) {
          this.playSong(next.songId);
        }
      } else {
        if (!this.__player.isPaused()) {
          this.__player.pause();
        } else {
          this.__player.play();
        }
      }

      this.updateControls();
    },

    onNowPlayingButtonPress: function(e) {
      if (this.__nowPlaying.isHidden()) {
        this.__nowPlaying.show();
        this.__nowPlaying.placeToWidget(this.__nowPlayingButton);
      } else {
        this.__nowPlaying.hide();
      }
    },

    on_btn_repeat_execute: function(e) {
      var me = this;
      // this.__rpc.callAsync("Player.SetRepeat", [player_id, "cycle"],
      //   function(result) {
      //     me.update_player();
      //   });
    },

    onShuffleButtonPress: function(e) {
      this.__nowPlaying.shuffle();
    },

    onScrubberMouseDown: function(e) {
      this.__manipulatingScrubber = true;
    },

    onScrubberMouseUp: function(e) {
      this.__player.setCurrentTime(this.__scrubber.getValue());
      this.__manipulatingScrubber = false;
    },

    onTimeUpdate: function(e) {
      var currTime = this.__player.getCurrentTime();
      var hour = Math.floor(currTime / 60);
      var sec = parseInt(currTime % 60);
      this.__timeElapsed.setValue(hour + ":" + (sec > 9 ? sec : "0" + sec));

      if (this.__player.getDuration() === Infinity) {
        this.__scrubber.setEnabled(false);
        this.__scrubber.setValue(0);
      } else {
        this.__scrubber.setEnabled(true);
        this.__scrubber.setMaximum(Math.floor(this.__player.getDuration()));
        if (!this.__manipulatingScrubber) {
          this.__scrubber.setValue(Math.floor(currTime));
        }
      }
    },

    init: function() {
      this.__nowPlaying = new qooxtunes.ui.ctl.NowPlaying();
      this.__nowPlaying.setPosition('bottom-center');
      this.__nowPlaying.addListener('playQueuedItem', function(e) {
        this.playSong.call(this, e.getData())
      }, this);

      this.setLayout(new qx.ui.layout.HBox(8));
      this.setHeight(76);

      this.__cl1 = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
      this.__cl1.setWidth(232);

      this.__bl1 = new qx.ui.container.Composite(new qx.ui.layout.HBox(8, 'center'));

      this.__backButton = new qx.ui.form.Button(null, "qooxtunes/icon/24/backward.png");
      this.__backButton.setDecorator(null);
      this.__backButton.addListener("mousedown", function(e) {
        this.__backButton.setIcon("qooxtunes/icon/24/backward-dark.png");
      }, this);
      this.__backButton.addListener("mouseup", function(e) {
        this.__backButton.setIcon("qooxtunes/icon/24/backward.png");
      }, this);
      this.__backButton.addListener("execute", this.onBackButtonPress, this);
      this.__bl1.add(this.__backButton);

      this.__playButton = new qx.ui.form.Button(null, "qooxtunes/icon/32/play.png");
      this.__playButton.setDecorator(null);
      this.__playButton.addListener("mousedown", function(e) {
        if (this.__playButton.getIcon() == "qooxtunes/icon/32/play.png") {
          this.__playButton.setIcon("qooxtunes/icon/32/play-dark.png")
        } else {
          this.__playButton.setIcon("qooxtunes/icon/32/pause-dark.png")
        }
      }, this);
      this.__playButton.addListener("execute", this.onPlayButtonPress, this);
      this.__bl1.add(this.__playButton);

      this.__forwardButton = new qx.ui.form.Button(null, "qooxtunes/icon/24/forward.png");
      this.__forwardButton.setDecorator(null);
      this.__forwardButton.addListener("mousedown", function(e) {
        this.__forwardButton.setIcon("qooxtunes/icon/24/forward-dark.png");
      }, this);
      this.__forwardButton.addListener("mouseup", function(e) {
        this.__forwardButton.setIcon("qooxtunes/icon/24/forward.png");
      }, this);
      this.__forwardButton.addListener("execute", this.onForwardButtonPress, this);
      this.__bl1.add(this.__forwardButton);

      // preload the alternate images so you don't get annoying flashes
      // the first time you click the buttons
      // not working
      /*qx.io.ImageLoader.load("qooxtunes/icon/24/backward-dark.png");
      qx.io.ImageLoader.load("qooxtunes/icon/32/play-dark.png");
      qx.io.ImageLoader.load("qooxtunes/icon/32/pause.png");
      qx.io.ImageLoader.load("qooxtunes/icon/32/pause-dark.png");
      qx.io.ImageLoader.load("qooxtunes/icon/24/forward-dark.png");*/

      this.__cl1.add(this.__bl1, {
        top: 16,
        left: 32
      });

      this.__cl2 = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
      this.__cl2.setBackgroundColor('#eee');
      // this.__cl2.setDecorator('rounded');

      this.__artworkImage = new qx.ui.basic.Image('qooxtunes/icon/64/music.png');
      // this.__artworkImage.setDecorator(qx.ui.decoration.MSingleBorder);
      this.__artworkImage.setScale(true);
      this.__artworkImage.setWidth(60);
      this.__artworkImage.setHeight(60);
      this.__artworkImage.addListener('click', function() {
        qooxtunes.ui.dlg.ArtworkViewer.go(this.__artworkImage.getSource());
      }, this);
      this.__cl2.add(this.__artworkImage, {
        left: 8,
        top: 8
      });

      this.__titleLabel = qooxtunes.util.UI.buildLabel('', 'medium', true);
      this.__titleLabel.setTextAlign('center');
      this.__cl2.add(this.__titleLabel, {
        top: 8,
        left: 76,
        right: 92
      });

      this.__artistLabel = qooxtunes.util.UI.buildLabel('', 'small', false);
      this.__artistLabel.setTextAlign('center');
      this.__cl2.add(this.__artistLabel, {
        top: 26,
        left: 76,
        right: 92
      });

      this.__nowPlayingButton = new qx.ui.form.Button(null, "qooxtunes/icon/32/list-ol.png");
      this.__nowPlayingButton.setDecorator(null);
      this.__nowPlayingButton.addListener("execute", this.onNowPlayingButtonPress, this);
      this.__cl2.add(this.__nowPlayingButton, {
        top: 16,
        right: 8
      });

      this.__btn_repeat = new qx.ui.form.Button(null, "qooxtunes/icon/16/loop.png");
      this.__btn_repeat.setDecorator(null);
      this.__btn_repeat.addListener("execute", this.on_btn_repeat_execute, this);
      this.__cl2.add(this.__btn_repeat, {
        top: 40,
        left: 76
      });

      this.__timeElapsed = qooxtunes.util.UI.buildLabel('', 'small', false);
      this.__timeElapsed.setWidth(48);
      this.__cl2.add(this.__timeElapsed, {
        top: 44,
        left: 112
      });

      this.__cl2.addListener('resize', function() {
        // hack -- really shouldn't access private members like this
        //this.__titleLabel.setWidth (this.__cl2.__computedLayout.width - 60 - 24 - 24);
        //this.__artistLabel.setWidth (this.__cl2.__computedLayout.width - 60 - 24 - 24);
        var w = this.__cl2.getBounds().width - 76 - 8;
        this.__titleLabel.setWidth(w);
        this.__artistLabel.setWidth(w);
      }, this);

      this.__scrubber = new qx.ui.form.Slider();
      // this.__scrubber.setDecorator('rounded_slider');
      this.__scrubber.setKnobFactor(0.001);
      this.__scrubber.setHeight(12);
      this.__scrubber.setBackgroundColor('#ccc');
      this.__scrubber.setEnabled(false)
      this.__scrubber.addListener('mousedown', this.onScrubberMouseDown, this);
      this.__scrubber.addListener('mouseup', this.onScrubberMouseUp, this);
      // this.__scrubber.addListener('changeValue', this.on_s_scrubber_changeValue, this);
      this.__cl2.add(this.__scrubber, {
        top: 45,
        left: 168,
        right: 148
      });

      this.__totalTimeLabel = qooxtunes.util.UI.buildLabel('', 'small', false);
      this.__totalTimeLabel.setTextAlign('right');
      this.__totalTimeLabel.setWidth(48);
      this.__cl2.add(this.__totalTimeLabel, {
        top: 44,
        right: 92
      });

      this.__btn_shuffle = new qx.ui.form.Button(null, "qooxtunes/icon/16/shuffle.png");
      this.__btn_shuffle.setDecorator(null);
      this.__btn_shuffle.addListener("execute", this.onShuffleButtonPress, this);
      this.__cl2.add(this.__btn_shuffle, {
        top: 40,
        right: 56
      });

      this.__cl3 = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
      this.__cl3.setWidth(232);

      this.add(this.__cl1);
      this.add(this.__cl2, {
        flex: 1
      });
      this.add(this.__cl3);

      this.__player = new qx.bom.media.Audio();
      this.__player.addListener('timeupdate', this.onTimeUpdate, this);
      this.__player.addListener('pause', this.updateControls, this);
      this.__player.addListener('play', this.updateControls, this);
      this.__player.addListener('ended', this.songEnded, this);
    }
  }

});

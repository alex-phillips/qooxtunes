qx.Class.define("qooxtunes.ui.ctl.PlaybackControl", {
  type: 'singleton',

  extend: qx.ui.container.Composite,

  events: {
    'play': 'qx.event.type.Data'
  },

  construct: function() {
    this.base(arguments);
    this.init();
  },

  members: {
    __api: null,

    __player: null,
    __playing: false,
    __shuffled: false,
    __repeat: false,
    __repeatOne: false,
    __current_song_id: null,
    __manipulatingScrubber: false,
    __update_interval: 500,
    __update_timeout: null,

    __active_track: null,
    __current_playlist_id: -1,
    __current_playlist_position: -1,

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
        this.__player.stop();
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

    queueNext: function(songs) {
      if (!songs) {
        return;
      }

      this.__nowPlaying.prepend(songs);
    },

    replaceQueue: function(songs) {
      if (!songs) {
        return;
      }

      this.__nowPlaying.replaceQueue(songs);
    },

    playSong: function(id, time) {
      if (!id) {
        return;
      }

      this.__scrubber.setValue(0);
      this.__scrubber.setEnabled(false);
      this.__titleLabel.setValue('Loading');
      this.__artistLabel.setValue('-');
      this.__timeElapsed.setValue('--:--');
      this.__totalTimeLabel.setValue('--:--');

      var self = this;
      this.__currentSong = this.__api.getSongById(id);

      this.__api.getSongPlayInfo(id, function(data) {
        if (!data) {
          console.error(Error('Error fetching song data'));
        } else {
          self.__currentSong = self.__api.getSongById(id);
          self.__titleLabel.setValue(self.__currentSong.title);
          self.__artistLabel.setValue(self.__currentSong.album.artist.name + ' - ' + self.__currentSong.album.name);
          self.__totalTimeLabel.setValue(qooxtunes.util.Time.intToStr(self.__currentSong.length));
          self.__scrubber.setMaximum(Math.floor(self.__currentSong.length));
          self.__scrubber.setEnabled(true);
          qooxtunes.ui.dlg.ArtworkViewer.getInstance().setSource(self.__currentSong.album.cover);
        }
      });

      this.__player.setSource(this.__api.getSongById(id), this.__api.getSongUrl(id, time));
      this.__player.play();
      this.fireDataEvent('play', id);
      this.__artworkImage.setSource(self.__currentSong.album.cover);
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
      if (!this.__repeat && !this.__repeatOne) {
        this.__repeat = true;
        this.__nowPlaying.setRepeat('all');
        this.__repeatButton.setIcon("qooxtunes/icon/16/loop-active-all.png");
      } else if (this.__repeat && !this.__repeatOne) {
        this.__repeat = false;
        this.__repeatOne = true;
        this.__nowPlaying.setRepeat('one');
        this.__repeatButton.setIcon("qooxtunes/icon/16/loop-active-one.png");
      } else {
        this.__repeat = false;
        this.__repeatOne = false;
        this.__nowPlaying.setRepeat('none');
        this.__repeatButton.setIcon("qooxtunes/icon/16/loop.png");
      }
    },

    onShuffleButtonPress: function(e) {
      if (this.__shuffled) {
        this.__shuffled = false;
        this.__nowPlaying.setShuffle(false);
        this.__shuffleButton.setIcon("qooxtunes/icon/16/shuffle.png");
      } else {
        this.__shuffled = true;
        this.__nowPlaying.setShuffle(true);
        this.__shuffleButton.setIcon("qooxtunes/icon/16/shuffle-active.png");
        this.__nowPlaying.shuffle();
      }
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

      if (!this.__currentSong) {
        this.__scrubber.setEnabled(false);
        this.__scrubber.setValue(0);
      } else {
        if (!this.__manipulatingScrubber) {
          this.__scrubber.setValue(Math.floor(this.__player.getCurrentTime()));
        }
      }
    },

    init: function() {
      this.__api = qooxtunes.api.Koel.getInstance();

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
      qx.io.ImageLoader.load("resource/qooxtunes/icon/16/shuffle.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/16/shuffle-active.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/16/loop.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/16/loop-active-all.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/16/loop-active-one.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/24/backward.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/24/backward-dark.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/24/forward.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/24/forward-dark.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/32/play.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/32/play-dark.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/32/pause.png");
      qx.io.ImageLoader.load("resource/qooxtunes/icon/32/pause-dark.png");

      this.__cl1.add(this.__bl1, {
        top: 16,
        left: 32
      });

      this.__cl2 = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
      this.__cl2.setBackgroundColor('#eee');
      this.__cl2.setDecorator('rounded');

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

      this.__repeatButton = new qx.ui.form.Button(null, "qooxtunes/icon/16/loop.png");
      this.__repeatButton.setDecorator(null);
      this.__repeatButton.addListener("execute", this.on_btn_repeat_execute, this);
      this.__cl2.add(this.__repeatButton, {
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
      this.__scrubber.setDecorator('rounded_slider');
      this.__scrubber.setKnobFactor(0.001);
      this.__scrubber.setHeight(12);
      this.__scrubber.setBackgroundColor('#ccc');
      this.__scrubber.setEnabled(false);
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

      this.__shuffleButton = new qx.ui.form.Button(null, "qooxtunes/icon/16/shuffle.png");
      this.__shuffleButton.setDecorator(null);
      this.__shuffleButton.addListener("execute", this.onShuffleButtonPress, this);
      this.__cl2.add(this.__shuffleButton, {
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

      if (qx.module.Cookie.get('use_advanced_player') === "true") {
        this.__player = new qooxtunes.ui.ctl.AdvancedPlayer();
        this.__advancedPlayer = true;
      } else {
        this.__player = new qooxtunes.ui.ctl.Player();
      }

      this.__player.addListener('timeupdate', this.onTimeUpdate, this);
      this.__player.addListener('pause', this.updateControls, this);
      this.__player.addListener('play', this.updateControls, this);
      this.__player.addListener('ended', this.songEnded, this);
    }
  }

});

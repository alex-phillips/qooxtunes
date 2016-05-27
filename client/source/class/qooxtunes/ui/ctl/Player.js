qx.Class.define('qooxtunes.ui.ctl.Player', {
    extend: qx.core.Object,

    events: {
      "play": "qx.event.type.Event",
      "pause": "qx.event.type.Event",
      "ended": "qx.event.type.Event",
      "timeupdate": "qx.event.type.Event"
    },

    construct: function() {
      this.base(arguments);
      this.init();
    },

    members: {
      __player: null,
      __transcodeStream: false,
      __currentTime: 0,
      __currentSong: null,
      __currentSourceUrl: null,
      __scrubbedTo: 0,

      init: function() {
        this.__player = new qx.bom.media.Audio();
        this.__player.addListener('play', function() {
          this.fireEvent('play');
        }, this);
        this.__player.addListener('pause', function() {
          this.fireEvent('pause');
        }, this);
        this.__player.addListener('ended', this.onEnd, this);
        this.__player.addListener('timeupdate', this.onProgress, this);
      },

      isPaused: function() {
        return this.__player.isPaused();
      },

      pause: function() {
        this.__player.pause();
      },

      play: function() {
        if (this.__transcodeStream && this.__currentTime > 0) {
          this.seekSource(this.__currentSourceUrl + '&time=' + this.__currentTime);
          this.__player.play();
        } else {
          this.__player.play();
        }
      },

      getCurrentTime: function() {
        if (this.__transcodeStream) {
          return this.__currentTime;
        }

        return this.__player.getCurrentTime();
      },

      setCurrentTime: function(time) {
        if (this.__transcodeStream) {
          var playing = !this.__player.isPaused();
          this.__scrubbedTo = time;
          this.seekSource(this.__currentSourceUrl + '&time=' + time);
          if (playing) {
            this.__player.play();
          }
        } else {
          this.__player.setCurrentTime(time);
        }
      },

      getDuration: function() {
        return this.__player.getDuration();
      },

      getSource: function() {
        return this.__player.getSource();
      },

      seekSource: function(url) {
        this.__player.setSource(url);
      },

      setSource: function(song, url) {
        this.__currentTime = 0;
        this.__scrubbedTo = 0;
        this.__currentSong = song;
        this.__currentSourceUrl = url;
        this.__player.setSource(url);
      },

      stop: function() {
        this.__player.setSource('');
      },

      onEnd: function() {
        this.fireEvent('ended');
      },

      onProgress: function() {
        if (this.getDuration() === Infinity) {
          this.__transcodeStream = true;
        } else {
          this.__transcodeStream = false;
        }
        this.__currentTime = this.__scrubbedTo + Math.floor(this.__player.getCurrentTime());
        this.fireEvent('timeupdate');
      }
    }
});

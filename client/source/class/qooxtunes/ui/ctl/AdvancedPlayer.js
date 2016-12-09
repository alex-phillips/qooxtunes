/**
 #asset(audiocogs/aurora.js)
 #asset(audiocogs/flac.js)
 #asset(audiocogs/mp3.js)
 #asset(audiocogs/aac.js)
*/
qx.Class.define('qooxtunes.ui.ctl.AdvancedPlayer', {
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
      __currentSong: null,
      __volume: 1,

      init: function() {
      },

      isPaused: function() {
        return !this.__player.playing;
      },

      pause: function() {
        this.__player.pause();
        this.fireEvent('pause');
      },

      play: function() {
        if (this.__player.playing) {
          return;
        }

        this.__player.play();

        var self = this;
        this.__player.on('end', function() {
          self.onEnd.call(self)
        });
        this.__player.on('progress', function() {
          self.onProgress.call(self)
        });
        this.__player.on('error', function(error) {
          console.log(error);
        });
        this.fireEvent('play');
      },

      getCurrentTime: function() {
        return this.__player.currentTime;
      },

      setCurrentTime: function(time) {
        this.__player.seek(time);
      },

      setVolume: function(value) {
        this.__volume = value;
        if (this.__player) {
          this.__player.volume = this.__volume;
        }
      },

      getDuration: function() {
        return this.__player.duration;
      },

      getSource: function() {
        return this.__player.asset.source.url;
      },

      setSource: function(song, url) {
        if (this.__player) {
          this.__player.stop();
        }

        this.__player = AV.Player.fromURL(url);
        this.__player.volume = this.__volume;
        this.__player.preload();
        this.__currentSong = song;
      },

      stop: function() {
        this.__player.stop();
      },

      onEnd: function() {
        this.fireEvent('ended');
      },

      onProgress: function() {
        this.fireEvent('timeupdate');
      }
    }
});

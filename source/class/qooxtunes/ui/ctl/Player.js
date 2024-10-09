qx.Class.define("qooxtunes.ui.ctl.Player", {
  extend: qx.core.Object,

  events: {
    play: "qx.event.type.Event",
    pause: "qx.event.type.Event",
    ended: "qx.event.type.Event",
    timeupdate: "qx.event.type.Event",
  },

  construct() {
    super();
    this.init();
  },

  members: {
    __player: null,
    __transcodeStream: false,
    __currentTime: 0,
    __currentSong: null,
    __currentSourceUrl: null,
    __scrubbedTo: 0,

    init() {
      this.__player = new qx.bom.media.Audio();
      this.__player.addListener("play", () => {
        this.fireEvent("play");
      });
      this.__player.addListener("pause", () => {
        this.fireEvent("pause");
      });
      this.__player.addListener("ended", this.onEnd, this);
      this.__player.addListener("timeupdate", this.onProgress, this);
    },

    isPaused() {
      return this.__player.isPaused();
    },

    pause() {
      this.__player.pause();
    },

    play() {
      if (this.__transcodeStream && this.__currentTime > 0) {
        this.__scrubbedTo = this.__currentTime;
        this.seekSource(
          this.__currentSourceUrl + "&time=" + this.__currentTime
        );
        this.__player.play();
      } else {
        this.__player.play();
      }
    },

    getCurrentTime() {
      if (this.__transcodeStream) {
        return this.__currentTime * 1000;
      }

      return this.__player.getCurrentTime() * 1000;
    },

    setCurrentTime(time) {
      time = time / 1000;
      if (this.__transcodeStream) {
        var playing = !this.__player.isPaused();
        this.__scrubbedTo = time;
        this.seekSource(this.__currentSourceUrl + "&time=" + time);
        if (playing) {
          this.__player.play();
        }
      } else {
        this.__player.setCurrentTime(time);
      }
    },

    getDuration() {
      return this.__player.getDuration();
    },

    getSource() {
      return this.__player.getSource();
    },

    seekSource(url) {
      this.__player.setSource(url);
    },

    setSource(song, url) {
      this.__currentTime = 0;
      this.__scrubbedTo = 0;
      this.__currentSong = song;
      this.__currentSourceUrl = url;
      this.__player.setSource(url);
    },

    setVolume(value) {
      this.__player.setVolume(value / 100);
    },

    stop() {
      this.__player.setSource("");
    },

    onEnd() {
      this.fireEvent("ended");
    },

    onProgress() {
      if (this.getDuration() === Infinity) {
        this.__transcodeStream = true;
      } else {
        this.__transcodeStream = false;
      }
      this.__currentTime =
        this.__scrubbedTo + Math.floor(this.__player.getCurrentTime());
      this.fireEvent("timeupdate");
    },
  },
});

qx.Class.define("qooxtunes.media.Player", {
  extend: qx.core.Object,

  construct() {
    super();
    this.init();
  },

  events: {
    timeUpdated: "qx.event.type.Data",
    startWaiting: "qx.event.type.Data",
    stopWaiting: "qx.event.type.Data",
    startLoading: "qx.event.type.Data",
    stopLoading: "qx.event.type.Data",
    toggleTimeMode: "qx.event.type.Data",
    changeState: "qx.event.type.Data",
    titleUpdated: "qx.event.type.Data",
    channelCountUpdated: "qx.event.type.Data",
    volumeChanged: "qx.event.type.Data",
    balanceChanged: "qx.event.type.Data",
    doubledModeToggled: "qx.event.type.Data",
    repeatToggled: "qx.event.type.Data",
    close: "qx.event.type.Data",
    play: "qx.event.type.Data",
    pause: "qx.event.type.Data",
    stop: "qx.event.type.Data",
  },

  members: {
    init(options) {
      options = {
        volume: 100,
        balance: 0,
        // skinUrl: 'https://cdn.rawgit.com/captbaritone/winamp-skins/master/v2/base-2.91.wsz'
      };

      this.media = new qooxtunes.media.Audio();
      // this.skin = Skin.init(document.getElementById('visualizer'), this.media._analyser);
      // this.state = '';

      this.setVolume(options.volume);
      this.setBalance(options.balance);
      // this.loadFromUrl(options.mediaFile.url, options.mediaFile.name);
      // var skinFile = new MyFile();
      // skinFile.setUrl(options.skinUrl);
      // this.setSkin(skinFile);

      this._registerListeners();
    },

    _registerListeners() {
      var self = this;

      this.media.addEventListener("timeupdate", function () {
        self.fireEvent("timeUpdated");
      });

      this.media.addEventListener("visualizerupdate", function (analyser) {
        // self.skin.visualizer.paintFrame(self.visualizerStyle, analyser);
      });
      this.media.addEventListener("ended", function () {
        // self.skin.visualizer.clear();
        self.setState("stop");
      });
      this.media.addEventListener("waiting", function () {
        self.fireEvent("startWaiting");
      });
      this.media.addEventListener("stopWaiting", function () {
        self.fireEvent("stopWaiting");
      });

      this.media.addEventListener("playing", function () {
        self.setState("play");
      });
    },

    /* Functions */
    setState(state) {
      this.state = state;
      this.fireDataEvent("changeState", this.state);
      this.fireDataEvent(this.state, null);
    },

    getState() {
      return this.state;
    },

    getDuration() {
      return this.media.duration();
    },

    getTimeRemaining() {
      return this.media.timeRemaining();
    },

    getTimeElapsed() {
      return this.media.timeElapsed();
    },

    getPercentComplete() {
      return this.media.percentComplete();
    },

    getChannelCount() {
      return this.media.channels();
    },

    getVolume() {
      return Math.round(this.media.getVolume() * 100);
    },

    seekToPercentComplete(percent) {
      this.media.seekToPercentComplete(percent);
    },

    toggleTimeMode() {
      this.fireEvent("toggleTimeMode");
    },

    play() {
      if (this.getState() === "play") {
        this.media.stop();
      }
      this.media.play();
      this.setState("play");
    },

    pause() {
      if (this.getState() === "pause") {
        this.media.play();
      } else if (this.getState() === "play") {
        this.media.pause();
        this.setState("pause");
      }
    },
    stop() {
      this.media.stop();
      this.setState("stop");
    },

    // From 0-100
    setVolume(volume) {
      // Ensure volume does not go out of bounds
      volume = Math.max(volume, 0);
      volume = Math.min(volume, 100);

      var percent = volume / 100;

      this.media.setVolume(percent);
      this.fireEvent("volumeChanged");
    },

    incrementVolumeBy(ammount) {
      this.setVolume(this.media.getVolume() * 100 + ammount);
    },

    toggleDoubledMode() {
      this.fireEvent("doubledModeToggled");
    },

    // From -100 to 100
    setBalance(balance) {
      this.media.setBalance(balance);
      this.fireEvent("balanceChanged");
    },

    getBalance() {
      return this.media.getBalance();
    },

    seekForwardBy(seconds) {
      this.media.seekToTime(this.media.timeElapsed() + seconds);
      this.fireEvent("timeUpdated");
    },

    toggleRepeat() {
      this.media.toggleRepeat();
      this.fireEvent("repeatTogggled");
    },

    toggleShuffle() {
      this.media.toggleShuffle();
      this.mainWindow.toggleShuffle();
    },

    close() {
      this.fireEvent("close");
      this.media.stop();
      this.setState("stop"); // Currently unneeded
    },

    // loadFromFileReference: function(fileReference) {
    //   var file = new MyFile();
    //   file.setFileReference(fileReference);
    //   if (new RegExp('(wsz|zip)$', 'i').test(fileReference.name)) {
    //     this.skin.setSkinByFile(file);
    //   } else {
    //     this.media.autoPlay = true;
    //     file.processBuffer(this._loadBuffer.bind(this));
    //   }
    // },

    // Used only for the initial load, since it must have a CORS header
    loadFromUrl(url) {
      var file = new qooxtunes.media.File();
      file.setUrl(url);
      file.processBuffer(this._loadBuffer.bind(this));
    },

    setSkin(file) {
      this.setLoadingState();
      this.skin.setSkinByFile(file, this.unsetLoadingState.bind(this));
    },

    setLoadingState() {
      this.fireEvent("startLoading");
    },

    unsetLoadingState() {
      this.fireEvent("stopLoading");
    },

    toggleVisualizer() {
      if (this.skin.visualizer.style === this.skin.visualizer.NONE) {
        this.skin.visualizer.setStyle(this.skin.visualizer.BAR);
      } else if (this.skin.visualizer.style === this.skin.visualizer.BAR) {
        this.skin.visualizer.setStyle(this.skin.visualizer.OSCILLOSCOPE);
      } else if (
        this.skin.visualizer.style === this.skin.visualizer.OSCILLOSCOPE
      ) {
        this.skin.visualizer.setStyle(this.skin.visualizer.NONE);
      }
      this.skin.visualizer.clear();
    },

    /* Listeners */
    _loadBuffer(buffer) {
      function setMetaData() {
        var kbps = "128";
        var khz = Math.round(this.media.sampleRate() / 1000).toString();
        // this.skin.font.setNodeToString(document.getElementById('kbps'), kbps);
        // this.skin.font.setNodeToString(document.getElementById('khz'), khz);
        this.fireEvent("channelCountUpdated");
        this.fireEvent("titleUpdated");
        this.fireEvent("timeUpdated");
      }

      // Note, this will not happen right away
      this.media.loadBuffer(buffer, setMetaData.bind(this));
    },

    /* Helpers */
    _timeObject(time) {
      var minutes = Math.floor(time / 60);
      var seconds = time - minutes * 60;

      return [
        Math.floor(minutes / 10),
        Math.floor(minutes % 10),
        Math.floor(seconds / 10),
        Math.floor(seconds % 10),
      ];
    },

    getNewFileReader() {
      return function () {};
    },

    isPaused() {
      return this.state === "pause";
    },
  },
});

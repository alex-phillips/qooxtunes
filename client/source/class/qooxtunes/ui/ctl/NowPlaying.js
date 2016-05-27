qx.Class.define("qooxtunes.ui.ctl.NowPlaying",
  {
    extend: qx.ui.popup.Popup,

    events: {
      "playQueuedItem": "qx.event.type.Data"
    },

    construct: function() {
      this.base(arguments);

      this.init();
    },

    members: {
      __repeat: false,
      __queue: [],
      __previous: [],
      __nowPlaying: null,
      __shuffleOn: false,

      append: function(songs) {
        if (songs instanceof Array) {
          this.__queue = this.__queue.concat(songs);
        } else {
          this.__queue.push(songs);
        }

        this.update();
      },

      prepend: function(songs) {
        if (songs instanceof Array) {
          this.__queue = songs.concat(this.__queue);
        } else {
          this.__queue.unshift(songs);
        }

        this.update();
      },

      update: function() {
        this.__itemPane.removeAll();
        var queuedCount = 0;
        for (var i = 0; i < this.__queue.length; i++) {
          if (queuedCount > 20) {
            break;
          }
          var song = this.__queue[i];
          var nowPlayingItem = new qooxtunes.ui.ctl.NowPlayingItem(i, song.songId, song.title, song.artist);
          nowPlayingItem.addListener('removeQueuedItem', this.removeQueuedItem(i), this);
          nowPlayingItem.addListener('queuedItemClicked', this.playQueuedItem(i), this);
          this.__itemPane.add(nowPlayingItem);
          queuedCount++;
        }

        if (queuedCount === 0) {
          var c = new qx.ui.container.Composite();
          c.setLayout(new qx.ui.layout.Canvas());
          c.setHeight(46);

          var l = new qx.ui.basic.Label(this.tr("Nothing queued."));
          c.add(l, {top: 8, left: 8});

          this.__itemPane.add(c);
        }
      },

      /**
       * Function to generate the callback to remove an queued item. Function
       * needs to be generated so that it references the correct index.
       *
       * @param  {int} index The index of the queued item to remove
       * @return {function}  The returned function
       */
      removeQueuedItem: function(index) {
        var self = this;
        return function() {
          self.__queue.splice(index, 1);
          self.update();
        }
      },

      playQueuedItem: function(index) {
        var self = this;
        return function() {
          for (var i = 0; i <= index; i++) {
            var song = self.getNext(true);
          }

          self.update();
          self.fireDataEvent('playQueuedItem', song.songId);
        }
      },

      setQueue: function(songs) {
        this.__nowPlaying = null;
        this.__previous = [];
        this.__queue = songs;
        this.update();
      },

      replaceQueue: function(songs) {
        this.__previous = [];
        this.__queue = songs;

        if (this.__shuffleOn) {
          this.shuffle();
        }

        this.update();
      },

      setRepeat: function(type) {
        switch (type) {
          case 'all':
          case 'one':
            this.__repeat = type;
            break;
          default:
            this.__repeat = false;
            break;
        }
      },

      setShuffle: function(enabled) {
        this.__shuffleOn = enabled ? true : false;
        if (this.__shuffleOn) {
          this.shuffle();
        }
      },

      shuffle: function() {
        this.__queue = shuffle(this.__queue);
        this.update();

        function shuffle(array) {
          var currentIndex = array.length, temporaryValue, randomIndex;

          // While there remain elements to shuffle...
          while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
          }

          return array;
        }
      },

      getNext: function(overrideRepeat) {
        if (this.__repeat === 'one' && !overrideRepeat) {
          return this.__nowPlaying;
        }

        if (this.__nowPlaying) {
          this.__previous.unshift(this.__nowPlaying);
        }

        if (this.__queue.length === 0) {
          if (!this.__repeat) {
            return null;
          }

          this.__queue = this.__previous.reverse();
          this.__previous = [];

          if (this.__shuffleOn) {
            this.shuffle();
          }
        }

        this.__nowPlaying = this.__queue.shift();

        this.update();

        return this.__nowPlaying;
      },

      getPrevious: function() {
        if (this.__previous.length > 0) {
          this.__queue.unshift(this.__nowPlaying);
          this.__nowPlaying = this.__previous.shift();
          this.update();

          return this.__nowPlaying;
        }
      },

      init: function() {
        this.setLayout(new qx.ui.layout.Canvas());

        this.set({
          width: 320,
          height: 500,
          autoHide: true
        });

        this.__itemPane = new qx.ui.container.Composite(new qx.ui.layout.VBox(0, null));

        this.add(new qx.ui.container.Scroll(this.__itemPane), {edge: 0});
        this.update();
      }
    }
  });

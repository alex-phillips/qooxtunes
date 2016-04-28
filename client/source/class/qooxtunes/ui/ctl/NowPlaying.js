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
      repeat: false,

      __queue: [],
      __previous: [],
      __nowPlaying: null,

      append: function(songs) {
        if (songs instanceof Array) {
          this.__queue = this.__queue.concat(songs);
        } else {
          this.__queue.push(songs);
        }

        this.update(this.__queue);
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
            var song = self.getNext();
          }

          self.fireDataEvent('playQueuedItem', song.songId);
        }
      },

      setQueue: function(songs) {
        this.__nowPlaying = null;
        this.__previous = [];
        this.__queue = songs;
        this.update();
      },

      shuffle: function() {
        this.__queue = shuffle(this.__queue);
        this.__previous = shuffle(this.__previous);
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

      getNext: function() {
        if (this.__nowPlaying) {
          this.__previous.unshift(this.__nowPlaying);
        }

        this.__nowPlaying = this.__queue.shift();

        if (this.__queue.length === 0) {
          this.__queue = this.__previous;
          this.__previous = [];
        }

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
          autoHide: false
        });

        this.__itemPane = new qx.ui.container.Composite(new qx.ui.layout.VBox(0, null, qx.ui.MSingleBorder));

        this.add(new qx.ui.container.Scroll(this.__itemPane), {edge: 0});
        this.update();
      }
    }
  });

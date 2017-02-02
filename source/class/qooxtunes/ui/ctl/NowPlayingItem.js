qx.Class.define("qooxtunes.ui.ctl.NowPlayingItem",
  {
    extend: qx.ui.container.Composite,

    events: {
      "removeQueuedItem": "qx.event.type.Event",
      "queuedItemClicked": "qx.event.type.Event"
    },

    construct: function(idx, id, title, artist) {
      this.base(arguments);

      this.__idx = idx;
      this.__id = id;
      this.__title = title;
      this.__artist = artist;

      this.init();
    },

    members: {
      __idx: -1,
      __id: -1,
      __title: '',
      __artist: '',

      init: function() {
        /*
        #asset(qx/icon/${qx.icontheme}/16/actions/window-close.png)
        */

        this.setLayout(new qx.ui.layout.Canvas());
        this.setHeight(46);

        this.__deleteButton = new qx.ui.form.Button(null, "icon/16/actions/window-close.png");
        this.__deleteButton.setDecorator(null);
        this.__deleteButton.setVisibility('hidden');
        this.__deleteButton.addListener('execute', function() {
          this.fireEvent('removeQueuedItem');
        }, this);
        this.addListener('mouseover', function(e) {
          this.__deleteButton.show();
        }, this);
        this.addListener('mouseout', function(e) {
          this.__deleteButton.hide();
        }, this);
        this.add(this.__deleteButton, {left: 0, top: 12});

        this.__cl = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        this.__cl.setDecorator(null);

        this.__l_title = qooxtunes.util.UI.buildLabel(this.__title, 'small', true);
        this.__cl.add(this.__l_title, {left: 0, top: 8});

        this.__l_artist = qooxtunes.util.UI.buildLabel(this.__artist, 'small', false);
        this.__cl.add(this.__l_artist, {left: 0, top: 22});

        this.__cl.addListener('mouseup', function() {
          this.fireEvent('queuedItemClicked');
        }, this);

        this.add(this.__cl, {left: 28, top: 0});
      }
    }
  });

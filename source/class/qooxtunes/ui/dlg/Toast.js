qx.Class.define("qooxtunes.ui.dlg.Toast",
  {
    extend: qx.ui.popup.Popup,

    type: 'singleton',

    statics: {

      go: function (html, icon) {
        if (icon === undefined) {
          icon = "information-white.png";
        }
        icon = "diesel/image/24/" + icon;

        var p = qooxtunes.ui.dlg.Toast.getInstance();

        p.atom.setIcon(icon);
        p.atom.setLabel(html);

        p.show();

        setTimeout(function () {
          p.startfadeIn();
        }, 50);
      }

    },

    construct: function () {
      this.base(arguments);
      this.init();
    },

    members: {

      fadetimer: 0,
      maxOpacity: 0.7,
      opacityIncrement: 0.05,
      opacityChangeInterval: 50,  // ms
      displayInterval: 5000,  // ms
      ctlWidth: 300,

      startfadeIn: function () {
        var me = this;
        this.fadetimer = setInterval(function () {
          me.fadeIn();
        }, this.opacityChangeInterval);
      },

      fadeIn: function () {
        var opacity_level = this.getOpacity();
        if (opacity_level == null) {
          opacity_level = 0;
        }
        opacity_level += this.opacityIncrement;

        if (opacity_level >= this.maxOpacity) {
          opacity_level = this.maxOpacity;
          clearInterval(this.fadetimer);
          this.fadetimer = null;

          var me = this;
          setTimeout(function () {
            me.startfadeOut();
          }, this.displayInterval);
        }
        this.set({ opacity: opacity_level });
      },

      startfadeOut: function () {
        var me = this;
        this.fadetimer = setInterval(function () {
          me.fadeOut();
        }, this.opacityChangeInterval);
      },

      fadeOut: function () {
        var opacity_level = this.getOpacity();
        opacity_level -= this.opacityIncrement;

        if (opacity_level <= 0) {
          opacity_level = 0;
          clearInterval(this.fadetimer);
          this.fadetimer = null;
        }
        this.set({ opacity: opacity_level });
      },

      init: function () {
        this.set({
          width: this.ctlWidth,
          height: 44,
          opacity: 0,
          layout: new qx.ui.layout.Canvas(),
          decorator: "rounded",
          backgroundColor: '#1a1a1a'
        });

        var icon = "diesel/image/24/information-white.png";
        this.atom = new qx.ui.basic.Atom('', icon);
        this.atom.set({
          rich: true,
          padding: 4,
          textColor: '#ffffff',
          backgroundColor: '#1a1a1a'
        });

        this.add(this.atom, { left: 0, top: 0, right: 0, bottom: 0 });

        this.addListener('appear', this._setPosition, this);
      },

      _setPosition: function () {
        var parent = this.getLayoutParent();
        if (parent) {
          var bounds = parent.getBounds();
          if (bounds) {
            this.moveTo(bounds.width - 45 - this.ctlWidth, 42);
          }
        }
      }
    }
  });

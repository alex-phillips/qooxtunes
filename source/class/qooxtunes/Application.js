/* ************************************************************************

 Copyright:

 License:

 Authors:

 ************************************************************************ */

/**
 * This is the main application class of your custom application "client"
 *
 * @asset(qooxtunes/*)
 */
qx.Class.define("qooxtunes.Application",
  {
    extend: qx.application.Standalone,


    /*
     *****************************************************************************
     MEMBERS
     *****************************************************************************
     */

    members: {
      __api: null,
      __loggedIn: false,

      /**
       * This method contains the initial application code and gets called
       * during startup of the application
       *
       * @lint ignoreDeprecated(alert)
       */
      main: function() {
        // Call super class
        this.base(arguments);

        // Enable logging in debug variant
        if (qx.core.Environment.get("qx.debug")) {
          // support native logging capabilities, e.g. Firebug for Firefox
          qx.log.appender.Native;
          // support additional cross-browser console. Press F7 to toggle visibility
          qx.log.appender.Console;
        }

        /*
         -------------------------------------------------------------------------
         Below is your actual application code...
         -------------------------------------------------------------------------
         */

        this.__api = qooxtunes.api.API.get();
        this.setUpLogin();
      },

      close: function() {
        this.base(arguments);

        if (this.__loggedIn && qooxtunes.util.Preferences.getInstance().get('confirmClosing', false)) {
          return "";
        }
      },

      logout: function() {
        var self = this;
        this.__api.logout(function(err) {
          self.__loggedIn = false;
          window.location.reload();
        });
      },

      setUpLogin: function() {
        var cl = new qx.ui.container.Composite(new qx.ui.layout.Canvas);
        this.getRoot().add(cl, {edge: 0});

        // this.branding_img = new qx.ui.basic.Image ('diesel/image/diesel.png');
        // cl.add (this.branding_img, { bottom : 2, right : 2 });

        this.login = new qooxtunes.ui.dlg.Login();
        this.login.addListener('login', this.setUpUI, this);
        this.login.init();
      },

      setUpUI: function() {
        this.__loggedIn = true;
        this.playbackControl = qooxtunes.ui.ctl.PlaybackControl.getInstance();
        this.getRoot().add(this.playbackControl, { top: 41, left: 8, right: 8 });

        this.tvMain = new qooxtunes.ui.tabview.Main();
        this.getRoot().add(this.tvMain, {top: 125, left: 8, right: 8, bottom: 8});

        /*
         * Set up 'logout' button with yes/no dialog
         */
        // var btn = new qx.ui.menu.Button("Logout", "qooxtunes/icon/16/logout.png");
        // btn.addListener("execute", function (e) {
        //   var self = this;
        //   qooxtunes.ui.dlg.Confirm.go("Are you sure you want to log out?",
        //     function () {
        //       self.logout();
        //     });
        // }, this);
        // menu.add(btn);

        var frame = new qx.ui.container.Composite(new qx.ui.layout.Grow());
        var menubar = new qooxtunes.ui.ctl.MenuBar();
        menubar.addListener('logout', this.logout, this);
        frame.add(menubar);
        this.getRoot().add(frame);
      }
    }
  });

qx.Class.define("qooxtunes.ui.ctl.MenuBar",
  {
    extend: qx.ui.menubar.MenuBar,

    events: {
      "logout": "qx.event.type.Event"
    },

    construct: function() {
      this.base(arguments);
      this.init();
    },

    members: {
      __api: null,

      __fileMenuButton: null,
      __helpMenuButton: null,

      init: function() {
        /*
         #asset(qx/icon/${qx.icontheme}/16/actions/application-exit.png)
         #asset(qx/icon/${qx.icontheme}/16/actions/list-add.png)
         #asset(qx/icon/${qx.icontheme}/16/actions/help-about.png)
         #asset(qx/icon/${qx.icontheme}/16/categories/system.png)
         */

        this.__api = qooxtunes.api.Koel.getInstance();

        this.__applicationMenuButton = new qx.ui.menubar.Button("myMusic", null, this.getApplicationMenu());
        this.__fileMenuButton = new qx.ui.menubar.Button("File", null, this.getFileMenu());

        this.add(this.__applicationMenuButton);
        this.add(this.__fileMenuButton);
      },

      getApplicationMenu: function() {
        var menu = new qx.ui.menu.Menu();

        var aboutCmd = new qx.ui.command.Command();
        aboutCmd.addListener("execute", function() {
          qooxtunes.ui.dlg.MsgBox.go("About", "myMusic version 1.0.0");
        }, this);
        var aboutButton = new qx.ui.menu.Button("About", 'icon/16/actions/help-about.png', aboutCmd);

        var settingsButtonCmd = new qx.ui.command.Command("Ctrl+/");
        settingsButtonCmd.addListener('execute', function() {
          qooxtunes.ui.dlg.Settings.go();
        });
        var settingsButton = new qx.ui.menu.Button("Settings", "icon/16/categories/system.png", settingsButtonCmd);

        menu.add(aboutButton);
        menu.addSeparator();
        menu.add(settingsButton);

        return menu;
      },

      getFileMenu: function() {
        var self = this;

        var menu = new qx.ui.menu.Menu();

        var newPlaylistButtonCmd = new qx.ui.command.Command("Ctrl+n");
        newPlaylistButtonCmd.addListener('execute', function() {
          qooxtunes.ui.dlg.NewPlaylistForm.go('Create Playlist', 'Please enter the name of the new playlist');
        }, this);
        var newPlaylistButton = new qx.ui.menu.Button("New Playlist", "icon/16/actions/list-add.png", newPlaylistButtonCmd);

        var exitButtonCmd = new qx.ui.command.Command();
        exitButtonCmd.addListener('execute', function() {
          self.fireEvent('logout');
        });
        var exitButton = new qx.ui.menu.Button("Logout", "icon/16/actions/application-exit.png", exitButtonCmd);

        menu.add(newPlaylistButton);
        menu.addSeparator();
        menu.add(exitButton);

        return menu;
      }
    }

  });

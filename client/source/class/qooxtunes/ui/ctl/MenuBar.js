qx.Class.define("qooxtunes.ui.ctl.MenuBar",
  {
    extend: qx.ui.menubar.MenuBar,

    construct: function() {
      this.base(arguments);
      this.init();
    },

    members: {
      __fileMenuButton: null,
      __helpMenuButton: null,

      init: function() {
        this.__fileMenuButton = new qx.ui.menubar.Button("File", null, this.getFileMenu());

        this.add(this.__fileMenuButton);
      },

      getFileMenu: function() {
        var self = this;

        /*
        #asset(qx/icon/${qx.icontheme}/16/actions/application-exit.png)
        #asset(qx/icon/${qx.icontheme}/16/actions/list-add.png)
        #asset(qx/icon/${qx.icontheme}/16/categories/system.png)
        */

        var menu = new qx.ui.menu.Menu();

        var newPlaylistButtonCmd = new qx.ui.command.Command("Ctrl+n");
        newPlaylistButtonCmd.addListener('execute', function() {
          self.fireEvent('createPlaylist');
        }, this);
        var newPlaylistButton = new qx.ui.menu.Button("New Playlist", "icon/16/actions/list-add.png", newPlaylistButtonCmd);

        var settingsButtonCmd = new qx.ui.command.Command("Ctrl+/");
        settingsButtonCmd.addListener('execute', function() {
          qooxtunes.ui.dlg.Settings.go();
        });
        var settingsButton = new qx.ui.menu.Button("Settings", "icon/16/categories/system.png", settingsButtonCmd);

        var exitButtonCmd = new qx.ui.command.Command();
        exitButtonCmd.addListener('execute', function() {
          self.fireEvent('logout');
        });
        var exitButton = new qx.ui.menu.Button("Logout", "icon/16/actions/application-exit.png", exitButtonCmd);

        menu.add(newPlaylistButton);
        menu.addSeparator();
        menu.add(settingsButton);
        menu.add(exitButton);

        return menu;
      },

      getHelpMenu: function() {

      }
    }

  });

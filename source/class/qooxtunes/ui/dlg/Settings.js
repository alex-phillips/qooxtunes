qx.Class.define("qooxtunes.ui.dlg.Settings",
  {
    extend: qx.ui.window.Window,

    type: "singleton",

    statics: {
      go: function() {
        var dlg = qooxtunes.ui.dlg.Settings.getInstance();
        var profile = dlg.__api.getProfile();
        if (!dlg.isActive()) {
          dlg.fillForm(dlg.__formConfig.profile, {
            name: profile.name,
            email: profile.email
          });
          if (qooxtunes.api.API.get().getProfile().is_admin) {
            dlg.fillForm(dlg.__formConfig.admin, {
              libraryPath: dlg.__api.getSettings().media_path
            });
          }
          dlg.open();
        }
      }
    },

    construct: function() {
      /*
      #asset(qx/icon/${qx.icontheme}/16/categories/system.png)
      */
      this.base(arguments, this.tr("Settings"), "icon/16/categories/system.png");
      this.init();
    },

    members: {
      __api: null,

      __okCallback: null,
      __clean: true,

      __formConfig: {
        profile: {
          name: {
            type: 'TextField',
            label: 'Name',
            required: true,
            field: null
          },
          email: {
            type: 'TextField',
            label: 'Email',
            required: true,
            field: null
          },
          newPassword: {
            type: 'PasswordField',
            label: 'New Password',
            required: false,
            field: null
          },
          newPasswordConfirm: {
            type: 'PasswordField',
            label: 'Confirm Password',
            required: false,
            field: null
          }
        },
        admin: {
          libraryPath: {
            type: 'TextField',
            label: 'Library Path',
            required: true,
            field: null
          },
          bitrate: {
            type: 'TextField',
            label: 'Transcode Bitrate',
            required: true,
            field: null
          }
        }
      },

      buildLabel : function(value, bold) {
        var lb;

        lb = new qx.ui.basic.Label (value);

        if (typeof bold === "undefined") {
          bold = false;
        }

        if (bold) {
          lb.setFont (qx.bom.Font.fromString("11px sans-serif bold"));
        } else {
          lb.setFont (qx.bom.Font.fromString("11px sans-serif"));
        }

        return lb;
      },

      buildForm: function(config, spacing, submitCallback) {
        if (!spacing) {
          spacing = 40;
        }

        var container = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        container.setWidth(478);

        var y = 10;
        for (var i in config) {
          config[i].field = new qx.ui.form[config[i].type]();
          var label = this.buildLabel(config[i].label);

          container.add(label, {
            top: y,
            left: 10
          });
          y += 14;

          container.add(config[i].field, {
            top: y,
            left: 10,
            right: 10
          });

          y += spacing;
        }

        return container;
      },

      fillForm: function(config, data) {
        if (!data) {
          data = {};
        }

        for (var i in config) {
          if (data[i]) {
            config[i].field.setValue(data[i]);
          } else {
            config[i].field.setValue('');
          }
        }
      },

      buildProfilePane: function() {
        var profilePage = new qx.ui.tabview.Page(this.tr("Profile")),
          layout = new qx.ui.layout.VBox();
        profilePage.setLayout(layout);

        profilePage.add(this.buildLabel('Profile', true));
        var form = this.buildForm(this.__formConfig.profile);

        var saveButton = new qx.ui.form.Button('Save');
        saveButton.addListener("execute", function(){
          var name = this.__formConfig.profile.name.field.getValue(),
            email = this.__formConfig.profile.email.field.getValue(),
            newPassword = this.__formConfig.profile.newPassword.field.getValue(),
            newPasswordConfirm = this.__formConfig.profile.newPasswordConfirm.field.getValue();

          if (!email) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'Email cannot be empty');
          }
          if (!name) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'Name cannot be empty');
          }
          if ((newPassword || newPasswordConfirm) && (newPassword !== newPasswordConfirm)) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'New passwords do not match');
          }
          this.__api.updateProfile({
            name: name,
            email: email,
            password: newPassword
          }, function(result) {
            if (!result) {
              return qooxtunes.ui.dlg.MsgBox.go('Error', 'There was an error saving your profile.');
            }

            qooxtunes.ui.dlg.MsgBox.go('Success', 'Profile updated successfully!');
          });
        }, this);
        form.add(saveButton, {
          top: 230,
          right: 10
        });

        profilePage.add(form);

        profilePage.add(this.buildLabel('Preferences', true));

        var confirmBeforeClosingCheckbox = new qx.ui.form.CheckBox();
        if (qooxtunes.util.Preferences.getInstance().get('confirmClosing', false)) {
          confirmBeforeClosingCheckbox.setValue(true);
        }
        confirmBeforeClosingCheckbox.addListener('changeValue', function(e) {
          qooxtunes.util.Preferences.getInstance().set('confirmClosing', confirmBeforeClosingCheckbox.getValue());
        }, this);
        var checkBoxContainer = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        checkBoxContainer.add(confirmBeforeClosingCheckbox, {
          top: 10,
          left: 10
        });
        checkBoxContainer.add(this.buildLabel('Confirm before closing?'), {
          top: 10,
          left: 25
        });
        profilePage.add(checkBoxContainer);

        var privateSessionCheckbox = new qx.ui.form.CheckBox();
        if (qooxtunes.util.Preferences.getInstance().get('privateSession', false)) {
          privateSessionCheckbox.setValue(true);
        }
        privateSessionCheckbox.addListener('changeValue', function(e) {
          qooxtunes.util.Preferences.getInstance().set('privateSession', privateSessionCheckbox.getValue());
        }, this);
        var privateCheckBoxContainer = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        privateCheckBoxContainer.add(privateSessionCheckbox, {
          top: 15,
          left: 10
        });
        privateCheckBoxContainer.add(this.buildLabel('Private Session (prevent scrobbling)'), {
          top: 15,
          left: 25
        });
        profilePage.add(privateCheckBoxContainer);

        var lastFmContainer = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        lastFmContainer.add(this.buildLabel('Last.fm Integration', true), {
          top: 15
        });

        if (this.__api.isLastFmEnabled()) {
          var atom = new qx.ui.basic.Atom("This installation integrates with Last.fm.<br/>" +
            "Connecting to your Last.fm account enables exciting features – scrobbling is one.<br/>");
        } else {
          var atom = new qx.ui.basic.Atom("Last.fm integration is currently not enabled.<br/>" +
          "Be sure your Last.fm credentials are properly set in the applications config.");

        }
        atom.setRich(true);
        lastFmContainer.add(atom, {
          top: 30
        });

        if (this.__api.isLastFmEnabled()) {
          var connectLastFmButton = new qx.ui.form.Button('Connect to Last.fm');
          connectLastFmButton.addListener('execute', function() {
            window.open(
              '/api/lastfm/connect?jwt-token=' + this.__api.getToken(),
              '_blank',
              'toolbar=no,titlebar=no,location=no,width=1024,height=640'
            );
          }, this);
          lastFmContainer.add(connectLastFmButton, {
            top: 115,
            left: 0
          });

          var disconnectLastFmButton = new qx.ui.form.Button('Disconnect from Last.fm');
          disconnectLastFmButton.addListener('execute', function() {
            this.__api.disconnectFromLastFm(function() {
              window.location.reload();
            });
          }, this);
          lastFmContainer.add(disconnectLastFmButton, {
            top: 115,
            left: 150
          });

          if (this.__api.getUserPreferenceValue('lastfm_session_key')) {
            connectLastFmButton.setLabel('Reconnect to Last.fm');
            disconnectLastFmButton.setEnabled(true);
          } else {
            disconnectLastFmButton.setEnabled(false);
          }
        }

        profilePage.add(lastFmContainer);

        return profilePage;
      },

      buildUsersPane: function() {
        var usersPage = new qx.ui.tabview.Page(this.tr("Users"));
        adminPage.setLayout(new qx.ui.layout.VBox());

        var usersScroller = new qx.ui.container.Scroll().set({
          width: 425,
          height: 400
        });
        usersScroller.setDecorator(new qx.ui.decoration.Decorator().set({
          width: 1,
          color: '#000000',
          style: 'solid'}
        ));
        usersContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(4, 'top'));

        usersPage.add(usersScroller);

        // var form = this.buildForm(this.__formConfig.admin, 60);
        // var scanButton = new qx.ui.form.Button('Scan');
        // scanButton.addListener("execute", function(){
        //   var mediaPath = this.__formConfig.admin.libraryPath.field.getValue();
        //
        //   if (!mediaPath) {
        //     return qooxtunes.ui.dlg.MsgBox.go('Error', 'Please specify the location of your media');
        //   }
        //
        //   qooxtunes.ui.dlg.WaitPopup.show(this.tr("Scanning library..."));
        //   this.__api.scanLibrary(mediaPath, function(result) {
        //     qooxtunes.ui.dlg.WaitPopup.hide();
        //     if (result === false) {
        //       return qooxtunes.ui.dlg.MsgBox.go('Error', 'Scanning completed successfully!');
        //     }
        //
        //     qooxtunes.ui.dlg.MsgBox.go('Success', 'There was a problem scanning the library.');
        //   });
        // }, this);
        // form.add(scanButton, {
        //   top: 54,
        //   right: 10
        // });
        //
        // adminPage.add(form);
        //
        // var useAdvancedPlayer = new qx.ui.form.CheckBox();
        // if (qooxtunes.util.Preferences.getInstance().get('player.advanced', false)) {
        //   useAdvancedPlayer.setValue(true);
        // }
        // useAdvancedPlayer.addListener('changeValue', function(e) {
        //   qooxtunes.util.Preferences.getInstance().set('player.advanced', e.getData());
        //   window.location.reload();
        // }, this);
        // var checkBoxContainer = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        // checkBoxContainer.add(useAdvancedPlayer, {
        //   top: 10,
        //   left: 10
        // });
        // checkBoxContainer.add(this.buildLabel('Use advanced player technology (lossless support)? (requires refresh)'), {
        //   top: 10,
        //   left: 25
        // });
        // adminPage.add(checkBoxContainer);
        //
        return usersPage;
      },

      buildAdminPane: function() {
        var adminPage = new qx.ui.tabview.Page(this.tr("Admin"));
        adminPage.setLayout(new qx.ui.layout.VBox());

        adminPage.add(this.buildLabel('Media Library', true));

        var form = this.buildForm(this.__formConfig.admin, 60);
        var scanButton = new qx.ui.form.Button('Scan');
        scanButton.addListener("execute", function(){
          var mediaPath = this.__formConfig.admin.libraryPath.field.getValue();

          if (!mediaPath) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'Please specify the location of your media');
          }

          qooxtunes.ui.dlg.WaitPopup.show(this.tr("Scanning library..."));
          this.__api.scanLibrary(mediaPath, function(result) {
            qooxtunes.ui.dlg.WaitPopup.hide();
            if (result === false) {
              return qooxtunes.ui.dlg.MsgBox.go('Error', 'Scanning completed successfully!');
            }

            qooxtunes.ui.dlg.MsgBox.go('Success', 'There was a problem scanning the library.');
          });
        }, this);
        form.add(scanButton, {
          top: 54,
          right: 10
        });

        adminPage.add(form);

        var useAdvancedPlayer = new qx.ui.form.CheckBox();
        if (qooxtunes.util.Preferences.getInstance().get('player.advanced', false)) {
          useAdvancedPlayer.setValue(true);
        }
        useAdvancedPlayer.addListener('changeValue', function(e) {
          qooxtunes.util.Preferences.getInstance().set('player.advanced', e.getData());
          window.location.reload();
        }, this);
        var checkBoxContainer = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
        checkBoxContainer.add(useAdvancedPlayer, {
          top: 10,
          left: 10
        });
        checkBoxContainer.add(this.buildLabel('Use advanced player technology (lossless support)? (requires refresh)'), {
          top: 10,
          left: 25
        });
        adminPage.add(checkBoxContainer);

        return adminPage;
      },

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.close();
        }
      },

      init: function() {
        this.__api = qooxtunes.api.API.get();

        this.setLayout(new qx.ui.layout.VBox(10));

        this.set({
          showMinimize: false,
          showMaximize: false,
          resizable: false,
          width: 534,
          height: 550
        });

        this.__tabView = new qx.ui.tabview.TabView();

        this.__tabView.add(this.buildProfilePane());

        if (this.__api.getProfile().is_admin) {
          this.__tabView.add(this.buildAdminPane());
          // this.__tabView.add(this.buildUsersPane());
        }

        this.add(this.__tabView, {flex: 1});
        this.addListener('keypress', this.onKeypress, this);
        this.addListener('appear', this.center, this);
      }
    }
  });

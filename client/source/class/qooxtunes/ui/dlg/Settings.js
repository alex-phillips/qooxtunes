qx.Class.define("qooxtunes.ui.dlg.Settings",
  {
    extend: qx.ui.window.Window,

    type: "singleton",

    statics: {
      go: function() {
        var dlg = qooxtunes.ui.dlg.Settings.getInstance();
        var profile = qooxtunes.api.Koel.getProfile();
        if (!dlg.isActive()) {
          dlg.fillForm(dlg.__formConfig.profile, {
            name: profile.name,
            email: profile.email
          });
          dlg.fillForm(dlg.__formConfig.advanced, {
            libraryPath: qooxtunes.api.Koel.getSettings().media_path
          });
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
      __ok_callback: null,
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
          // _confirmBeforeClose: {
          //   type: 'CheckBox',
          //   label: 'Confirm before closing?',
          //   required: false,
          //   field: null
          // }
        },
        advanced: {
          libraryPath: {
            type: 'TextField',
            label: 'Library Path',
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

      buildForm: function(config, submitCallback) {
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

          y += 40;
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
        var profilePage = new qx.ui.tabview.Page(this.tr("Profile"));
        profilePage.setLayout(new qx.ui.layout.VBox());

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
          qooxtunes.api.Koel.updateProfile({
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

        var preferences = qooxtunes.api.Koel.getPreferences();
        var confirmBeforeClosingCheckbox = new qx.ui.form.CheckBox();
        if (preferences.confirmClosing) {
          confirmBeforeClosingCheckbox.setValue(true);
        }
        confirmBeforeClosingCheckbox.addListener('changeValue', function(e) {
          qooxtunes.api.Koel.setPreferenceValue('confirmClosing', confirmBeforeClosingCheckbox.getValue());
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

        return profilePage;
      },

      buildAdvancedPane: function() {
        var advancedPage = new qx.ui.tabview.Page(this.tr("Advanced"));
        advancedPage.setLayout(new qx.ui.layout.VBox());

        advancedPage.add(this.buildLabel('Media Library', true));

        var form = this.buildForm(this.__formConfig.advanced);
        var scanButton = new qx.ui.form.Button('Scan');
        scanButton.addListener("execute", function(){
          var mediaPath = this.__formConfig.advanced.libraryPath.field.getValue();

          if (!mediaPath) {
            return qooxtunes.ui.dlg.MsgBox.go('Error', 'Please specify the location of your media');
          }

          qooxtunes.ui.dlg.WaitPopup.show(this.tr("Scanning library..."));
          qooxtunes.api.Koel.scanLibrary(mediaPath, function(result) {
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

        advancedPage.add(form);

        return advancedPage;
      },

      onKeypress: function(e) {
        if (e.getKeyIdentifier().toLowerCase() == 'escape') {
          // escape
          this.close();
        }
      },

      init: function() {
        this.setLayout(new qx.ui.layout.VBox(10));

        this.set({
          showMinimize: false,
          showMaximize: false,
          resizable: false,
          width: 534,
          height: 593
        });

        this.__tabView = new qx.ui.tabview.TabView();

        this.__tabView.add(this.buildProfilePane());

        if (qooxtunes.api.Koel.getProfile().is_admin) {
          this.__tabView.add(this.buildAdvancedPane());
        }

        this.add(this.__tabView, {flex: 1});
        this.addListener('keypress', this.onKeypress, this);
        this.addListener('appear', this.center, this);
      }
    }
  });

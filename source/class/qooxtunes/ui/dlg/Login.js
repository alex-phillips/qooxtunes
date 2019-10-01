qx.Class.define("qooxtunes.ui.dlg.Login",
  {
    extend: qooxtunes.ui.dlg.Standard,

    events: {
      "login": "qx.event.type.Event"
    },

    construct: function (login_message) {
      this.base(arguments, "Login");

      this.set({ width: 240, height: 220 });

      this.__serverTypeSelect = new qooxtunes.ui.ctl.SelectBox();
      this.__serverTypeSelect.addItem("Subsonic", "subsonic");
      this.__serverTypeSelect.addItem("Ampache", "subsonic");
      this.__serverTypeSelect.addItem("Koel", "koel");
      this.__serverTypeSelect.addListener("changeSelection", this.onServerTypeChange, this);
      this.add(this.__serverTypeSelect, { left: 18, top: 18, right: 18 });

      this.__urlField = new qx.ui.form.TextField();
      this.__urlField.set({ width: null, placeholder: 'url' });
      this.__urlField.addListener("keypress", this.onUrlKeypress, this);
      this.add(this.__urlField, { left: 18, top: 52, right: 18 });

      this.__emailField = new qx.ui.form.TextField();
      this.__emailField.set({ width: null, placeholder: 'email' });
      this.__emailField.addListener("keypress", this.onEmailKeypress, this);
      this.add(this.__emailField, { left: 18, top: 86, right: 18 });

      this.__passwordField = new qx.ui.form.PasswordField();
      this.__passwordField.set({ width: null, placeholder: 'password' });
      this.__passwordField.addListener("keypress", this.onPasswordKeypress, this);
      this.add(this.__passwordField, { left: 18, top: 120, right: 18 });

      if (login_message) {
        var lb3 = new qx.ui.basic.Label("<p>" + login_message + "</p>");
        this.add(lb3, { left: 9, top: 62 });
      }

      this.__okButton = new qx.ui.form.Button("OK");
      this.__okButton.set({ enabled: false });
      this.__okButton.addListener("execute", this.login, this);
      this.add(this.__okButton, { bottom: 7, right: 18 });

      this.addListener('appear', function () {
        this.__emailField.focus();
      }, this);
    },

    members: {
      __api: null,

      __serverTypeSelect: null,
      __urlField: null,
      __emailField: null,
      __passwordField: null,
      __okButton: null,
      __isOpen: false,

      checkFields: function () {
        var email = this.__emailField.getValue();
        var password = this.__passwordField.getValue();

        if ((email == null || email == "") || (password == null || password == "")) {
          this.__okButton.set({ enabled: false });
        }
        else {
          this.__okButton.set({ enabled: true });
        }
      },

      init: function () {
        var serverType = qx.bom.Cookie.get('serverType');
        var url = qx.bom.Cookie.get('url');

        this.__emailField.setValue('');
        this.__passwordField.setValue('');

        if (serverType && url) {
          qooxtunes.api.API.serverType = serverType;
          this.__api = qooxtunes.api.API.get(serverType);

          var self = this;
          return this.__api.ping(function(result) {
            if (result) {
              self.fireEvent('login');
            } else {
              self.open();
              self.__isOpen = true;
            }
          })
        }

        this.open();
        this.__isOpen = true;
      },

      login: function (event) {
        if (!this.__okButton.getEnabled()) {
          return;
        }

        var serverSelected = this.__serverTypeSelect.getSelectedLabel();
        var serverType = this.__serverTypeSelect.getSelectedValue();
        var url = this.__urlField.getValue();
        var email = this.__emailField.getValue();
        var password = this.__passwordField.getValue();

        if (email == null || email == "" || password == null || password == "") {
          qooxtunes.ui.dlg.MsgBox.go("Please enter your email and password.");
          return;
        }

        this.__api = qooxtunes.api.API.get(serverType);

        var self = this;
        this.__api.login({
          url: url,
          username: email,
          email: email,
          password: password,
          version: serverSelected === 'Ampache' ? '1.12' : '1.15'
        }, function (result) {
          if (result) {
            qx.bom.Cookie.set('serverType', serverType, 365);
            qx.bom.Cookie.set('url', url, 365);
            self.close();
            self.__isOpen = false;
            self.fireEvent('login');
          }
        });
      },

      /*
       -------------------------------------------------------------------------
       Field listeners
       -------------------------------------------------------------------------
       */

      onUrlKeypress: function (e) {
        this.checkFields();

        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          this.login(null);
        }
      },

      onEmailKeypress: function (e) {
        this.checkFields();

        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          this.login(null);
        }
      },

      onPasswordKeypress: function (e) {
        this.checkFields();

        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          this.login(null);
        }
      },

      onServerTypeChange: function (e) {
        var serverType = this.__serverTypeSelect.getSelectedValue();
        qooxtunes.api.API.serverType = serverType;
      }
    }
  });

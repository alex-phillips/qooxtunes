qx.Class.define("qooxtunes.ui.dlg.Login",
  {
    extend: qooxtunes.ui.dlg.Standard,

    events: {
      "login": "qx.event.type.Event"
    },

    construct: function(login_message) {
      this.base(arguments, "Login");

      this.set({width: 240, height: 148});

      this.__emailField = new qx.ui.form.TextField();
      this.__emailField.set({width: null, placeholder: 'email'});
      this.__emailField.addListener("keypress", this.onEmailKeypress, this);
      this.add(this.__emailField, {left: 18, top: 18, right: 18});

      this.__passwordField = new qx.ui.form.PasswordField();
      this.__passwordField.set({width: null, placeholder: 'password'});
      this.__passwordField.addListener("keypress", this.onPasswordKeypress, this);
      this.add(this.__passwordField, {left: 18, top: 47, right: 18});

      if (login_message) {
        var lb3 = new qx.ui.basic.Label("<p>" + login_message + "</p>");
        this.add(lb3, {left: 9, top: 62});
      }

      this.__okButton = new qx.ui.form.Button("OK");
      this.__okButton.set({enabled: false});
      this.__okButton.addListener("execute", this.login, this);
      this.add(this.__okButton, {bottom: 14, right: 18});

      this.addListener('appear', function() {
        this.__emailField.focus();
      }, this);
    },

    members: {
      __api: null,

      __emailField: null,
      __passwordField: null,
      __okButton: null,
      __isOpen: false,

      checkFields: function() {
        var email = this.__emailField.getValue();
        var password = this.__passwordField.getValue();

        if ((email == null || email == "") || (password == null || password == "")) {
          this.__okButton.set({enabled: false});
        }
        else {
          this.__okButton.set({enabled: true});
        }
      },

      init: function() {
        this.__api = qooxtunes.api.Koel.getInstance();

        this.__emailField.setValue('');
        this.__passwordField.setValue('');

        var self = this;
        this.__api.ping(function(result) {
          if (result) {
            self.fireEvent('login');
          } else {
            self.open();
            self.__isOpen = true;
          }
        })
      },

      login: function(event) {
        if (!this.__okButton.getEnabled()) {
          return;
        }

        var email = this.__emailField.getValue();
        var password = this.__passwordField.getValue();

        if (email == null || email == "" || password == null || password == "") {
          qooxtunes.ui.dlg.MsgBox.go("Please enter your email and password.");
          return;
        }

        var self = this;
        this.__api.login({
          email: email,
          password: password
        }, function(result) {
          if (result) {
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

      onEmailKeypress: function(e) {
        this.checkFields();

        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          this.login(null);
        }
      },

      onPasswordKeypress: function(e) {
        this.checkFields();

        if (e.getKeyIdentifier().toLowerCase() == 'enter') {
          this.login(null);
        }
      }
    }
  });

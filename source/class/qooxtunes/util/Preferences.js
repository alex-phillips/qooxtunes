qx.Class.define("qooxtunes.util.Preferences",
  {
    type: 'singleton',

    extend: qx.core.Object,

    construct: function() {
      this.base(arguments);

      var data = qx.module.Cookie.get('local_preferences');
      if (data) {
        data = JSON.parse(data);
      } else {
        data = {};
      }

      this.init(data);
    },

    members: {
      init: function(data) {
        this.replace(data);
      },

      flatten: function() {
        var flatten = function(data, prefix) {
          if (prefix === undefined) {
            prefix = '';
          }

          var retval = {};
          for (var i in data) {
            if (typeof data[i] === 'object') {
              var nestedObj = flatten(data[i], prefix + i + '.');
              for (var j in nestedObj) {
                retval[j] = nestedObj[j];
              }
            } else {
              retval['' + prefix + i] = data[i];
            }
          }

          return retval;
        };

        return flatten(this.data);
      },

      get: function(path, defaultValue) {
        if (defaultValue === undefined) {
          defaultValue = null;
        }

        var retval = this.data;

        path = path.split('.');
        for (var i = 0; i < path.length; i++) {
          if (retval[path[i]] === undefined) {
            return defaultValue;
          }

          retval = retval[path[i]];
        }

        return retval;
      },

      getData: function() {
        return this.data;
      },

      replace: function(data) {
        this.data = {};
        for (var i in data) {
          this.set(i, data[i]);
        }
      },

      set: function(key, value) {
        var keys = key.split('.');
        var xary = this.data;
        while (key = keys.shift()) {
          if (keys.length === 0) {
            xary[key] = value;
            break;
          }

          if (xary[key] === undefined) {
            xary[key] = {};
          }

          xary = xary[key];
        }

        qx.module.Cookie.set('local_preferences', JSON.stringify(this.data), 1000);
      }
    }
  });

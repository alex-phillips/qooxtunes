qx.Class.define("qooxtunes.api.Koel", {
  extend: qx.core.Object,

  statics: {
    __token: '',
    __data: null,

    /**
     * Log in the user with the provided credentials and save the auth token on success
     *
     * @param data
     * @param callback
     */
    login: function(data, callback) {
      var self = this;
      var request = new qx.io.remote.Request('/api/me', 'POST', 'application/json');
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.addListener('completed', function(e) {
        if (e.getContent().token) {
          self.__token = e.getContent().token;
          qx.bom.Cookie.set('token', e.getContent().token);

          return callback(true)
        }

        return callback(false);
      });
      request.setData(JSON.stringify({
        email: data.email,
        password: data.password
      }));
      request.send();
    },

    logout: function(callback) {
      var self = this;
      var request = new qx.io.remote.Request('/api/me', 'DELETE', 'application/json');
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.addListener('completed', function(e) {
        callback();
      });
      request.send();
    },

    /**
     * Fetch data from server
     *
     * @param callback
     */
    fetchData: function(callback) {
      var self = this;
      var request = new qx.io.remote.Request('/api/data', 'GET', 'application/json');
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setTimeout(100000000);
      request.addListener('completed', function(e) {
        self.__data = e.getContent();
        callback(self.__data);
      });
      request.send();
    },

    /**
     * Retrieved already fetched data or fetch it from the server
     *
     * @param callback
     * @returns {*}
     */
    getData: function(callback) {
      if (this.__data) {
        return callback(this.__data);
      }

      this.fetchData(callback);
    },

    getPlaylistById: function(id) {
      for (var i = 0; i < this.__data.playlists.length; i++) {
        if (this.__data.playlists[i].id === id) {
          return this.__data.playlists[i];
        }
      }

      return null;
    },

    getPlaylists: function() {
      return this.__data.playlists;
    },

    getPreferences: function() {
      var preferences = qx.module.Cookie.get('preferences_' + this.__data.currentUser.id);
      if (!preferences) {
        preferences = {};
      } else {
        preferences = JSON.parse(preferences);
      }

      return preferences;
    },

    getPreferenceValue: function(key) {
      var preferences = this.getPreferences();
      if (preferences[key]) {
        return preferences[key];
      }

      return null;
    },

    savePreferences: function(data) {
      qx.module.Cookie.set('preferences_' + this.__data.currentUser.id, JSON.stringify(data), 1000);
    },

    setPreferenceValue: function(key, value) {
      var preferences = this.getPreferences();
      preferences[key] = value;
      this.savePreferences(preferences);
    },

    getProfile: function() {
      return this.__data.currentUser;
    },

    getSettings: function() {
      return this.__data.settings;
    },

    getAllSongInfo: function(id, callback) {
      var playData = null;
      var playRequest = new qx.io.remote.Request('/api/interaction/play', 'POST', 'application/json');
      playRequest.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      playRequest.setRequestHeader("Accept","application/json");
      playRequest.setRequestHeader("content-type","application/json");
      playRequest.setTimeout(60000);
      playRequest.setData(JSON.stringify({
        song: id
      }));
      playRequest.addListener('completed', function(e) {
        playData = e.getContent();
      });
      playRequest.addListener('failed', function(e) {
        playData = false;
      });

      var infoData = null;
      var infoRequest = new qx.io.remote.Request('/api/' + id + '/info', 'GET', 'application/json');
      infoRequest.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      infoRequest.setRequestHeader("Accept","application/json");
      infoRequest.setRequestHeader("content-type","application/json");
      infoRequest.setTimeout(60000);
      infoRequest.addListener('completed', function(e) {
        infoData = e.getContent();
      });
      infoRequest.addListener('failed', function(e) {
        infoData = false;
      });

      playRequest.send();
      infoRequest.send();

      var doneInterval = setInterval(function() {
        if (playData === null || infoData === null) {
          return;
        }

        clearInterval(doneInterval);

        callback({
          info: playData,
          details: infoData
        });
      }, 100);
    },

    getSongInfo: function(id, callback) {
      var request = new qx.io.remote.Request('/api/interaction/play', 'POST', 'application/json');
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setTimeout(60000);
      request.setData(JSON.stringify({
        song: id
      }));
      request.addListener('completed', function(e) {
        callback(e.getContent());
      });
      request.addListener('failed', function(e) {
        callback(false);
      });
      request.send();
    },

    getSongUrl: function(songId) {
      return '/api/' + songId + '/play?jwt-token=' + this.getToken();
    },

    /**
     * Retrieved the saved auth token
     *
     * @returns {string}
     */
    getToken: function() {
      if (!this.__token) {
        this.__token = qx.bom.Cookie.get('token');
      }

      return this.__token;
    },

    /**
     * Test function call to determine if the user is already logged in or not
     *
     * @param callback
     */
    ping: function(callback) {
      var request = new qx.io.remote.Request('/api/', 'GET', 'application/json');
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setTimeout(10000);
      request.addListener('completed', function(e) {
        callback(true);
      });
      request.addListener('failed', function(e) {
        callback(false);
      });
      request.send();
    },

    scanLibrary: function(path, callback) {
      var request = new qx.io.remote.Request('/api/settings', 'POST', 'application/json');
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setTimeout(300000); // 5 minutes
      request.setData(JSON.stringify({
        media_path: path
      }));
      request.addListener('completed', function(e) {
        callback(e.getContent());
      });
      request.addListener('failed', function(e) {
        callback(false);
      });
      request.send();
    },

    updateProfile: function(data, callback) {
      var request = new qx.io.remote.Request('/api/me', 'PUT', 'application/json');
      request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
      request.setRequestHeader("Accept","application/json");
      request.setRequestHeader("content-type","application/json");
      request.setTimeout(60000);
      request.setData(JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password
      }));
      request.addListener('completed', function(e) {
        if (!e.getContent()) {
          this.__data.currentUser.name = data.name;
          this.__data.currentUser.email = data.email;
        }

        callback(e.getContent());
      });
      request.addListener('failed', function(e) {
        callback(false);
      });
      request.send();
    }
  },

  members: {

  }
});

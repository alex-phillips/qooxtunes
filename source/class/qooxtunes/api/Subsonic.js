qx.Class.define("qooxtunes.api.Subsonic",
  {
    type: 'singleton',

    extend: qx.core.Object,

    events: {
      playlistCreated: 'qx.event.type.Event'
    },

    members: {
      streamLossless: false,

      _username: 'admin',
      _password: 'MDf!%n$WPxGbdKiYGn%ZAEe6v%m#MmC$Zk&4AfxQadok@ExJ8vu#krsP&e&M5vQeAq%k',
      _url: 'https://as.w00t.cloud',
      _port: '443',
      _md5Auth: true,

      __token: '',
      __data: null,
      __songs: {},
      __albums: {},
      __artists: {},

      params: {
        f: 'json',
        c: 'qooxtunes',
        v: '1.15'
      },

      /**
       * conver object to url query string
       */
      _toQueryString: function (params) {
        var r = [];
        for (var n in params) {
          n = encodeURIComponent(n);
          r.push(params[n] === null ? n : (n + '=' + encodeURIComponent(params[n])));
        }
        return r.join('&');
      },

      _buildUrl: function (method, options) {
        if (options !== null && typeof options === 'object') {
          options = '&' + this._toQueryString(options);
        }
        if (!options) {
          options = '';
        }

        this.params.u = this._username;

        var retval = '';
        if (this._versionCompare(this.params.v, '1.13.0') >= 0 && this._md5Auth) {
          if (this.params.p) {
            delete this.params.p;
          }
          this.params.s = this._makeSalt(6);
          this.params.t = qooxtunes.util.MD5.md5(this._password + this.params.s);

          retval = this._url + '/rest/' + method + '.view?' + this._toQueryString(this.params) + options;
        } else {
          if (this.params.t) {
            delete this.params.t;
          }
          if (this.params.s) {
            delete this.params.s;
          }
          this.params.p = qooxtunes.util.MD5.hexEncode(this._password);

          retval = this._url + '/rest/' + method + '.view?' + this._toQueryString(this.params) + options;
        }

        return retval;
      },

      /**
       * compare 2 api versions ** I did not write this function **
       */
      _versionCompare: function (v1, v2, options) {
        var lexicographical = options && options.lexicographical,
          zeroExtend = options && options.zeroExtend,
          v1parts = v1.split('.'),
          v2parts = v2.split('.');
        function isValidPart(x) {
          return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }
        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
          return NaN;
        }
        if (zeroExtend) {
          while (v1parts.length < v2parts.length) v1parts.push("0");
          while (v2parts.length < v1parts.length) v2parts.push("0");
        }
        if (!lexicographical) {
          v1parts = v1parts.map(Number);
          v2parts = v2parts.map(Number);
        }
        for (var i = 0; i < v1parts.length; ++i) {
          if (v2parts.length == i) {
            return 1;
          }
          if (v1parts[i] == v2parts[i]) {
            continue;
          }
          else if (v1parts[i] > v2parts[i]) {
            return 1;
          }
          else {
            return -1;
          }
        }
        if (v1parts.length != v2parts.length) {
          return -1;
        }
        return 0;
      },

      /**
       * generates a string of the given length
       *
       * @param {Number} length
       */
      _makeSalt: function (length) {
        var text = "";
        var possible = "ABCD/EFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
      },

      getCoverArt: function (id) {
        return this._buildUrl('getCoverArt', {
          id: id
        });
      },

      addSongsToPlaylist: function (id, songIds, callback) {
        var playlist = null;
        for (var i = 0; i < this.__data.playlists.length; i++) {
          if (this.__data.playlists[i].id === id) {
            playlist = this.__data.playlists[i];
            break;
          }
        }

        if (!playlist) {
          return callback(false);
        }

        qx.lang.Array.append(playlist.songs, songIds);

        var request = new qx.io.remote.Request('/api/playlist/' + id + '/sync', 'PUT', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          songs: playlist.songs
        }));
        request.addListener('completed', function (e) {
          callback(true);
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      removeSongsFromPlaylist: function (id, songs, callback) {
        var playlist = null;
        for (var i = 0; i < this.__data.playlists.length; i++) {
          if (this.__data.playlists[i].id === id) {
            playlist = this.__data.playlists[i];
            break;
          }
        }

        if (!playlist) {
          return callback(false);
        }

        for (i = 0; i < songs.length; i++) {
          if (qx.lang.Array.contains(playlist.songs, songs[i].songId)) {
            qx.lang.Array.remove(playlist.songs, songs[i].songId);
          }
        }

        var request = new qx.io.remote.Request('/api/playlist/' + id + '/sync', 'PUT', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          songs: playlist.songs
        }));
        request.addListener('completed', function (e) {
          callback(true);
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      createPlaylist: function (name, callback) {
        var self = this;
        var request = new qx.io.request.Xhr(this._buildUrl('createPlaylist', {
          name: name
        }));
        request.addListener('success', function () {
          self._getPlaylists(function() {
            self.fireEvent('playlistCreated');
            callback(true);
          });
        });
        request.send();
      },

      deletePlaylist: function (id, callback) {
        var self = this;
        var request = new qx.io.request.Xhr(this._buildUrl('deletePlaylist', {
          id: id
        }));
        request.addListener('success', function () {
          for (var i = 0; i < self.__data.playlists.length; i++) {
            if (self.__data.playlists[i].id === id) {
              self.__data.playlists.splice(i, 1);
              break;
            }
          }
          self.fireEvent('playlistDeleted');
          callback(true);
        });
        request.send();
      },

      /**
       * Log in the user with the provided credentials and save the auth token on success
       *
       * @param data
       * @param callback
       */
      login: function (data, callback) {
        var self = this;
        var request = new qx.io.remote.Request('/api/me', 'POST', 'application/json');
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.addListener('completed', function (e) {
          if (e.getContent().token) {
            self.__token = e.getContent().token;
            qx.bom.Cookie.set('token', e.getContent().token, 365);

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

      logout: function (callback) {
        var self = this;
        var request = new qx.io.remote.Request('/api/me', 'DELETE', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.addListener('completed', function (e) {
          callback();
        });
        request.send();
      },

      _getArtist: function (id, callback) {
        var self = this;
        var request = new qx.io.request.Xhr(self._buildUrl('getArtist', {
          id: id
        }));
        request.addListener('success', function () {
          var artistData = request.getResponse()['subsonic-response'];

          for (var i = 0; i < artistData.artist.album.length; i++) {
            self.__albums[artistData.artist.album[i].id] = artistData.artist.album[i];
          }

          return callback(artistData);
        });

        request.send();
      },

      _getAlbum: function (id, callback) {
        var self = this;
        var request = new qx.io.request.Xhr(self._buildUrl('getAlbum', {
          id: id
        }));
        request.addListener('success', function () {
          var albumData = request.getResponse()['subsonic-response'];

          for (var i = 0; i < albumData.album.song.length; i++) {
            var song = albumData.album.song[i];
            var album = self.__albums[id];
            var artist = self.__artists[song.artistId] || self.__artists[album.artistId]

            if (!artist) {
              console.log('no artist for id ' + song.artistId, song)
            }

            self.__data.interactions[song.id] = {
              playCount: song.playCount,
              liked: false,
            }

            self.__songs[song.id] = {
              id: song.id,
              title: song.title,
              year: song.year,
              disc: song.discNumber === 0 ? '' : song.discNumber,
              track: song.track,
              rating: null,
              search_value: song.title + ' ' + song.artist + ' ' + self.__albums[song.albumId],
              genre: song.genre_id ? self.getGenreById(song.genre_id) : '',
              length: song.duration,
              artist_id: song.artistId || album.artistId,
              date_added: new Date(song.created),
              album: {
                id: album.id,
                cover: album.coverArt,
                name: album.name,
                year: album.year,
                compilationState: 0,
                artist: {
                  id: artist.id,
                  image: artist.coverArt,
                  name: artist.name
                }
              }
            };
          }

          return callback(albumData);
        });

        request.send();
      },

      _getArtists: function (callback) {
        var self = this;
        var artistReq = new qx.io.request.Xhr(self._buildUrl('getArtists'));
        artistReq.addListener('success', function () {
          var artistData = artistReq.getResponse()['subsonic-response'];
          for (var i = 0; i < artistData.artists.index.length; i++) {
            for (var j = 0; j < artistData.artists.index[i].artist.length; j++) {
                self.__artists[artistData.artists.index[i].artist[j].id] = artistData.artists.index[i].artist[j];
            }
          }

          return callback();
        });

        artistReq.send();
      },

      _getPlaylists: function (callback) {
        var self = this;
        self.__data.playlists = [];

        var request = new qx.io.request.Xhr(this._buildUrl('getPlaylists'));
        request.addListener('success', function () {
          var response = request.getResponse()['subsonic-response'];
          Promise.all(response.playlists.playlist.map(function (playlist) {
            return new Promise(function (resolve, reject) {
              self._getPlaylist(playlist.id, function (playlist) {
                var playlistSongs = [];
                if (playlist.entry) {
                  playlistSongs = playlist.entry.map(function(song) {
                    return song.id;
                  })
                }
                self.__data.playlists.push({
                  id: playlist.id,
                  name: playlist.name,
                  songs: playlistSongs
                });

                return resolve();
              });
            });
          }))
            .then(callback);
        });
        request.send();
      },

      _getPlaylist: function (id, callback) {
        var request = new qx.io.request.Xhr(this._buildUrl('getPlaylist', {
          id: id
        }));
        request.addListener('success', function () {
          var response = request.getResponse()['subsonic-response'];

          return callback(response.playlist);
        });
        request.send();
      },

      /**
       * Fetch data from server and build local song data
       *
       * @param callback
       */
      fetchData: function (callback) {
        var self = this;
        self.__data = {
          playlists: [],
          interactions: {},
        };

        self._getArtists(function () {
          Promise.all(Object.keys(self.__artists).map(function (name, id) {
            return new Promise(function (resolve, reject) {
              self._getArtist(id, resolve);
            });
          }))
            .then(function () {
              return Promise.all(Object.keys(self.__albums).map(function (name, id) {
                return new Promise(function (resolve, reject) {
                  self._getAlbum(id, resolve);
                });
              }))
            })
            .then(function () {
              return new Promise(function (resolve, reject) {
                self._getPlaylists(resolve);
              });
            })
            .then(callback)
        });
      },

      isLastFmEnabled: function () {
        return this.__data.useLastfm;
      },

      disconnectFromLastFm: function (callback) {
        var request = new qx.io.remote.Request('/api/lastfm/disconnect', 'DELETE', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.addListener('completed', function (e) {
          callback();
        });
        request.send();
      },

      /**
       * Retrieved already fetched data or fetch it from the server
       *
       * @param callback
       * @returns {*}
       */
      getData: function (callback) {
        if (this.__data) {
          return callback(this.__data);
        }

        this.fetchData(callback);
      },

      getSongs: function () {
        return this.__songs;
      },

      getSongById: function (id) {
        return this.__songs[id];
      },

      getAlbumById: function (id) {
        return this.__albums[id];
      },

      getArtistById: function (id) {
        return this.__artists[id];
      },

      getGenreById: function (id) {
        var retval = '';
        for (var i = 0; i < this.__data.genres.length; i++) {
          if (this.__data.genres[i].id === id) {
            retval = this.__data.genres[i].name;
            break;
          }
        }

        return retval;
      },

      getPlaylistById: function (id) {
        for (var i = 0; i < this.__data.playlists.length; i++) {
          if (this.__data.playlists[i].id === id) {
            return this.__data.playlists[i];
          }
        }

        return null;
      },

      getPlaylists: function () {
        return this.__data.playlists;
      },

      getUserPreferences: function () {
        return this.__data.currentUser.preferences;
      },

      getUserPreferenceValue: function (key) {
        var preferences = this.getUserPreferences();
        if (preferences[key]) {
          return preferences[key];
        }

        return null;
      },

      getPreferences: function () {
        var preferences = qx.module.Cookie.get('preferences_' + this.__data.currentUser.id);
        if (!preferences) {
          preferences = {};
        } else {
          preferences = JSON.parse(preferences);
        }

        return preferences;
      },

      getPreferenceValue: function (key, defaultValue) {
        var preferences = this.getPreferences();
        if (preferences[key]) {
          return preferences[key];
        }

        return defaultValue === undefined ? null : defaultValue;
      },

      savePreferences: function (data) {
        qx.module.Cookie.set('preferences_' + this.__data.currentUser.id, JSON.stringify(data), 1000);
      },

      scrobble: function (songId) {
        var request = new qx.io.request.Xhr(this._buildUrl('scrobble', {
          id: songId,
          time: (new Date()).getTime(),
          submision: true
        }));
        request.send();
      },

      setPreferenceValue: function (key, value) {
        var preferences = this.getPreferences();
        preferences[key] = value;
        this.savePreferences(preferences);
      },

      getProfile: function () {
        return this.__data.currentUser;
      },

      getSettings: function () {
        return this.__data.settings;
      },

      getSongInfo: function (id, callback) {
        var infoData = null;
        var infoRequest = new qx.io.remote.Request('/api/' + id + '/info', 'GET', 'application/json');
        infoRequest.setProhibitCaching(false);
        infoRequest.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        infoRequest.setRequestHeader("Accept", "application/json");
        infoRequest.setRequestHeader("content-type", "application/json");
        infoRequest.setTimeout(60000);
        infoRequest.addListener('completed', function (e) {
          callback(e.getContent());
        });
        infoRequest.addListener('failed', function (e) {
          infoData = false;
        });

        infoRequest.send();
      },

      getSongPlayInfo: function (id, callback) {
        var request = new qx.io.remote.Request('/api/interaction/play', 'POST', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          song: id
        }));
        request.addListener('completed', function (e) {
          callback(e.getContent());
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      getSongUrl: function (songId, time) {
        var url = this._buildUrl('stream', {
          id: songId,
          maxBitRate: 320,
          estimateContentLength: false,
        });

        return url;
      },

      /**
       * Retrieved the saved auth token
       *
       * @returns {string}
       */
      getToken: function () {
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
      ping: function (callback) {
        var request = new qx.io.request.Xhr(this._buildUrl('ping'));

        request.addListener('success', function (e) {
          return callback(true);
        });

        request.addListener('error', function (e) {
          return callback(false);
        });

        request.send();
      },

      scanLibrary: function (path, callback) {
        var request = new qx.io.remote.Request('/api/settings', 'POST', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(300000); // 5 minutes
        request.setData(JSON.stringify({
          media_path: path
        }));
        request.addListener('completed', function (e) {
          callback(e.getContent());
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      updateProfile: function (data, callback) {
        var request = new qx.io.remote.Request('/api/me', 'PUT', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password
        }));
        request.addListener('completed', function (e) {
          if (!e.getContent()) {
            this.__data.currentUser.name = data.name;
            this.__data.currentUser.email = data.email;
          }

          callback(e.getContent());
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      favorite: function (songIds, callback) {
        Promise.all(songIds.map(function (songId) {
          return new Promise(function (resolve, reject) {
            var request = new qx.io.request.Xhr(this._buildUrl('star', {
              id: songId
            }))
            request.addListener('success', resolve);
            request.send();
          })
        }))
          .then(callback);
      },

      unfavorite: function (songIds, callback) {
        Promise.all(songIds.map(function (songId) {
          return new Promise(function (resolve, reject) {
            var request = new qx.io.request.Xhr(this._buildUrl('unstar', {
              id: songId
            }))
            request.addListener('success', resolve);
            request.send();
          })
        }))
          .then(callback);
      },

      updateSong: function (data, callback) {
        var request = new qx.io.remote.Request('/api/songs', 'PUT', 'application/json');
        request.setProhibitCaching(false);
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify(data));
        request.addListener('completed', function (e) {
          callback(e.getContent());
        });
        request.addListener('failed', function (e) {
          callback(false);
        });
        request.send();
      },

      downloadSongs: function (songIds) {
        var query = [
          'jwt-token=' + this.getToken(),
        ];
        for (var i = 0; i < songIds.length; i++) {
          query.push('songs[]=' + songIds[i]);
        }
        query = '?' + query.join('&');

        window.open('/api/download/songs' + query);
      }
    }
  });

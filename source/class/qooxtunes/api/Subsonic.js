qx.Class.define("qooxtunes.api.Subsonic",
  {
    type: 'singleton',

    extend: qx.core.Object,

    events: {
      playlistCreated: 'qx.event.type.Event'
    },

    members: {
      streamLossless: false,

      _username: '',
      _password: '',
      _url: '',
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
        var self = this;
        Promise.all(songIds.map(function (songId) {
          return new Promise(function (resolve, request) {
            var request = new qx.io.request.Xhr(self._buildUrl('updatePlaylist', {
              playlistId: id,
              songIdToAdd: songId
            }));
            request.addListener('success', resolve);
            request.send();
          });
        }))
          .then(function () {
            self._getPlaylists(function() {
              callback(true);
            });
          });
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
        this._username = data.username;
        this._password = data.password;
        this._url = data.url.replace(/\/$/, '');

        var self = this;
        this.ping(function (result) {
          if (result) {
            qx.bom.Cookie.set('username', self._username, 365);
            qx.bom.Cookie.set('password', self._password, 365);
          }
          return callback(result);
        });
      },

      logout: function (callback) {
        qx.bom.Cookie.del('url');
        qx.bom.Cookie.del('username');
        qx.bom.Cookie.del('password');
        callback();
      },

      _getArtist: function (id, callback) {
        var self = this;
        var request = new qx.io.request.Xhr(self._buildUrl('getArtist', {
          id: id
        }));
        request.addListener('success', function () {
          var artistData = request.getResponse()['subsonic-response'];

          if (!artistData.artist) {
            return callback();
          }

          if (!artistData.artist.album) {
            artistData.album = [];

            return callback(artistData);
          }

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

          if (!albumData.album) {
            return callback();
          }

          if (!albumData.album.song) {
            return callback();
          }

          for (var i = 0; i < albumData.album.song.length; i++) {
            var song = albumData.album.song[i];
            var album = self.__albums[id];
            var artist = self.__artists[song.artistId] || self.__artists[album.artistId];
            var albumArtist = self.__artists[album.artistId];

            if (!artist) {
              console.log('no artist for id ' + song.artistId, song)
            }

            if (song.playCount > 0) {
              self.__data.interactions[song.id] = {
                song_id: song.id,
                playCount: song.playCount,
                liked: false
              }
            }

            self.__songs[song.id] = {
              id: song.id,
              title: song.title,
              year: song.year,
              disc: song.discNumber === 0 ? '' : song.discNumber,
              track: song.track,
              rating: null,
              search_value: song.title + ' ' + song.artist + ' ' + self.__albums[song.albumId],
              genre: song.genre || album.genre,
              length: song.duration || 0,
              artist_id: song.artistId || album.artistId,
              artist: {
                name: song.artist
              },
              date_added: new Date(song.created),
              album: {
                id: album.id,
                cover: album.coverArt,
                name: album.name,
                year: album.year,
                compilationState: song.artist !== album.artist,
                artist: {
                  id: artist.id,
                  image: albumArtist.coverArt,
                  name: albumArtist.name
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
          if (!response.playlists || !response.playlists.playlist) {
            return callback();
          }

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

      _getStarred: function (callback) {
        var self = this;
        var request = new qx.io.request.Xhr(this._buildUrl('getStarred2'));
        request.addListener('success', function () {
          var data = request.getResponse()['subsonic-response'];
          if (data.starred2 && data.starred2.song) {
            for (var i = 0; i < data.starred2.song.length; i++) {
              if (!self.__data.interactions[data.starred2.song[i].id]) {
                self.__data.interactions[data.starred2.song[i].id] = {
                  sing_id: data.starred2.song[i].id
                };
              }

              self.__data.interactions[data.starred2.song[i].id].liked = true;
            }

            self.__data.interactions = Object.values(self.__data.interactions);
          }

          return callback();
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
          interactions: []
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
            .then(function () {
              return new Promise(function (resolve, reject) {
                self._getStarred(resolve);
              });
            })
            .then(function () {
              return callback(self.__data);
            })
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

      getArtistByName: function (name) {
        var keys = Object.keys(this.__artists);
        for (var i = 0; i < keys.length; i++) {
          if (this.__artists[keys[i]] === name) {
            return keys[i];
          }
        }

        return null;
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
        var song = this.getSongById(id);

        var self = this;
        this._getArtistInfo(song.id, function(artistInfo) {
          song.artist_info = {};
          if (artistInfo.biography) {
            song.artist_info.bio = {
              full: artistInfo.biography
            };
          }

          if (artistInfo.largeImageUrl) {
            song.artist_info.image = artistInfo.largeImageUrl;
          }

          self._getLyrics(song.id, function (lyrics) {
            // song.lyrics = lyrics;

            return callback(song);
          })
        });
      },

      _getLyrics: function (id, callback) {
        var request = new qx.io.request.Xhr(this._buildUrl('getLyrics', {
          id: id
        }))
        request.addListener('success', function () {
          var data = request.getResponse()['subsonic-response'];
          return callback(data.lyrics);
        });
        request.send();
      },

      _getArtistInfo: function (id, callback) {
        var request = new qx.io.request.Xhr(this._buildUrl('getArtistInfo', {
          id: id
        }))
        request.addListener('success', function () {
          var data = request.getResponse()['subsonic-response'];
          console.log(data)
          return callback(data.artistInfo);
        });
        request.send();
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
          estimateContentLength: false
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
        if (!this._username) {
          this._username = qx.bom.Cookie.get('username');
        }
        if (!this._password) {
          this._password = qx.bom.Cookie.get('password');
        }
        if (!this._url) {
          this._url = qx.bom.Cookie.get('url');
        }

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
        var self = this;
        Promise.all(songIds.map(function (songId) {
          return new Promise(function (resolve, reject) {
            var request = new qx.io.request.Xhr(self._buildUrl('star', {
              id: songId
            }))
            request.addListener('success', resolve);
            request.send();
          })
        }))
          .then(function () {
            var retval = [];
            for (var i = 0; i < songIds.length; i++) {
              retval.push({
                song_id: songIds[i]
              });
            }
            callback(retval);
          });
      },

      unfavorite: function (songIds, callback) {
        var self = this;
        Promise.all(songIds.map(function (songId) {
          return new Promise(function (resolve, reject) {
            var request = new qx.io.request.Xhr(self._buildUrl('unstar', {
              id: songId
            }))
            request.addListener('success', resolve);
            request.send();
          })
        }))
          .then(function() {
            callback(true);
          });
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
      },

      supportsEditing: function () {
        return false;
      }
    }
  });

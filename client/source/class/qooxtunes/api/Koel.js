qx.Class.define("qooxtunes.api.Koel",
  {
    type: 'singleton',

    extend: qx.core.Object,

    events: {
      playlistCreated: 'qx.event.type.Event'
    },

    members: {
      __token: '',
      __data: null,
      __songs: {},
      __albums: {},
      __artists: {},

      addSongsToPlaylist: function(id, songIds, callback) {
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
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          songs: playlist.songs
        }));
        request.addListener('completed', function(e) {
          callback(true);
        });
        request.addListener('failed', function(e) {
          callback(false);
        });
        request.send();
      },

      removeSongsFromPlaylist: function(id, songs, callback) {
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
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          songs: playlist.songs
        }));
        request.addListener('completed', function(e) {
          callback(true);
        });
        request.addListener('failed', function(e) {
          callback(false);
        });
        request.send();
      },

      createPlaylist: function(name, callback) {
        var self = this;
        var request = new qx.io.remote.Request('/api/playlist', 'POST', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setData(JSON.stringify({
          name: name,
          songs: []
        }));
        request.addListener('completed', function(e) {
          var newPlaylist = e.getContent();
          self.__data.playlists.push(newPlaylist);
          self.fireEvent('playlistCreated');
          if (callback) {
            callback(true);
          }
        });
        request.addListener('failed', function(e) {
          if (callback) {
            callback(false);
          }
        });
        request.send();
      },

      deletePlaylist: function(id, callback) {
        var self = this;
        var request = new qx.io.remote.Request('/api/playlist/' + id, 'DELETE', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.addListener('completed', function(e) {
          for (var i = 0; i < self.__data.playlists.length; i++) {
            if (self.__data.playlists[i].id === id) {
              self.__data.playlists.splice(i, 1);
              break;
            }
          }
          self.fireEvent('playlistDeleted');
          callback(true);
        });
        request.addListener('failed', function(e) {
          callback(false);
        });
        request.send();
      },

      /**
       * Log in the user with the provided credentials and save the auth token on success
       *
       * @param data
       * @param callback
       */
      login: function(data, callback) {
        var self = this;
        var request = new qx.io.remote.Request('/api/me', 'POST', 'application/json');
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(100000000);
        request.addListener('completed', function(e) {
          self.__data = e.getContent();

          for (var i = 0; i < self.__data.artists.length; i++) {
            var artist = JSON.parse(JSON.stringify(self.__data.artists[i]));
            for (var j = 0; j < artist.albums.length; j++) {
              var album = JSON.parse(JSON.stringify(artist.albums[j]));
              for (var k = 0; k < album.songs.length; k++) {
                var song = JSON.parse(JSON.stringify(album.songs[k]));

                self.__artists[artist.id] = artist;
                self.__albums[album.id] = album;
                self.__songs[song.id] = {
                  id: song.id,
                  title: song.title,
                  year: album.year,
                  disc: song.disc === 0 ? '' : song.disc,
                  track: song.track,
                  rating: null,
                  search_value: song.title + ' ' + artist.name + ' ' + album.name,
                  genre: song.genre,
                  length: song.length,
                  compilationState: album.is_compilation ? 1 : 0,
                  album: {
                    id: album.id,
                    cover: album.cover,
                    name: album.name,
                    year: album.year,
                    artist: {
                      id: artist.id,
                      image: artist.image,
                      name: artist.name
                    }
                  }
                };
              }
            }
          }

          callback(self.__data);
        });
        request.send();
      },

      isLastFmEnabled: function() {
        return this.__data.useLastfm;
      },

      disconnectFromLastFm: function(callback) {
        var request = new qx.io.remote.Request('/api/lastfm/disconnect', 'DELETE', 'application/json');
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.addListener('completed', function(e) {
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
      getData: function(callback) {
        if (this.__data) {
          return callback(this.__data);
        }

        this.fetchData(callback);
      },

      getSongs: function() {
        return this.__songs;
      },

      getSongById: function(id) {
        return this.__songs[id];
      },

      getAlbumById: function(id) {
        return this.__albums[id];
      },

      getArtistById: function(id) {
        return this.__artists[id];
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

      getUserPreferences: function() {
        return this.__data.currentUser.preferences;
      },

      getUserPreferenceValue: function(key) {
        var preferences = this.getUserPreferences();
        if (preferences[key]) {
          return preferences[key];
        }

        return null;
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

      getSongInfo: function(id, callback) {
        var infoData = null;
        var infoRequest = new qx.io.remote.Request('/api/' + id + '/info', 'GET', 'application/json');
        infoRequest.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        infoRequest.setRequestHeader("Accept", "application/json");
        infoRequest.setRequestHeader("content-type", "application/json");
        infoRequest.setTimeout(60000);
        infoRequest.addListener('completed', function(e) {
          callback(e.getContent());
        });
        infoRequest.addListener('failed', function(e) {
          infoData = false;
        });

        infoRequest.send();
      },

      getSongPlayInfo: function(id, callback) {
        var request = new qx.io.remote.Request('/api/interaction/play', 'POST', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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

      getSongUrl: function(songId, time) {
        return '/api/' + songId + '/play?jwt-token=' + this.getToken() + '&time=' + time;
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
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
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
      },

      favorite: function(songId, callback) {
        var request = new qx.io.remote.Request('/api/interaction/like', 'POST', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify({
          song: songId
        }));
        request.addListener('completed', function(e) {
          callback(e.getContent());
        });
        request.addListener('failed', function(e) {
          callback(false);
        });
        request.send();
      },
      
      updateSong: function(data, callback) {
        var request = new qx.io.remote.Request('/api/songs', 'PUT', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + this.getToken());
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("content-type", "application/json");
        request.setTimeout(60000);
        request.setData(JSON.stringify(data));
        request.addListener('completed', function(e) {
          callback(e.getContent());
        });
        request.addListener('failed', function(e) {
          callback(false);
        });
        request.send();
      }
    }
  });

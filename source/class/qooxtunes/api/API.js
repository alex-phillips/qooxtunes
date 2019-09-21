qx.Class.define("qooxtunes.api.API",
  {
    extend: qx.core.Object,

    statics: {
      serverType: null,

      get: function (serverType) {
        serverType = serverType || qooxtunes.api.API.serverType;

        switch (serverType) {
          case 'koel':
            return qooxtunes.api.Koel.getInstance();
            break;
          case 'subsonic':
            return qooxtunes.api.Subsonic.getInstance();
            break;
        }
      }
    }
  });

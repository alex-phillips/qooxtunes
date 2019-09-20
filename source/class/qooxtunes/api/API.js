qx.Class.define("qooxtunes.api.API",
  {
    extend: qx.core.Object,

    statics: {
      get: function () {
        return qooxtunes.api.Subsonic.getInstance();
      }
    }
  });

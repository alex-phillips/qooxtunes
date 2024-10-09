qx.Class.define("qooxtunes.util.XHR", {
  extend: qx.core.Object,

  statics: {
    get(url) {
      return new qx.Promise((resolve) => {
        var request = new qx.io.request.Xhr(url);
        request.addListener("success", function () {
          var response = request.getResponse()["subsonic-response"];

          return resolve(response);
        });
        request.send();
      });
    },
  },
});

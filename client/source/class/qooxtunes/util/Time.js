qx.Class.define("qooxtunes.util.Time",
  {
    extend: qx.core.Object,

    statics: {
      intToStr: function(ts) {
        var hour = Math.floor(ts / 60);
        var sec = parseInt(ts % 60);

        return hour + ":" + (sec > 9 ? sec : "0" + sec);
      },

      duration_str_to_int: function(str) {
        var xary = str.split(':');

        if (xary.length == 1) {
          return parseInt(xary[0]);
        }

        if (xary.length == 2) {
          return parseInt(xary[0]) * 60 + parseInt(xary[1]);
        }

        if (xary.length == 2) {
          return parseInt(xary[0]) * 3600 + parseInt(xary[1]) * 60 + parseInt(xary[2]);
        }

        return 0;
      }
    }
  });

qx.Class.define("qooxtunes.util.Time",
  {
    extend: qx.core.Object,

    statics: {
      intToStr: function(ts) {
        var hour = Math.floor(ts / 60);
        var sec = parseInt(ts % 60);

        return hour + ":" + (sec > 9 ? sec : "0" + sec);
      },

      totalDurationString: function(time) {
        var sec_num = parseInt(time, 10); // don't forget the second param
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        // if (minutes < 10) {
        //   minutes = "0" + minutes;
        // }
        // if (seconds < 10) {
        //   seconds = "0" + seconds;
        // }

        var timeParts = [];
        if (hours > 0) {
          timeParts.push(hours + ' hours');
        }
        if (minutes > 0) {
          timeParts.push(minutes + ' minutes');
        }
        if (seconds > 0) {
          timeParts.push(seconds + ' seconds');
        }

        var retval = timeParts.join(', ');

        var days = '';
        if (hours > 24) {
          retval = (time / 86400).toFixed(1) + ' days';
        }

        // return days + hours + ':' + minutes + ':' + seconds;
        return retval;
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

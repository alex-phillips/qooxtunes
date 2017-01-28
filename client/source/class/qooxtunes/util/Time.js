qx.Class.define("qooxtunes.util.Time",
  {
    extend: qx.core.Object,

    statics: {
      intToStr: function(ts) {
        var hour = Math.floor(ts / 3600);
        var min = Math.floor(ts / 60);
        var sec = parseInt(ts % 60);

        var retval = min + ":" + (sec > 9 ? sec : "0" + sec);

        if (hour > 0) {
          if (min < 10) {
            min = '0' + min;
          }
          retval = hour + ':' + min + ":" + (sec > 9 ? sec : "0" + sec);
        }

        return retval;
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

      durationStringToInt: function(str) {
        var xary = str.split(':');

        if (xary.length === 1) {
          return parseInt(xary[0]);
        }

        if (xary.length === 2) {
          return parseInt(xary[0]) * 60 + parseInt(xary[1]);
        }

        if (xary.length === 3) {
          return parseInt(xary[0]) * 3600 + parseInt(xary[1]) * 60 + parseInt(xary[2]);
        }

        console.log('bad length of ' + xary.length);
        console.log(xary)

        return 0;
      }
    }
  });

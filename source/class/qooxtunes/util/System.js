qx.Class.define("qooxtunes.util.System",
  {
    extend: qx.core.Object,

    statics: {
      getOS: function(value, size, bold) {
        if (navigator.appVersion.indexOf("Win") != -1) {
          return "Windows";
        } else if (navigator.appVersion.indexOf("Mac") != -1) {
          return "MacOS";
        } else if (navigator.appVersion.indexOf("X11") != -1) {
          return "UNIX";
        } else if (navigator.appVersion.indexOf("Linux") != -1) {
          return "Linux";
        }

        return null;
      },

      getShortcutMetaKey: function() {
        switch (qooxtunes.util.System.getOS()) {
          case 'MacOS':
            return 'Meta';
            break;
          default:
            return 'Ctrl';
            break;
        }
      }
    }
  });

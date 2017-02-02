qx.Class.define("qooxtunes.ui.ctl.Table",
  {
    extend: qx.ui.table.Table,

    construct: function(tableModel, custom) {
      this.base(arguments, tableModel, custom);
      this.set({showCellFocusIndicator: false});
    },

    members: {
      getFirstSelectedIndex: function() {
        var m = this.getSelectionModel();
        var ranges = m.getSelectedRanges();

        if (ranges.length < 1) {
          return -1;
        }

        return ranges[0].minIndex;
      },


      getSelectedItems: function() {
        var m = this.getSelectionModel();
        var ranges = m.getSelectedRanges();

        var tm = this.getTableModel();

        var xary = [];
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i];

          for (var j = range.minIndex; j <= range.maxIndex; j++) {
            var sel_item = tm.getRowDataAsMap(j);
            xary.push(sel_item);
          }
        }

        return xary;
      },

      getSelectedIndices: function() {
        var m = this.getSelectionModel();
        var ranges = m.getSelectedRanges();

        var xary = [];
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i];

          for (var j = range.minIndex; j <= range.maxIndex; j++) {
            xary.push(j);
          }
        }

        return xary;
      },

      clearSelection: function() {
        var m = this.getSelectionModel();
        m.resetSelection();
      },

      setSelectedIndex: function(idx) {
        var m = this.getSelectionModel();
        m.setSelectionInterval(idx, idx);
      },

      removeSelectedItems: function() {
        var m = this.getSelectionModel();
        var ranges = m.getSelectedRanges();

        var tm = this.getTableModel();

        // work backward through the ranges so we don't mess
        // up the row indices as we delete them...
        for (var i = ranges.length - 1; i >= 0; i--) {
          var range = ranges[i];

          tm.removeRows(range.minIndex, range.maxIndex - range.minIndex + 1);
        }

        this.resetCellFocus();
      },

      setColumnWidth: function(idx, w) {
        var tcm = this.getTableColumnModel();
        var resize_behavior = tcm.getBehavior();
        resize_behavior.set(idx, {width: w});
      }
    }
  });

/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * A table column model that automatically resizes columns based on a
 * selected behavior.
 *
 * @see qx.ui.table.columnmodel.Basic
 */
qx.Class.define("qx.ui.table.columnmodel.Resize",
{
  extend : qx.ui.table.columnmodel.Basic,
  include : qx.locale.MTranslation,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // We don't want to recursively call ourself based on our resetting of
    // column sizes.  Track when we're resizing.
    this.__bInProgress = false;

    // Track when the table has appeared.  We want to ignore resize events
    // until then since we won't be able to determine the available width
    // anyway.
    this.__bAppeared = false;
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * The behavior to use.
     *
     * The provided behavior must extend {@link qx.ui.table.columnmodel.resizebehavior.Abstract} and
     * implement the <i>onAppear</i>, <i>onTableWidthChanged</i>,
     * <i>onColumnWidthChanged</i> and <i>onVisibilityChanged</i>methods.
     */
    behavior :
    {
      check : "qx.ui.table.columnmodel.resizebehavior.Abstract",
      init : null,
      nullable : true,
      apply : "_applyBehavior",
      event : "changeBehavior"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __bAppeared : null,
    __bInProgress : null,
    __table : null,


    // Behavior modifier
    _applyBehavior : function(value, old)
    {
      if (old != null)
      {
        old.dispose();
        old = null;
      }

      // Tell the new behavior how many columns there are
      value._setNumColumns(this.getOverallColumnCount());
      value.setTableColumnModel(this);
    },


    /**
     * Initializes the column model.
     *
     * @param numColumns {Integer} the number of columns the model should have.
     * @param table {qx.ui.table.Table}
     *   The table which this model is used for. This allows us access to
     *   other aspects of the table, as the <i>behavior</i> sees fit.
     */
    init : function(numColumns, table)
    {
      // Call our superclass
      this.base(arguments, numColumns, table);

      if (this.__table == null)
      {
        this.__table = table;
        // We'll do our column resizing when the table appears, ...
        table.addListener("appear", this._onappear, this);

        // ... when the inner width of the table changes, ...
        table.addListener("tableWidthChanged", this._onTableWidthChanged, this);

        // ... when a vertical scroll bar appears or disappears
        table.addListener(
          "verticalScrollBarChanged",
          this._onverticalscrollbarchanged,
          this
        );

        // We want to manipulate the button visibility menu
        table.addListener(
          "columnVisibilityMenuCreateEnd",
          this._addResetColumnWidthButton,
          this
        );

        // ... when columns are resized, ...
        this.addListener("widthChanged", this._oncolumnwidthchanged, this );

        // ... and when a column visibility changes.
        this.addListener("visibilityChanged", this._onvisibilitychanged, this);
      }

      // Set the initial resize behavior
      if (this.getBehavior() == null) {
        this.setBehavior(new qx.ui.table.columnmodel.resizebehavior.Default());
      }

      // Tell the behavior how many columns there are
      this.getBehavior()._setNumColumns(numColumns);
    },


    /**
     * Get the table widget
     *
     * @return {qx.ui.table.Table} the table widget
     */
    getTable : function() {
      return this.__table;
    },


    /**
     * Reset the column widths to their "onappear" defaults.
     *
     * @param event {qx.event.type.Data}
     *   The "columnVisibilityMenuCreateEnd" event indicating that the menu is
     *   being generated.  The data is a map containing properties <i>table</i>
     *   and <i>menu</i>.
     *
     */
    _addResetColumnWidthButton : function(event)
    {
      var data = event.getData();
      var columnButton = data.columnButton;
      var menu = data.menu;
      var o;

      // Add a separator between the column names and our reset button
      o = columnButton.factory("separator");
      menu.add(o);

      // Add a button to reset the column widths
      o = columnButton.factory("user-button",
                               {
                                 text : this.tr("Reset column widths")
                               });
      menu.add(o);
      o.addListener("execute", this._onappear, this);
    },


    /**
     * Event handler for the "appear" event.
     *
     * @param event {qx.event.type.Event}
     *   The "onappear" event object.
     *
     */
    _onappear : function(event)
    {
      // Is this a recursive call?
      if (this.__bInProgress)
      {
        // Yup.  Ignore it.
        return ;
      }

      this.__bInProgress = true;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.tableResizeDebug"))
        {
          this.debug("onappear");
        }
      }

      // this handler is also called by the "execute" event of the menu button
      this.getBehavior().onAppear(event, event.getType() !== "appear");

      this.__table._updateScrollerWidths();
      this.__table._updateScrollBarVisibility();

      this.__bInProgress = false;

      this.__bAppeared = true;
    },


    /**
     * Event handler for the "tableWidthChanged" event.
     *
     * @param event {qx.event.type.Event}
     *   The "onwindowresize" event object.
     *
     */
    _onTableWidthChanged : function(event)
    {
      // Is this a recursive call or has the table not yet been rendered?
      if (this.__bInProgress || !this.__bAppeared)
      {
        // Yup.  Ignore it.
        return;
      }

      this.__bInProgress = true;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.tableResizeDebug"))
        {
          this.debug("ontablewidthchanged");
        }
      }

      this.getBehavior().onTableWidthChanged(event);
      this.__bInProgress = false;
    },


    /**
     * Event handler for the "verticalScrollBarChanged" event.
     *
     * @param event {qx.event.type.Data}
     *   The "verticalScrollBarChanged" event object.  The data is a boolean
     *   indicating whether a vertical scroll bar is now present.
     *
     */
    _onverticalscrollbarchanged : function(event)
    {
      // Is this a recursive call or has the table not yet been rendered?
      if (this.__bInProgress || !this.__bAppeared)
      {
        // Yup.  Ignore it.
        return;
      }

      this.__bInProgress = true;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.tableResizeDebug"))
        {
          this.debug("onverticalscrollbarchanged");
        }
      }

      this.getBehavior().onVerticalScrollBarChanged(event);

      qx.event.Timer.once(function()
      {
        if (this.__table && !this.__table.isDisposed())
        {
          this.__table._updateScrollerWidths();
          this.__table._updateScrollBarVisibility();
        }
      }, this, 0);

      this.__bInProgress = false;
    },


    /**
     * Event handler for the "widthChanged" event.
     *
     * @param event {qx.event.type.Data}
     *   The "widthChanged" event object.
     *
     */
    _oncolumnwidthchanged : function(event)
    {
      // Is this a recursive call or has the table not yet been rendered?
      if (this.__bInProgress || !this.__bAppeared)
      {
        // Yup.  Ignore it.
        return;
      }

      this.__bInProgress = true;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.tableResizeDebug"))
        {
          this.debug("oncolumnwidthchanged");
        }
      }

      this.getBehavior().onColumnWidthChanged(event);
      this.__bInProgress = false;
    },


    /**
     * Event handler for the "visibilityChanged" event.
     *
     * @param event {qx.event.type.Data}
     *   The "visibilityChanged" event object.
     *
     */
    _onvisibilitychanged : function(event)
    {
      // Is this a recursive call or has the table not yet been rendered?
      if (this.__bInProgress || !this.__bAppeared)
      {
        // Yup.  Ignore it.
        return;
      }

      this.__bInProgress = true;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.tableResizeDebug"))
        {
          this.debug("onvisibilitychanged");
        }
      }

      this.getBehavior().onVisibilityChanged(event);
      this.__bInProgress = false;
    }
  },


 /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this.__table = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007-2008 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * All of the resizing information about a column.
 *
 *  This is used internally by qx.ui.table and qx.ui.progressive's table and
 *  may be used for other widgets as well.
 */
qx.Class.define("qx.ui.core.ColumnData",
{
  extend : qx.ui.core.LayoutItem,


  construct : function()
  {
    this.base(arguments);
    this.setColumnWidth("auto");
  },


  members :
  {
    __computedWidth : null,


    // overridden
    renderLayout : function(left, top, width, height) {
      this.__computedWidth = width;
    },


    /**
     * Get the computed width of the column.
     * @return {Integer} Computed column width
     */
    getComputedWidth : function() {
      return this.__computedWidth;
    },


    /**
     * Get the column's flex value
     *
     * @return {Integer} The column's flex value
     */
    getFlex : function()
    {
      return this.getLayoutProperties().flex || 0;
    },


    /**
     * Set the column width. The column width can be one of the following
     * values:
     *
     * * Pixels: e.g. <code>23</code>
     * * Autosized: <code>"auto"</code>
     * * Flex: e.g. <code>"1*"</code>
     * * Percent: e.g. <code>"33%"</code>
     *
     * @param width {Integer|String} The column width
     * @param flex {Integer?0} Optional flex value of the column
     */
    setColumnWidth : function(width, flex)
    {
      var flex = flex || 0;
      var percent = null;

      if (typeof width == "number")
      {
        this.setWidth(width);
      }
      else if (typeof width == "string")
      {
        if (width == "auto") {
          flex = 1;
        }
        else
        {
          var match = width.match(/^[0-9]+(?:\.[0-9]+)?([%\*])$/);
          if (match)
          {
            if (match[1] == "*") {
              flex = parseFloat(width);
            } else {
              percent = width;
            }
          }
        }
      }
      this.setLayoutProperties({
        flex: flex,
        width: percent
      });
    }
  },

  environment :
  {
    "qx.tableResizeDebug" : false
  }
})
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * An abstract resize behavior.  All resize behaviors should extend this
 * class.
 */
qx.Class.define("qx.ui.table.columnmodel.resizebehavior.Abstract",
{
  type : "abstract",
  extend : qx.core.Object,



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Called when the ResizeTableColumnModel is initialized, and upon loading of
     * a new TableModel, to allow the Resize Behaviors to know how many columns
     * are in use.
     *
     * @abstract
     * @param numColumns {Integer} The numbrer of columns in use.
     * @throws {Error} the abstract function warning.
     */
    _setNumColumns : function(numColumns) {
      throw new Error("_setNumColumns is abstract");
    },


    /**
     * Called when the table has first been rendered.
     *
     * @abstract
     * @param event {var} The <i>onappear</i> event object.
     * @param forceRefresh {Boolean?false} Whether a refresh should be forced
     * @throws {Error} the abstract function warning.
     */
    onAppear : function(event, forceRefresh) {
      throw new Error("onAppear is abstract");
    },


    /**
     * Called when the table width changes due to either a window size change
     * or a parent object changing size causing the table to change size.
     *
     * @abstract
     * @param event {var} The <i>tableWidthChanged</i> event object.
     * @throws {Error} the abstract function warning.
     */
    onTableWidthChanged : function(event) {
      throw new Error("onTableWidthChanged is abstract");
    },


    /**
     * Called when the use of vertical scroll bar in the table changes, either
     * from present to not present, or vice versa.
     *
     * @abstract
     * @param event {var} The <i>verticalScrollBarChanged</i> event object.  This event has data,
     *     obtained via event.getValue(), which is a boolean indicating whether a
     *     vertical scroll bar is now present.
     * @throws {Error} the abstract function warning.
     */
    onVerticalScrollBarChanged : function(event) {
      throw new Error("onVerticalScrollBarChanged is abstract");
    },


    /**
     * Called when a column width is changed.
     *
     * @abstract
     * @param event {var} The <i>widthChanged</i> event object.  This event has data, obtained via
     *     event.getValue(), which is an object with three properties: the column
     *     which changed width (data.col), the old width (data.oldWidth) and the new
     *     width (data.newWidth).
     * @throws {Error} the abstract function warning.
     */
    onColumnWidthChanged : function(event) {
      throw new Error("onColumnWidthChanged is abstract");
    },


    /**
     * Called when a column visibility is changed.
     *
     * @abstract
     * @param event {var} The <i>visibilityChanged</i> event object.  This event has data, obtained
     *     via event.getValue(), which is an object with two properties: the column
     *     which changed width (data.col) and the new visibility of the column
     *     (data.visible).
     * @throws {Error} the abstract function warning.
     */
    onVisibilityChanged : function(event) {
      throw new Error("onVisibilityChanged is abstract");
    },

    /**
     * Determine the inner width available to columns in the table.
     *
     * @return {Integer} The available width
     */
    _getAvailableWidth : function()
    {
      var tableColumnModel = this.getTableColumnModel();

      // Get the inner width off the table
      var table = tableColumnModel.getTable();

      var scrollerArr = table._getPaneScrollerArr();
      if (!scrollerArr[0] || !scrollerArr[0].getLayoutParent().getBounds()) {
        return null;
      };
      var scrollerParentWidth = scrollerArr[0].getLayoutParent().getBounds().width;

      var lastScroller = scrollerArr[scrollerArr.length-1];
      scrollerParentWidth -= lastScroller.getPaneInsetRight();

      return scrollerParentWidth;
    }
  }});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * The default resize behavior.  Until a resize model is loaded, the default
 * behavior is to:
 * <ol>
 *   <li>
 *     Upon the table initially appearing, and upon any window resize, divide
 *     the table space equally between the visible columns.
 *   </li>
 *   <li>
 *     When a column is increased in width, all columns to its right are
 *     pushed to the right with no change to their widths.  This may push some
 *     columns off the right edge of the table, causing a horizontal scroll
 *     bar to appear.
 *   </li>
 *   <li>
 *     When a column is decreased in width, if the total width of all columns
 *     is <i>greater than</i> the table width, no additional column width
 *     change is made.
 *   </li>
 *   <li>
 *     When a column is decreased in width, if the total width of all columns
 *     is <i>less than</i> the table width, the visible column
 *     immediately to the right of the column which decreased in width has its
 *     width increased to fill the remaining space.
 *   </li>
 * </ol>
 *
 * A resize model may be loaded to provide more guidance on how to adjust
 * column width upon each of the events: initial appear, window resize, and
 * column resize. *** TO BE FILLED IN ***
 *
 * @require(qx.ui.core.ColumnData)
 */
qx.Class.define("qx.ui.table.columnmodel.resizebehavior.Default",
{
  extend : qx.ui.table.columnmodel.resizebehavior.Abstract,


  construct : function()
  {
    this.base(arguments);

    this.__resizeColumnData = [];

    // This layout is not connected to a widget but to this class. This class
    // must implement the method "getLayoutChildren", which must return all
    // columns (LayoutItems) which should be recalcutated. The call
    // "layout.renderLayout" will call the method "renderLayout" on each column
    // data object
    // The advantage of the use of the normal layout manager is that the
    // samantics of flex and percent are exectly the same as in the widget code.
    this.__layout = new qx.ui.layout.HBox();
    this.__layout.connectToWidget(this);

    this.__deferredComputeColumnsFlexWidth = new qx.util.DeferredCall(
      this._computeColumnsFlexWidth, this
    );
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * A function to instantiate a resize behavior column data object.
     */
    newResizeBehaviorColumnData :
    {
      check : "Function",
      init : function(obj)
      {
        return new qx.ui.core.ColumnData();
      }
    },

    /**
     * Whether to reinitialize default widths on each appear event.
     * Typically, one would want to initialize the default widths only upon
     * the first appearance of the table, but the original behavior was to
     * reinitialize it even if the table is hidden and then reshown
     * (e.g. it's in a pageview and the page is switched and then switched
     * back).
     */
    initializeWidthsOnEveryAppear :
    {
      check : "Boolean",
      init  : false
    },

    /**
     * The table column model in use.  Of particular interest is the method
     * <i>getTable</i> which is a reference to the table widget.  This allows
     * access to any other features of the table, for use in calculating widths
     * of columns.
     */
    tableColumnModel :
    {
      check : "qx.ui.table.columnmodel.Resize"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __layout : null,
    __layoutChildren : null,
    __resizeColumnData : null,
    __deferredComputeColumnsFlexWidth : null,

    /**
     * Whether we have initialized widths on the first appear yet
     */
    __widthsInitialized : false,

    /**
     * Set the width of a column.
     *
     * @param col {Integer} The column whose width is to be set
     *
     * @param width {Integer|String}
     *   The width of the specified column.  The width may be specified as
     *   integer number of pixels (e.g. 100), a string representing percentage
     *   of the inner width of the Table (e.g. "25%"), or a string
     *   representing a flex width (e.g. "1*").
     *
     * @param flex {Integer?0} Optional flex value of the column
     *
     * @throws {Error}
     *   Error is thrown if the provided column number is out of the range.
     */
    setWidth : function(col, width, flex)
    {
      // Ensure the column is within range
      if (col >= this.__resizeColumnData.length) {
        throw new Error("Column number out of range");
      }

      // Set the new width
      this.__resizeColumnData[col].setColumnWidth(width, flex);
      this.__deferredComputeColumnsFlexWidth.schedule();
    },


    /**
     * Set the minimum width of a column.
     *
     * @param col {Integer}
     *   The column whose minimum width is to be set
     *
     * @param width {Integer}
     *   The minimum width of the specified column.
     *
     *
     * @throws {Error}
     *   Error is thrown if the provided column number is out of the range.
     */
    setMinWidth : function(col, width)
    {
      // Ensure the column is within range
      if (col >= this.__resizeColumnData.length)
      {
        throw new Error("Column number out of range");
      }

      // Set the new width
      this.__resizeColumnData[col].setMinWidth(width);
      this.__deferredComputeColumnsFlexWidth.schedule();
    },


    /**
     * Set the maximum width of a column.
     *
     * @param col {Integer}
     *   The column whose maximum width is to be set
     *
     * @param width {Integer}
     *   The maximum width of the specified column.
     *
     *
     * @throws {Error}
     *   Error is thrown if the provided column number is out of the range.
     */
    setMaxWidth : function(col, width)
    {
      // Ensure the column is within range
      if (col >= this.__resizeColumnData.length) {
        throw new Error("Column number out of range");
      }

      // Set the new width
      this.__resizeColumnData[col].setMaxWidth(width);
      this.__deferredComputeColumnsFlexWidth.schedule();
    },


    /**
     * Set any or all of the width, minimum width, and maximum width of a
     * column in a single call.
     *
     * @param col {Integer}
     *   The column whose attributes are to be changed
     *
     * @param map {Map}
     *   A map containing any or all of the property names "width", "minWidth",
     *   and "maxWidth".  The property values are as described for
     *   {@link #setWidth}, {@link #setMinWidth} and {@link #setMaxWidth}
     *   respectively.
     *
     *
     * @throws {Error}
     *   Error is thrown if the provided column number is out of the range.
     */
    set : function(col, map)
    {
      for (var prop in map)
      {
        switch(prop)
        {
          case "width":
            this.setWidth(col, map[prop]);
            break;

          case "minWidth":
            this.setMinWidth(col, map[prop]);
            break;

          case "maxWidth":
            this.setMaxWidth(col, map[prop]);
            break;

          default:
            throw new Error("Unknown property: " + prop);
        }
      }
    },

    // overloaded
    onAppear : function(event, forceRefresh)
    {
      // If we haven't initialized widths at least once, or
      // they want us to reinitialize widths on every appear event...
      if (forceRefresh === true || !this.__widthsInitialized || this.getInitializeWidthsOnEveryAppear())
      {
        // Calculate column widths
        this._computeColumnsFlexWidth();

        // Track that we've initialized widths at least once
        this.__widthsInitialized = true;
      }
    },

    // overloaded
    onTableWidthChanged : function(event) {
      this._computeColumnsFlexWidth();
    },

    // overloaded
    onVerticalScrollBarChanged : function(event) {
      this._computeColumnsFlexWidth();
    },

    // overloaded
    onColumnWidthChanged : function(event)
    {
      // Extend the next column to fill blank space
      this._extendNextColumn(event);
    },

    // overloaded
    onVisibilityChanged : function(event)
    {
      // Event data properties: col, visible
      var data = event.getData();

      // If a column just became visible, resize all columns.
      if (data.visible)
      {
        this._computeColumnsFlexWidth();
        return;
      }

      // Extend the last column to fill blank space
      this._extendLastColumn(event);
    },

    // overloaded
    _setNumColumns : function(numColumns)
    {
      var colData = this.__resizeColumnData;
      // Are there now fewer (or the same number of) columns than there were
      // previously?
      if (numColumns <= colData.length)
      {
        // Yup.  Delete the extras.
        colData.splice(numColumns, colData.length);
        return;
      }

      // There are more columns than there were previously.  Allocate more.
      for (var i=colData.length; i<numColumns; i++)
      {
        colData[i] = this.getNewResizeBehaviorColumnData()();
        colData[i].columnNumber = i;
      }
    },


    /**
     * This method is required by the box layout. If returns an array of items
     * to relayout.
     *
     * @return {qx.ui.core.ColumnData[]} The list of column data object to layout.
     */
    getLayoutChildren : function() {
      return this.__layoutChildren;
    },


    /**
     * Computes the width of all flexible children.
     *
     */
    _computeColumnsFlexWidth : function()
    {
      this.__deferredComputeColumnsFlexWidth.cancel();
      var width = this._getAvailableWidth();

      if (width === null) {
        return;
      }

      var tableColumnModel = this.getTableColumnModel();
      var visibleColumns = tableColumnModel.getVisibleColumns();
      var visibleColumnsLength = visibleColumns.length;
      var colData = this.__resizeColumnData;
      var i, l;

      if (visibleColumnsLength === 0) {
        return;
      }

      // Create an array of the visible columns
      var columns = [ ];
      for (i=0; i<visibleColumnsLength; i++)
      {
        columns.push(colData[visibleColumns[i]]);
      }
      this.__layoutChildren = columns;
      this.__clearLayoutCaches();

      // Use a horizontal box layout to determine the available width.
      this.__layout.renderLayout(width, 100, {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      });

      // Now that we've calculated the width, set it.
      for (i=0,l=columns.length; i<l; i++)
      {
        var colWidth = columns[i].getComputedWidth();
        tableColumnModel.setColumnWidth(visibleColumns[i], colWidth);
      }
    },


    /**
     * Clear all layout caches of the column datas.
     */
    __clearLayoutCaches : function()
    {
      this.__layout.invalidateChildrenCache();
      var children = this.__layoutChildren;
      for (var i=0,l=children.length; i<l; i++) {
        children[i].invalidateLayoutCache();
      }
    },


    /**
     * Extend the visible column to right of the column which just changed
     * width, to fill any available space within the inner width of the table.
     * This means that if the sum of the widths of all columns exceeds the
     * inner width of the table, no change is made.  If, on the other hand,
     * the sum of the widths of all columns is less than the inner width of
     * the table, the visible column to the right of the column which just
     * changed width is extended to take up the width available within the
     * inner width of the table.
     *
     *
     * @param event {qx.event.type.Data}
     *   The event object.
     *
     */
    _extendNextColumn : function(event)
    {
      var tableColumnModel = this.getTableColumnModel();

      // Event data properties: col, oldWidth, newWidth
      var data = event.getData();

      var visibleColumns = tableColumnModel.getVisibleColumns();

      // Determine the available width
      var width = this._getAvailableWidth();

      // Determine the number of visible columns
      var numColumns = visibleColumns.length;

      // Did this column become longer than it was?
      if (data.newWidth > data.oldWidth)
      {
        // Yup.  Don't resize anything else.  The other columns will just get
        // pushed off and require scrollbars be added (if not already there).
        return ;
      }

      // This column became shorter.  See if we no longer take up the full
      // space that's available to us.
      var i;
      var nextCol;
      var widthUsed = 0;

      for (i=0; i<numColumns; i++) {
        widthUsed += tableColumnModel.getColumnWidth(visibleColumns[i]);
      }

      // If the used width is less than the available width...
      if (widthUsed < width)
      {
        // ... then determine the next visible column
        for (i=0; i<visibleColumns.length; i++)
        {
          if (visibleColumns[i] == data.col)
          {
            nextCol = visibleColumns[i + 1];
            break;
          }
        }

        if (nextCol)
        {
          // Make the next column take up the available space.
          var newWidth =
            (width - (widthUsed - tableColumnModel.getColumnWidth(nextCol)));
          tableColumnModel.setColumnWidth(nextCol, newWidth);
        }
      }
    },


    /**
     * If a column was just made invisible, extend the last column to fill any
     * available space within the inner width of the table.  This means that
     * if the sum of the widths of all columns exceeds the inner width of the
     * table, no change is made.  If, on the other hand, the sum of the widths
     * of all columns is less than the inner width of the table, the last
     * column is extended to take up the width available within the inner
     * width of the table.
     *
     *
     * @param event {qx.event.type.Data}
     *   The event object.
     *
     */
    _extendLastColumn : function(event)
    {
      var tableColumnModel = this.getTableColumnModel();

      // Event data properties: col, visible
      var data = event.getData();

      // If the column just became visible, don't make any width changes
      if (data.visible)
      {
        return;
      }

      // Get the array of visible columns
      var visibleColumns = tableColumnModel.getVisibleColumns();

      // If no columns are visible...
      if (visibleColumns.length == 0)
      {
        return;
      }

      // Determine the available width
      var width = this._getAvailableWidth(tableColumnModel);

      // Determine the number of visible columns
      var numColumns = visibleColumns.length;

      // See if we no longer take up the full space that's available to us.
      var i;
      var lastCol;
      var widthUsed = 0;

      for (i=0; i<numColumns; i++) {
        widthUsed += tableColumnModel.getColumnWidth(visibleColumns[i]);
      }

      // If the used width is less than the available width...
      if (widthUsed < width)
      {
        // ... then get the last visible column
        lastCol = visibleColumns[visibleColumns.length - 1];

        // Make the last column take up the available space.
        var newWidth =
          (width - (widthUsed - tableColumnModel.getColumnWidth(lastCol)));
        tableColumnModel.setColumnWidth(lastCol, newWidth);
      }
    },


    /**
     * Returns an array of the resizing information of a column.
     *
     * @return {qx.ui.core.ColumnData[]} array of the resizing information of a column.
     */
    _getResizeColumnData : function()
    {
      return this.__resizeColumnData;
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.__resizeColumnData = this.__layoutChildren = null;
    this._disposeObjects("__layout", "__deferredComputeColumnsFlexWidth");
  }
});

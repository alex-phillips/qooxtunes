/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * The Scroller wraps a {@link Pane} and provides scroll bars to interactively
 * scroll the pane's content.
 *
 * @childControl pane {qx.ui.virtual.core.Pane} Virtual pane.
 */
qx.Class.define("qx.ui.virtual.core.Scroller",
{
  extend : qx.ui.core.scroll.AbstractScrollArea,


  /**
   * @param rowCount {Integer?0} The number of rows of the virtual grid.
   * @param columnCount {Integer?0} The number of columns of the virtual grid.
   * @param cellHeight {Integer?10} The default cell height.
   * @param cellWidth {Integer?10} The default cell width.
   */
  construct : function(rowCount, columnCount, cellHeight, cellWidth)
  {
    this.base(arguments);

    this.__pane = new qx.ui.virtual.core.Pane(rowCount, columnCount, cellHeight, cellWidth);
    this.__pane.addListener("update", this._computeScrollbars, this);
    this.__pane.addListener("scrollX", this._onScrollPaneX, this);
    this.__pane.addListener("scrollY", this._onScrollPaneY, this);

    if (qx.core.Environment.get("os.scrollBarOverlayed")) {
      this._add(this.__pane, {edge: 0});
    } else {
      this._add(this.__pane, {row: 0, column: 0});
    }

  },


  properties :
  {
    // overridden
    width :
    {
      refine : true,
      init : null
    },


    // overridden
    height :
    {
      refine : true,
      init : null
    }
  },


  members :
  {
    /** @type {Pane} Virtual pane. */
    __pane : null,


    /*
    ---------------------------------------------------------------------------
      ACCESSOR METHODS
    ---------------------------------------------------------------------------
    */


    /**
     * Get the scroller's virtual pane.
     *
     * @return {Pane} The scroller's pane.
     */
    getPane : function() {
      return this.__pane;
    },


    /*
    ---------------------------------------------------------------------------
      CHILD CONTROL SUPPORT
    ---------------------------------------------------------------------------
    */


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      if (id == "pane") {
        return this.__pane;
      } else {
        return this.base(arguments, id);
      }
    },


    /*
    ---------------------------------------------------------------------------
      ITEM LOCATION SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * NOT IMPLEMENTED
     *
     * @param item {qx.ui.core.Widget} Item to query.
     * @return {Integer} Top offset.
     * @abstract
     */
    getItemTop : function(item)
    {
      throw new Error("The method 'getItemTop' is not implemented!");
    },


    /**
     * NOT IMPLEMENTED
     *
     * @param item {qx.ui.core.Widget} Item to query.
     * @return {Integer} Top offset.
     * @abstract
     */
    getItemBottom : function(item)
    {
      throw new Error("The method 'getItemBottom' is not implemented!");
    },


    /**
     * NOT IMPLEMENTED
     *
     * @param item {qx.ui.core.Widget} Item to query.
     * @return {Integer} Top offset.
     * @abstract
     */
    getItemLeft : function(item)
    {
      throw new Error("The method 'getItemLeft' is not implemented!");
    },


    /**
     * NOT IMPLEMENTED
     *
     * @param item {qx.ui.core.Widget} Item to query.
     * @return {Integer} Right offset.
     * @abstract
     */
    getItemRight : function(item)
    {
      throw new Error("The method 'getItemRight' is not implemented!");
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */


    // overridden
    _onScrollBarX : function(e) {
      this.__pane.setScrollX(e.getData());
    },


    // overridden
    _onScrollBarY : function(e) {
      this.__pane.setScrollY(e.getData());
    }
  },


  destruct : function()
  {
    this.__pane.dispose();
    this.__pane = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * The Pane provides a window of a larger virtual grid.
 *
 * The actual rendering is performed by one or several layers ({@link ILayer}.
 * The pane computes, which cells of the virtual area is visible and instructs
 * the layers to render these cells.
 */
qx.Class.define("qx.ui.virtual.core.Pane",
{
  extend : qx.ui.core.Widget,


  /**
   * @param rowCount {Integer?0} The number of rows of the virtual grid.
   * @param columnCount {Integer?0} The number of columns of the virtual grid.
   * @param cellHeight {Integer?10} The default cell height.
   * @param cellWidth {Integer?10} The default cell width.
   */
  construct : function(rowCount, columnCount, cellHeight, cellWidth)
  {
    this.base(arguments);

    this.__rowConfig = new qx.ui.virtual.core.Axis(cellHeight, rowCount);
    this.__columnConfig = new qx.ui.virtual.core.Axis(cellWidth, columnCount);

    this.__scrollTop = 0;
    this.__scrollLeft = 0;


    this.__paneHeight = 0;
    this.__paneWidth = 0;

    this.__layerWindow = {};
    this.__jobs = {};

    // create layer container. The container does not have a layout manager
    // layers are positioned using "setUserBounds"
    this.__layerContainer = new qx.ui.container.Composite();
    this.__layerContainer.setUserBounds(0, 0, 0, 0);
    this._add(this.__layerContainer);

    this.__layers = [];

    this.__rowConfig.addListener("change", this.fullUpdate, this);
    this.__columnConfig.addListener("change", this.fullUpdate, this);

    this.addListener("resize", this._onResize, this);
    this.addListenerOnce("appear", this._onAppear, this);

    this.addListener("pointerdown", this._onPointerDown, this);
    this.addListener("tap", this._onTap, this);
    this.addListener("dbltap", this._onDbltap, this);
    this.addListener("contextmenu", this._onContextmenu, this);
  },


  events :
  {
    /** Fired if a cell is tapped. */
    cellTap : "qx.ui.virtual.core.CellEvent",

    /** Fired if a cell is right-clicked. */
    cellContextmenu : "qx.ui.virtual.core.CellEvent",

    /** Fired if a cell is double-tapped. */
    cellDbltap : "qx.ui.virtual.core.CellEvent",

    /** Fired on resize of either the container or the (virtual) content. */
    update : "qx.event.type.Event",

    /** Fired if the pane is scrolled horizontally. */
    scrollX : "qx.event.type.Data",

    /** Fired if the pane is scrolled vertically. */
    scrollY : "qx.event.type.Data"
  },


  properties :
  {
    // overridden
    width :
    {
      refine : true,
      init : 400
    },


    // overridden
    height :
    {
      refine : true,
      init : 300
    }
  },


  members :
  {
    __rowConfig : null,
    __columnConfig : null,
    __scrollTop : null,
    __scrollLeft : null,
    __paneHeight : null,
    __paneWidth : null,
    __layerWindow : null,
    __jobs : null,
    __layerContainer : null,
    __layers : null,
    __dontFireUpdate : null,
    __columnSizes : null,
    __rowSizes : null,
    __pointerDownCoords : null,


    /*
    ---------------------------------------------------------------------------
      ACCESSOR METHODS
    ---------------------------------------------------------------------------
    */


    /**
     * Get the axis object, which defines the row numbers and the row sizes.
     *
     * @return {Axis} The row configuration.
     */
    getRowConfig : function() {
      return this.__rowConfig;
    },


    /**
     * Get the axis object, which defines the column numbers and the column sizes.
     *
     * @return {Axis} The column configuration.
     */
    getColumnConfig : function() {
      return this.__columnConfig;
    },


    /*
    ---------------------------------------------------------------------------
      LAYER MANAGEMENT
    ---------------------------------------------------------------------------
    */


    /**
     * Returns an array containing the layer container.
     *
     * @return {Object[]} The layer container array.
     */
    getChildren : function() {
      return [this.__layerContainer];
    },


    /**
     * Add a layer to the layer container.
     *
     * @param layer {ILayer} The layer to add.
     */
    addLayer : function(layer)
    {
      if (qx.core.Environment.get("qx.debug")) {
        this.assertInterface(layer, qx.ui.virtual.core.ILayer);
      }

      this.__layers.push(layer);
      layer.setUserBounds(0, 0, 0, 0);
      this.__layerContainer.add(layer);
    },


    /**
     * Get a list of all layers.
     *
     * @return {ILayer[]} List of the pane's layers.
     */
    getLayers : function() {
      return this.__layers;
    },


    /**
     * Get a list of all visible layers.
     *
     * @return {ILayer[]} List of the pane's visible layers.
     */
    getVisibleLayers : function()
    {
      var layers = [];
      for (var i=0; i<this.__layers.length; i++)
      {
        var layer = this.__layers[i];
        if (layer.isVisible()) {
          layers.push(layer);
        }
      }
      return layers;
    },


    /*
    ---------------------------------------------------------------------------
      SCROLL SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * The maximum horizontal scroll position.
     *
     * @return {Integer} Maximum horizontal scroll position.
     */
    getScrollMaxX : function()
    {
      var paneSize = this.getInnerSize();

      if (paneSize) {
        return Math.max(0, this.__columnConfig.getTotalSize() - paneSize.width);
      }

      return 0;
    },


    /**
     * The maximum vertical scroll position.
     *
     * @return {Integer} Maximum vertical scroll position.
     */
    getScrollMaxY : function()
    {
      var paneSize = this.getInnerSize();

      if (paneSize) {
        return Math.max(0, this.__rowConfig.getTotalSize() - paneSize.height);
      }

      return 0;
    },


    /**
     * Scrolls the content to the given left coordinate.
     *
     * @param value {Integer} The vertical position to scroll to.
     */
    setScrollY : function(value)
    {
      var max = this.getScrollMaxY();

      if (value < 0) {
        value = 0;
      } else if (value > max) {
        value = max;
      }

      if (this.__scrollTop !== value)
      {
        var old = this.__scrollTop;
        this.__scrollTop = value;
        this._deferredUpdateScrollPosition();
        this.fireDataEvent("scrollY", value, old);
      }
    },


    /**
     * Returns the vertical scroll offset.
     *
     * @return {Integer} The vertical scroll offset.
     */
    getScrollY : function() {
      return this.__scrollTop;
    },


    /**
     * Scrolls the content to the given top coordinate.
     *
     * @param value {Integer} The horizontal position to scroll to.
     */
    setScrollX : function(value)
    {
      var max = this.getScrollMaxX();

      if (value < 0) {
        value = 0;
      } else if (value > max) {
        value = max;
      }

      if (value !== this.__scrollLeft)
      {
        var old = this.__scrollLeft;
        this.__scrollLeft = value;
        this._deferredUpdateScrollPosition();

        this.fireDataEvent("scrollX", value, old);
      }
    },


    /**
     * Returns the horizontal scroll offset.
     *
     * @return {Integer} The horizontal scroll offset.
     */
    getScrollX : function() {
      return this.__scrollLeft;
    },


    /**
     * The (virtual) size of the content.
     *
     * @return {Map} Size of the content (keys: <code>width</code> and
     *     <code>height</code>).
     */
    getScrollSize : function()
    {
      return {
        width: this.__columnConfig.getTotalSize(),
        height: this.__rowConfig.getTotalSize()
      }
    },


    /*
    ---------------------------------------------------------------------------
      SCROLL INTO VIEW SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * Scrolls a row into the visible area of the pane.
     *
     * @param row {Integer} The row's index.
     */
    scrollRowIntoView : function(row)
    {
      var bounds = this.getBounds();
      if (!bounds)
      {
        this.addListenerOnce("appear", function()
        {
          // It's important that the registered events are first dispatched.
          qx.event.Timer.once(function() {
            this.scrollRowIntoView(row);
          }, this, 0);
        }, this);
        return;
      }

      var itemTop = this.__rowConfig.getItemPosition(row);
      var itemBottom = itemTop + this.__rowConfig.getItemSize(row);
      var scrollTop = this.getScrollY();

      if (itemTop < scrollTop) {
        this.setScrollY(itemTop);
      } else if (itemBottom > scrollTop + bounds.height) {
        this.setScrollY(itemBottom - bounds.height);
      }
    },


    /**
     * Scrolls a column into the visible area of the pane.
     *
     * @param column {Integer} The column's index.
     */
    scrollColumnIntoView : function(column)
    {
      var bounds = this.getBounds();
      if (!bounds)
      {
        this.addListenerOnce("appear", function()
        {
          // It's important that the registered events are first dispatched.
          qx.event.Timer.once(function() {
            this.scrollColumnIntoView(column);
          }, this, 0);
        }, this);
        return;
      }

      var itemLeft = this.__columnConfig.getItemPosition(column);
      var itemRight = itemLeft + this.__columnConfig.getItemSize(column);
      var scrollLeft = this.getScrollX();

      if (itemLeft < scrollLeft) {
        this.setScrollX(itemLeft);
      } else if (itemRight > scrollLeft + bounds.width) {
        this.setScrollX(itemRight - bounds.width);
      }
    },


    /**
     * Scrolls a grid cell into the visible area of the pane.
     *
     * @param row {Integer} The cell's row index.
     * @param column {Integer} The cell's column index.
     */
    scrollCellIntoView : function(column, row)
    {
      var bounds = this.getBounds();
      if (!bounds)
      {
        this.addListenerOnce("appear", function()
        {
          // It's important that the registered events are first dispatched.
          qx.event.Timer.once(function() {
            this.scrollCellIntoView(column, row);
          }, this, 0);
        }, this);
        return;
      }

      this.scrollColumnIntoView(column);
      this.scrollRowIntoView(row);
    },


    /*
    ---------------------------------------------------------------------------
      CELL SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * Get the grid cell at the given absolute document coordinates. This method
     * can be used to convert the pointer position returned by
     * {@link qx.event.type.Pointer#getDocumentLeft} and
     * {@link qx.event.type.Pointer#getDocumentLeft} into cell coordinates.
     *
     * @param documentX {Integer} The x coordinate relative to the viewport
     *    origin.
     * @param documentY {Integer} The y coordinate relative to the viewport
     *    origin.
     * @return {Map|null} A map containing the <code>row</code> and <code>column</code>
     *    of the found cell. If the coordinate is outside of the pane's bounds
     *    or there is no cell at the coordinate <code>null</code> is returned.
     */
    getCellAtPosition: function(documentX, documentY)
    {
      var rowData, columnData;
      var paneLocation = this.getContentLocation();

      if (
        !paneLocation ||
        documentY < paneLocation.top ||
        documentY >= paneLocation.bottom ||
        documentX < paneLocation.left ||
        documentX >= paneLocation.right
      ) {
        return null;
      }

      rowData = this.__rowConfig.getItemAtPosition(
        this.getScrollY() + documentY - paneLocation.top
      );

      columnData = this.__columnConfig.getItemAtPosition(
        this.getScrollX() + documentX - paneLocation.left
      );

      if (!rowData || !columnData) {
        return null;
      }

      return {
        row : rowData.index,
        column : columnData.index
      };
    },


    /*
    ---------------------------------------------------------------------------
      PREFETCH SUPPORT
    ---------------------------------------------------------------------------
    */


    /**
     * Increase the layers width beyond the needed width to improve
     * horizontal scrolling. The layers are only resized if invisible parts
     * left/right of the pane window are smaller than minLeft/minRight.
     *
     * @param minLeft {Integer} Only prefetch if the invisible part left of the
     *    pane window if smaller than this (pixel) value.
     * @param maxLeft {Integer} The amount of pixel the layers should reach
     *    left of the pane window.
     * @param minRight {Integer} Only prefetch if the invisible part right of the
     *    pane window if smaller than this (pixel) value.
     * @param maxRight {Integer} The amount of pixel the layers should reach
     *    right of the pane window.
     */
    prefetchX : function(minLeft, maxLeft, minRight, maxRight)
    {
      var layers = this.getVisibleLayers();
      if (layers.length == 0) {
        return;
      }

      var bounds = this.getBounds();
      if (!bounds) {
        return;
      }

      var paneRight = this.__scrollLeft + bounds.width;
      var rightAvailable = this.__paneWidth - paneRight;
      if (
        this.__scrollLeft - this.__layerWindow.left  < Math.min(this.__scrollLeft, minLeft) ||
        this.__layerWindow.right - paneRight < Math.min(rightAvailable, minRight)
      )
      {
        var left = Math.min(this.__scrollLeft, maxLeft);
        var right = Math.min(rightAvailable, maxRight)
        this._setLayerWindow(
          layers,
          this.__scrollLeft - left,
          this.__scrollTop,
          bounds.width + left + right,
          bounds.height,
          false
        );
      }
    },


    /**
     * Increase the layers height beyond the needed height to improve
     * vertical scrolling. The layers are only resized if invisible parts
     * above/below the pane window are smaller than minAbove/minBelow.
     *
     * @param minAbove {Integer} Only prefetch if the invisible part above the
     *    pane window if smaller than this (pixel) value.
     * @param maxAbove {Integer} The amount of pixel the layers should reach
     *    above the pane window.
     * @param minBelow {Integer} Only prefetch if the invisible part below the
     *    pane window if smaller than this (pixel) value.
     * @param maxBelow {Integer} The amount of pixel the layers should reach
     *    below the pane window.
     */
    prefetchY : function(minAbove, maxAbove, minBelow, maxBelow)
    {
      var layers = this.getVisibleLayers();
      if (layers.length == 0) {
        return;
      }

      var bounds = this.getBounds();
      if (!bounds) {
        return;
      }

      var paneBottom = this.__scrollTop + bounds.height;
      var belowAvailable = this.__paneHeight - paneBottom;
      if (
        this.__scrollTop - this.__layerWindow.top  < Math.min(this.__scrollTop, minAbove) ||
        this.__layerWindow.bottom - paneBottom < Math.min(belowAvailable, minBelow)
      )
      {
        var above = Math.min(this.__scrollTop, maxAbove);
        var below = Math.min(belowAvailable, maxBelow)
        this._setLayerWindow(
          layers,
          this.__scrollLeft,
          this.__scrollTop - above,
          bounds.width,
          bounds.height + above + below,
          false
        );
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENER
    ---------------------------------------------------------------------------
    */


    /**
     * Resize event handler.
     *
     * Updates the visible window.
     */
    _onResize : function()
    {
      if (this.getContentElement().getDomElement())
      {
        this.__dontFireUpdate = true;
        this._updateScrollPosition();
        this.__dontFireUpdate = null;
        this.fireEvent("update");
      }
    },


    /**
     * Resize event handler. Do a full update on first appear.
     */
    _onAppear : function() {
      this.fullUpdate();
    },

    /**
     * Event listener for pointer down. Remembers cell position to prevent pointer event when cell position change.
     *
     * @param e {qx.event.type.Pointer} The incoming pointer event.
     */
    _onPointerDown : function(e) {
      this.__pointerDownCoords = this.getCellAtPosition(e.getDocumentLeft(), e.getDocumentTop());
    },

    /**
     * Event listener for pointer taps. Fires an cellTap event.
     *
     * @param e {qx.event.type.Pointer} The incoming pointer event.
     */
    _onTap : function(e) {
      this.__handlePointerCellEvent(e, "cellTap");
    },


    /**
     * Event listener for context menu taps. Fires an cellContextmenu event.
     *
     * @param e {qx.event.type.Pointer} The incoming pointer event.
     */
    _onContextmenu : function(e) {
      this.__handlePointerCellEvent(e, "cellContextmenu");
    },


    /**
     * Event listener for double taps. Fires an cellDbltap event.
     *
     * @param e {qx.event.type.Pointer} The incoming pointer event.
     */
    _onDbltap : function(e) {
       this.__handlePointerCellEvent(e, "cellDbltap");
    },


    /**
     * Converts a pointer event into a cell event and fires the cell event if the
     * pointer is over a cell.
     *
     * @param e {qx.event.type.Pointer} The pointer event.
     * @param cellEventType {String} The name of the cell event to fire.
     */
    __handlePointerCellEvent : function(e, cellEventType)
    {
      var coords = this.getCellAtPosition(e.getDocumentLeft(), e.getDocumentTop());
      if (!coords) {
        return;
      }

      var pointerDownCoords = this.__pointerDownCoords;
      if (pointerDownCoords == null || pointerDownCoords.row !== coords.row || pointerDownCoords.column !== coords.column) {
        return;
      }

      this.fireNonBubblingEvent(
        cellEventType,
        qx.ui.virtual.core.CellEvent,
        [this, e, coords.row, coords.column]
      );
    },


    /*
    ---------------------------------------------------------------------------
      PANE UPDATE
    ---------------------------------------------------------------------------
    */


    // overridden
    syncWidget : function(jobs)
    {
      if (this.__jobs._fullUpdate) {
        this._fullUpdate();
      } else if (this.__jobs._updateScrollPosition) {
        this._updateScrollPosition();
      }
      this.__jobs = {};
    },


    /**
     * Sets the size of the layers to contain the cells at the pixel position
     * "left/right" up to "left+minHeight/right+minHeight". The offset of the
     * layer container is adjusted to respect the pane's scroll top and scroll
     * left values.
     *
     * @param layers {ILayer[]} List of layers to update.
     * @param left {Integer} Maximum left pixel coordinate of the layers.
     * @param top {Integer} Maximum top pixel coordinate of the layers.
     * @param minWidth {Integer} The minimum end coordinate of the layers will
     *    be larger than <code>left+minWidth</code>.
     * @param minHeight {Integer} The minimum end coordinate of the layers will
     *    be larger than <code>top+minHeight</code>.
     * @param doFullUpdate {Boolean?false} Whether a full update on the layer
     *    should be performed of if only the layer window should be updated.
     */
    _setLayerWindow : function(layers, left, top, minWidth, minHeight, doFullUpdate)
    {
      var rowCellData = this.__rowConfig.getItemAtPosition(top);
      if (rowCellData)
      {
        var firstRow = rowCellData.index;
        var rowSizes = this.__rowConfig.getItemSizes(firstRow, minHeight + rowCellData.offset);
        var layerHeight = qx.lang.Array.sum(rowSizes);
        var layerTop = top - rowCellData.offset;
        var layerBottom = top - rowCellData.offset + layerHeight;
      }
      else
      {
        var firstRow = 0;
        var rowSizes = [];
        var layerHeight = 0;
        var layerTop = 0;
        var layerBottom = 0;
      }

      var columnCellData = this.__columnConfig.getItemAtPosition(left);
      if (columnCellData)
      {
        var firstColumn = columnCellData.index;
        var columnSizes = this.__columnConfig.getItemSizes(firstColumn, minWidth + columnCellData.offset);
        var layerWidth = qx.lang.Array.sum(columnSizes);
        var layerLeft = left - columnCellData.offset;
        var layerRight = left - columnCellData.offset + layerWidth;
      }
      else
      {
        var firstColumn = 0;
        var columnSizes = [];
        var layerWidth = 0;
        var layerLeft = 0;
        var layerRight = 0;
      }

      this.__layerWindow = {
        top: layerTop,
        bottom: layerBottom,
        left: layerLeft,
        right: layerRight
      }

      this.__layerContainer.setUserBounds(
        (this.getPaddingLeft() || 0) + (this.__layerWindow.left - this.__scrollLeft),
        (this.getPaddingTop() || 0) + (this.__layerWindow.top - this.__scrollTop),
        layerWidth, layerHeight
      );

      this.__columnSizes = columnSizes;
      this.__rowSizes = rowSizes;

      for (var i=0; i<this.__layers.length; i++)
      {
        var layer = this.__layers[i];
        layer.setUserBounds(0, 0, layerWidth, layerHeight);

        if (doFullUpdate) {
          layer.fullUpdate(firstRow, firstColumn, rowSizes, columnSizes);
        } else {
          layer.updateLayerWindow(firstRow, firstColumn, rowSizes, columnSizes);
        }
      }
    },



    /**
     * Check whether the pane was resized and fire an {@link #update} event if
     * it was.
     */
    __checkPaneResize : function()
    {
      if (this.__dontFireUpdate) {
        return;
      }

      var scrollSize = this.getScrollSize();
      if (
        this.__paneHeight !== scrollSize.height ||
        this.__paneWidth !== scrollSize.width
      )
      {
        this.__paneHeight = scrollSize.height;
        this.__paneWidth = scrollSize.width;
        this.fireEvent("update");
      }
    },


    /**
     * Schedule a full update on all visible layers.
     */
    fullUpdate : function()
    {
      this.__jobs._fullUpdate = 1;
      qx.ui.core.queue.Widget.add(this);
    },


    /**
     * Whether a full update is scheduled.
     *
     * @return {Boolean} Whether a full update is scheduled.
     */
    isUpdatePending : function() {
      return !!this.__jobs._fullUpdate;
    },


    /**
     * Perform a full update on all visible layers. All cached data will be
     * discarded.
     */
    _fullUpdate : function()
    {
      var layers = this.getVisibleLayers();
      if (layers.length == 0)
      {
        this.__checkPaneResize();
        return;
      }

      var bounds = this.getBounds();

      if (!bounds) {
        return; // the pane has not yet been rendered -> wait for the appear event
      }



      this._setLayerWindow(
        layers,
        this.__scrollLeft, this.__scrollTop,
        bounds.width, bounds.height,
        true
      );

      this.__checkPaneResize();
    },


    /**
     * Schedule an update the visible window of the grid according to the top
     * and left scroll positions.
     */
    _deferredUpdateScrollPosition : function()
    {
      this.__jobs._updateScrollPosition = 1;
      qx.ui.core.queue.Widget.add(this);
    },


    /**
     * Update the visible window of the grid according to the top and left scroll
     * positions.
     */
    _updateScrollPosition : function()
    {
      var layers = this.getVisibleLayers();
      if (layers.length == 0)
      {
        this.__checkPaneResize();
        return;
      }

      var bounds = this.getBounds();
      if (!bounds) {
        return; // the pane has not yet been rendered -> wait for the appear event
      }

      // the visible window of the virtual coordinate space
      var paneWindow = {
        top: this.__scrollTop,
        bottom: this.__scrollTop + bounds.height,
        left: this.__scrollLeft,
        right: this.__scrollLeft + bounds.width
      };

      if (
        this.__layerWindow.top <= paneWindow.top &&
        this.__layerWindow.bottom >= paneWindow.bottom &&
        this.__layerWindow.left <= paneWindow.left &&
        this.__layerWindow.right >= paneWindow.right
      )
      {
        // only update layer container offset
        this.__layerContainer.setUserBounds(
          (this.getPaddingLeft() || 0) + (this.__layerWindow.left - paneWindow.left),
          (this.getPaddingTop() || 0) + (this.__layerWindow.top - paneWindow.top),
          this.__layerWindow.right - this.__layerWindow.left,
          this.__layerWindow.bottom - this.__layerWindow.top
        );
      }
      else
      {
        this._setLayerWindow(
          layers,
          this.__scrollLeft, this.__scrollTop,
          bounds.width, bounds.height,
          false
        )
      }

      this.__checkPaneResize();
    }
  },


  destruct : function()
  {
    this._disposeArray("__layers");
    this._disposeObjects("__rowConfig", "__columnConfig", "__layerContainer");
    this.__layerWindow = this.__jobs = this.__columnSizes =
      this.__rowSizes = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * The axis maps virtual screen coordinates to item indexes. By default all
 * items have the same size but it is also possible to give specific items
 * a different size.
 */
qx.Class.define("qx.ui.virtual.core.Axis",
{
  extend : qx.core.Object,

  /**
   * @param defaultItemSize {Integer} The default size of the items.
   * @param itemCount {Integer} The number of item on the axis.
   */
  construct : function(defaultItemSize, itemCount)
  {
    this.base(arguments);

    this.itemCount = itemCount;
    this.defaultItemSize = defaultItemSize;

    // sparse array
    this.customSizes = {};
  },


  events :
  {
    /** Every change to the axis configuration triggers this event. */
    "change" : "qx.event.type.Event"
  },


  members :
  {
    __ranges : null,


    /**
     * Get the default size of the items.
     *
     * @return {Integer} The default item size.
     */
    getDefaultItemSize : function() {
      return this.defaultItemSize;
    },


    /**
     * Set the default size the items.
     *
     * @param defaultItemSize {Integer} The default size of the items.
     */
    setDefaultItemSize : function(defaultItemSize)
    {
      if (this.defaultItemSize !== defaultItemSize)
      {
        this.defaultItemSize = defaultItemSize;
        this.__ranges = null;
        this.fireNonBubblingEvent("change");
      }
    },


    /**
     * Get the number of items in the axis.
     *
     * @return {Integer} The number of items.
     */
    getItemCount : function() {
      return this.itemCount;
    },


    /**
     * Set the number of items in the axis.
     *
     * @param itemCount {Integer} The new item count.
     */
    setItemCount : function(itemCount)
    {
      if (this.itemCount !== itemCount)
      {
        this.itemCount = itemCount;
        this.__ranges = null;
        this.fireNonBubblingEvent("change");
      }
    },


    /**
     * Sets the size of a specific item. This allow item, which have a size
     * different from the default size.
     *
     * @param index {Integer} Index of the item to change.
     * @param size {Integer} New size of the item.
     */
    setItemSize : function(index, size)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertArgumentsCount(arguments, 2, 2);
        this.assert(
          size >= 0 || size === null,
          "'size' must be 'null' or an integer larger than 0."
        );
      }
      if (this.customSizes[index] == size) {
        return;
      }

      if (size === null) {
        delete this.customSizes[index];
      } else {
        this.customSizes[index] = size;
      }
      this.__ranges = null;
      this.fireNonBubblingEvent("change");
    },


    /**
     * Get the size of the item at the given index.
     *
     * @param index {Integer} Index of the item to get the size for.
     * @return {Integer} Size of the item.
     */
    getItemSize : function(index)
    {
      // custom size of 0 is not allowed
      return this.customSizes[index] || this.defaultItemSize;
    },


    /**
     * Reset all custom sizes set with {@link #setItemSize}.
     */
    resetItemSizes : function()
    {
      this.customSizes = {};
      this.__ranges = null;
      this.fireNonBubblingEvent("change");
    },


    /**
     * Split the position range into disjunct intervals. Each interval starts
     * with a custom sized cell. Each position is contained in exactly one range.
     * The ranges are sorted according to their start position.
     *
     * Complexity: O(n log n) (n = number of custom sized cells)
     *
     * @return {Map[]} The sorted list of ranges.
     */
    __getRanges : function()
    {
      if (this.__ranges) {
        return this.__ranges;
      }

      var defaultSize = this.defaultItemSize;
      var itemCount = this.itemCount;

      var indexes = [];
      for (var key in this.customSizes)
      {
        var index = parseInt(key, 10);
        if (index < itemCount) {
          indexes.push(index);
        }
      }
      if (indexes.length == 0)
      {
        var ranges = [{
          startIndex: 0,
          endIndex: itemCount - 1,
          firstItemSize: defaultSize,
          rangeStart: 0,
          rangeEnd: itemCount * defaultSize - 1
        }];
        this.__ranges = ranges;
        return ranges;
      }

      indexes.sort(function(a,b) { return a > b ? 1 : -1});

      var ranges = [];
      var correctionSum = 0;

      for (var i=0; i<indexes.length; i++)
      {
        var index = indexes[i];
        if (index >= itemCount) {
          break;
        }

        var cellSize = this.customSizes[index];
        var rangeStart = index * defaultSize + correctionSum;

        correctionSum += cellSize - defaultSize;

        ranges[i] = {
          startIndex: index,
          firstItemSize: cellSize,
          rangeStart: rangeStart
        };
        if (i > 0) {
          ranges[i-1].rangeEnd = rangeStart-1;
          ranges[i-1].endIndex = index-1;
        }
      }

      // fix first range
      if (ranges[0].rangeStart > 0)
      {
        ranges.unshift({
          startIndex: 0,
          endIndex: ranges[0].startIndex-1,
          firstItemSize: defaultSize,
          rangeStart: 0,
          rangeEnd: ranges[0].rangeStart-1
        });
      }

      // fix last range
      var lastRange = ranges[ranges.length-1];
      var remainingItemsSize = (itemCount - lastRange.startIndex - 1) * defaultSize;
      lastRange.rangeEnd = lastRange.rangeStart + lastRange.firstItemSize + remainingItemsSize - 1;
      lastRange.endIndex = itemCount - 1;

      this.__ranges = ranges;
      return ranges;
    },


    /**
     * Returns the range, which contains the position
     *
     * Complexity: O(log n) (n = number of custom sized cells)
     *
     * @param position {Integer} The position.
     * @return {Map} The range, which contains the given position.
     */
    __findRangeByPosition : function(position)
    {
      var ranges = this.__ranges || this.__getRanges();

      var start = 0;
      var end = ranges.length-1;

      // binary search in the sorted ranges list
      while (true)
      {
        var pivot = start + ((end - start) >> 1);
        var range = ranges[pivot];

        if (range.rangeEnd < position) {
          start = pivot + 1;
        } else if (range.rangeStart > position) {
          end = pivot - 1;
        } else {
          return range;
        }
      }
    },


    /**
     * Get the item and the offset into the item at the given position.
     *
     * @param position {Integer|null} The position to get the item for.
     * @return {Map} A map with the keys <code>index</code> and
     *    <code>offset</code>. The index is the index of the item containing the
     *    position and offsets specifies offset into this item. If the position
     *    is outside of the range, <code>null</code> is returned.
     */
    getItemAtPosition : function(position)
    {
      if (position < 0 || position >= this.getTotalSize()) {
        return null;
      }

      var range = this.__findRangeByPosition(position);

      var startPos = range.rangeStart;
      var index = range.startIndex;
      var firstItemSize = range.firstItemSize;

      if (startPos + firstItemSize > position)
      {
        return {
          index: index,
          offset: position - startPos
        }
      }
      else
      {
        var defaultSize = this.defaultItemSize;
        return {
          index: index + 1 + Math.floor((position - startPos - firstItemSize) / defaultSize),
          offset: (position - startPos - firstItemSize) % defaultSize
        }
      }
    },


    /**
     * Returns the range, which contains the position.
     *
     * Complexity: O(log n) (n = number of custom sized cells)
     *
     * @param index {Integer} The index of the item to get the range for.
     * @return {Map} The range for the index.
     */
    __findRangeByIndex : function(index)
    {
      var ranges = this.__ranges || this.__getRanges();

      var start = 0;
      var end = ranges.length-1;

      // binary search in the sorted ranges list
      while (true)
      {
        var pivot = start + ((end - start) >> 1);
        var range = ranges[pivot];

        if (range.endIndex < index) {
          start = pivot + 1;
        } else if (range.startIndex > index) {
          end = pivot - 1;
        } else {
          return range;
        }
      }
    },


    /**
     * Get the start position of the item with the given index.
     *
     * @param index {Integer} The item's index.
     * @return {Integer|null} The start position of the item. If the index is outside
     *    of the axis range <code>null</code> is returned.
     */
    getItemPosition : function(index)
    {
      if (index < 0 || index >= this.itemCount) {
        return null;
      }

      var range = this.__findRangeByIndex(index);
      if (range.startIndex == index) {
        return range.rangeStart;
      } else {
        return range.rangeStart + range.firstItemSize + (index-range.startIndex-1) * this.defaultItemSize;
      }
    },


    /**
     * Returns the sum of all cell sizes.
     *
     * @return {Integer} The sum of all item sizes.
     */
    getTotalSize : function()
    {
      var ranges = this.__ranges || this.__getRanges();
      return ranges[ranges.length-1].rangeEnd + 1;
    },


    /**
     * Get an array of item sizes starting with the item at "startIndex". The
     * sum of all sizes in the returned array is at least "minSizeSum".
     *
     * @param startIndex {Integer} The index of the first item.
     * @param minSizeSum {Integer} The minimum sum of the item sizes.
     * @return {Integer[]} List of item sizes starting with the size of the item
     *    at index <code>startIndex</code>. The sum of the item sizes is at least
     *    <code>minSizeSum</code>.
     */
    getItemSizes : function(startIndex, minSizeSum)
    {
      var customSizes = this.customSizes;
      var defaultSize = this.defaultItemSize;

      var sum = 0;
      var sizes = [];
      var i=0;
      while (sum < minSizeSum)
      {
        var itemSize = customSizes[startIndex] != null ? customSizes[startIndex] : defaultSize;
        startIndex++;

        sum += itemSize;
        sizes[i++] = itemSize;
        if (startIndex >= this.itemCount) {
          break;
        }
      }
      return sizes;
    }
  },


  destruct : function() {
    this.customSizes = this.__ranges = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * A layer is responsible to render one aspect of a virtual pane. The pane tells
 * each layer to render/update a specific window of the virtual grid.
 */
qx.Interface.define("qx.ui.virtual.core.ILayer",
{
  members :
  {
    /**
     * Do a complete update of the layer. All cached data should be discarded.
     * This method is called e.g. after changes to the grid geometry
     * (row/column sizes, row/column count, ...).
     *
     * Note: This method can only be called after the widgets initial appear
     * event has been fired because it may work with the widget's DOM elements.
     *
     * @param firstRow {Integer} Index of the first row to display.
     * @param firstColumn {Integer} Index of the first column to display.
     * @param rowSizes {Integer[]} Array of heights for each row to display.
     * @param columnSizes {Integer[]} Array of widths for each column to display.
     */
    fullUpdate : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    ) {
      this.assertArgumentsCount(arguments, 6, 6);
      this.assertPositiveInteger(firstRow);
      this.assertPositiveInteger(firstColumn);
      this.assertArray(rowSizes);
      this.assertArray(columnSizes);
    },


    /**
     * Update the layer to display a different window of the virtual grid.
     * This method is called if the pane is scrolled, resized or cells
     * are prefetched. The implementation can assume that no other grid
     * data has been changed since the last "fullUpdate" of "updateLayerWindow"
     * call.
     *
     * Note: This method can only be called after the widgets initial appear
     * event has been fired because it may work with the widget's DOM elements.
     *
     * @param firstRow {Integer} Index of the first row to display.
     * @param firstColumn {Integer} Index of the first column to display.
     * @param rowSizes {Integer[]} Array of heights for each row to display.
     * @param columnSizes {Integer[]} Array of widths for each column to display.
     */
    updateLayerWindow : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    ) {
      this.assertArgumentsCount(arguments, 6, 6);
      this.assertPositiveInteger(firstRow);
      this.assertPositiveInteger(firstColumn);
      this.assertArray(rowSizes);
      this.assertArray(columnSizes);
    },


    /**
     * Update the layer to reflect changes in the data the layer displays.
     */
    updateLayerData : function() {}
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * David Perez Carmona (david-perez)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * A cell event instance contains all data for pointer events related to cells in
 * a pane.
 **/
qx.Class.define("qx.ui.virtual.core.CellEvent",
{
  extend : qx.event.type.Pointer,


  properties :
  {
    /** The table row of the event target. */
    row :
    {
      check : "Integer",
      nullable: true
    },

    /** The table column of the event target. */
    column :
    {
      check : "Integer",
      nullable: true
    }
  },


  members :
  {
     /**
      * Initialize the event.
      *
      * @param scroller {qx.ui.table.pane.Scroller} The tables pane scroller.
      * @param me {qx.event.type.Pointer} The original pointer event.
      * @param row {Integer?null} The cell's row index.
      * @param column {Integer?null} The cell's column index.
      */
     init : function(scroller, me, row, column)
     {
       me.clone(this);
       this.setBubbles(false);

       this.setRow(row);
       this.setColumn(column);
     }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Implements the different selection modes single, multi, additive and one
 * selection with there drag and quick selection.
 *
 * Example how to use selection:
 * <pre class="javascript">
 * var rawData = [];
 * for (var i = 0; i < 2500; i++) {
 *  rawData[i] = "Item No " + i;
 * }
 *
 * var model = qx.data.marshal.Json.createModel(rawData);
 * var list = new qx.ui.list.List(model);
 *
 * // Pre-Select "Item No 20"
 * list.getSelection().push(model.getItem(20));
 *
 * // log change selection
 * list.getSelection().addListener("change", function(e) {
 *   this.debug("Selection: " + list.getSelection().getItem(0));
 * }, this);
 * </pre>
 *
 * @internal
 */
qx.Mixin.define("qx.ui.virtual.selection.MModel",
{
  construct : function()
  {
    this._initSelectionManager();
    this.__defaultSelection = new qx.data.Array();
    this.initSelection(this.__defaultSelection);
  },


  properties :
  {
    /** Current selected items */
    selection :
    {
      check : "qx.data.Array",
      event : "changeSelection",
      apply : "_applySelection",
      nullable : false,
      deferredInit : true
    },


    /**
     * The selection mode to use.
     *
     * For further details please have a look at:
     * {@link qx.ui.core.selection.Abstract#mode}
     */
    selectionMode :
    {
      check : ["single", "multi", "additive", "one"],
      init : "single",
      apply : "_applySelectionMode"
    },


    /**
     * Enable drag selection (multi selection of items through
     * dragging the pointer in pressed states).
     *
     * Only possible for the selection modes <code>multi</code> and <code>additive</code>
     */
    dragSelection :
    {
      check : "Boolean",
      init : false,
      apply : "_applyDragSelection"
    },


    /**
     * Enable quick selection mode, where no tap is needed to change the selection.
     *
     * Only possible for the modes <code>single</code> and <code>one</code>.
     */
    quickSelection :
    {
      check : "Boolean",
      init : false,
      apply : "_applyQuickSelection"
    }
  },


  events : {
    /**
     * This event is fired as soon as the content of the selection property changes, but
     * this is not equal to the change of the selection of the widget. If the selection
     * of the widget changes, the content of the array stored in the selection property
     * changes. This means you have to listen to the change event of the selection array
     * to get an event as soon as the user changes the selected item.
     * <pre class="javascript">obj.getSelection().addListener("change", listener, this);</pre>
     */
    "changeSelection" : "qx.event.type.Data"
  },


  members :
  {
    /** @type {qx.ui.virtual.selection.Row} selection manager */
    _manager : null,


    /** @type {Boolean} flag to ignore the selection change from {@link #selection} */
    __ignoreChangeSelection : false,


    /** @type {Boolean} flag to ignore the selection change from <code>_manager</code> */
    __ignoreManagerChangeSelection : false,

    __defaultSelection : null,


    /**
     * Initialize the selection manager with his delegate.
     */
    _initSelectionManager : function()
    {
      var self = this;
      var selectionDelegate =
      {
        isItemSelectable : function(row) {
          return self._provider.isSelectable(row);
        },

        styleSelectable : function(row, type, wasAdded)
        {
          if (type != "selected") {
            return;
          }

          if (wasAdded) {
            self._provider.styleSelectabled(row);
          } else {
            self._provider.styleUnselectabled(row);
          }
        }
      }

      this._manager = new qx.ui.virtual.selection.Row(
        this.getPane(), selectionDelegate
      );
      this._manager.attachPointerEvents(this.getPane());
      this._manager.attachKeyEvents(this);
      this._manager.addListener("changeSelection", this._onManagerChangeSelection, this);
    },


    /**
     * Determines, if automatically scrolling of selected item is active.
     * Set <code>false</code> to suspend auto scrolling.
     *
     * @param value {Boolean} Set <code>false</code> to suspend auto scrolling.
     */
    setAutoScrollIntoView : function(value)
    {
      this._manager._autoScrollIntoView = value;
    },


    /**
     * Returns true, if automatically scrolling of selected item is active.
     *
     * @return {Boolean} Returns <code>false</code> if auto scrolling is suspended.
     */
    getAutoScrollIntoView : function()
    {
      return this._manager._autoScrollIntoView;
    },


    /**
     * Method to update the selection, this method can be used when the model has
     * changes.
     */
    _updateSelection : function()
    {
      if (this._manager == null) {
        return;
      }

      this._onChangeSelection();
    },


    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */


    // apply method
    _applySelection : function(value, old)
    {
      value.addListener("change", this._onChangeSelection, this);

      if (old != null) {
        old.removeListener("change", this._onChangeSelection, this);
      }

      this._onChangeSelection();
    },


    // apply method
    _applySelectionMode : function(value, old) {
      this._manager.setMode(value);
    },


    // apply method
    _applyDragSelection : function(value, old) {
      this._manager.setDrag(value);
    },


    // apply method
    _applyQuickSelection : function(value, old) {
      this._manager.setQuick(value);
    },


    /*
    ---------------------------------------------------------------------------
      SELECTION HANDLERS
    ---------------------------------------------------------------------------
    */


    /**
     * Event handler for the internal selection change {@link #selection}.
     *
     * @param e {qx.event.type.Data} the change event.
     */
    _onChangeSelection : function(e)
    {
      if (this.__ignoreManagerChangeSelection == true) {
        return;
      }

      this.__ignoreChangeSelection = true;
      var selection = this.getSelection();

      var newSelection = [];
      for (var i = 0; i < selection.getLength(); i++)
      {
        var item = selection.getItem(i);
        var selectables = this._getSelectables();
        var index = -1;

        if (selectables != null) {
          index = selectables.indexOf(item);
        }

        var row = this._reverseLookup(index);

        if (row >= 0) {
          newSelection.push(row);
        }
      }

      if (this._beforeApplySelection != null &&
          qx.lang.Type.isFunction(this._beforeApplySelection)) {
        this._beforeApplySelection(newSelection);
      }

      try {
        if (!qx.lang.Array.equals(newSelection, this._manager.getSelection())) {
          this._manager.replaceSelection(newSelection);
        }
      }
      catch(ex)
      {
        this._manager.selectItem(newSelection[newSelection.length - 1]);
      }
      this.__synchronizeSelection();

      if (this._afterApplySelection != null &&
          qx.lang.Type.isFunction(this._afterApplySelection)) {
        this._afterApplySelection();
      }

      this.__ignoreChangeSelection = false;
    },


    /**
     * Event handler for the selection change from the <code>_manager</code>.
     *
     * @param e {qx.event.type.Data} the change event.
     */
    _onManagerChangeSelection : function(e)
    {
      if (this.__ignoreChangeSelection == true) {
        return;
      }

      this.__ignoreManagerChangeSelection = true;

      this.__synchronizeSelection();

      this.__ignoreManagerChangeSelection = false;
    },


    /**
     * Synchronized the selection form the manager with the local one.
     */
    __synchronizeSelection : function()
    {
      if (this.__isSelectionEquals()) {
        return
      }

      var managerSelection = this._manager.getSelection();
      var newSelection = [];

      for (var i = 0; i < managerSelection.length; i++)
      {
        var item = this._getDataFromRow(managerSelection[i]);

        if (item != null) {
          newSelection.push(item);
        }
      }

      this.__replaceSelection(newSelection);
    },


    /**
     * Replace the current selection with the passed selection Array.
     *
     * @param newSelection {qx.data.Array} The new selection.
     */
    __replaceSelection : function(newSelection)
    {
      var selection = this.getSelection();
      if (newSelection.length > 0)
      {
        var args = [0, selection.getLength()];
        args = args.concat(newSelection);
        // dispose data array returned by splice to avoid memory leak
        var temp = selection.splice.apply(selection, args);
        temp.dispose();
      } else {
        selection.removeAll();
      }
    },


    /**
     * Checks whether the local and the manager selection are equal.
     *
     * @return {Boolean} <code>true</code> if the selections are equal,
     *   <code>false</code> otherwise.
     */
    __isSelectionEquals : function()
    {
      var selection = this.getSelection();
      var managerSelection = this._manager.getSelection();

      if (selection.getLength() !== managerSelection.length) {
        return false;
      }

      for (var i = 0; i < selection.getLength(); i++)
      {
        var item = selection.getItem(i);
        var selectables = this._getSelectables()
        var index = -1;

        if (selectables != null) {
          index = selectables.indexOf(item);
        }
        var row = this._reverseLookup(index);

        if (row !== managerSelection[i]) {
          return false;
        };
      }
      return true;
    },


    /**
     * Helper Method to select default item.
     */
    _applyDefaultSelection : function() {
      if (this._manager != null) {
        this._manager._applyDefaultSelection();
      }
    }
  },


  destruct : function()
  {
    this._manager.dispose();
    this._manager = null;
    if (this.__defaultSelection) {
      this.__defaultSelection.dispose();
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)

************************************************************************ */

/**
 * Generic selection manager to bring rich desktop like selection behavior
 * to widgets and low-level interactive controls.
 *
 * The selection handling supports both Shift and Ctrl/Meta modifies like
 * known from native applications.
 */
qx.Class.define("qx.ui.core.selection.Abstract",
{
  type : "abstract",
  extend : qx.core.Object,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // {Map} Internal selection storage
    this.__selection = {};
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fires after the selection was modified. Contains the selection under the data property. */
    "changeSelection" : "qx.event.type.Data"
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Selects the selection mode to use.
     *
     * * single: One or no element is selected
     * * multi: Multi items could be selected. Also allows empty selections.
     * * additive: Easy Web-2.0 selection mode. Allows multiple selections without modifier keys.
     * * one: If possible always exactly one item is selected
     */
    mode :
    {
      check : [ "single", "multi", "additive", "one" ],
      init : "single",
      apply : "_applyMode"
    },


    /**
     * Enable drag selection (multi selection of items through
     * dragging the pointer in pressed states).
     *
     * Only possible for the modes <code>multi</code> and <code>additive</code>
     */
    drag :
    {
      check : "Boolean",
      init : false
    },


    /**
     * Enable quick selection mode, where no tap is needed to change the selection.
     *
     * Only possible for the modes <code>single</code> and <code>one</code>.
     */
    quick :
    {
      check : "Boolean",
      init : false
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __scrollStepX : 0,
    __scrollStepY : 0,
    __scrollTimer : null,
    __frameScroll : null,
    __lastRelX : null,
    __lastRelY : null,
    __frameLocation : null,
    __dragStartX : null,
    __dragStartY : null,
    __inCapture : null,
    __pointerX : null,
    __pointerY : null,
    __moveDirectionX : null,
    __moveDirectionY : null,
    __selectionModified : null,
    __selectionContext : null,
    __leadItem : null,
    __selection : null,
    __anchorItem : null,
    __pointerDownOnSelected : null,

    // A flag that signals an user interaction, which means the selection change
    // was triggered by pointer or keyboard [BUG #3344]
    _userInteraction : false,

    __oldScrollTop : null,

    /*
    ---------------------------------------------------------------------------
      USER APIS
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the selection context. One of <code>tap</code>,
     * <code>quick</code>, <code>drag</code> or <code>key</code> or
     * <code>null</code>.
     *
     * @return {String} One of <code>tap</code>, <code>quick</code>,
     *    <code>drag</code> or <code>key</code> or <code>null</code>
     */
    getSelectionContext : function() {
      return this.__selectionContext;
    },


    /**
     * Selects all items of the managed object.
     *
     */
    selectAll : function()
    {
      var mode = this.getMode();
      if (mode == "single" || mode == "one") {
        throw new Error("Can not select all items in selection mode: " + mode);
      }

      this._selectAllItems();
      this._fireChange();
    },


    /**
     * Selects the given item. Replaces current selection
     * completely with the new item.
     *
     * Use {@link #addItem} instead if you want to add new
     * items to an existing selection.
     *
     * @param item {Object} Any valid item
     */
    selectItem : function(item)
    {
      this._setSelectedItem(item);

      var mode = this.getMode();
      if (mode !== "single" && mode !== "one")
      {
        this._setLeadItem(item);
        this._setAnchorItem(item);
      }

      this._scrollItemIntoView(item);
      this._fireChange();
    },


    /**
     * Adds the given item to the existing selection.
     *
     * Use {@link #selectItem} instead if you want to replace
     * the current selection.
     *
     * @param item {Object} Any valid item
     */
    addItem : function(item)
    {
      var mode = this.getMode();
      if (mode === "single" || mode === "one") {
        this._setSelectedItem(item);
      }
      else
      {
        if (this._getAnchorItem() == null) {
          this._setAnchorItem(item);
        }

        this._setLeadItem(item);
        this._addToSelection(item);
      }

      this._scrollItemIntoView(item);
      this._fireChange();
    },


    /**
     * Removes the given item from the selection.
     *
     * Use {@link #clearSelection} when you want to clear
     * the whole selection at once.
     *
     * @param item {Object} Any valid item
     */
    removeItem : function(item)
    {
      this._removeFromSelection(item);

      if (this.getMode() === "one" && this.isSelectionEmpty())
      {
        var selected = this._applyDefaultSelection();

        // Do not fire any event in this case.
        if (selected == item) {
          return;
        }
      }

      if (this.getLeadItem() == item) {
        this._setLeadItem(null);
      }

      if (this._getAnchorItem() == item) {
        this._setAnchorItem(null);
      }

      this._fireChange();
    },


    /**
     * Selects an item range between two given items.
     *
     * @param begin {Object} Item to start with
     * @param end {Object} Item to end at
     */
    selectItemRange : function(begin, end)
    {
      var mode = this.getMode();
      if (mode == "single" || mode == "one") {
        throw new Error("Can not select multiple items in selection mode: " + mode);
      }

      this._selectItemRange(begin, end);

      this._setAnchorItem(begin);

      this._setLeadItem(end);
      this._scrollItemIntoView(end);

      this._fireChange();
    },


    /**
     * Clears the whole selection at once. Also
     * resets the lead and anchor items and their
     * styles.
     *
     */
    clearSelection : function()
    {
      if (this.getMode() == "one")
      {
        var selected = this._applyDefaultSelection(true);
        if (selected != null) {
          return;
        }
      }

      this._clearSelection();
      this._setLeadItem(null);
      this._setAnchorItem(null);

      this._fireChange();
    },


    /**
     * Replaces current selection with given array of items.
     *
     * Please note that in single selection scenarios it is more
     * efficient to directly use {@link #selectItem}.
     *
     * @param items {Array} Items to select
     */
    replaceSelection : function(items)
    {
      var mode = this.getMode();
      if (mode == "one" || mode === "single")
      {
        if (items.length > 1)   {
          throw new Error("Could not select more than one items in mode: " + mode + "!");
        }

        if (items.length == 1) {
          this.selectItem(items[0]);
        } else {
          this.clearSelection();
        }
        return;
      }
      else
      {
        this._replaceMultiSelection(items);
      }
    },


    /**
     * Get the selected item. This method does only work in <code>single</code>
     * selection mode.
     *
     * @return {Object} The selected item.
     */
    getSelectedItem : function()
    {
      var mode = this.getMode();
      if (mode === "single" || mode === "one")
      {
        var result = this._getSelectedItem();
        return result != undefined ? result : null;
      }

      throw new Error("The method getSelectedItem() is only supported in 'single' and 'one' selection mode!");
    },


    /**
     * Returns an array of currently selected items.
     *
     * Note: The result is only a set of selected items, so the order can
     * differ from the sequence in which the items were added.
     *
     * @return {Object[]} List of items.
     */
    getSelection : function() {
      return qx.lang.Object.getValues(this.__selection);
    },


    /**
     * Returns the selection sorted by the index in the
     * container of the selection (the assigned widget)
     *
     * @return {Object[]} Sorted list of items
     */
    getSortedSelection : function()
    {
      var children = this.getSelectables();
      var sel = qx.lang.Object.getValues(this.__selection);

      sel.sort(function(a, b) {
        return children.indexOf(a) - children.indexOf(b);
      });

      return sel;
    },


    /**
     * Detects whether the given item is currently selected.
     *
     * @param item {var} Any valid selectable item
     * @return {Boolean} Whether the item is selected
     */
    isItemSelected : function(item)
    {
      var hash = this._selectableToHashCode(item);
      return this.__selection[hash] !== undefined;
    },


    /**
     * Whether the selection is empty
     *
     * @return {Boolean} Whether the selection is empty
     */
    isSelectionEmpty : function() {
      return qx.lang.Object.isEmpty(this.__selection);
    },


    /**
     * Invert the selection. Select the non selected and deselect the selected.
     */
    invertSelection: function() {
      var mode = this.getMode();
      if (mode === "single" || mode === "one") {
        throw new Error("The method invertSelection() is only supported in 'multi' and 'additive' selection mode!");
      }

      var selectables = this.getSelectables();
      for (var i = 0; i < selectables.length; i++)
      {
        this._toggleInSelection(selectables[i]);
      }

      this._fireChange();
    },



    /*
    ---------------------------------------------------------------------------
      LEAD/ANCHOR SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the lead item. Generally the item which was last modified
     * by the user (tapped on etc.)
     *
     * @param value {Object} Any valid item or <code>null</code>
     */
    _setLeadItem : function(value)
    {
      var old = this.__leadItem;

      if (old !== null) {
        this._styleSelectable(old, "lead", false);
      }

      if (value !== null) {
        this._styleSelectable(value, "lead", true);
      }

      this.__leadItem = value;
    },


    /**
     * Returns the current lead item. Generally the item which was last modified
     * by the user (tapped on etc.)
     *
     * @return {Object} The lead item or <code>null</code>
     */
    getLeadItem : function() {
      return this.__leadItem;
    },


    /**
     * Sets the anchor item. This is the item which is the starting
     * point for all range selections. Normally this is the item which was
     * tapped on the last time without any modifier keys pressed.
     *
     * @param value {Object} Any valid item or <code>null</code>
     */
    _setAnchorItem : function(value)
    {
      var old = this.__anchorItem;

      if (old != null) {
        this._styleSelectable(old, "anchor", false);
      }

      if (value != null) {
        this._styleSelectable(value, "anchor", true);
      }

      this.__anchorItem = value;
    },


    /**
     * Returns the current anchor item. This is the item which is the starting
     * point for all range selections. Normally this is the item which was
     * tapped on the last time without any modifier keys pressed.
     *
     * @return {Object} The anchor item or <code>null</code>
     */
    _getAnchorItem : function() {
      return this.__anchorItem !== null ? this.__anchorItem : null;
    },





    /*
    ---------------------------------------------------------------------------
      BASIC SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Whether the given item is selectable.
     *
     * @param item {var} Any item
     * @return {Boolean} <code>true</code> when the item is selectable
     */
    _isSelectable : function(item) {
      throw new Error("Abstract method call: _isSelectable()");
    },


    /**
     * Finds the selectable instance from a pointer event
     *
     * @param event {qx.event.type.Pointer} The pointer event
     * @return {Object|null} The resulting selectable
     */
    _getSelectableFromPointerEvent : function(event)
    {
      var target = event.getTarget();
      // check for target (may be null when leaving the viewport) [BUG #4378]
      if (target && this._isSelectable(target)) {
        return target;
      }
      return null;
    },


    /**
     * Returns an unique hashcode for the given item.
     *
     * @param item {var} Any item
     * @return {String} A valid hashcode
     */
    _selectableToHashCode : function(item) {
      throw new Error("Abstract method call: _selectableToHashCode()");
    },


    /**
     * Updates the style (appearance) of the given item.
     *
     * @param item {var} Item to modify
     * @param type {String} Any of <code>selected</code>, <code>anchor</code> or <code>lead</code>
     * @param enabled {Boolean} Whether the given style should be added or removed.
     */
    _styleSelectable : function(item, type, enabled) {
      throw new Error("Abstract method call: _styleSelectable()");
    },


    /**
     * Enables capturing of the container.
     *
     */
    _capture : function() {
      throw new Error("Abstract method call: _capture()");
    },


    /**
     * Releases capturing of the container
     *
     */
    _releaseCapture : function() {
      throw new Error("Abstract method call: _releaseCapture()");
    },






    /*
    ---------------------------------------------------------------------------
      DIMENSION AND LOCATION
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the location of the container
     *
     * @return {Map} Map with the keys <code>top</code>, <code>right</code>,
     *    <code>bottom</code> and <code>left</code>.
     */
    _getLocation : function() {
      throw new Error("Abstract method call: _getLocation()");
    },


    /**
     * Returns the dimension of the container (available scrolling space).
     *
     * @return {Map} Map with the keys <code>width</code> and <code>height</code>.
     */
    _getDimension : function() {
      throw new Error("Abstract method call: _getDimension()");
    },


    /**
     * Returns the relative (to the container) horizontal location of the given item.
     *
     * @param item {var} Any item
     * @return {Map} A map with the keys <code>left</code> and <code>right</code>.
     */
    _getSelectableLocationX : function(item) {
      throw new Error("Abstract method call: _getSelectableLocationX()");
    },


    /**
     * Returns the relative (to the container) horizontal location of the given item.
     *
     * @param item {var} Any item
     * @return {Map} A map with the keys <code>top</code> and <code>bottom</code>.
     */
    _getSelectableLocationY : function(item) {
      throw new Error("Abstract method call: _getSelectableLocationY()");
    },






    /*
    ---------------------------------------------------------------------------
      SCROLL SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the scroll position of the container.
     *
     * @return {Map} Map with the keys <code>left</code> and <code>top</code>.
     */
    _getScroll : function() {
      throw new Error("Abstract method call: _getScroll()");
    },


    /**
     * Scrolls by the given offset
     *
     * @param xoff {Integer} Horizontal offset to scroll by
     * @param yoff {Integer} Vertical offset to scroll by
     */
    _scrollBy : function(xoff, yoff) {
      throw new Error("Abstract method call: _scrollBy()");
    },


    /**
     * Scrolls the given item into the view (make it visible)
     *
     * @param item {var} Any item
     */
    _scrollItemIntoView : function(item) {
      throw new Error("Abstract method call: _scrollItemIntoView()");
    },






    /*
    ---------------------------------------------------------------------------
      QUERY SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns all selectable items of the container.
     *
     * @param all {Boolean} true for all selectables, false for the
      *   selectables the user can interactively select
     * @return {Array} A list of items
     */
    getSelectables : function(all) {
      throw new Error("Abstract method call: getSelectables()");
    },


    /**
     * Returns all selectable items between the two given items.
     *
     * The items could be given in any order.
     *
     * @param item1 {var} First item
     * @param item2 {var} Second item
     * @return {Array} List of items
     */
    _getSelectableRange : function(item1, item2) {
      throw new Error("Abstract method call: _getSelectableRange()");
    },


    /**
     * Returns the first selectable item.
     *
     * @return {var} The first selectable item
     */
    _getFirstSelectable : function() {
      throw new Error("Abstract method call: _getFirstSelectable()");
    },


    /**
     * Returns the last selectable item.
     *
     * @return {var} The last selectable item
     */
    _getLastSelectable : function() {
      throw new Error("Abstract method call: _getLastSelectable()");
    },


    /**
     * Returns a selectable item which is related to the given
     * <code>item</code> through the value of <code>relation</code>.
     *
     * @param item {var} Any item
     * @param relation {String} A valid relation: <code>above</code>,
     *    <code>right</code>, <code>under</code> or <code>left</code>
     * @return {var} The related item
     */
    _getRelatedSelectable : function(item, relation) {
      throw new Error("Abstract method call: _getRelatedSelectable()");
    },


    /**
     * Returns the item which should be selected on pageUp/pageDown.
     *
     * May also scroll to the needed position.
     *
     * @param lead {var} The current lead item
     * @param up {Boolean?false} Which page key was pressed:
     *   <code>up</code> or <code>down</code>.
     */
    _getPage : function(lead, up) {
      throw new Error("Abstract method call: _getPage()");
    },




    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyMode : function(value, old)
    {
      this._setLeadItem(null);
      this._setAnchorItem(null);

      this._clearSelection();

      // Mode "one" requires one selected item
      if (value === "one") {
        this._applyDefaultSelection(true);
      }

      this._fireChange();
    },






    /*
    ---------------------------------------------------------------------------
      POINTER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * This method should be connected to the <code>pointerover</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.Pointer} A valid pointer event
     */
    handlePointerOver : function(event)
    {
      // All browsers (except Opera) fire a native "mouseover" event when a scroll appears
      // by keyboard interaction. We have to ignore the event to avoid a selection for
      // "pointerover" (quick selection). For more details see [BUG #4225]
      if(this.__oldScrollTop != null &&
         this.__oldScrollTop != this._getScroll().top)
      {
        this.__oldScrollTop = null;
        return;
      }

      // quick select should only work on mouse events
      if (event.getPointerType() != "mouse") {
        return;
      }

      // this is a method invoked by an user interaction, so be careful to
      // set / clear the mark this._userInteraction [BUG #3344]
      this._userInteraction = true;

      if (!this.getQuick()) {
        this._userInteraction = false;
        return;
      }

      var mode = this.getMode();
      if (mode !== "one" && mode !== "single") {
        this._userInteraction = false;
        return;
      }

      var item = this._getSelectableFromPointerEvent(event);
      if (item === null) {
        this._userInteraction = false;
        return;
      }

      this._setSelectedItem(item);

      // Be sure that item is in view
      // This does not feel good when pointerover is used
      // this._scrollItemIntoView(item);

      // Fire change event as needed
      this._fireChange("quick");

      this._userInteraction = false;
    },


    /**
     * This method should be connected to the <code>pointerdown</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.Pointer} A valid pointer event
     */
    handlePointerDown : function(event)
    {
      // this is a method invoked by an user interaction, so be careful to
      // set / clear the mark this._userInteraction [BUG #3344]
      this._userInteraction = true;

      var item = this._getSelectableFromPointerEvent(event);
      if (item === null) {
        this._userInteraction = false;
        return;
      }

      // Read in keyboard modifiers
      var isCtrlPressed = event.isCtrlPressed() ||
        (qx.core.Environment.get("os.name") == "osx" && event.isMetaPressed());
      var isShiftPressed = event.isShiftPressed();

      // tapping on selected items deselect on pointerup, not on pointerdown
      if (this.isItemSelected(item) && !isShiftPressed && !isCtrlPressed && !this.getDrag())
      {
        this.__pointerDownOnSelected = item;
        this._userInteraction = false;
        return;
      }
      else
      {
        this.__pointerDownOnSelected = null;
      }

      // Be sure that item is in view
      this._scrollItemIntoView(item);

      // Drag selection
      var mode = this.getMode();
      if (
        this.getDrag() &&
        mode !== "single" &&
        mode !== "one" &&
        !isShiftPressed &&
        !isCtrlPressed &&
        event.getPointerType() == "mouse"
      )
      {
        this._setAnchorItem(item);
        this._setLeadItem(item);

        // Cache location/scroll data
        this.__frameLocation = this._getLocation();
        this.__frameScroll = this._getScroll();

        // Store position at start
        this.__dragStartX = event.getDocumentLeft() + this.__frameScroll.left;
        this.__dragStartY = event.getDocumentTop() + this.__frameScroll.top;

        // Switch to capture mode
        this.__inCapture = true;
        this._capture();
      }


      // Fire change event as needed
      this._fireChange("tap");

      this._userInteraction = false;
    },


    /**
     * This method should be connected to the <code>tap</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.Tap} A valid pointer event
     */
    handleTap : function(event)
    {
      // this is a method invoked by an user interaction, so be careful to
      // set / clear the mark this._userInteraction [BUG #3344]
      this._userInteraction = true;

      // Read in keyboard modifiers
      var isCtrlPressed = event.isCtrlPressed() ||
        (qx.core.Environment.get("os.name") == "osx" && event.isMetaPressed());
      var isShiftPressed = event.isShiftPressed();

      if (!isCtrlPressed && !isShiftPressed && this.__pointerDownOnSelected != null)
      {
        this._userInteraction = false;
        var item = this._getSelectableFromPointerEvent(event);
        if (item === null || !this.isItemSelected(item)) {
          return;
        }
      }

      var item = this._getSelectableFromPointerEvent(event);
      if (item === null) {
        this._userInteraction = false;
        return;
      }

      // Action depends on selected mode
      switch(this.getMode())
      {
        case "single":
        case "one":
          this._setSelectedItem(item);
          break;

        case "additive":
          this._setLeadItem(item);
          this._setAnchorItem(item);
          this._toggleInSelection(item);
          break;

        case "multi":
          // Update lead item
          this._setLeadItem(item);

          // Create/Update range selection
          if (isShiftPressed)
          {
            var anchor = this._getAnchorItem();
            if (anchor === null)
            {
              anchor = this._getFirstSelectable();
              this._setAnchorItem(anchor);
            }

            this._selectItemRange(anchor, item, isCtrlPressed);
          }

          // Toggle in selection
          else if (isCtrlPressed)
          {
            this._setAnchorItem(item);
            this._toggleInSelection(item);
          }

          // Replace current selection
          else
          {
            this._setAnchorItem(item);
            this._setSelectedItem(item);
          }

          break;
      }

      // Cleanup operation
      this._cleanup();
    },


    /**
     * This method should be connected to the <code>losecapture</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.Pointer} A valid pointer event
     */
    handleLoseCapture : function(event) {
      this._cleanup();
    },


    /**
     * This method should be connected to the <code>pointermove</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.Pointer} A valid pointer event
     */
    handlePointerMove : function(event)
    {
      // Only relevant when capturing is enabled
      if (!this.__inCapture) {
        return;
      }


      // Update pointer position cache
      this.__pointerX = event.getDocumentLeft();
      this.__pointerY = event.getDocumentTop();

      // this is a method invoked by an user interaction, so be careful to
      // set / clear the mark this._userInteraction [BUG #3344]
      this._userInteraction = true;

      // Detect move directions
      var dragX = this.__pointerX + this.__frameScroll.left;
      if (dragX > this.__dragStartX) {
        this.__moveDirectionX = 1;
      } else if (dragX < this.__dragStartX) {
        this.__moveDirectionX = -1;
      } else {
        this.__moveDirectionX = 0;
      }

      var dragY = this.__pointerY + this.__frameScroll.top;
      if (dragY > this.__dragStartY) {
        this.__moveDirectionY = 1;
      } else if (dragY < this.__dragStartY) {
        this.__moveDirectionY = -1;
      } else {
        this.__moveDirectionY = 0;
      }


      // Update scroll steps
      var location = this.__frameLocation;

      if (this.__pointerX < location.left) {
        this.__scrollStepX = this.__pointerX - location.left;
      } else if (this.__pointerX > location.right) {
        this.__scrollStepX = this.__pointerX - location.right;
      } else {
        this.__scrollStepX = 0;
      }

      if (this.__pointerY < location.top) {
        this.__scrollStepY = this.__pointerY - location.top;
      } else if (this.__pointerY > location.bottom) {
        this.__scrollStepY = this.__pointerY - location.bottom;
      } else {
        this.__scrollStepY = 0;
      }


      // Dynamically create required timer instance
      if (!this.__scrollTimer)
      {
        this.__scrollTimer = new qx.event.Timer(100);
        this.__scrollTimer.addListener("interval", this._onInterval, this);
      }


      // Start interval
      this.__scrollTimer.start();


      // Auto select based on new cursor position
      this._autoSelect();

      event.stopPropagation();
      this._userInteraction = false;
    },


    /**
     * This method should be connected to the <code>addItem</code> event
     * of the managed object.
     *
     * @param e {qx.event.type.Data} The event object
     */
    handleAddItem : function(e)
    {
      var item = e.getData();
      if (this.getMode() === "one" && this.isSelectionEmpty()) {
        this.addItem(item);
      }
    },


    /**
     * This method should be connected to the <code>removeItem</code> event
     * of the managed object.
     *
     * @param e {qx.event.type.Data} The event object
     */
    handleRemoveItem : function(e) {
      this.removeItem(e.getData());
    },




    /*
    ---------------------------------------------------------------------------
      POINTER SUPPORT INTERNALS
    ---------------------------------------------------------------------------
    */

    /**
     * Stops all timers, release capture etc. to cleanup drag selection
     */
    _cleanup : function()
    {
      if (!this.getDrag() && this.__inCapture) {
        return;
      }

      // Fire change event if needed
      if (this.__selectionModified) {
        this._fireChange("tap");
      }

      // Remove flags
      delete this.__inCapture;
      delete this.__lastRelX;
      delete this.__lastRelY;

      // Stop capturing
      this._releaseCapture();

      // Stop timer
      if (this.__scrollTimer) {
        this.__scrollTimer.stop();
      }
    },


    /**
     * Event listener for timer used by drag selection
     *
     * @param e {qx.event.type.Event} Timer event
     */
    _onInterval : function(e)
    {
      // Scroll by defined block size
      this._scrollBy(this.__scrollStepX, this.__scrollStepY);

      // Update scroll cache
      this.__frameScroll = this._getScroll();

      // Auto select based on new scroll position and cursor
      this._autoSelect();
    },


    /**
     * Automatically selects items based on the pointer movement during a drag selection
     */
    _autoSelect : function()
    {
      var inner = this._getDimension();

      // Get current relative Y position and compare it with previous one
      var relX = Math.max(0, Math.min(this.__pointerX - this.__frameLocation.left, inner.width)) + this.__frameScroll.left;
      var relY = Math.max(0, Math.min(this.__pointerY - this.__frameLocation.top, inner.height)) + this.__frameScroll.top;

      // Compare old and new relative coordinates (for performance reasons)
      if (this.__lastRelX === relX && this.__lastRelY === relY) {
        return;
      }
      this.__lastRelX = relX;
      this.__lastRelY = relY;

      // Cache anchor
      var anchor = this._getAnchorItem();
      var lead = anchor;


      // Process X-coordinate
      var moveX = this.__moveDirectionX;
      var nextX, locationX;

      while (moveX !== 0)
      {
        // Find next item to process depending on current scroll direction
        nextX = moveX > 0 ?
          this._getRelatedSelectable(lead, "right") :
          this._getRelatedSelectable(lead, "left");

        // May be null (e.g. first/last item)
        if (nextX !== null)
        {
          locationX = this._getSelectableLocationX(nextX);

          // Continue when the item is in the visible area
          if (
            (moveX > 0 && locationX.left <= relX) ||
            (moveX < 0 && locationX.right >= relX)
          )
          {
            lead = nextX;
            continue;
          }
        }

        // Otherwise break
        break;
      }


      // Process Y-coordinate
      var moveY = this.__moveDirectionY;
      var nextY, locationY;

      while (moveY !== 0)
      {
        // Find next item to process depending on current scroll direction
        nextY = moveY > 0 ?
          this._getRelatedSelectable(lead, "under") :
          this._getRelatedSelectable(lead, "above");

        // May be null (e.g. first/last item)
        if (nextY !== null)
        {
          locationY = this._getSelectableLocationY(nextY);

          // Continue when the item is in the visible area
          if (
            (moveY > 0 && locationY.top <= relY) ||
            (moveY < 0 && locationY.bottom >= relY)
          )
          {
            lead = nextY;
            continue;
          }
        }

        // Otherwise break
        break;
      }


      // Differenciate between the two supported modes
      var mode = this.getMode();
      if (mode === "multi")
      {
        // Replace current selection with new range
        this._selectItemRange(anchor, lead);
      }
      else if (mode === "additive")
      {
        // Behavior depends on the fact whether the
        // anchor item is selected or not
        if (this.isItemSelected(anchor)) {
          this._selectItemRange(anchor, lead, true);
        } else {
          this._deselectItemRange(anchor, lead);
        }

        // Improve performance. This mode does not rely
        // on full ranges as it always extend the old
        // selection/deselection.
        this._setAnchorItem(lead);
      }


      // Fire change event as needed
      this._fireChange("drag");
    },






    /*
    ---------------------------------------------------------------------------
      KEYBOARD SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * @type {Map} All supported navigation keys
     *
     * @lint ignoreReferenceField(__navigationKeys)
     */
    __navigationKeys :
    {
      Home : 1,
      Down : 1 ,
      Right : 1,
      PageDown : 1,
      End : 1,
      Up : 1,
      Left : 1,
      PageUp : 1
    },


    /**
     * This method should be connected to the <code>keypress</code> event
     * of the managed object.
     *
     * @param event {qx.event.type.KeySequence} A valid key sequence event
     */
    handleKeyPress : function(event)
    {
      // this is a method invoked by an user interaction, so be careful to
      // set / clear the mark this._userInteraction [BUG #3344]
      this._userInteraction = true;

      var current, next;
      var key = event.getKeyIdentifier();
      var mode = this.getMode();

      // Support both control keys on Mac
      var isCtrlPressed = event.isCtrlPressed() ||
        (qx.core.Environment.get("os.name") == "osx" && event.isMetaPressed());
      var isShiftPressed = event.isShiftPressed();

      var consumed = false;

      if (key === "A" && isCtrlPressed)
      {
        if (mode !== "single" && mode !== "one")
        {
          this._selectAllItems();
          consumed = true;
        }
      }
      else if (key === "Escape")
      {
        if (mode !== "single" && mode !== "one")
        {
          this._clearSelection();
          consumed = true;
        }
      }
      else if (key === "Space")
      {
        var lead = this.getLeadItem();
        if (lead != null && !isShiftPressed)
        {
          if (isCtrlPressed || mode === "additive") {
            this._toggleInSelection(lead);
          } else {
            this._setSelectedItem(lead);
          }
          consumed = true;
        }
      }
      else if (this.__navigationKeys[key])
      {
        consumed = true;
        if (mode === "single" || mode == "one") {
          current = this._getSelectedItem();
        } else {
          current = this.getLeadItem();
        }

        if (current !== null)
        {
          switch(key)
          {
            case "Home":
              next = this._getFirstSelectable();
              break;

            case "End":
              next = this._getLastSelectable();
              break;

            case "Up":
              next = this._getRelatedSelectable(current, "above");
              break;

            case "Down":
              next = this._getRelatedSelectable(current, "under");
              break;

            case "Left":
              next = this._getRelatedSelectable(current, "left");
              break;

            case "Right":
              next = this._getRelatedSelectable(current, "right");
              break;

            case "PageUp":
              next = this._getPage(current, true);
              break;

            case "PageDown":
              next = this._getPage(current, false);
              break;
          }
        }
        else
        {
          switch(key)
          {
            case "Home":
            case "Down":
            case "Right":
            case "PageDown":
              next = this._getFirstSelectable();
              break;

            case "End":
            case "Up":
            case "Left":
            case "PageUp":
              next = this._getLastSelectable();
              break;
          }
        }

        // Process result
        if (next !== null)
        {
          switch(mode)
          {
            case "single":
            case "one":
              this._setSelectedItem(next);
              break;

            case "additive":
              this._setLeadItem(next);
              break;

            case "multi":
              if (isShiftPressed)
              {
                var anchor = this._getAnchorItem();
                if (anchor === null) {
                  this._setAnchorItem(anchor = this._getFirstSelectable());
                }

                this._setLeadItem(next);
                this._selectItemRange(anchor, next, isCtrlPressed);
              }
              else
              {
                this._setAnchorItem(next);
                this._setLeadItem(next);

                if (!isCtrlPressed) {
                  this._setSelectedItem(next);
                }
              }

              break;
          }

          this.__oldScrollTop = this._getScroll().top;
          this._scrollItemIntoView(next);
        }
      }


      if (consumed)
      {
        // Stop processed events
        event.stop();

        // Fire change event as needed
        this._fireChange("key");
      }
      this._userInteraction = false;
    },






    /*
    ---------------------------------------------------------------------------
      SUPPORT FOR ITEM RANGES
    ---------------------------------------------------------------------------
    */

    /**
     * Adds all items to the selection
     */
    _selectAllItems : function()
    {
      var range = this.getSelectables();
      for (var i=0, l=range.length; i<l; i++) {
        this._addToSelection(range[i]);
      }
    },


    /**
     * Clears current selection
     */
    _clearSelection : function()
    {
      var selection = this.__selection;
      for (var hash in selection) {
        this._removeFromSelection(selection[hash]);
      }
      this.__selection = {};
    },


    /**
     * Select a range from <code>item1</code> to <code>item2</code>.
     *
     * @param item1 {Object} Start with this item
     * @param item2 {Object} End with this item
     * @param extend {Boolean?false} Whether the current
     *    selection should be replaced or extended.
     */
    _selectItemRange : function(item1, item2, extend)
    {
      var range = this._getSelectableRange(item1, item2);

      // Remove items which are not in the detected range
      if (!extend)
      {
        var selected = this.__selection;
        var mapped = this.__rangeToMap(range);

        for (var hash in selected)
        {
          if (!mapped[hash]) {
            this._removeFromSelection(selected[hash]);
          }
        }
      }

      // Add new items to the selection
      for (var i=0, l=range.length; i<l; i++) {
        this._addToSelection(range[i]);
      }
    },


    /**
     * Deselect all items between <code>item1</code> and <code>item2</code>.
     *
     * @param item1 {Object} Start with this item
     * @param item2 {Object} End with this item
     */
    _deselectItemRange : function(item1, item2)
    {
      var range = this._getSelectableRange(item1, item2);
      for (var i=0, l=range.length; i<l; i++) {
        this._removeFromSelection(range[i]);
      }
    },


    /**
     * Internal method to convert a range to a map of hash
     * codes for faster lookup during selection compare routines.
     *
     * @param range {Array} List of selectable items
     */
    __rangeToMap : function(range)
    {
      var mapped = {};
      var item;

      for (var i=0, l=range.length; i<l; i++)
      {
        item = range[i];
        mapped[this._selectableToHashCode(item)] = item;
      }

      return mapped;
    },






    /*
    ---------------------------------------------------------------------------
      SINGLE ITEM QUERY AND MODIFICATION
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the first selected item. Only makes sense
     * when using manager in single selection mode.
     *
     * @return {var} The selected item (or <code>null</code>)
     */
    _getSelectedItem : function()
    {
      for (var hash in this.__selection) {
        return this.__selection[hash];
      }

      return null;
    },


    /**
     * Replace current selection with given item.
     *
     * @param item {var} Any valid selectable item
     */
    _setSelectedItem : function(item)
    {
      if (this._isSelectable(item))
      {
        // If already selected try to find out if this is the only item
        var current = this.__selection;
        var hash = this._selectableToHashCode(item);

        if (!current[hash] || (current.length >= 2))
        {
          this._clearSelection();
          this._addToSelection(item);
        }
      }
    },







    /*
    ---------------------------------------------------------------------------
      MODIFY ITEM SELECTION
    ---------------------------------------------------------------------------
    */

    /**
     * Adds an item to the current selection.
     *
     * @param item {Object} Any item
     */
    _addToSelection : function(item)
    {
      var hash = this._selectableToHashCode(item);

      if (this.__selection[hash] == null && this._isSelectable(item))
      {
        this.__selection[hash] = item;
        this._styleSelectable(item, "selected", true);

        this.__selectionModified = true;
      }
    },


    /**
     * Toggles the item e.g. remove it when already selected
     * or select it when currently not.
     *
     * @param item {Object} Any item
     */
    _toggleInSelection : function(item)
    {
      var hash = this._selectableToHashCode(item);

      if (this.__selection[hash] == null)
      {
        this.__selection[hash] = item;
        this._styleSelectable(item, "selected", true);
      }
      else
      {
        delete this.__selection[hash];
        this._styleSelectable(item, "selected", false);
      }

      this.__selectionModified = true;
    },


    /**
     * Removes the given item from the current selection.
     *
     * @param item {Object} Any item
     */
    _removeFromSelection : function(item)
    {
      var hash = this._selectableToHashCode(item);

      if (this.__selection[hash] != null)
      {
        delete this.__selection[hash];
        this._styleSelectable(item, "selected", false);

        this.__selectionModified = true;
      }
    },


    /**
     * Replaces current selection with items from given array.
     *
     * @param items {Array} List of items to select
     */
    _replaceMultiSelection : function(items)
    {
      if (items.length === 0) {
        this.clearSelection();
        return;
      }

      var modified = false;

      // Build map from hash codes and filter non-selectables
      var selectable, hash;
      var incoming = {};
      for (var i=0, l=items.length; i<l; i++)
      {
        selectable = items[i];
        if (this._isSelectable(selectable))
        {
          hash = this._selectableToHashCode(selectable);
          incoming[hash] = selectable;
        }
      }

      // Remember last
      var first = items[0];
      var last = selectable;

      // Clear old entries from map
      var current = this.__selection;
      for (var hash in current)
      {
        if (incoming[hash])
        {
          // Reduce map to make next loop faster
          delete incoming[hash];
        }
        else
        {
          // update internal map
          selectable = current[hash];
          delete current[hash];

          // apply styling
          this._styleSelectable(selectable, "selected", false);

          // remember that the selection has been modified
          modified = true;
        }
      }

      // Add remaining selectables to selection
      for (var hash in incoming)
      {
        // update internal map
        selectable = current[hash] = incoming[hash];

        // apply styling
        this._styleSelectable(selectable, "selected", true);

        // remember that the selection has been modified
        modified = true;
      }

      // Do not do anything if selection is equal to previous one
      if (!modified) {
        return false;
      }

      // Scroll last incoming item into view
      this._scrollItemIntoView(last);

      // Reset anchor and lead item
      this._setLeadItem(first);
      this._setAnchorItem(first);

      // Finally fire change event
      this.__selectionModified = true;
      this._fireChange();
    },


    /**
     * Fires the selection change event if the selection has
     * been modified.
     *
     * @param context {String} One of <code>tap</code>, <code>quick</code>,
     *    <code>drag</code> or <code>key</code> or <code>null</code>
     */
    _fireChange : function(context)
    {
      if (this.__selectionModified)
      {
        // Store context
        this.__selectionContext = context || null;

        // Fire data event which contains the current selection
        this.fireDataEvent("changeSelection", this.getSelection());
        delete this.__selectionModified;
      }
    },


    /**
     * Applies the default selection. The default item is the first item.
     *
     * @param force {Boolean} Whether the default selection sould forced.
     *
     * @return {var} The selected item.
     */
    _applyDefaultSelection : function(force)
    {
      if (force === true || this.getMode() === "one" && this.isSelectionEmpty())
      {
        var first = this._getFirstSelectable();
        if (first != null) {
          this.selectItem(first);
        }
        return first;
      }
      return null;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this._disposeObjects("__scrollTimer");
    this.__selection = this.__pointerDownOnSelected = this.__anchorItem = null;
    this.__leadItem = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * Abstract base class for selection manager, which manage selectable items
 * rendered in a virtual {@link qx.ui.virtual.core.Pane}.
 */
qx.Class.define("qx.ui.virtual.selection.Abstract",
{
  extend : qx.ui.core.selection.Abstract,


  /*
   *****************************************************************************
      CONSTRUCTOR
   *****************************************************************************
   */

  /**
   * @param pane {qx.ui.virtual.core.Pane} The virtual pane on which the
   *    selectable item are rendered
   * @param selectionDelegate {ISelectionDelegate?null} An optional delegate,
   *    which can be used to customize the behavior of the selection manager
   *    without sub classing it.
   */
  construct : function(pane, selectionDelegate)
  {
    this.base(arguments);

    if (qx.core.Environment.get("qx.debug")) {
      this.assertInstance(pane, qx.ui.virtual.core.Pane);
    }

    this._pane = pane;
    this._delegate = selectionDelegate || {};
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // Determines if automatically scrolling of selected item into view is active.
    _autoScrollIntoView : true,


    /*
    ---------------------------------------------------------------------------
      DELEGATE METHODS
    ---------------------------------------------------------------------------
    */

    // overridden
    _isSelectable : function(item) {
      return this._delegate.isItemSelectable ?
        this._delegate.isItemSelectable(item) :
        true;
    },


    // overridden
    _styleSelectable : function(item, type, enabled)
    {
      if (this._delegate.styleSelectable) {
        this._delegate.styleSelectable(item, type, enabled);
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENTS
    ---------------------------------------------------------------------------
    */

    /**
     * Attach pointer events to the managed pane.
     */
    attachPointerEvents : function()
    {
      var paneElement = this._pane.getContentElement();
      paneElement.addListener("pointerdown", this.handlePointerDown, this);
      paneElement.addListener("tap", this.handleTap, this);
      paneElement.addListener("pointerover", this.handlePointerOver, this);
      paneElement.addListener("pointermove", this.handlePointerMove, this);
      paneElement.addListener("losecapture", this.handleLoseCapture, this);
    },


    /**
     * Detach pointer events from the managed pane.
     */
    detatchPointerEvents : function()
    {
      var paneElement = this._pane.getContentElement();
      paneElement.removeListener("pointerdown", this.handlePointerDown, this);
      paneElement.removeListener("tap", this.handleTap, this);
      paneElement.removeListener("pointerover", this.handlePointerOver, this);
      paneElement.removeListener("pointermove", this.handlePointerMove, this);
      paneElement.removeListener("losecapture", this.handleLoseCapture, this);
    },


    /**
     * Attach key events to manipulate the selection using the keyboard. The
     * event target doesn't need to be the pane itself. It can be an widget,
     * which received key events. Usually the key event target is the
     * {@link qx.ui.virtual.core.Scroller}.
     *
     * @param target {qx.core.Object} the key event target.
     *
     */
    attachKeyEvents : function(target) {
      target.addListener("keypress", this.handleKeyPress, this);
    },


    /**
     * Detach key events.
     *
     * @param target {qx.core.Object} the key event target.
     */
    detachKeyEvents : function(target) {
      target.removeListener("keypress", this.handleKeyPress, this);
    },


    /**
     * Attach list events. The selection mode <code>one</code> need to know,
     * when selectable items are added or removed. If this mode is used the
     * <code>list</code> parameter must fire <code>addItem</code> and
     * <code>removeItem</code> events.
     *
     * @param list {qx.core.Object} the event target for <code>addItem</code> and
     *    <code>removeItem</code> events
     */
    attachListEvents : function(list)
    {
      list.addListener("addItem", this.handleAddItem, this);
      list.addListener("removeItem", this.handleRemoveItem, this);
    },


    /**
     * Detach list events.
     *
     * @param list {qx.core.Object} the event target for <code>addItem</code> and
     *    <code>removeItem</code> events
     */
    detachListEvents : function(list)
    {
      list.removeListener("addItem", this.handleAddItem, this);
      list.removeListener("removeItem", this.handleRemoveItem, this);
    },


    /*
    ---------------------------------------------------------------------------
      IMPLEMENT ABSTRACT METHODS
    ---------------------------------------------------------------------------
    */

    // overridden
    _capture : function() {
      this._pane.capture();
    },


    // overridden
    _releaseCapture : function() {
      this._pane.releaseCapture();
    },


    // overridden
    _getScroll : function()
    {
      return {
        left : this._pane.getScrollX(),
        top: this._pane.getScrollY()
      };
    },


    // overridden
    _scrollBy : function(xoff, yoff)
    {
      this._pane.setScrollX(this._pane.getScrollX() + xoff);
      this._pane.setScrollY(this._pane.getScrollY() + yoff);
    },


    // overridden
    _getLocation : function()
    {
      var elem = this._pane.getContentElement().getDomElement();
      return elem ? qx.bom.element.Location.get(elem) : null;
    },


    // overridden
    _getDimension : function() {
      return this._pane.getInnerSize();
    }
  },

  /*
   *****************************************************************************
      DESTRUCT
   *****************************************************************************
   */

  destruct : function() {
    this._pane = this._delegate = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * Row selection manager
 */
qx.Class.define("qx.ui.virtual.selection.Row",
{
  extend : qx.ui.virtual.selection.Abstract,


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Returns the number of all items in the pane. This number may contain
     * unselectable items as well.
     *
     * @return {Integer} number of items
     */
    _getItemCount : function() {
      return this._pane.getRowConfig().getItemCount();
    },


    /*
    ---------------------------------------------------------------------------
      IMPLEMENT ABSTRACT METHODS
    ---------------------------------------------------------------------------
    */

    // overridden
    _getSelectableFromPointerEvent : function(event)
    {
      var cell = this._pane.getCellAtPosition(
        event.getDocumentLeft(),
        event.getDocumentTop()
      );

      if (!cell) {
        return null;
      }

      return this._isSelectable(cell.row) ? cell.row : null;
    },


    // overridden
    getSelectables : function(all)
    {
      var selectables = [];

      for (var i=0, l=this._getItemCount(); i<l; i++)
      {
        if (this._isSelectable(i)) {
          selectables.push(i);
        }
      }

      return selectables;
    },


    // overridden
    _getSelectableRange : function(item1, item2)
    {
      var selectables = [];
      var min = Math.min(item1, item2);
      var max = Math.max(item1, item2);

      for (var i=min; i<=max; i++)
      {
        if (this._isSelectable(i)) {
          selectables.push(i);
        }
      }

      return selectables;
    },


    // overridden
    _getFirstSelectable : function()
    {
      var count = this._getItemCount();
      for (var i=0; i<count; i++)
      {
        if (this._isSelectable(i)) {
          return i;
        }
      }
      return null;
    },


    // overridden
    _getLastSelectable : function()
    {
      var count = this._getItemCount();
      for (var i=count-1; i>=0; i--)
      {
        if (this._isSelectable(i)) {
          return i;
        }
      }
      return null;
    },


    // overridden
    _getRelatedSelectable : function(item, relation)
    {
      if (relation == "above")
      {
        var startIndex = item-1;
        var endIndex = 0;
        var increment = -1;
      }
      else if (relation == "under")
      {
        var startIndex = item+1;
        var endIndex = this._getItemCount()-1;
        var increment = 1;
      }
      else
      {
        return null;
      }

      for (var i=startIndex; i !== endIndex+increment; i += increment)
      {
        if (this._isSelectable(i)) {
          return i;
        }
      }
      return null;
    },


    // overridden
    _getPage : function(lead, up)
    {
      if (up) {
        return this._getFirstSelectable();
      } else {
        return this._getLastSelectable();
      }
    },


    // overridden
    _selectableToHashCode : function(item) {
      return item;
    },


    // overridden
    _scrollItemIntoView : function(item) {
      if (this._autoScrollIntoView) {
        this._pane.scrollRowIntoView(item);
      }
    },


    // overridden
    _getSelectableLocationX : function(item)
    {
      return {
        left: 0,
        right: this._pane.getColumnConfig().getTotalSize() - 1
      };
    },


    // overridden
    _getSelectableLocationY : function(item)
    {
      var rowConfig = this._pane.getRowConfig();

      var itemTop = rowConfig.getItemPosition(item);
      var itemBottom = itemTop + rowConfig.getItemSize(item) - 1;

      return {
        top: itemTop,
        bottom: itemBottom
      }
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2012 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Interface for data binding classes offering a selection.
 */
qx.Interface.define("qx.data.controller.ISelection",
{
  members :
  {
    /**
     * Setter for the selection.
     * @param value {qx.data.IListData} The data of the selection.
     */
    setSelection : function(value) {},


    /**
     * Getter for the selection list.
     * @return {qx.data.IListData} The current selection.
     */
    getSelection : function() {},


    /**
     * Resets the selection to its default value.
     */
    resetSelection : function() {}
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * The <code>qx.ui.list.List</code> is based on the virtual infrastructure and
 * supports filtering, sorting, grouping, single selection, multi selection,
 * data binding and custom rendering.
 *
 * Using the virtual infrastructure has considerable advantages when there is a
 * huge amount of model items to render because the virtual infrastructure only
 * creates widgets for visible items and reuses them. This saves both creation
 * time and memory.
 *
 * With the {@link qx.ui.list.core.IListDelegate} interface it is possible
 * to configure the list's behavior (item and group renderer configuration,
 * filtering, sorting, grouping, etc.).
 *
 * Here's an example of how to use the widget:
 * <pre class="javascript">
 * //create the model data
 * var rawData = [];
 * for (var i = 0; i < 2500; i++) {
 *  rawData[i] = "Item No " + i;
 * }
 * var model = qx.data.marshal.Json.createModel(rawData);
 *
 * //create the list
 * var list = new qx.ui.list.List(model);
 *
 * //configure the lists's behavior
 * var delegate = {
 *   sorter : function(a, b) {
 *     return a > b ? 1 : a < b ? -1 : 0;
 *   }
 * };
 * list.setDelegate(delegate);
 *
 * //Pre-Select "Item No 20"
 * list.getSelection().push(model.getItem(20));
 *
 * //log selection changes
 * list.getSelection().addListener("change", function(e) {
 *   this.debug("Selection: " + list.getSelection().getItem(0));
 * }, this);
 * </pre>
 *
 * @childControl row-layer {qx.ui.virtual.layer.Row} layer for all rows
 */
qx.Class.define("qx.ui.list.List",
{
  extend : qx.ui.virtual.core.Scroller,
  include : [qx.ui.virtual.selection.MModel],
  implement : qx.data.controller.ISelection,

  /**
   * Creates the <code>qx.ui.list.List</code> with the passed model.
   *
   * @param model {qx.data.IListData|null} model for the list.
   */
  construct : function(model)
  {
    this.base(arguments, 0, 1, 20, 100);

    this._init();

    this.__defaultGroups = new qx.data.Array();
    this.initGroups(this.__defaultGroups);

    if(model != null) {
      this.initModel(model);
    }

    this.initItemHeight();
  },


  properties :
  {
    // overridden
    appearance :
    {
      refine : true,
      init : "virtual-list"
    },


    // overridden
    focusable :
    {
      refine : true,
      init : true
    },


    // overridden
    width :
    {
      refine : true,
      init : 100
    },


    // overridden
    height :
    {
      refine : true,
      init : 200
    },


    /** Data array containing the data which should be shown in the list. */
    model :
    {
      check : "qx.data.IListData",
      apply : "_applyModel",
      event: "changeModel",
      nullable : true,
      deferredInit : true
    },


    /** Default item height */
    itemHeight :
    {
      check : "Integer",
      init : 25,
      apply : "_applyRowHeight",
      themeable : true
    },


    /** Group item height */
    groupItemHeight :
    {
      check : "Integer",
      init : null,
      nullable : true,
      apply : "_applyGroupRowHeight",
      themeable : true
    },


    /**
     * The path to the property which holds the information that should be
     * displayed as a label. This is only needed if objects are stored in the
     * model.
     */
    labelPath :
    {
      check: "String",
      apply: "_applyLabelPath",
      nullable: true
    },


    /**
     * The path to the property which holds the information that should be
     * displayed as an icon. This is only needed if objects are stored in the
     * model and icons should be displayed.
     */
    iconPath :
    {
      check: "String",
      apply: "_applyIconPath",
      nullable: true
    },


    /**
     * The path to the property which holds the information that should be
     * displayed as a group label. This is only needed if objects are stored in the
     * model.
     */
    groupLabelPath :
    {
      check: "String",
      apply: "_applyGroupLabelPath",
      nullable: true
    },


    /**
     * A map containing the options for the label binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    labelOptions :
    {
      apply: "_applyLabelOptions",
      nullable: true
    },


    /**
     * A map containing the options for the icon binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    iconOptions :
    {
      apply: "_applyIconOptions",
      nullable: true
    },


    /**
     * A map containing the options for the group label binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    groupLabelOptions :
    {
      apply: "_applyGroupLabelOptions",
      nullable: true
    },


    /**
     * Delegation object which can have one or more functions defined by the
     * {@link qx.ui.list.core.IListDelegate} interface.
     */
    delegate :
    {
      apply: "_applyDelegate",
      event: "changeDelegate",
      init: null,
      nullable: true
    },


    /**
     * Indicates that the list is managing the {@link #groups} automatically.
     */
    autoGrouping :
    {
      check: "Boolean",
      init: true
    },


    /**
     * Contains all groups for data binding, but do only manipulate the array
     * when the {@link #autoGrouping} is set to <code>false</code>.
     */
    groups :
    {
      check: "qx.data.Array",
      event: "changeGroups",
      nullable: false,
      deferredInit: true
    }
  },


  members :
  {
    /** @type {qx.ui.virtual.layer.Row} background renderer */
    _background : null,


    /** @type {qx.ui.list.provider.IListProvider} provider for cell rendering */
    _provider : null,


    /** @type {qx.ui.virtual.layer.Abstract} layer which contains the items. */
    _layer : null,


    /**
     * @type {Array} lookup table to get the model index from a row. To get the
     *   correct value after applying filter, sorter, group.
     *
     * Note the value <code>-1</code> indicates that the value is a group item.
     */
    __lookupTable : null,


    /** @type {Array} lookup table for getting the group index from the row */
    __lookupTableForGroup : null,


    /**
     * @type {Map} contains all groups with the items as children. The key is
     *   the group name and the value is an <code>Array</code> containing each
     *   item's model index.
     */
    __groupHashMap : null,


    /**
     * @type {Boolean} indicates when one or more <code>String</code> are used for grouping.
     */
    __groupStringsUsed : false,


    /**
     * @type {Boolean} indicates when one or more <code>Object</code> are used for grouping.
     */
    __groupObjectsUsed : false,


    /**
     * @type {Boolean} indicates when a default group is used for grouping.
     */
    __defaultGroupUsed : false,

    __defaultGroups : null,


    /**
     * Trigger a rebuild from the internal data structure.
     */
    refresh : function() {
      this.__buildUpLookupTable();
    },


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "row-layer" :
          control = new qx.ui.virtual.layer.Row(null, null);
          break;
      }
      return control || this.base(arguments, id);
    },


    /**
     * Initializes the virtual list.
     */
    _init : function()
    {
      this._provider = new qx.ui.list.provider.WidgetProvider(this);

      this.__lookupTable = [];
      this.__lookupTableForGroup = [];
      this.__groupHashMap = {};
      this.__groupStringsUsed = false;
      this.__groupObjectsUsed = false;
      this.__defaultGroupUsed = false;

      this.getPane().addListener("resize", this._onResize, this);

      this._initBackground();
      this._initLayer();
    },


    /**
     * Initializes the background renderer.
     */
    _initBackground : function()
    {
      this._background = this.getChildControl("row-layer");
      this.getPane().addLayer(this._background);
    },


    /**
     * Initializes the layer for rendering.
     */
    _initLayer : function()
    {
      this._layer = this._provider.createLayer();
      this.getPane().addLayer(this._layer);
    },


    /*
    ---------------------------------------------------------------------------
      INTERNAL API
    ---------------------------------------------------------------------------
    */


    /**
     * Returns the model data for the given row.
     *
     * @param row {Integer} row to get data for.
     * @return {var|null} the row's model data.
     */
    _getDataFromRow : function(row) {
      var data = null;

      var model = this.getModel();
      if (model == null) {
        return null;
      }

      if (this._isGroup(row)) {
        data = this.getGroups().getItem(this._lookupGroup(row));
      } else {
        data = model.getItem(this._lookup(row));
      }

      if (data != null) {
        return data;
      } else {
        return null;
      }
    },


    /**
     * Return the internal lookup table. But do not manipulate the
     * lookup table!
     *
     * @return {Array} The internal lookup table.
     */
    _getLookupTable : function() {
      return this.__lookupTable;
    },


    /**
     * Performs a lookup from row to model index.
     *
     * @param row {Number} The row to look at.
     * @return {Number} The model index or
     *   <code>-1</code> if the row is a group item.
     */
    _lookup : function(row) {
      return this.__lookupTable[row];
    },


    /**
     * Performs a lookup from row to group index.
     *
     * @param row {Number} The row to look at.
     * @return {Number} The group index or
     *   <code>-1</code> if the row is a not a group item.
     */
    _lookupGroup : function(row) {
      return this.__lookupTableForGroup.indexOf(row);
    },


    /**
     * Performs a lookup from model index to row.
     *
     * @param index {Number} The index to look at.
     * @return {Number} The row or <code>-1</code>
     *  if the index is not a model index.
     */
    _reverseLookup : function(index) {
      if (index < 0) {
        return -1;
      }
      return this.__lookupTable.indexOf(index);
    },


    /**
     * Checks if the passed row is a group or an item.
     *
     * @param row {Integer} row to check.
     * @return {Boolean} <code>true</code> if the row is a group element,
     *  <code>false</code> if the row is an item element.
     */
    _isGroup : function(row) {
      return this._lookup(row) == -1;
    },


    /**
     * Returns the selectable model items.
     *
     * @return {qx.data.Array | null} The selectable items.
     */
    _getSelectables : function() {
      return this.getModel();
    },


    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */


    // apply method
    _applyModel : function(value, old)
    {
      if (value != null) {
        value.addListener("changeLength", this._onModelChange, this);
      }

      if (old != null) {
        old.removeListener("changeLength", this._onModelChange, this);
      }

      this._provider.removeBindings();
      this._onModelChange();
    },


    // apply method
    _applyRowHeight : function(value, old) {
      this.getPane().getRowConfig().setDefaultItemSize(value);
    },

    // apply method
    _applyGroupRowHeight : function(value, old) {
      this.__updateGroupRowHeight();
    },

    // apply method
    _applyLabelPath : function(value, old) {
      this._provider.setLabelPath(value);
    },


    // apply method
    _applyIconPath : function(value, old) {
      this._provider.setIconPath(value);
    },


    // apply method
    _applyGroupLabelPath : function(value, old) {
      this._provider.setGroupLabelPath(value);
    },


    // apply method
    _applyLabelOptions : function(value, old) {
      this._provider.setLabelOptions(value);
    },


    // apply method
    _applyIconOptions : function(value, old) {
      this._provider.setIconOptions(value);
    },


    // apply method
    _applyGroupLabelOptions : function(value, old) {
      this._provider.setGroupLabelOptions(value);
    },


    // apply method
    _applyDelegate : function(value, old) {
      this._provider.setDelegate(value);
      this.__buildUpLookupTable();
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLERS
    ---------------------------------------------------------------------------
    */


    /**
     * Event handler for the resize event.
     *
     * @param e {qx.event.type.Data} resize event.
     */
    _onResize : function(e) {
      this.getPane().getColumnConfig().setItemSize(0, e.getData().width);
    },


    /**
     * Event handler for the model change event.
     *
     * @param e {qx.event.type.Data} model change event.
     */
    _onModelChange : function(e) {
      this.__buildUpLookupTable();
      this._applyDefaultSelection();
    },


    /*
    ---------------------------------------------------------------------------
      HELPER ROUTINES
    ---------------------------------------------------------------------------
    */


    /**
     * Helper method to update the row count.
     */
    __updateRowCount : function()
    {
      this.getPane().getRowConfig().setItemCount(this.__lookupTable.length);
      this.getPane().fullUpdate();
    },


    /**
     * Helper method to update row heights.
     */
    __updateGroupRowHeight : function()
    {
      var rc = this.getPane().getRowConfig();
      var gh = this.getGroupItemHeight();
      rc.resetItemSizes();

      if (gh) {
        for (var i = 0,l = this.__lookupTable.length; i < l; ++i)
        {
          if (this.__lookupTable[i] == -1) {
            rc.setItemSize(i, gh);
          }
        }
      }
    },


    /**
     * Internal method for building the lookup table.
     */
    __buildUpLookupTable : function()
    {
      this.__lookupTable = [];
      this.__lookupTableForGroup = [];
      this.__groupHashMap = {};

      if (this.isAutoGrouping()) {
        this.getGroups().removeAll();
      }

      var model = this.getModel();

      if (model != null) {
        this._runDelegateFilter(model);
        this._runDelegateSorter(model);
        this._runDelegateGroup(model);
      }

      this._updateSelection();
      this.__updateGroupRowHeight();
      this.__updateRowCount();
    },


    /**
     * Invokes filtering using the filter given in the delegate.
     *
     * @param model {qx.data.IListData} The model.
     */
    _runDelegateFilter : function (model)
    {
      var filter = qx.util.Delegate.getMethod(this.getDelegate(), "filter");

      for (var i = 0,l = model.length; i < l; ++i)
      {
        if (filter == null || filter(model.getItem(i))) {
          this.__lookupTable.push(i);
        }
      }
    },


    /**
     * Invokes sorting using the sorter given in the delegate.
     *
     * @param model {qx.data.IListData} The model.
     */
    _runDelegateSorter : function (model)
    {
      if (this.__lookupTable.length == 0) {
        return;
      }

      var sorter = qx.util.Delegate.getMethod(this.getDelegate(), "sorter");

      if (sorter != null)
      {
        this.__lookupTable.sort(function(a, b)
        {
          return sorter(model.getItem(a), model.getItem(b));
        });
      }
    },


    /**
     * Invokes grouping using the group result given in the delegate.
     *
     * @param model {qx.data.IListData} The model.
     */
    _runDelegateGroup : function (model)
    {
      var groupMethod = qx.util.Delegate.getMethod(this.getDelegate(), "group");

      if (groupMethod != null)
      {
        for (var i = 0,l = this.__lookupTable.length; i < l; ++i)
        {
          var index = this.__lookupTable[i];
          var item = this.getModel().getItem(index);
          var group = groupMethod(item);

          this.__addGroup(group, index);
        }
        this.__lookupTable = this.__createLookupFromGroup();
      }
    },


    /**
     * Adds a model index the the group.
     *
     * @param group {String|Object|null} the group.
     * @param index {Integer} model index to add.
     */
    __addGroup : function(group, index)
    {
      // if group is null add to default group
      if (group == null)
      {
        this.__defaultGroupUsed = true;
        group = "???";
      }

      var name = this.__getUniqueGroupName(group);
      if (this.__groupHashMap[name] == null)
      {
        this.__groupHashMap[name] = [];
        if (this.isAutoGrouping()) {
          this.getGroups().push(group);
        }
      }
      this.__groupHashMap[name].push(index);
    },


    /**
     * Creates a lookup table form the internal group hash map.
     *
     * @return {Array} the lookup table based on the internal group hash map.
     */
    __createLookupFromGroup : function()
    {
      this.__checkGroupStructure();

      var result = [];
      var row = 0;
      var groups = this.getGroups();
      for (var i = 0; i < groups.getLength(); i++)
      {
        var group = groups.getItem(i);

        // indicate that the value is a group
        result.push(-1);
        this.__lookupTableForGroup.push(row);
        row++;

        var key = this.__getUniqueGroupName(group);
        var groupMembers = this.__groupHashMap[key];
        if (groupMembers != null)
        {
          for (var k = 0; k < groupMembers.length; k++) {
            result.push(groupMembers[k]);
            row++;
          }
        }
      }
      return result;
    },


    /**
     * Returns an unique group name for the passed group.
     *
     * @param group {String|Object} Group to find unique group name.
     * @return {String} Unique group name.
     */
    __getUniqueGroupName : function(group)
    {
      var name = null;
      if (!qx.lang.Type.isString(group))
      {
        var index = this.getGroups().indexOf(group);
        this.__groupObjectsUsed = true;

        name = "group";
        if (index == -1) {
           name += this.getGroups().getLength();
        } else {
          name += index;
        }
      }
      else
      {
        this.__groupStringsUsed = true;
        var name = group;
      }
      return name;
    },


    /**
     * Checks that <code>Object</code> and <code>String</code> are not mixed
     * as group identifier, otherwise an exception occurs.
     */
    __checkGroupStructure : function() {
      if (this.__groupObjectsUsed && this.__defaultGroupUsed ||
          this.__groupObjectsUsed && this.__groupStringsUsed)
      {
        throw new Error("GroupingTypeError: You can't mix 'Objects' and 'Strings' as" +
          " group identifier!");
      }
    }
  },


  destruct : function()
  {
    var model = this.getModel();
    if (model != null) {
      model.removeListener("changeLength", this._onModelChange, this);
    }

    var pane = this.getPane()
    if (pane != null) {
      pane.removeListener("resize", this._onResize, this);
    }

    this._background.dispose();
    this._provider.dispose();
    this._layer.dispose();
    this._background = this._provider = this._layer =
      this.__lookupTable = this.__lookupTableForGroup =
      this.__groupHashMap = null;

    if (this.__defaultGroups) {
      this.__defaultGroups.dispose();
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * Abstract base class for layers of a virtual pane.
 *
 * This class queues calls to {@link #fullUpdate}, {@link #updateLayerWindow}
 * and {@link #updateLayerData} and only performs the absolute necessary
 * actions. Concrete implementation of this class must at least implement
 * the {@link #_fullUpdate} method. Additionally the two methods
 * {@link #_updateLayerWindow} and {@link #_updateLayerData} may be implemented
 * to increase the performance.
 */
qx.Class.define("qx.ui.virtual.layer.Abstract",
{
  extend : qx.ui.core.Widget,
  type : "abstract",

  implement : [qx.ui.virtual.core.ILayer],

  /*
   *****************************************************************************
      CONSTRUCTOR
   *****************************************************************************
   */

   construct : function()
   {
     this.base(arguments);

     this.__jobs = {};
   },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    anonymous :
    {
      refine: true,
      init: true
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __jobs : null,
    __arguments : null,

    __firstRow : null,
    __firstColumn : null,
    __rowSizes : null,
    __columnSizes : null,


    /**
     * Get the first rendered row
     *
     * @return {Integer} The first rendered row
     */
    getFirstRow : function() {
      return this.__firstRow;
    },


    /**
     * Get the first rendered column
     *
     * @return {Integer} The first rendered column
     */
    getFirstColumn : function() {
      return this.__firstColumn;
    },


    /**
     * Get the sizes of the rendered rows
     *
     * @return {Integer[]} List of row heights
     */
    getRowSizes : function() {
      return this.__rowSizes || [];
    },


    /**
     * Get the sizes of the rendered column
     *
     * @return {Integer[]} List of column widths
     */
    getColumnSizes : function() {
      return this.__columnSizes || [];
    },


    // overridden
    syncWidget : function(jobs)
    {
      // return if the layer is not yet rendered
      // it will rendered in the appear event
      if (!this.getContentElement().getDomElement()) {
        return;
      }

      if (
        this.__jobs.fullUpdate ||
        this.__jobs.updateLayerWindow && this.__jobs.updateLayerData
      )
      {
        this._fullUpdate.apply(this, this.__arguments);
      }
      else if (this.__jobs.updateLayerWindow)
      {
        this._updateLayerWindow.apply(this, this.__arguments);
      }
      else if (this.__jobs.updateLayerData  && this.__rowSizes)
      {
        this._updateLayerData();
      }

      if (this.__jobs.fullUpdate || this.__jobs.updateLayerWindow)
      {
        var args = this.__arguments;
        this.__firstRow = args[0];
        this.__firstColumn = args[1];
        this.__rowSizes = args[2];
        this.__columnSizes = args[3];
      }

      this.__jobs = {};
    },


    /**
     * Update the layer to reflect changes in the data the layer displays.
     *
     * Note: It is guaranteed that this method is only called after the layer
     * has been rendered.
     */
    _updateLayerData : function()
    {
      this._fullUpdate(
        this.__firstRow, this.__firstColumn,
        this.__rowSizes, this.__columnSizes
      );
    },


    /**
     * Do a complete update of the layer. All cached data should be discarded.
     * This method is called e.g. after changes to the grid geometry
     * (row/column sizes, row/column count, ...).
     *
     * Note: It is guaranteed that this method is only called after the layer
     * has been rendered.
     *
     * @param firstRow {Integer} Index of the first row to display
     * @param firstColumn {Integer} Index of the first column to display
     * @param rowSizes {Integer[]} Array of heights for each row to display
     * @param columnSizes {Integer[]} Array of widths for each column to display
     */
    _fullUpdate : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    ) {
      throw new Error("Abstract method '_fullUpdate' called!");
    },


    /**
     * Update the layer to display a different window of the virtual grid.
     * This method is called if the pane is scrolled, resized or cells
     * are prefetched. The implementation can assume that no other grid
     * data has been changed since the last "fullUpdate" of "updateLayerWindow"
     * call.
     *
     * Note: It is guaranteed that this method is only called after the layer
     * has been rendered.
     *
     * @param firstRow {Integer} Index of the first row to display
     * @param firstColumn {Integer} Index of the first column to display
     * @param rowSizes {Integer[]} Array of heights for each row to display
     * @param columnSizes {Integer[]} Array of widths for each column to display
     */
    _updateLayerWindow : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    )
    {
      this._fullUpdate(
        firstRow, firstColumn,
        rowSizes, columnSizes
      );
    },


    // interface implementation
    updateLayerData : function()
    {
      this.__jobs.updateLayerData = true;
      qx.ui.core.queue.Widget.add(this);
    },


    // interface implementation
    fullUpdate : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    )
    {
      this.__arguments = arguments;
      this.__jobs.fullUpdate = true;
      qx.ui.core.queue.Widget.add(this);
    },


    // interface implementation
    updateLayerWindow : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    ) {
      this.__arguments = arguments;
      this.__jobs.updateLayerWindow = true;
      qx.ui.core.queue.Widget.add(this);
    }
  },

  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this.__jobs = this.__arguments = this.__rowSizes = this.__columnSizes = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * Abstract base class for the {@link Row} and {@link Column} layers.
 */
qx.Class.define("qx.ui.virtual.layer.AbstractBackground",
{
  extend : qx.ui.virtual.layer.Abstract,


  /*
   *****************************************************************************
      CONSTRUCTOR
   *****************************************************************************
   */

   /**
    * @param colorEven {Color?null} color for even indexes
    * @param colorOdd {Color?null} color for odd indexes
    */
   construct : function(colorEven, colorOdd)
   {
     this.base(arguments);

     if (colorEven) {
       this.setColorEven(colorEven);
     }

     if (colorOdd) {
       this.setColorOdd(colorOdd);
     }

     this.__customColors = {};
     this.__decorators = {};
   },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** color for event indexes */
    colorEven :
    {
      nullable : true,
      check : "Color",
      apply : "_applyColorEven",
      themeable : true
    },

    /** color for odd indexes */
    colorOdd :
    {
      nullable : true,
      check : "Color",
      apply : "_applyColorOdd",
      themeable : true
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __colorEven : null,
    __colorOdd : null,
    __customColors : null,
    __decorators : null,


    /*
    ---------------------------------------------------------------------------
      COLOR HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the color for the given index
     *
     * @param index {Integer} Index to set the color for
     * @param color {Color|null} the color to set. A value of <code>null</code>
     *    will reset the color.
     */
    setColor : function(index, color)
    {
      if (color) {
        this.__customColors[index] = qx.theme.manager.Color.getInstance().resolve(color);
      } else {
        delete(this.__customColors[index]);
      }
    },


    /**
     * Clear all colors set using {@link #setColor}.
     */
    clearCustomColors : function()
    {
      this.__customColors = {};
      this.updateLayerData();
    },


    /**
     * Get the color at the given index
     *
     * @param index {Integer} The index to get the color for.
     * @return {Color} The color at the given index
     */
    getColor : function(index)
    {
      var customColor = this.__customColors[index];
      if (customColor) {
        return customColor;
      } else {
        return index % 2 == 0 ? this.__colorEven : this.__colorOdd;
      }
    },


    // property apply
    _applyColorEven : function(value, old)
    {
      if (value) {
        this.__colorEven = qx.theme.manager.Color.getInstance().resolve(value);
      } else {
        this.__colorEven = null;
      }
      this.updateLayerData();
    },


    // property apply
    _applyColorOdd : function(value, old)
    {
      if (value) {
        this.__colorOdd = qx.theme.manager.Color.getInstance().resolve(value);
      } else {
        this.__colorOdd = null;
      }
      this.updateLayerData();
    },


    /**
     * Sets the decorator for the given index
     *
     * @param index {Integer} Index to set the color for
     * @param decorator {qx.ui.decoration.IDecorator|null} the decorator to set. A value of
     *    <code>null</code> will reset the decorator.
     */
    setBackground : function(index, decorator)
    {
      if (decorator) {
        this.__decorators[index] = qx.theme.manager.Decoration.getInstance().resolve(decorator);
      } else {
        delete(this.__decorators[index]);
      }
      this.updateLayerData();
    },


    /**
     * Get the decorator at the given index
     *
     * @param index {Integer} The index to get the decorator for.
     * @return {qx.ui.decoration.IDecorator} The decorator at the given index
     */
    getBackground : function(index) {
      return this.__decorators[index];
    }
  },

  /*
   *****************************************************************************
      DESTRUCT
   *****************************************************************************
   */

  destruct : function() {
    this.__customColors = this.__decorators = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * The Row layer renders row background colors.
 */
qx.Class.define("qx.ui.virtual.layer.Row",
{
  extend : qx.ui.virtual.layer.AbstractBackground,


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    appearance :
    {
      refine : true,
      init : "row-layer"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _fullUpdate : function(firstRow, firstColumn, rowSizes, columnSizes)
    {
      var html = [];

      var width = qx.lang.Array.sum(columnSizes);

      var top = 0;
      var row = firstRow;
      var childIndex = 0;

      for (var y=0; y<rowSizes.length; y++)
      {
        var color = this.getColor(row);
        var backgroundColor = color ? "background-color:" + color + ";" : "";

        var decorator = this.getBackground(row);
        var styles = decorator ? qx.bom.element.Style.compile(decorator.getStyles()) : "";

        html.push(
          "<div style='",
          "position: absolute;",
          "left: 0;",
          "top:", top, "px;",
          "height:", rowSizes[y], "px;",
          "width:", width, "px;",
          backgroundColor,
          styles,
          "'>",
          "</div>"
        );
        childIndex++;

        top += rowSizes[y];
        row += 1;
      }

      var el = this.getContentElement().getDomElement();
      // hide element before changing the child nodes to avoid
      // premature reflow calculations
      el.style.display = "none";
      el.innerHTML = html.join("");

      el.style.display = "block";
      this._width = width;
    },


    // overridden
    _updateLayerWindow : function(firstRow, firstColumn, rowSizes, columnSizes)
    {
      if (
        firstRow !== this.getFirstRow() ||
        rowSizes.length !== this.getRowSizes().length ||
        this._width < qx.lang.Array.sum(columnSizes)
      ) {
        this._fullUpdate(firstRow, firstColumn, rowSizes, columnSizes);
      }
    },


    // overridden
    setColor : function(index, color)
    {
      this.base(arguments, index, color);

      if (this.__isRowRendered(index)) {
        this.updateLayerData();
      }
    },


    // overridden
    setBackground : function(index, decorator)
    {
      this.base(arguments, index, decorator);
      if (this.__isRowRendered(index)) {
        this.updateLayerData();
      }
    },


    /**
     * Whether the row with the given index is currently rendered (i.e. in the
     * layer's view port).
     *
     * @param index {Integer} The row's index
     * @return {Boolean} Whether the row is rendered
     */
    __isRowRendered : function(index)
    {
      var firstRow = this.getFirstRow();
      var lastRow = firstRow + this.getRowSizes().length - 1;
      return index >= firstRow && index <= lastRow;
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * This interface needs to implemented from all {@link qx.ui.list.List} providers.
 *
 * @internal
 */
qx.Interface.define("qx.ui.list.provider.IListProvider",
{
  members :
  {
    /**
     * Creates a layer for item and group rendering.
     *
     * @return {qx.ui.virtual.layer.Abstract} new layer.
     */
    createLayer : function() {},


    /**
     * Creates a renderer for item rendering.
     *
     * @return {var} new item renderer.
     */
    createItemRenderer : function() {},


    /**
     * Creates a renderer for group rendering.
     *
     * @return {var} new group renderer.
     */
    createGroupRenderer : function() {},


    /**
     * Styles a selected item.
     *
     * @param row {Integer} row to style.
     */
    styleSelectabled : function(row) {},


    /**
     * Styles a not selected item.
     *
     * @param row {Integer} row to style.
     */
    styleUnselectabled : function(row) {},


    /**
     * Returns if the passed row can be selected or not.
     *
     * @param row {Integer} row to select.
     * @return {Boolean} <code>true</code> when the row can be selected,
     *    <code>false</code> otherwise.
     */
    isSelectable : function(row) {},


    /**
     * The path to the property which holds the information that should be
     * shown as a label. This is only needed if objects are stored in the model.
     *
     * @param path {String} path to the property.
     */
    setLabelPath : function(path) {},


    /**
     * The path to the property which holds the information that should be
     * shown as an icon. This is only needed if objects are stored in the model
     * and if the icon should be shown.
     *
     * @param path {String} path to the property.
     */
    setIconPath : function(path) {},


    /**
     * A map containing the options for the label binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     *
     * @param options {Map} options for the label binding.
     */
    setLabelOptions : function(options) {},


    /**
     * A map containing the options for the icon binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     *
     * @param options {Map} options for the icon binding.
     */
    setIconOptions : function(options) {},


    /**
     * Delegation object, which can have one or more functions defined by the
     * {@link qx.ui.list.core.IListDelegate} interface.
     *
     * @param delegate {Object} delegation object.
     */
    setDelegate : function(delegate) {},


    /**
     * Remove all bindings from all bounded items.
     */
    removeBindings : function() {}
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * A widget cell provider provides the {@link qx.ui.virtual.layer.WidgetCell}
 * with configured widgets to render the cells and pools/releases unused
 * cell widgets.
 */
qx.Interface.define("qx.ui.virtual.core.IWidgetCellProvider",
{
  members :
  {
    /**
     * This method returns the configured cell for the given cell. The return
     * value may be <code>null</code> to indicate that the cell should be empty.
     *
     * @param row {Integer} The cell's row index.
     * @param column {Integer} The cell's column index.
     * @return {qx.ui.core.LayoutItem} The configured widget for the given cell.
     */
    getCellWidget : function(row, column) {},

    /**
     * Release the given cell widget. Either pool or destroy the widget.
     *
     * @param widget {qx.ui.core.LayoutItem} The cell widget to pool.
     */
    poolCellWidget : function(widget) {}
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * The mixin controls the binding between model and item.
 *
 * @internal
 */
qx.Mixin.define("qx.ui.list.core.MWidgetController",
{
  construct : function() {
    this.__boundItems = [];
  },


  properties :
  {
    /**
     * The path to the property which holds the information that should be
     * shown as a label. This is only needed if objects are stored in the model.
     */
    labelPath :
    {
      check: "String",
      nullable: true
    },


    /**
     * The path to the property which holds the information that should be
     * shown as an icon. This is only needed if objects are stored in the model
     * and if the icon should be shown.
     */
    iconPath :
    {
      check: "String",
      nullable: true
    },


    /**
     * The path to the property which holds the information that should be
     * displayed as a group label. This is only needed if objects are stored in the
     * model.
     */
    groupLabelPath :
    {
      check: "String",
      nullable: true
    },


    /**
     * A map containing the options for the label binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    labelOptions :
    {
      nullable: true
    },


    /**
     * A map containing the options for the icon binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    iconOptions :
    {
      nullable: true
    },


    /**
     * A map containing the options for the group label binding. The possible keys
     * can be found in the {@link qx.data.SingleValueBinding} documentation.
     */
    groupLabelOptions :
    {
      nullable: true
    },


    /**
     * Delegation object, which can have one or more functions defined by the
     * {@link qx.ui.list.core.IListDelegate} interface.
     */
    delegate :
    {
      event: "changeDelegate",
      init: null,
      nullable: true
    }
  },


  members :
  {
    /** @type {Array} which contains the bounded items */
    __boundItems : null,


    /**
     * Helper-Method for binding the default properties from
     * the model to the target widget. The used default properties
     * depends on the passed item. When the passed item is
     * a list item the "label" and "icon" property is used.
     * When the passed item is a group item the "value" property is
     * used.
     *
     * This method should only be called in the
     * {@link IListDelegate#bindItem} function
     * implemented by the {@link #delegate} property.
     *
     * @param item {qx.ui.core.Widget} The internally created and used
     *   list or group item.
     * @param index {Integer} The index of the item.
     */
    bindDefaultProperties : function(item, index)
    {
      if(item.getUserData("cell.type") != "group")
      {
        // bind model first
        this.bindProperty(
            "", "model", null, item, index
        );

        this.bindProperty(
          this.getLabelPath(), "label", this.getLabelOptions(), item, index
        );

        if (this.getIconPath() != null) {
          this.bindProperty(
            this.getIconPath(), "icon", this.getIconOptions(), item, index
          );
        }
      }
      else
      {
        this.bindProperty(
          this.getGroupLabelPath(), "value", this.getGroupLabelOptions(), item, index
        );
      }
    },


    /**
     * Helper-Method for binding a given property from the model to the target
     * widget.
     * This method should only be called in the
     * {@link IListDelegate#bindItem} function implemented by the
     * {@link #delegate} property.
     *
     * @param sourcePath {String | null} The path to the property in the model.
     *   If you use an empty string, the whole model item will be bound.
     * @param targetProperty {String} The name of the property in the target widget.
     * @param options {Map | null} The options to use for the binding.
     * @param targetWidget {qx.ui.core.Widget} The target widget.
     * @param index {Integer} The index of the current binding.
     */
    bindProperty : function(sourcePath, targetProperty, options, targetWidget, index)
    {
      var type = targetWidget.getUserData("cell.type")
      var bindPath = this.__getBindPath(index, sourcePath, type);

      if (options) {
        options.ignoreConverter = "model";
      }

      var id = this._list.bind(bindPath, targetWidget, targetProperty, options);
      this.__addBinding(targetWidget, id);
    },


    /**
     * Helper-Method for binding a given property from the target widget to
     * the model.
     * This method should only be called in the
     * {@link IListDelegate#bindItem} function implemented by the
     * {@link #delegate} property.
     *
     * @param targetPath {String | null} The path to the property in the model.
     * @param sourceProperty {String} The name of the property in the target.
     * @param options {Map | null} The options to use for the binding.
     * @param sourceWidget {qx.ui.core.Widget} The source widget.
     * @param index {Integer} The index of the current binding.
     */
    bindPropertyReverse : function(targetPath, sourceProperty, options, sourceWidget, index)
    {
      var type = sourceWidget.getUserData("cell.type")
      var bindPath = this.__getBindPath(index, targetPath, type);

      var id = sourceWidget.bind(sourceProperty, this._list, bindPath, options);
      this.__addBinding(sourceWidget, id);
    },


    /**
     * Remove all bindings from all bounded items.
     */
    removeBindings : function()
    {
      while(this.__boundItems.length > 0) {
        var item = this.__boundItems.pop();
        this._removeBindingsFrom(item);
      }
    },


    /**
     * Configure the passed item if a delegate is set and the needed
     * function {@link IListDelegate#configureItem} is available.
     *
     * @param item {qx.ui.core.Widget} item to configure.
     */
    _configureItem : function(item)
    {
      var delegate = this.getDelegate();

      if (delegate != null && delegate.configureItem != null) {
        delegate.configureItem(item);
      }
    },


    /**
     * Configure the passed item if a delegate is set and the needed
     * function {@link IListDelegate#configureGroupItem} is available.
     *
     * @param item {qx.ui.core.Widget} item to configure.
     */
    _configureGroupItem : function(item)
    {
      var delegate = this.getDelegate();

      if (delegate != null && delegate.configureGroupItem != null) {
        delegate.configureGroupItem(item);
      }
    },


    /**
     * Sets up the binding for the given item and index.
     *
     * @param item {qx.ui.core.Widget} The internally created and used item.
     * @param index {Integer} The index of the item.
     */
    _bindItem : function(item, index) {
      var delegate = this.getDelegate();

      if (delegate != null && delegate.bindItem != null) {
        delegate.bindItem(this, item, index);
      } else {
        this.bindDefaultProperties(item, index);
      }
    },


    /**
     * Sets up the binding for the given group item and index.
     *
     * @param item {qx.ui.core.Widget} The internally created and used item.
     * @param index {Integer} The index of the item.
     */
    _bindGroupItem : function(item, index) {
      var delegate = this.getDelegate();

      if (delegate != null && delegate.bindGroupItem != null) {
        delegate.bindGroupItem(this, item, index);
      } else {
        this.bindDefaultProperties(item, index);
      }
    },


    /**
     * Removes the binding of the given item.
     *
     * @param item {qx.ui.core.Widget} The item which the binding should
     *   be removed.
     */
    _removeBindingsFrom : function(item) {
      var bindings = this.__getBindings(item);

      while (bindings.length > 0) {
        var id = bindings.pop();

        try {
          this._list.removeBinding(id);
        } catch(e) {
          item.removeBinding(id);
        }
      }

      if (qx.lang.Array.contains(this.__boundItems, item)) {
        qx.lang.Array.remove(this.__boundItems, item);
      }
    },


    /**
     * Helper method to create the path for binding.
     *
     * @param index {Integer} The index of the item.
     * @param path {String|null} The path to the property.
     * @param type {String} The type <code>["item", "group"]</code>.
     * @return {String} The binding path
     */
    __getBindPath : function(index, path, type)
    {
      var bindPath = "model[" + index + "]";
      if (type == "group") {
        bindPath = "groups[" + index + "]";
      }

      if (path != null && path != "") {
        bindPath += "." + path;
      }

      return bindPath;
    },


    /**
     * Helper method to save the binding for the widget.
     *
     * @param widget {qx.ui.core.Widget} widget to save binding.
     * @param id {var} the id from the binding.
     */
    __addBinding : function(widget, id)
    {
      var bindings = this.__getBindings(widget);

      if (!qx.lang.Array.contains(bindings, id)) {
        bindings.push(id);
      }

      if (!qx.lang.Array.contains(this.__boundItems, widget)) {
        this.__boundItems.push(widget);
      }
    },


    /**
     * Helper method which returns all bound id from the widget.
     *
     * @param widget {qx.ui.core.Widget} widget to get all binding.
     * @return {Array} all bound id's.
     */
    __getBindings : function(widget)
    {
      var bindings = widget.getUserData("BindingIds");

      if (bindings == null) {
        bindings = [];
        widget.setUserData("BindingIds", bindings);
      }

      return bindings;
    }
  },


  destruct : function() {
    this.__boundItems = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * The provider implements the {@link qx.ui.virtual.core.IWidgetCellProvider} API,
 * which can be used as delegate for the widget cell rendering and it
 * provides a API to bind the model with the rendered item.
 *
 * @internal
 */
qx.Class.define("qx.ui.list.provider.WidgetProvider",
{
  extend : qx.core.Object,

  implement : [
   qx.ui.virtual.core.IWidgetCellProvider,
   qx.ui.list.provider.IListProvider
  ],

  include : [qx.ui.list.core.MWidgetController],


  /**
   * Creates the <code>WidgetProvider</code>
   *
   * @param list {qx.ui.list.List} list to provide.
   */
  construct : function(list)
  {
    this.base(arguments);

    this._list = list;

    this._itemRenderer = this.createItemRenderer();
    this._groupRenderer = this.createGroupRenderer();

    this._itemRenderer.addListener("created", this._onItemCreated, this);
    this._groupRenderer.addListener("created", this._onGroupItemCreated, this);
    this._list.addListener("changeDelegate", this._onChangeDelegate, this);
  },


  members :
  {
    /** @type {qx.ui.virtual.cell.WidgetCell} the used item renderer */
    _itemRenderer : null,


    /** @type {qx.ui.virtual.cell.WidgetCell} the used group renderer */
    _groupRenderer : null,


    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */


    // interface implementation
    getCellWidget : function(row, column)
    {
      var widget = null;

      if (!this._list._isGroup(row))
      {
        widget = this._itemRenderer.getCellWidget();
        widget.setUserData("cell.type", "item");
        this._bindItem(widget, this._list._lookup(row));

        if(this._list._manager.isItemSelected(row)) {
          this._styleSelectabled(widget);
        } else {
          this._styleUnselectabled(widget);
        }
      }
      else
      {
        widget = this._groupRenderer.getCellWidget();
        widget.setUserData("cell.type", "group");
        this._bindGroupItem(widget, this._list._lookupGroup(row));
      }

      return widget;
    },


    // interface implementation
    poolCellWidget : function(widget) {
      this._removeBindingsFrom(widget);

      if (widget.getUserData("cell.type") == "item") {
        this._itemRenderer.pool(widget);
      } else if (widget.getUserData("cell.type") == "group") {
        this._groupRenderer.pool(widget);
      }
      this._onPool(widget);
    },


    // interface implementation
    createLayer : function() {
      return new qx.ui.virtual.layer.WidgetCell(this);
    },


    // interface implementation
    createItemRenderer : function()
    {
      var createWidget = qx.util.Delegate.getMethod(this.getDelegate(), "createItem");

      if (createWidget == null) {
        createWidget = function() {
          return new qx.ui.form.ListItem();
        }
      }

      var renderer = new qx.ui.virtual.cell.WidgetCell();
      renderer.setDelegate({
        createWidget : createWidget
      });

      return renderer;
    },


    // interface implementation
    createGroupRenderer : function() {
      var createWidget = qx.util.Delegate.getMethod(this.getDelegate(), "createGroupItem");

      if (createWidget == null)
      {
        createWidget = function()
        {
          var group = new qx.ui.basic.Label();
          group.setAppearance("group-item");

          return group;
        }
      }

      var renderer = new qx.ui.virtual.cell.WidgetCell();
      renderer.setDelegate({
        createWidget : createWidget
      });

      return renderer;
    },


    // interface implementation
    styleSelectabled : function(row)
    {
      var widget = this.__getWidgetFrom(row);
      this._styleSelectabled(widget);
    },


    // interface implementation
    styleUnselectabled : function(row)
    {
      var widget = this.__getWidgetFrom(row);
      this._styleUnselectabled(widget);
    },


    // interface implementation
    isSelectable : function(row)
    {
      if (this._list._isGroup(row)) {
        return false;
      }

      var widget = this._list._layer.getRenderedCellWidget(row, 0);

      if (widget != null) {
        return widget.isEnabled();
      } else {
        return true;
      }
    },


    /*
    ---------------------------------------------------------------------------
      INTERNAL API
    ---------------------------------------------------------------------------
    */


    /**
     * Styles a selected item.
     *
     * @param widget {qx.ui.core.Widget} widget to style.
     */
    _styleSelectabled : function(widget) {
      this.__updateStates(widget, {selected: 1});
    },


    /**
     * Styles a not selected item.
     *
     * @param widget {qx.ui.core.Widget} widget to style.
     */
    _styleUnselectabled : function(widget) {
      this.__updateStates(widget, {});
    },


    /**
     * Calls the delegate <code>onPool</code> method when it is used in the
     * {@link #delegate} property.
     *
     * @param item {qx.ui.core.Widget} Item to modify.
     */
    _onPool : function(item)
    {
      var onPool = qx.util.Delegate.getMethod(this.getDelegate(), "onPool");

      if (onPool != null) {
        onPool(item);
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLERS
    ---------------------------------------------------------------------------
    */


    /**
     * Event handler for the created item widget event.
     *
     * @param event {qx.event.type.Data} fired event.
     */
    _onItemCreated : function(event)
    {
      var widget = event.getData();
      this._configureItem(widget);
    },


    /**
     * Event handler for the created item widget event.
     *
     * @param event {qx.event.type.Data} fired event.
     */
    _onGroupItemCreated : function(event)
    {
      var widget = event.getData();
      this._configureGroupItem(widget);
    },


    /**
     * Event handler for the change delegate event.
     *
     * @param event {qx.event.type.Data} fired event.
     */
    _onChangeDelegate : function(event)
    {
      this._itemRenderer.dispose();
      this._itemRenderer = this.createItemRenderer();
      this._itemRenderer.addListener("created", this._onItemCreated, this);
      this._groupRenderer.dispose();
      this._groupRenderer = this.createGroupRenderer();
      this._groupRenderer.addListener("created", this._onGroupItemCreated, this);
      this.removeBindings();
      this._list.getPane().fullUpdate();
    },


    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */


    /**
     * Helper method to get the widget from the passed row.
     *
     * @param row {Integer} row to search.
     * @return {qx.ui.core.Widget|null} The found widget or <code>null</code> when no widget found.
     */
    __getWidgetFrom : function(row) {
      return this._list._layer.getRenderedCellWidget(row, 0);
    },


    /**
     * Helper method to update the states from a widget.
     *
     * @param widget {qx.ui.core.Widget} widget to set states.
     * @param states {Map} the state to set.
     */
    __updateStates : function(widget, states)
    {
      if(widget == null) {
        return;
      }

      this._itemRenderer.updateStates(widget, states);
    }
  },


  destruct : function()
  {
    this._itemRenderer.dispose();
    this._groupRenderer.dispose();
    this._itemRenderer = this._groupRenderer = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */


/**
 * EXPERIMENTAL!
 *
 * The WidgetCell layer renders each cell with a qooxdoo widget. The concrete
 * widget instance for each cell is provided by a cell provider.
 */
qx.Class.define("qx.ui.virtual.layer.WidgetCell",
{
  extend : qx.ui.virtual.layer.Abstract,

  include : [
    qx.ui.core.MChildrenHandling
  ],


  /**
   * @param widgetCellProvider {qx.ui.virtual.core.IWidgetCellProvider} This
   *    class manages the life cycle of the cell widgets.
   */
  construct : function(widgetCellProvider)
  {
    this.base(arguments);
    this.setZIndex(12);

    if (qx.core.Environment.get("qx.debug")) {
      this.assertInterface(
        widgetCellProvider,
        qx.ui.virtual.core.IWidgetCellProvider
      );
    }

    this._cellProvider = widgetCellProvider;
    this.__spacerPool = [];
  },


  /*
   *****************************************************************************
      PROPERTIES
   *****************************************************************************
   */

   properties :
   {
     // overridden
     anonymous :
     {
       refine: true,
       init: false
     }
   },

  events :
  {
    /**
     * Is fired when the {@link #_fullUpdate} or the
     * {@link #_updateLayerWindow} is finished.
     */
    updated : "qx.event.type.Event"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
     __spacerPool : null,

     /**
     * Returns the widget used to render the given cell. May return null if the
     * cell isn’t rendered currently rendered.
     *
     * @param row {Integer} The cell's row index
     * @param column {Integer} The cell's column index
     * @return {qx.ui.core.LayoutItem|null} the widget used to render the given
     *    cell or <code>null</code>
     */
     getRenderedCellWidget : function(row, column)
     {
        if (this._getChildren().length === 0) {
          return null;
        }

        var columnCount = this.getColumnSizes().length;
        var rowCount = this.getRowSizes().length;

        var firstRow = this.getFirstRow();
        var firstColumn = this.getFirstColumn();

        if (
         row < firstRow ||
         row >= firstRow + rowCount ||
         column < firstColumn ||
         column >= firstColumn + columnCount
        ) {
         return null;
        }

        var childIndex = (column - firstColumn) + (row - firstRow) * columnCount;
        var widget = this._getChildren()[childIndex];

        if (!widget || widget.getUserData("cell.empty")) {
         return null;
        } else {
         return widget;
        }
     },


    /**
     * Get the spacer widget, for empty cells
     *
     * @return {qx.ui.core.Spacer} The spacer widget.
     */
    _getSpacer : function()
    {
      var spacer = this.__spacerPool.pop();
      if (!spacer)
      {
        spacer = new qx.ui.core.Spacer();
        spacer.setUserData("cell.empty", 1);
      }
      return spacer;
    },


    /**
     * Activates one of the still not empty items.
     * @param elementToPool {qx.ui.core.Widget} The widget which gets pooled.
     */
    _activateNotEmptyChild : function(elementToPool)
    {
      // get the current active element
      var active = qx.ui.core.FocusHandler.getInstance().getActiveWidget();
      // if the element to pool is active or one of its children
      if (active == elementToPool || qx.ui.core.Widget.contains(elementToPool, active)) {
        // search for a new child to activate
        var children = this._getChildren();
        for (var i = children.length - 1; i >= 0; i--) {
          if (!children[i].getUserData("cell.empty")) {
            children[i].activate();
            break;
          }
        };
      }
    },


    // overridden
    _fullUpdate : function(firstRow, firstColumn, rowSizes, columnSizes)
    {
      var cellProvider = this._cellProvider;

      var children = this._getChildren().concat();
      for (var i=0; i<children.length; i++)
      {
        var child = children[i];
        if (child.getUserData("cell.empty")) {
          this.__spacerPool.push(child);
        } else {
          this._activateNotEmptyChild(child);
          cellProvider.poolCellWidget(child);
        }
      }


      var top = 0;
      var left = 0;

      var visibleItems = [];

      for (var y=0; y<rowSizes.length; y++)
      {
        for (var x=0; x<columnSizes.length; x++)
        {
          var row = firstRow + y;
          var column = firstColumn + x;

          var item = cellProvider.getCellWidget(row, column) || this._getSpacer();

          visibleItems.push(item);

          item.setUserBounds(left, top, columnSizes[x], rowSizes[y]);
          item.setUserData("cell.row", row);
          item.setUserData("cell.column", column);
          this._add(item);

          left += columnSizes[x];
        }
        top += rowSizes[y];
        left = 0;
      }
      children.forEach(function(child){
        if (visibleItems.indexOf(child) === -1) {
          this._remove(child);
        }
      }.bind(this));

      this.fireEvent("updated");
    },


    _updateLayerWindow : function(
      firstRow, firstColumn,
      rowSizes, columnSizes
    )
    {
      // compute overlap of old and new window
      //
      //      +---+
      //      |  ##--+
      //      |  ##  |
      //      +--##  |
      //         +---+
      //


    if (qx.core.Environment.get("qx.debug"))
    {
      this.assertPositiveInteger(firstRow);
      this.assertPositiveInteger(firstColumn);
      this.assertArray(rowSizes);
      this.assertArray(columnSizes);
    }


      var lastRow = firstRow + rowSizes.length - 1;
      var lastColumn = firstColumn + columnSizes.length - 1;

      var overlap = {
        firstRow: Math.max(firstRow, this.getFirstRow()),
        lastRow: Math.min(lastRow, this._lastRow),
        firstColumn: Math.max(firstColumn, this.getFirstColumn()),
        lastColumn: Math.min(lastColumn, this._lastColumn)
      }

      this._lastColumn = lastColumn;
      this._lastRow = lastRow;

      if (
        overlap.firstRow > overlap.lastRow ||
        overlap.firstColumn > overlap.lastColumn
      ) {
        return this._fullUpdate(
          firstRow, firstColumn,
          rowSizes, columnSizes
        );
      }

      // collect the widgets to move
      var children = this._getChildren();
      var lineLength = this.getColumnSizes().length;
      var widgetsToMove = [];
      var widgetsToMoveIndexes = {};
      for (var row=firstRow; row<=lastRow; row++)
      {
        widgetsToMove[row] = [];
        for (var column=firstColumn; column<=lastColumn; column++)
        {
          if (
            row >= overlap.firstRow &&
            row <= overlap.lastRow &&
            column >= overlap.firstColumn &&
            column <= overlap.lastColumn
          )
          {
            var x = column - this.getFirstColumn();
            var y = row - this.getFirstRow();
            var index = y*lineLength + x;
            widgetsToMove[row][column] = children[index];
            widgetsToMoveIndexes[index] = true;
          }
        }
      }

      var cellProvider = this._cellProvider;

      // pool widgets
      var children = this._getChildren().concat();
      for (var i=0; i<children.length; i++)
      {
        if (!widgetsToMoveIndexes[i])
        {
          var child = children[i];
          if (child.getUserData("cell.empty")) {
            this.__spacerPool.push(child);
          } else {
            this._activateNotEmptyChild(child);
            cellProvider.poolCellWidget(child);
          }
        }
      }


      var top = 0;
      var left = 0;
      var visibleItems = [];

      for (var y=0; y<rowSizes.length; y++)
      {
        for (var x=0; x<columnSizes.length; x++)
        {
          var row = firstRow + y;
          var column = firstColumn + x;

          var item =
            widgetsToMove[row][column] ||
            cellProvider.getCellWidget(row, column) ||
            this._getSpacer();

          visibleItems.push(item);

          item.setUserBounds(left, top, columnSizes[x], rowSizes[y]);
          item.setUserData("cell.row", row);
          item.setUserData("cell.column", column);
          this._add(item);

          left += columnSizes[x];
        }
        top += rowSizes[y];
        left = 0;
      }
      children.forEach(function(child){
        if (visibleItems.indexOf(child) === -1) {
          this._remove(child);
        }
      }.bind(this));

      this.fireEvent("updated");
    }
  },

  destruct : function()
  {
    var children = this._getChildren();
    for (var i=0; i<children.length; i++) {
      children[i].dispose();
    }

    this._cellProvider = this.__spacerPool = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Methods to work with the delegate pattern.
 */
qx.Class.define("qx.util.Delegate",
{
  statics :
  {
    /**
     * Returns the delegate method given my its name.
     *
     * @param delegate {Object} The delegate object to check the method.
     * @param specificMethod {String} The name of the delegate method.
     * @return {Function|null} The requested method or null, if no method is set.
     */
    getMethod : function(delegate, specificMethod)
    {
      if (qx.util.Delegate.containsMethod(delegate, specificMethod)) {
        return qx.lang.Function.bind(delegate[specificMethod], delegate);
      }

      return null;
    },



    /**
     * Checks, if the given delegate is valid or if a specific method is given.
     *
     * @param delegate {Object} The delegate object.
     * @param specificMethod {String} The name of the method to search for.
     * @return {Boolean} True, if everything was ok.
     */
    containsMethod : function (delegate, specificMethod)
    {
      var Type = qx.lang.Type;

      if (Type.isObject(delegate)) {
        return Type.isFunction(delegate[specificMethod]);
      }

      return false;
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * A widget cell renderer manages a pool of widgets to render cells in a
 * {@link qx.ui.virtual.layer.WidgetCell} layer.
 */
qx.Interface.define("qx.ui.virtual.cell.IWidgetCell",
{
  members :
  {
    /**
     * Get a widget instance to render the cell
     *
     * @param data {var} Data needed for the cell to render.
     * @param states {Map} The states set on the cell (e.g. <i>selected</i>,
     * <i>focused</i>, <i>editable</i>).
     *
     * @return {qx.ui.core.LayoutItem} The cell widget
     */
    getCellWidget : function(data, states) {},


    /**
     * Release the given widget instance.
     *
     * Either pool or dispose the widget.
     *
     * @param widget {qx.ui.core.LayoutItem} The cell widget to pool
     */
    pool : function(widget) {},


    /**
     * Update the states of the given widget.
     *
     * @param widget {qx.ui.core.LayoutItem} The cell widget to update
     * @param states {Map} The cell widget's states
     */
    updateStates : function(widget, states) {},


    /**
     * Update the data the cell widget should display
     *
     * @param widget {qx.ui.core.LayoutItem} The cell widget to update
     * @param data {var} The data to display
     */
    updateData : function(widget, data) {}
  }
});
/**
 * Abstract base class for widget based cell renderer.
 */
qx.Class.define("qx.ui.virtual.cell.AbstractWidget",
{
  extend : qx.core.Object,
  implement : [qx.ui.virtual.cell.IWidgetCell],


  construct : function()
  {
    this.base(arguments);

    this.__pool = [];
  },


  events :
  {
    /** Fired when a new <code>LayoutItem</code> is created. */
    "created" : "qx.event.type.Data"
  },


  members :
  {
    __pool : null,


    /**
     * Creates the widget instance.
     *
     * @abstract
     * @return {qx.ui.core.LayoutItem} The widget used to render a cell
     */
    _createWidget : function() {
      throw new Error("abstract method call");
    },


    // interface implementation
    updateData : function(widget, data) {
      throw new Error("abstract method call");
    },


    // interface implementation
    updateStates : function(widget, states)
    {
      var oldStates = widget.getUserData("cell.states");

      // remove old states
      if (oldStates)
      {
        var newStates = states || {};
        for (var state in oldStates)
        {
          if (!newStates[state]) {
            widget.removeState(state);
          }
        }
      }
      else
      {
        oldStates = {};
      }

      // apply new states
      if (states)
      {
        for (var state in states)
        {
          if (!oldStates.state) {
            widget.addState(state);
          }
        }
      }

      widget.setUserData("cell.states", states);
    },


    // interface implementation
    getCellWidget : function(data, states)
    {
      var widget = this.__getWidgetFromPool();
      this.updateStates(widget, states);
      this.updateData(widget, data);
      return widget;
    },


    // interface implementation
    pool : function(widget) {
      this.__pool.push(widget);
    },

    /**
     * Cleanup all <code>LayoutItem</code> and destroy them.
     */
    _cleanupPool : function() {
      var widget = this.__pool.pop();

      while(widget)
      {
        widget.destroy();
        widget = this.__pool.pop();
      }
    },

    /**
     * Returns a <code>LayoutItem</code> from the pool, when the pool is empty
     * a new <code>LayoutItem</code> is created.
     *
     * @return {qx.ui.core.LayoutItem} The cell widget
     */
    __getWidgetFromPool : function()
    {
      var widget = this.__pool.shift();

      if (widget == null)
      {
        widget = this._createWidget();
        this.fireDataEvent("created", widget);
      }

      return widget;
    }
  },

  /*
   *****************************************************************************
      DESTRUCT
   *****************************************************************************
   */

  destruct : function()
  {
    this._cleanupPool();
    this.__pool = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2010 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * EXPERIMENTAL!
 *
 * Cell renderer can be used for Widget rendering. The Widget creation can be configured with the
 * {@link #delegate} property:
 *
 * <pre class="javascript">
 * widgetCell.setDelegate(
 * {
 *   createWidget : function() {
 *     return new qx.ui.form.ListItem();
 *   }
 * });
 * </pre>
 *
 * When the {@link #delegate} property is not used {@link qx.ui.core.Widget} instances are created as
 * fallback.
 *
 * The {@link #updateData} method can be used to update any Widget property. Just use a <code>Map</code>
 * with property name as key:
 *
 * <pre class="javascript">
 * // widget is a qx.ui.form.ListItem instance
 * widgetCell.updateData(widget,
 * {
 *   label: "my label value",
 *   icon: "qx/icon/22/emotes/face-angel.png"
 * });
 * </pre>
 */
qx.Class.define("qx.ui.virtual.cell.WidgetCell",
{
  extend : qx.ui.virtual.cell.AbstractWidget,

  properties :
  {
    /**
     * Delegation object, which can have one or more functions defined by the
     * {@link qx.ui.virtual.cell.IWidgetCellDelegate} interface.
     */
    delegate :
    {
      apply: "_applyDelegate",
      init: null,
      nullable: true
    }
  },

  members :
  {
    // apply method
    _applyDelegate : function(value, old) {
      this._cleanupPool();
    },

    // overridden
    _createWidget : function() {
      var delegate = this.getDelegate();

      if (delegate != null && delegate.createWidget != null) {
        return delegate.createWidget();
      } else {
        return new qx.ui.core.Widget();
      }
    },

    // overridden
    updateData : function(widget, data) {
      for (var key in data)
      {
        if (qx.Class.hasProperty(widget.constructor, key)) {
          qx.util.PropertyUtil.setUserValue(widget, key, data[key]);
        } else {
          throw new Error("Can't update data! The key '" + key + "' is not a Property!")
        }
      }
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)

************************************************************************ */

/**
 * A item for a list. Could be added to all List like widgets but also
 * to the {@link qx.ui.form.SelectBox} and {@link qx.ui.form.ComboBox}.
 */
qx.Class.define("qx.ui.form.ListItem",
{
  extend : qx.ui.basic.Atom,
  implement : [qx.ui.form.IModel],
  include : [qx.ui.form.MModelProperty],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} Label to use
   * @param icon {String?null} Icon to use
   * @param model {String?null} The items value
   */
  construct : function(label, icon, model)
  {
    this.base(arguments, label, icon);

    if (model != null) {
      this.setModel(model);
    }

    this.addListener("pointerover", this._onPointerOver, this);
    this.addListener("pointerout", this._onPointerOut, this);
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events:
  {
    /** (Fired by {@link qx.ui.form.List}) */
    "action" : "qx.event.type.Event"
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    appearance :
    {
      refine : true,
      init : "listitem"
    }
  },


  members :
  {
    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      focused : true,
      hovered : true,
      selected : true,
      dragover : true
    },


    /**
     * Event handler for the pointer over event.
     */
    _onPointerOver : function() {
      this.addState("hovered");
    },


    /**
     * Event handler for the pointer out event.
     */
    _onPointerOut : function() {
      this.removeState("hovered");
    }
  },

  destruct : function() {
    this.removeListener("pointerover", this._onPointerOver, this);
    this.removeListener("pointerout", this._onPointerOut, this);
  }
});

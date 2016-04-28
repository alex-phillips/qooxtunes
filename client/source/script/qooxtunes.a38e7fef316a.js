/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2014 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Mixin holding the handler for roll event. Please
 * keep in mind that the including widget has to have the scroll bars
 * implemented as child controls named <code>scrollbar-x</code> and
 * <code>scrollbar-y</code> to get the handler working. Also, you have to
 * attach the listener yourself.
 */
qx.Mixin.define("qx.ui.core.scroll.MRoll",
{
  members :
  {
    __cancelRoll : null,


    /**
     * Responsible for adding the event listener needed for scroll handling.
     */
    _addRollHandling : function() {
      this.addListener("roll", this._onRoll, this);
      this.addListener("pointerdown", this._onPointerDownForRoll, this);
    },


    /**
     * Responsible for removing the event listener needed for scroll handling.
     */
    _removeRollHandling : function() {
      this.removeListener("roll", this._onRoll, this);
      this.removeListener("pointerdown", this._onPointerDownForRoll, this);
    },


    /**
     * Handler for the pointerdown event which simply stops the momentum scrolling.
     *
     * @param e {qx.event.type.Pointer} pointerdown event
     */
    _onPointerDownForRoll : function(e) {
      this.__cancelRoll = e.getPointerId();
    },


    /**
     * Roll event handler
     *
     * @param e {qx.event.type.Roll} Roll event
     */
    _onRoll : function(e)
    {
      // only wheel and touch
      if (e.getPointerType() == "mouse") {
        return;
      }

      if (this.__cancelRoll && e.getMomentum()) {
        qx.event.Registration.getManager(e.getOriginalTarget())
          .getHandler(qx.event.handler.Gesture)
          .gestureCancel(this.__cancelRoll);

        e.stopMomentum();
        this.__cancelRoll = null;
        return;
      }
      this.__cancelRoll = null;

      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      var scrollbarY = showY ? this.getChildControl("scrollbar-y", true) : null;
      var scrollbarX = showX ? this.getChildControl("scrollbar-x", true) : null;

      var deltaY = e.getDelta().y;
      var deltaX = e.getDelta().x;

      var endY = !showY;
      var endX = !showX;

      // y case
      if (scrollbarY) {
        if (deltaY !== 0) {
          scrollbarY.scrollBy(parseInt(deltaY, 10));
        }

        var position = scrollbarY.getPosition();
        var max = scrollbarY.getMaximum();

        // pass the event to the parent if the scrollbar is at an edge
        if (deltaY < 0 && position <= 0 || deltaY > 0 && position >= max) {
          endY = true;
        }
      }

      // x case
      if (scrollbarX) {
        if (deltaX !== 0) {
          scrollbarX.scrollBy(parseInt(deltaX, 10));
        }

        var position = scrollbarX.getPosition();
        var max = scrollbarX.getMaximum();
        // pass the event to the parent if the scrollbar is at an edge
        if (deltaX < 0 && position <= 0 || deltaX > 0 && position >= max) {
          endX = true;
        }
      }

      if (endX && endY) {
        e.stopMomentum();
      }

      // pass the event to the parent if both scrollbars are at the end
      if ((!endY && deltaX === 0) ||
          (!endX && deltaY === 0) ||
          ((!endX || !endY ) && deltaX !== 0 && deltaY !== 0)) {
        // Stop bubbling and native event only if a scrollbar is visible
        e.stop();
      }
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2013 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Richard Sternagel (rsternagel)

************************************************************************ */

/**
 * Provides scrolling ability during drag session to the widget.
 */
qx.Mixin.define("qx.ui.core.MDragDropScrolling",
{
  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    var widget = this;

    if (this instanceof qx.ui.core.DragDropScrolling) {
      widget = this._getWidget();
    }

    widget.addListener("drag", this.__onDrag, this);
    widget.addListener("dragend", this.__onDragend, this);

    this.__xDirs = ["left", "right"];
    this.__yDirs = ["top", "bottom"];
  },

  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The threshold for the x-axis (in pixel) to activate scrolling at the edges. */
    dragScrollThresholdX :
    {
      check : "Integer",
      init : 30
    },

    /** The threshold for the y-axis (in pixel) to activate scrolling at the edges. */
    dragScrollThresholdY :
    {
      check : "Integer",
      init : 30
    },

    /** The factor for slowing down the scrolling. */
    dragScrollSlowDownFactor :
    {
      check : "Float",
      init : 0.1
    }
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __dragScrollTimer : null,
    __xDirs : null,
    __yDirs : null,

    /**
     * Finds the first scrollable parent (in the parent chain).
     *
     * @param widget {qx.ui.core.LayoutItem} The widget to start from.
     * @return {qx.ui.core.Widget} A scrollable widget.
     */
    _findScrollableParent : function(widget)
    {
      var cur = widget;
      if (cur === null) {
        return null;
      }

      while (cur.getLayoutParent()) {
        cur = cur.getLayoutParent();
        if (this._isScrollable(cur)) {
          return cur;
        }
      }
      return null;
    },

    /**
     * Whether the widget is scrollable.
     *
     * @param widget {qx.ui.core.Widget} The widget to check.
     * @return {Boolean} Whether the widget is scrollable.
     */
    _isScrollable : function(widget)
    {
      return qx.Class.hasMixin(widget.constructor, qx.ui.core.scroll.MScrollBarFactory);
    },

    /**
     * Gets the bounds of the given scrollable.
     *
     * @param scrollable {qx.ui.core.Widget} Scrollable which has scrollbar child controls.
     * @return {Map} A map with all four bounds (e.g. {"left":0, "top":20, "right":0, "bottom":80}).
     */
    _getBounds : function(scrollable)
    {
      var bounds = scrollable.getContentLocation();

      // the scrollable may dictate a nested widget for more precise bounds
      if (scrollable.getScrollAreaContainer) {
        bounds = scrollable.getScrollAreaContainer().getContentLocation();
      }

      return bounds;
    },

    /**
     * Gets the edge type or null if the pointer isn't within one of the thresholds.
     *
     * @param diff {Map} Difference map with all for edgeTypes.
     * @param thresholdX {Number} x-axis threshold.
     * @param thresholdY {Number} y-axis threshold.
     * @return {String} One of the four edgeTypes ('left', 'right', 'top', 'bottom').
     */
    _getEdgeType : function(diff, thresholdX, thresholdY)
    {
      if ((diff.left * -1) <= thresholdX && diff.left < 0) {
        return "left";
      } else if ((diff.top * -1) <= thresholdY && diff.top < 0) {
        return "top";
      } else if (diff.right <= thresholdX && diff.right > 0) {
        return "right";
      } else if (diff.bottom <= thresholdY && diff.bottom > 0) {
        return "bottom";
      } else {
        return null;
      }
    },

    /**
     * Gets the axis ('x' or 'y') by the edge type.
     *
     * @param edgeType {String} One of the four edgeTypes ('left', 'right', 'top', 'bottom').
     * @throws {Error} If edgeType is not one of the distinct four ones.
     * @return {String} Returns 'y' or 'x'.
     */
    _getAxis : function(edgeType)
    {
      if (this.__xDirs.indexOf(edgeType) !== -1) {
        return "x";
      } else if (this.__yDirs.indexOf(edgeType) !== -1) {
        return "y";
      } else {
        throw new Error("Invalid edge type given ("+edgeType+"). Must be: 'left', 'right', 'top' or 'bottom'");
      }
    },

    /**
     * Gets the threshold amount by edge type.
     *
     * @param edgeType {String} One of the four edgeTypes ('left', 'right', 'top', 'bottom').
     * @return {Number} The threshold of the x or y axis.
     */
    _getThresholdByEdgeType : function(edgeType) {
      if (this.__xDirs.indexOf(edgeType) !== -1) {
        return this.getDragScrollThresholdX();
      } else if(this.__yDirs.indexOf(edgeType) !== -1) {
        return this.getDragScrollThresholdY();
      }
    },

    /**
     * Whether the scrollbar is visible.
     *
     * @param scrollable {qx.ui.core.Widget} Scrollable which has scrollbar child controls.
     * @param axis {String} Can be 'y' or 'x'.
     * @return {Boolean} Whether the scrollbar is visible.
     */
    _isScrollbarVisible : function(scrollable, axis)
    {
      if (scrollable && scrollable._isChildControlVisible) {
        return scrollable._isChildControlVisible("scrollbar-"+axis);
      } else {
        return false;
      }
    },

    /**
     * Whether the scrollbar is exceeding it's maximum position.
     *
     * @param scrollbar {qx.ui.core.scroll.IScrollBar} Scrollbar to check.
     * @param axis {String} Can be 'y' or 'x'.
     * @param amount {Number} Amount to scroll which may be negative.
     * @return {Boolean} Whether the amount will exceed the scrollbar max position.
     */
    _isScrollbarExceedingMaxPos : function(scrollbar, axis, amount)
    {
      var newPos = 0;
      if (!scrollbar) {
        return true;
      }
      newPos = scrollbar.getPosition() + amount;
      return (newPos > scrollbar.getMaximum() || newPos < 0);
    },

    /**
     * Calculates the threshold exceedance (which may be negative).
     *
     * @param diff {Number} Difference value of one edgeType.
     * @param threshold {Number} x-axis or y-axis threshold.
     * @return {Number} Threshold exceedance amount (positive or negative).
     */
    _calculateThresholdExceedance : function(diff, threshold)
    {
      var amount = threshold - Math.abs(diff);
      return diff < 0 ? (amount * -1) : amount;
    },

    /**
     * Calculates the scroll amount (which may be negative).
     * The amount is influenced by the scrollbar size (bigger = faster)
     * the exceedanceAmount (bigger = faster) and the slowDownFactor.
     *
     * @param scrollbarSize {Number} Size of the scrollbar.
     * @param exceedanceAmount {Number} Threshold exceedance amount (positive or negative).
     * @return {Number} Scroll amount (positive or negative).
     */
    _calculateScrollAmount : function(scrollbarSize, exceedanceAmount)
    {
      return Math.floor(((scrollbarSize / 100) * exceedanceAmount) * this.getDragScrollSlowDownFactor());
    },

    /**
     * Scrolls the given scrollable on the given axis for the given amount.
     *
     * @param scrollable {qx.ui.core.Widget} Scrollable which has scrollbar child controls.
     * @param axis {String} Can be 'y' or 'x'.
     * @param exceedanceAmount {Number} Threshold exceedance amount (positive or negative).
     */
    _scrollBy : function(scrollable, axis, exceedanceAmount) {
      var scrollbar = scrollable.getChildControl("scrollbar-"+axis, true);
      if (!scrollbar) {
        return;
      }
      var bounds = scrollbar.getBounds(),
          scrollbarSize = axis === "x" ? bounds.width : bounds.height,
          amount = this._calculateScrollAmount(scrollbarSize, exceedanceAmount);

      if (this._isScrollbarExceedingMaxPos(scrollbar, axis, amount)) {
        this.__dragScrollTimer.stop();
      }

      scrollbar.scrollBy(amount);
    },

    /*
    ---------------------------------------------------------------------------
    EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Event handler for the drag event.
     *
     * @param e {qx.event.type.Drag} The drag event instance.
     */
    __onDrag : function(e)
    {
      if (this.__dragScrollTimer) {
        // stop last scroll action
        this.__dragScrollTimer.stop();
      }

      var target = e.getOriginalTarget();
      if (!target) {
        return;
      }
      var scrollable;
      if (this._isScrollable(target)) {
        scrollable = target;
      } else {
        scrollable = this._findScrollableParent(target);
      }

      while (scrollable) {
        var bounds = this._getBounds(scrollable),
            xPos = e.getDocumentLeft(),
            yPos = e.getDocumentTop(),
            diff = {
              "left": bounds.left - xPos,
              "right": bounds.right - xPos,
              "top": bounds.top - yPos,
              "bottom": bounds.bottom - yPos
            },
            edgeType = null,
            axis = "",
            exceedanceAmount = 0;

        edgeType = this._getEdgeType(diff, this.getDragScrollThresholdX(), this.getDragScrollThresholdY());
        if (!edgeType) {
          scrollable = this._findScrollableParent(scrollable);
          continue;
        }
        axis = this._getAxis(edgeType);

        if (this._isScrollbarVisible(scrollable, axis)) {
          exceedanceAmount = this._calculateThresholdExceedance(diff[edgeType], this._getThresholdByEdgeType(edgeType));

          if (this.__dragScrollTimer) {
            this.__dragScrollTimer.dispose();
          }

          this.__dragScrollTimer = new qx.event.Timer(50);
          this.__dragScrollTimer.addListener("interval",
            function(scrollable, axis, amount) {
              this._scrollBy(scrollable, axis, amount);
            }.bind(this, scrollable, axis, exceedanceAmount));
          this.__dragScrollTimer.start();
          e.stopPropagation();
          return;
        } else {
          scrollable = this._findScrollableParent(scrollable);
        }
      }
    },

    /**
     * Event handler for the dragend event.
     *
     * @param e {qx.event.type.Drag} The drag event instance.
     */
    __onDragend : function(e)
    {
      if (this.__dragScrollTimer) {
        this.__dragScrollTimer.stop();
      }
    }
  },


  destruct : function() {
    if (this.__dragScrollTimer) {
      this.__dragScrollTimer.dispose();
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2014 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Mustafa Sak (msak)

************************************************************************ */

/**
 * Provides scrolling ability during drag session to the widget.
 */
qx.Class.define("qx.ui.core.DragDropScrolling",
{
  extend : qx.core.Object,

  include : [qx.ui.core.MDragDropScrolling],


  construct : function(widget)
  {
    this.base(arguments);

    this._widget = widget;
  },

  members :
  {
    _widget : null,


    /**
     * Returns the root widget whose children will have scroll on drag session
     * behavior. Widget was set on constructor or will be application root by
     * default.
     *
     * @return {qx.ui.core.Widget} The root widget whose children will have
     * scroll on drag session
     */
    _getWidget : function()
    {
      return this._widget || qx.core.Init.getApplication().getRoot();
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

qx.core.Environment.add("qx.nativeScrollBars", false);

/**
 * Include this widget if you want to create scrollbars depending on the global
 * "qx.nativeScrollBars" setting.
 */
qx.Mixin.define("qx.ui.core.scroll.MScrollBarFactory",
{
  members :
  {
    /**
     * Creates a new scrollbar. This can either be a styled qooxdoo scrollbar
     * or a native browser scrollbar.
     *
     * @param orientation {String?"horizontal"} The initial scroll bar orientation
     * @return {qx.ui.core.scroll.IScrollBar} The scrollbar instance
     */
    _createScrollBar : function(orientation)
    {
      if (qx.core.Environment.get("qx.nativeScrollBars")) {
        return new qx.ui.core.scroll.NativeScrollBar(orientation);
      } else {
        return new qx.ui.core.scroll.ScrollBar(orientation);
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * All widget used as scrollbars must implement this interface.
 */
qx.Interface.define("qx.ui.core.scroll.IScrollBar",
{
  events :
  {
    /** Fired if the user scroll */
    "scroll" : "qx.event.type.Data",
    /** Fired as soon as the scroll animation ended. */
    "scrollAnimationEnd": 'qx.event.type.Event'
  },


  properties :
  {
    /**
     * The scroll bar orientation
     */
    orientation : {},


    /**
     * The maximum value (difference between available size and
     * content size).
     */
    maximum : {},


    /**
     * Position of the scrollbar (which means the scroll left/top of the
     * attached area's pane)
     *
     * Strictly validates according to {@link #maximum}.
     * Does not apply any correction to the incoming value. If you depend
     * on this, please use {@link #scrollTo} instead.
     */
    position : {},


    /**
     * Factor to apply to the width/height of the knob in relation
     * to the dimension of the underlying area.
     */
    knobFactor : {}
  },


  members :
  {
    /**
     * Scrolls to the given position.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param position {Integer} Scroll to this position. Must be greater zero.
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollTo : function(position, duration) {
      this.assertNumber(position);
    },


    /**
     * Scrolls by the given offset.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param offset {Integer} Scroll by this offset
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollBy : function(offset, duration) {
      this.assertNumber(offset);
    },


    /**
     * Scrolls by the given number of steps.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param steps {Integer} Number of steps
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollBySteps : function(steps, duration) {
      this.assertNumber(steps);
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The scroll bar widget wraps the native browser scroll bars as a qooxdoo widget.
 * It can be uses instead of the styled qooxdoo scroll bars.
 *
 * Scroll bars are used by the {@link qx.ui.container.Scroll} container. Usually
 * a scroll bar is not used directly.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var scrollBar = new qx.ui.core.scroll.NativeScrollBar("horizontal");
 *   scrollBar.set({
 *     maximum: 500
 *   })
 *   this.getRoot().add(scrollBar);
 * </pre>
 *
 * This example creates a horizontal scroll bar with a maximum value of 500.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/scrollbar.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.core.scroll.NativeScrollBar",
{
  extend : qx.ui.core.Widget,
  implement : qx.ui.core.scroll.IScrollBar,


  /**
   * @param orientation {String?"horizontal"} The initial scroll bar orientation
   */
  construct : function(orientation)
  {
    this.base(arguments);

    this.addState("native");

    this.getContentElement().addListener("scroll", this._onScroll, this);
    this.addListener("pointerdown", this._stopPropagation, this);
    this.addListener("pointerup", this._stopPropagation, this);
    this.addListener("pointermove", this._stopPropagation, this);
    this.addListener("appear", this._onAppear, this);

    this.getContentElement().add(this._getScrollPaneElement());
    this.getContentElement().setStyle("box-sizing", "content-box");

    // Configure orientation
    if (orientation != null) {
      this.setOrientation(orientation);
    } else {
      this.initOrientation();
    }

    // prevent drag & drop on scrolling
    this.addListener("track", function(e) {
      e.stopPropagation();
    }, this);
  },


  events : {
    /**
     * Fired as soon as the scroll animation ended.
     */
    scrollAnimationEnd: 'qx.event.type.Event'
  },


  properties :
  {
    // overridden
    appearance :
    {
      refine : true,
      init : "scrollbar"
    },


    // interface implementation
    orientation :
    {
      check : [ "horizontal", "vertical" ],
      init : "horizontal",
      apply : "_applyOrientation"
    },


    // interface implementation
    maximum :
    {
      check : "PositiveInteger",
      apply : "_applyMaximum",
      init : 100
    },


    // interface implementation
    position :
    {
      check : "Number",
      init : 0,
      apply : "_applyPosition",
      event : "scroll"
    },


    /**
     * Step size for each tap on the up/down or left/right buttons.
     */
    singleStep :
    {
      check : "Integer",
      init : 20
    },


    // interface implementation
    knobFactor :
    {
      check : "PositiveNumber",
      nullable : true
    }
  },


  members :
  {
    __isHorizontal : null,
    __scrollPaneElement : null,
    __requestId : null,

    __scrollAnimationframe : null,


    /**
     * Get the scroll pane html element.
     *
     * @return {qx.html.Element} The element
     */
    _getScrollPaneElement : function()
    {
      if (!this.__scrollPaneElement) {
        this.__scrollPaneElement = new qx.html.Element();
      }
      return this.__scrollPaneElement;
    },

    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    renderLayout : function(left, top, width, height)
    {
      var changes = this.base(arguments, left, top, width, height);

      this._updateScrollBar();
      return changes;
    },


    // overridden
    _getContentHint : function()
    {
      var scrollbarWidth = qx.bom.element.Scroll.getScrollbarWidth();
      return {
        width: this.__isHorizontal ? 100 : scrollbarWidth,
        maxWidth: this.__isHorizontal ? null : scrollbarWidth,
        minWidth: this.__isHorizontal ? null : scrollbarWidth,
        height: this.__isHorizontal ? scrollbarWidth : 100,
        maxHeight: this.__isHorizontal ? scrollbarWidth : null,
        minHeight: this.__isHorizontal ? scrollbarWidth : null
      }
    },


    // overridden
    _applyEnabled : function(value, old)
    {
      this.base(arguments, value, old);
      this._updateScrollBar();
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyMaximum : function(value) {
      this._updateScrollBar();
    },


    // property apply
    _applyPosition : function(value)
    {
      var content = this.getContentElement();

      if (this.__isHorizontal) {
        content.scrollToX(value)
      } else {
        content.scrollToY(value);
      }
    },


    // property apply
    _applyOrientation : function(value, old)
    {
      var isHorizontal = this.__isHorizontal = value === "horizontal";

      this.set({
        allowGrowX : isHorizontal,
        allowShrinkX : isHorizontal,
        allowGrowY : !isHorizontal,
        allowShrinkY : !isHorizontal
      });

      if (isHorizontal) {
        this.replaceState("vertical", "horizontal");
      } else {
        this.replaceState("horizontal", "vertical");
      }

      this.getContentElement().setStyles({
        overflowX: isHorizontal ? "scroll" : "hidden",
        overflowY: isHorizontal ? "hidden" : "scroll"
      });

      // Update layout
      qx.ui.core.queue.Layout.add(this);
    },


    /**
     * Update the scroll bar according to its current size, max value and
     * enabled state.
     */
    _updateScrollBar : function()
    {
      var isHorizontal = this.__isHorizontal;

      var bounds = this.getBounds();
      if (!bounds) {
        return;
      }

      if (this.isEnabled())
      {
        var containerSize = isHorizontal ? bounds.width : bounds.height;
        var innerSize = this.getMaximum() + containerSize;
      } else {
        innerSize = 0;
      }

      // Scrollbars don't work properly in IE/Edge if the element with overflow has
      // excatly the size of the scrollbar. Thus we move the element one pixel
      // out of the view and increase the size by one.
      if (qx.core.Environment.get("engine.name") == "mshtml" || 
        qx.core.Environment.get("browser.name") == "edge")
      {
        var bounds = this.getBounds();
        this.getContentElement().setStyles({
          left: (isHorizontal ? bounds.left : (bounds.left -1)) + "px",
          top: (isHorizontal ? (bounds.top - 1) : bounds.top) + "px",
          width: (isHorizontal ? bounds.width : bounds.width + 1) + "px",
          height: (isHorizontal ? bounds.height + 1 : bounds.height) + "px"
        });
      }

      this._getScrollPaneElement().setStyles({
        left: 0,
        top: 0,
        width: (isHorizontal ? innerSize : 1) + "px",
        height: (isHorizontal ? 1 : innerSize) + "px"
      });

      this.updatePosition(this.getPosition());
    },


    // interface implementation
    scrollTo : function(position, duration) {
      // if a user sets a new position, stop any animation
      this.stopScrollAnimation();

      if (duration) {
        var from = this.getPosition();

        this.__scrollAnimationframe = new qx.bom.AnimationFrame();

        this.__scrollAnimationframe.on("frame", function(timePassed) {
          var newPos = parseInt(timePassed/duration * (position - from) + from);
          this.updatePosition(newPos);
        }, this);

        this.__scrollAnimationframe.on("end", function() {
          this.setPosition(Math.max(0, Math.min(this.getMaximum(), position)));
          this.__scrollAnimationframe = null;
          this.fireEvent("scrollAnimationEnd");
        }, this);

        this.__scrollAnimationframe.startSequence(duration);
      } else {
        this.updatePosition(position);
      }
    },


    /**
     * Helper to set the new position taking care of min and max values.
     * @param position {Number} The new position.
     */
    updatePosition : function(position) {
      this.setPosition(Math.max(0, Math.min(this.getMaximum(), position)));
    },


    // interface implementation
    scrollBy : function(offset, duration) {
      this.scrollTo(this.getPosition() + offset, duration)
    },


    // interface implementation
    scrollBySteps : function(steps, duration)
    {
      var size = this.getSingleStep();
      this.scrollBy(steps * size, duration);
    },


    /**
     * If a scroll animation is running, it will be stopped.
     */
    stopScrollAnimation : function() {
      if (this.__scrollAnimationframe) {
        this.__scrollAnimationframe.cancelSequence();
        this.__scrollAnimationframe = null;
      }
    },


    /**
     * Scroll event handler
     *
     * @param e {qx.event.type.Event} the scroll event
     */
    _onScroll : function(e)
    {
      var container = this.getContentElement();
      var position = this.__isHorizontal ? container.getScrollX() : container.getScrollY();
      this.setPosition(position);
    },


    /**
     * Listener for appear which ensured the scroll bar is positioned right
     * on appear.
     *
     * @param e {qx.event.type.Data} Incoming event object
     */
    _onAppear : function(e) {
      this._applyPosition(this.getPosition());
    },


    /**
     * Stops propagation on the given even
     *
     * @param e {qx.event.type.Event} the event
     */
    _stopPropagation : function(e) {
      e.stopPropagation();
    }
  },


  destruct : function() {
    this._disposeObjects("__scrollPaneElement");
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The scroll bar widget, is a special slider, which is used in qooxdoo instead
 * of the native browser scroll bars.
 *
 * Scroll bars are used by the {@link qx.ui.container.Scroll} container. Usually
 * a scroll bar is not used directly.
 *
 * @childControl slider {qx.ui.core.scroll.ScrollSlider} scroll slider component
 * @childControl button-begin {qx.ui.form.RepeatButton} button to scroll to top
 * @childControl button-end {qx.ui.form.RepeatButton} button to scroll to bottom
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var scrollBar = new qx.ui.core.scroll.ScrollBar("horizontal");
 *   scrollBar.set({
 *     maximum: 500
 *   })
 *   this.getRoot().add(scrollBar);
 * </pre>
 *
 * This example creates a horizontal scroll bar with a maximum value of 500.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/scrollbar.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.core.scroll.ScrollBar",
{
  extend : qx.ui.core.Widget,
  implement : qx.ui.core.scroll.IScrollBar,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param orientation {String?"horizontal"} The initial scroll bar orientation
   */
  construct : function(orientation)
  {
    this.base(arguments);

    // Create child controls
    this._createChildControl("button-begin");
    this._createChildControl("slider").addListener("resize", this._onResizeSlider, this);
    this._createChildControl("button-end");

    // Configure orientation
    if (orientation != null) {
      this.setOrientation(orientation);
    } else {
      this.initOrientation();
    }

    // prevent drag & drop on scrolling
    this.addListener("track", function(e) {
      e.stopPropagation();
    }, this);
  },


  events : {
    /** Change event for the value. */
    "scrollAnimationEnd": "qx.event.type.Event"
  },




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
      init : "scrollbar"
    },


    /**
     * The scroll bar orientation
     */
    orientation :
    {
      check : [ "horizontal", "vertical" ],
      init : "horizontal",
      apply : "_applyOrientation"
    },


    /**
     * The maximum value (difference between available size and
     * content size).
     */
    maximum :
    {
      check : "PositiveInteger",
      apply : "_applyMaximum",
      init : 100
    },


    /**
     * Position of the scrollbar (which means the scroll left/top of the
     * attached area's pane)
     *
     * Strictly validates according to {@link #maximum}.
     * Does not apply any correction to the incoming value. If you depend
     * on this, please use {@link #scrollTo} instead.
     */
    position :
    {
      check : "qx.lang.Type.isNumber(value)&&value>=0&&value<=this.getMaximum()",
      init : 0,
      apply : "_applyPosition",
      event : "scroll"
    },


    /**
     * Step size for each tap on the up/down or left/right buttons.
     */
    singleStep :
    {
      check : "Integer",
      init : 20
    },


    /**
     * The amount to increment on each event. Typically corresponds
     * to the user pressing <code>PageUp</code> or <code>PageDown</code>.
     */
    pageStep :
    {
      check : "Integer",
      init : 10,
      apply : "_applyPageStep"
    },


    /**
     * Factor to apply to the width/height of the knob in relation
     * to the dimension of the underlying area.
     */
    knobFactor :
    {
      check : "PositiveNumber",
      apply : "_applyKnobFactor",
      nullable : true
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __offset : 2,
    __originalMinSize : 0,


    // overridden
    _computeSizeHint : function() {
      var hint = this.base(arguments);
      if (this.getOrientation() === "horizontal") {
        this.__originalMinSize = hint.minWidth;
        hint.minWidth = 0;
      } else {
        this.__originalMinSize = hint.minHeight;
        hint.minHeight = 0;
      }
      return hint;
    },


    // overridden
    renderLayout : function(left, top, width, height) {
      var changes = this.base(arguments, left, top, width, height);
      var horizontal = this.getOrientation() === "horizontal";
      if (this.__originalMinSize >= (horizontal ? width : height)) {
        this.getChildControl("button-begin").setVisibility("hidden");
        this.getChildControl("button-end").setVisibility("hidden");
      } else {
        this.getChildControl("button-begin").setVisibility("visible");
        this.getChildControl("button-end").setVisibility("visible");
      }

      return changes
    },

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "slider":
          control = new qx.ui.core.scroll.ScrollSlider();
          control.setPageStep(100);
          control.setFocusable(false);
          control.addListener("changeValue", this._onChangeSliderValue, this);
          control.addListener("slideAnimationEnd", this._onSlideAnimationEnd, this);
          this._add(control, {flex: 1});
          break;

        case "button-begin":
          // Top/Left Button
          control = new qx.ui.form.RepeatButton();
          control.setFocusable(false);
          control.addListener("execute", this._onExecuteBegin, this);
          this._add(control);
          break;

        case "button-end":
          // Bottom/Right Button
          control = new qx.ui.form.RepeatButton();
          control.setFocusable(false);
          control.addListener("execute", this._onExecuteEnd, this);
          this._add(control);
          break;
      }

      return control || this.base(arguments, id);
    },




    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyMaximum : function(value) {
      this.getChildControl("slider").setMaximum(value);
    },


    // property apply
    _applyPosition : function(value) {
      this.getChildControl("slider").setValue(value);
    },


    // property apply
    _applyKnobFactor : function(value) {
      this.getChildControl("slider").setKnobFactor(value);
    },


    // property apply
    _applyPageStep : function(value) {
      this.getChildControl("slider").setPageStep(value);
    },


    // property apply
    _applyOrientation : function(value, old)
    {
      // Dispose old layout
      var oldLayout = this._getLayout();
      if (oldLayout) {
        oldLayout.dispose();
      }

      // Reconfigure
      if (value === "horizontal")
      {
        this._setLayout(new qx.ui.layout.HBox());

        this.setAllowStretchX(true);
        this.setAllowStretchY(false);

        this.replaceState("vertical", "horizontal");

        this.getChildControl("button-begin").replaceState("up", "left");
        this.getChildControl("button-end").replaceState("down", "right");
      }
      else
      {
        this._setLayout(new qx.ui.layout.VBox());

        this.setAllowStretchX(false);
        this.setAllowStretchY(true);

        this.replaceState("horizontal", "vertical");

        this.getChildControl("button-begin").replaceState("left", "up");
        this.getChildControl("button-end").replaceState("right", "down");
      }

      // Sync slider orientation
      this.getChildControl("slider").setOrientation(value);
    },





    /*
    ---------------------------------------------------------------------------
      METHOD REDIRECTION TO SLIDER
    ---------------------------------------------------------------------------
    */

    /**
     * Scrolls to the given position.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param position {Integer} Scroll to this position. Must be greater zero.
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollTo : function(position, duration) {
      this.getChildControl("slider").slideTo(position, duration);
    },


    /**
     * Scrolls by the given offset.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param offset {Integer} Scroll by this offset
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollBy : function(offset, duration) {
      this.getChildControl("slider").slideBy(offset, duration);
    },


    /**
     * Scrolls by the given number of steps.
     *
     * This method automatically corrects the given position to respect
     * the {@link #maximum}.
     *
     * @param steps {Integer} Number of steps
     * @param duration {Number} The time in milliseconds the slide to should take.
     */
    scrollBySteps : function(steps, duration) {
      var size = this.getSingleStep();
      this.getChildControl("slider").slideBy(steps * size, duration);
    },


    /**
     * Updates the position property considering the minimum and maximum values.
     * @param position {Number} The new position.
     */
    updatePosition : function(position) {
      this.getChildControl("slider").updatePosition(position);
    },


    /**
     * If a scroll animation is running, it will be stopped.
     */
    stopScrollAnimation : function() {
      this.getChildControl("slider").stopSlideAnimation();
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENER
    ---------------------------------------------------------------------------
    */

    /**
     * Executed when the up/left button is executed (pressed)
     *
     * @param e {qx.event.type.Event} Execute event of the button
     */
    _onExecuteBegin : function(e) {
      this.scrollBy(-this.getSingleStep(), 50);
    },


    /**
     * Executed when the down/right button is executed (pressed)
     *
     * @param e {qx.event.type.Event} Execute event of the button
     */
    _onExecuteEnd : function(e) {
      this.scrollBy(this.getSingleStep(), 50);
    },


    /**
     * Change listener for slider animation end.
     */
    _onSlideAnimationEnd : function() {
      this.fireEvent("scrollAnimationEnd");
    },


    /**
     * Change listener for slider value changes.
     *
     * @param e {qx.event.type.Data} The change event object
     */
    _onChangeSliderValue : function(e) {
      this.setPosition(e.getData());
    },

    /**
     * Hide the knob of the slider if the slidebar is too small or show it
     * otherwise.
     *
     * @param e {qx.event.type.Data} event object
     */
    _onResizeSlider : function(e)
    {
      var knob = this.getChildControl("slider").getChildControl("knob");
      var knobHint = knob.getSizeHint();
      var hideKnob = false;
      var sliderSize = this.getChildControl("slider").getInnerSize();

      if (this.getOrientation() == "vertical")
      {
        if (sliderSize.height  < knobHint.minHeight + this.__offset) {
          hideKnob = true;
        }
      }
      else
      {
        if (sliderSize.width  < knobHint.minWidth + this.__offset) {
          hideKnob = true;
        }
      }

      if (hideKnob) {
        knob.exclude();
      } else {
        knob.show();
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Minimal modified version of the {@link qx.ui.form.Slider} to be
 * used by {@link qx.ui.core.scroll.ScrollBar}.
 *
 * @internal
 */
qx.Class.define("qx.ui.core.scroll.ScrollSlider",
{
  extend : qx.ui.form.Slider,

  // overridden
  construct : function(orientation)
  {
    this.base(arguments, orientation);

    // Remove roll/keypress events
    this.removeListener("keypress", this._onKeyPress);
    this.removeListener("roll", this._onRoll);
  },


  members : {

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "knob":
          control = this.base(arguments, id);
          control.addListener("dblclick", function(e) {
            e.stopPropagation();
          });
      }

      return control || this.base(arguments, id);
    },

    // overridden
    getSizeHint : function(compute) {
      // get the original size hint
      var hint = this.base(arguments);
      // set the width or height to 0 depending on the orientation.
      // this is necessary to prevent the ScrollSlider to change the size
      // hint of its parent, which can cause errors on outer flex layouts
      // [BUG #3279]
      if (this.getOrientation() === "horizontal") {
        hint.width = 0;
      } else {
        hint.height = 0;
      }
      return hint;
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
     * Martin Wittemann (martinwittemann)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The RepeatButton is a special button, which fires repeatedly {@link #execute}
 * events, while a button is pressed on the button. The initial delay
 * and the interval time can be set using the properties {@link #firstInterval}
 * and {@link #interval}. The {@link #execute} events will be fired in a shorter
 * amount of time if a button is hold, until the min {@link #minTimer}
 * is reached. The {@link #timerDecrease} property sets the amount of milliseconds
 * which will decreased after every firing.
 *
 * <pre class='javascript'>
 *   var button = new qx.ui.form.RepeatButton("Hello World");
 *
 *   button.addListener("execute", function(e) {
 *     alert("Button is executed");
 *   }, this);
 *
 *   this.getRoot.add(button);
 * </pre>
 *
 * This example creates a button with the label "Hello World" and attaches an
 * event listener to the {@link #execute} event.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/repeatbutton.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.form.RepeatButton",
{
  extend : qx.ui.form.Button,


  /**
   * @param label {String} Label to use
   * @param icon {String?null} Icon to use
   */
  construct : function(label, icon)
  {
    this.base(arguments, label, icon);

    // create the timer and add the listener
    this.__timer = new qx.event.AcceleratingTimer();
    this.__timer.addListener("interval", this._onInterval, this);
  },


  events :
  {
    /**
     * This event gets dispatched with every interval. The timer gets executed
     * as long as the user holds down a button.
     */
    "execute" : "qx.event.type.Event",

    /**
     * This event gets dispatched when the button is pressed.
     */
    "press"   : "qx.event.type.Event",

    /**
     * This event gets dispatched when the button is released.
     */
    "release" : "qx.event.type.Event"
  },


  properties :
  {
    /**
     * Interval used after the first run of the timer. Usually a smaller value
     * than the "firstInterval" property value to get a faster reaction.
     */
    interval :
    {
      check : "Integer",
      init  : 100
    },

    /**
     * Interval used for the first run of the timer. Usually a greater value
     * than the "interval" property value to a little delayed reaction at the first
     * time.
     */
    firstInterval :
    {
      check : "Integer",
      init  : 500
    },

    /** This configures the minimum value for the timer interval. */
    minTimer :
    {
      check : "Integer",
      init  : 20
    },

    /** Decrease of the timer on each interval (for the next interval) until minTimer reached. */
    timerDecrease :
    {
      check : "Integer",
      init  : 2
    }
  },


  members :
  {
    __executed : null,
    __timer : null,


    /**
     * Calling this function is like a tap from the user on the
     * button with all consequences.
     * <span style='color: red'>Be sure to call the {@link #release} function.</span>
     *
     */
    press : function()
    {
      // only if the button is enabled
      if (this.isEnabled())
      {
        // if the state pressed must be applied (first call)
        if (!this.hasState("pressed"))
        {
          // start the timer
          this.__startInternalTimer();
        }

        // set the states
        this.removeState("abandoned");
        this.addState("pressed");
      }
    },


    /**
     * Calling this function is like a release from the user on the
     * button with all consequences.
     * Usually the {@link #release} function will be called before the call of
     * this function.
     *
     * @param fireExecuteEvent {Boolean?true} flag which signals, if an event should be fired
     */
    release : function(fireExecuteEvent)
    {
      // only if the button is enabled
      if (!this.isEnabled()) {
        return;
      }

      // only if the button is pressed
      if (this.hasState("pressed"))
      {
        // if the button has not been executed
        if (!this.__executed) {
          this.execute();
        }
      }

      // remove button states
      this.removeState("pressed");
      this.removeState("abandoned");

      // stop the repeat timer and therefore the execution
      this.__stopInternalTimer();
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // overridden
    _applyEnabled : function(value, old)
    {
      this.base(arguments, value, old);

      if (!value)
      {
        if (this.isCapturing()) {
          // also release capture because out event is missing on iOS
          this.releaseCapture();
        }

        // remove button states
        this.removeState("pressed");
        this.removeState("abandoned");

        // stop the repeat timer and therefore the execution
        this.__stopInternalTimer();
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Listener method for "pointerover" event
     * <ul>
     * <li>Adds state "hovered"</li>
     * <li>Removes "abandoned" and adds "pressed" state (if "abandoned" state is set)</li>
     * </ul>
     *
     * @param e {Event} Pointer event
     */
    _onPointerOver : function(e)
    {
      if (!this.isEnabled() || e.getTarget() !== this) {
        return;
      }

      if (this.hasState("abandoned"))
      {
        this.removeState("abandoned");
        this.addState("pressed");
        this.__timer.start();
      }

      this.addState("hovered");
    },


    /**
     * Listener method for "pointerout" event
     * <ul>
     * <li>Removes "hovered" state</li>
     * <li>Adds "abandoned" and removes "pressed" state (if "pressed" state is set)</li>
     * </ul>
     *
     * @param e {Event} Pointer event
     */
    _onPointerOut : function(e)
    {
      if (!this.isEnabled() || e.getTarget() !== this) {
        return;
      }

      this.removeState("hovered");

      if (this.hasState("pressed"))
      {
        this.removeState("pressed");
        this.addState("abandoned");
        this.__timer.stop();
      }
    },


    /**
     * Callback method for the "pointerdown" method.
     *
     * Sets the interval of the timer (value of firstInterval property) and
     * starts the timer. Additionally removes the state "abandoned" and adds the
     * state "pressed".
     *
     * @param e {qx.event.type.Pointer} pointerdown event
     */
    _onPointerDown : function(e)
    {
      if (!e.isLeftPressed()) {
        return;
      }

      // Activate capturing if the button get a pointerout while
      // the button is pressed.
      this.capture();

      this.__startInternalTimer();
      e.stopPropagation();
    },


    /**
     * Callback method for the "pointerup" event.
     *
     * Handles the case that the user is releasing a button
     * before the timer interval method got executed. This way the
     * "execute" method get executed at least one time.
     *
     * @param e {qx.event.type.Pointer} pointerup event
     */
    _onPointerUp : function(e)
    {
      this.releaseCapture();

      if (!this.hasState("abandoned"))
      {
        this.addState("hovered");

        if (this.hasState("pressed") && !this.__executed) {
          this.execute();
        }
      }

      this.__stopInternalTimer();
      e.stopPropagation();
    },


    // Nothing to do, 'execute' is already fired by _onPointerUp.
    _onTap : function(e) {},


    /**
     * Listener method for "keyup" event.
     *
     * Removes "abandoned" and "pressed" state (if "pressed" state is set)
     * for the keys "Enter" or "Space" and stops the internal timer
     * (same like pointer up).
     *
     * @param e {Event} Key event
     */
    _onKeyUp : function(e)
    {
      switch(e.getKeyIdentifier())
      {
        case "Enter":
        case "Space":
          if (this.hasState("pressed"))
          {
            if (!this.__executed) {
              this.execute();
            }

            this.removeState("pressed");
            this.removeState("abandoned");
            e.stopPropagation();
            this.__stopInternalTimer();
          }
      }
    },


    /**
     * Listener method for "keydown" event.
     *
     * Removes "abandoned" and adds "pressed" state
     * for the keys "Enter" or "Space". It also starts
     * the internal timer (same like pointerdown).
     *
     * @param e {Event} Key event
     */
    _onKeyDown : function(e)
    {
      switch(e.getKeyIdentifier())
      {
        case "Enter":
        case "Space":
          this.removeState("abandoned");
          this.addState("pressed");
          e.stopPropagation();
          this.__startInternalTimer();
      }
    },


    /**
     * Callback for the interval event.
     *
     * Stops the timer and starts it with a new interval
     * (value of the "interval" property - value of the "timerDecrease" property).
     * Dispatches the "execute" event.
     *
     * @param e {qx.event.type.Event} interval event
     */
    _onInterval : function(e)
    {
      this.__executed = true;
      this.fireEvent("execute");
    },


    /*
    ---------------------------------------------------------------------------
      INTERNAL TIMER
    ---------------------------------------------------------------------------
    */

    /**
     * Starts the internal timer which causes firing of execution
     * events in an interval. It also presses the button.
     *
     */
    __startInternalTimer : function()
    {
      this.fireEvent("press");

      this.__executed = false;

      this.__timer.set({
        interval: this.getInterval(),
        firstInterval: this.getFirstInterval(),
        minimum: this.getMinTimer(),
        decrease: this.getTimerDecrease()
      }).start();

      this.removeState("abandoned");
      this.addState("pressed");
    },


    /**
     * Stops the internal timer and releases the button.
     *
     */
    __stopInternalTimer : function()
    {
      this.fireEvent("release");

      this.__timer.stop();

      this.removeState("abandoned");
      this.removeState("pressed");
    }
  },




  /*
    *****************************************************************************
       DESTRUCTOR
    *****************************************************************************
    */

  destruct : function() {
    this._disposeObjects("__timer");
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Timer, which accelerates after each interval. The initial delay and the
 * interval time can be set using the properties {@link #firstInterval}
 * and {@link #interval}. The {@link #interval} events will be fired with
 * decreasing interval times while the timer is running, until the {@link #minimum}
 * is reached. The {@link #decrease} property sets the amount of milliseconds
 * which will decreased after every firing.
 *
 * This class is e.g. used in the {@link qx.ui.form.RepeatButton} and
 * {@link qx.ui.form.HoverButton} widgets.
 */
qx.Class.define("qx.event.AcceleratingTimer",
{
  extend : qx.core.Object,

  construct : function()
  {
    this.base(arguments);

    this.__timer = new qx.event.Timer(this.getInterval());
    this.__timer.addListener("interval", this._onInterval, this);
  },


  events :
  {
    /** This event if fired each time the interval time has elapsed */
    "interval" : "qx.event.type.Event"
  },


  properties :
  {
    /**
     * Interval used after the first run of the timer. Usually a smaller value
     * than the "firstInterval" property value to get a faster reaction.
     */
    interval :
    {
      check : "Integer",
      init  : 100
    },

    /**
     * Interval used for the first run of the timer. Usually a greater value
     * than the "interval" property value to a little delayed reaction at the first
     * time.
     */
    firstInterval :
    {
      check : "Integer",
      init  : 500
    },

    /** This configures the minimum value for the timer interval. */
    minimum :
    {
      check : "Integer",
      init  : 20
    },

    /** Decrease of the timer on each interval (for the next interval) until minTimer reached. */
    decrease :
    {
      check : "Integer",
      init  : 2
    }
  },


  members :
  {
    __timer : null,
    __currentInterval : null,

    /**
     * Reset and start the timer.
     */
    start : function()
    {
      this.__timer.setInterval(this.getFirstInterval());
      this.__timer.start();
    },


    /**
     * Stop the timer
     */
    stop : function()
    {
      this.__timer.stop();
      this.__currentInterval = null;
    },


    /**
     * Interval event handler
     */
    _onInterval : function()
    {
      this.__timer.stop();

      if (this.__currentInterval == null) {
        this.__currentInterval = this.getInterval();
      }

      this.__currentInterval = Math.max(
        this.getMinimum(),
        this.__currentInterval - this.getDecrease()
      );

      this.__timer.setInterval(this.__currentInterval);
      this.__timer.start();

      this.fireEvent("interval");
    }
  },


  destruct : function() {
    this._disposeObjects("__timer");
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The ScrollArea provides a container widget with on demand scroll bars
 * if the content size exceeds the size of the container.
 *
 * @childControl pane {qx.ui.core.scroll.ScrollPane} pane which holds the content to scroll
 * @childControl scrollbar-x {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar} horizontal scrollbar
 * @childControl scrollbar-y {qx.ui.core.scroll.ScrollBar?qx.ui.core.scroll.NativeScrollBar} vertical scrollbar
 * @childControl corner {qx.ui.core.Widget} corner where no scrollbar is shown
 */
qx.Class.define("qx.ui.core.scroll.AbstractScrollArea",
{
  extend : qx.ui.core.Widget,
  include : [
    qx.ui.core.scroll.MScrollBarFactory,
    qx.ui.core.scroll.MRoll,
    qx.ui.core.MDragDropScrolling
  ],
  type : "abstract",


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * The default width which is used for the width of the scroll bar if
     * overlaid.
     */
    DEFAULT_SCROLLBAR_WIDTH : 14
  },



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    if (qx.core.Environment.get("os.scrollBarOverlayed")) {
      // use a plain canvas to overlay the scroll bars
      this._setLayout(new qx.ui.layout.Canvas());
    } else {
      // Create 'fixed' grid layout
      var grid = new qx.ui.layout.Grid();
      grid.setColumnFlex(0, 1);
      grid.setRowFlex(0, 1);
      this._setLayout(grid);
    }

    // Roll listener for scrolling
    this._addRollHandling();
  },


  events : {
    /** Fired as soon as the scroll animation in X direction ends. */
    scrollAnimationXEnd: 'qx.event.type.Event',

    /** Fired as soon as the scroll animation in X direction ends. */
    scrollAnimationYEnd: 'qx.event.type.Event'
  },



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
      init : "scrollarea"
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


    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     * </ul>
     */
    scrollbarX :
    {
      check : ["auto", "on", "off"],
      init : "auto",
      themeable : true,
      apply : "_computeScrollbars"
    },


    /**
     * The policy, when the horizontal scrollbar should be shown.
     * <ul>
     *   <li><b>auto</b>: Show scrollbar on demand</li>
     *   <li><b>on</b>: Always show the scrollbar</li>
     *   <li><b>off</b>: Never show the scrollbar</li>
     * </ul>
     */
    scrollbarY :
    {
      check : ["auto", "on", "off"],
      init : "auto",
      themeable : true,
      apply : "_computeScrollbars"
    },


    /**
     * Group property, to set the overflow of both scroll bars.
     */
    scrollbar : {
      group : [ "scrollbarX", "scrollbarY" ]
    }
  },






  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      CHILD CONTROL SUPPORT
    ---------------------------------------------------------------------------
    */

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "pane":
          control = new qx.ui.core.scroll.ScrollPane();

          control.addListener("update", this._computeScrollbars, this);
          control.addListener("scrollX", this._onScrollPaneX, this);
          control.addListener("scrollY", this._onScrollPaneY, this);

          if (qx.core.Environment.get("os.scrollBarOverlayed")) {
            this._add(control, {edge: 0});
          } else {
            this._add(control, {row: 0, column: 0});
          }
          break;


        case "scrollbar-x":
          control = this._createScrollBar("horizontal");
          control.setMinWidth(0);

          control.exclude();
          control.addListener("scroll", this._onScrollBarX, this);
          control.addListener("changeVisibility", this._onChangeScrollbarXVisibility, this);
          control.addListener("scrollAnimationEnd", this._onScrollAnimationEnd.bind(this, "X"));

          if (qx.core.Environment.get("os.scrollBarOverlayed")) {
            control.setMinHeight(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
            this._add(control, {bottom: 0, right: 0, left: 0});
          } else {
            this._add(control, {row: 1, column: 0});
          }
          break;


        case "scrollbar-y":
          control = this._createScrollBar("vertical");
          control.setMinHeight(0);

          control.exclude();
          control.addListener("scroll", this._onScrollBarY, this);
          control.addListener("changeVisibility", this._onChangeScrollbarYVisibility, this);
          control.addListener("scrollAnimationEnd", this._onScrollAnimationEnd.bind(this, "Y"));

          if (qx.core.Environment.get("os.scrollBarOverlayed")) {
            control.setMinWidth(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);
            this._add(control, {right: 0, bottom: 0, top: 0});
          } else {
            this._add(control, {row: 0, column: 1});
          }
          break;


        case "corner":
          control = new qx.ui.core.Widget();
          control.setWidth(0);
          control.setHeight(0);
          control.exclude();

          if (!qx.core.Environment.get("os.scrollBarOverlayed")) {
            // only add for non overlayed scroll bars
            this._add(control, {row: 1, column: 1});
          }
          break;
      }

      return control || this.base(arguments, id);
    },




    /*
    ---------------------------------------------------------------------------
      PANE SIZE
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the boundaries of the pane.
     *
     * @return {Map} The pane boundaries.
     */
    getPaneSize : function() {
      return this.getChildControl("pane").getInnerSize();
    },






    /*
    ---------------------------------------------------------------------------
      ITEM LOCATION SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the top offset of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemTop : function(item) {
      return this.getChildControl("pane").getItemTop(item);
    },


    /**
     * Returns the top offset of the end of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemBottom : function(item) {
      return this.getChildControl("pane").getItemBottom(item);
    },


    /**
     * Returns the left offset of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemLeft : function(item) {
      return this.getChildControl("pane").getItemLeft(item);
    },


    /**
     * Returns the left offset of the end of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Right offset
     */
    getItemRight : function(item) {
      return this.getChildControl("pane").getItemRight(item);
    },





    /*
    ---------------------------------------------------------------------------
      SCROLL SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Scrolls the element's content to the given left coordinate
     *
     * @param value {Integer} The vertical position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToX : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-x").scrollTo(value, duration);
    },


    /**
     * Scrolls the element's content by the given left offset
     *
     * @param value {Integer} The vertical position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByX : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-x").scrollBy(value, duration);
    },


    /**
     * Returns the scroll left position of the content
     *
     * @return {Integer} Horizontal scroll position
     */
    getScrollX : function()
    {
      var scrollbar = this.getChildControl("scrollbar-x", true);
      return scrollbar ? scrollbar.getPosition() : 0;
    },


    /**
     * Scrolls the element's content to the given top coordinate
     *
     * @param value {Integer} The horizontal position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToY : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-y").scrollTo(value, duration);
    },


    /**
     * Scrolls the element's content by the given top offset
     *
     * @param value {Integer} The horizontal position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByY : function(value, duration) {
      // First flush queue before scroll
      qx.ui.core.queue.Manager.flush();

      this.getChildControl("scrollbar-y").scrollBy(value, duration);
    },


    /**
     * Returns the scroll top position of the content
     *
     * @return {Integer} Vertical scroll position
     */
    getScrollY : function()
    {
      var scrollbar = this.getChildControl("scrollbar-y", true);
      return scrollbar ? scrollbar.getPosition() : 0;
    },


    /**
     * In case a scroll animation is currently running in X direction,
     * it will be stopped. If not, the method does nothing.
     */
    stopScrollAnimationX : function() {
      var scrollbar = this.getChildControl("scrollbar-x", true);
      if (scrollbar) {
        scrollbar.stopScrollAnimation();
      }
    },


    /**
     * In case a scroll animation is currently running in X direction,
     * it will be stopped. If not, the method does nothing.
     */
    stopScrollAnimationY : function() {
      var scrollbar = this.getChildControl("scrollbar-y", true);
      if (scrollbar) {
        scrollbar.stopScrollAnimation();
      }
    },



    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */
    /**
     * Event handler for the scroll animation end event for both scroll bars.
     *
     * @param direction {String} Either "X" or "Y".
     */
    _onScrollAnimationEnd : function(direction) {
      this.fireEvent("scrollAnimation" + direction + "End");
    },

    /**
     * Event handler for the scroll event of the horizontal scrollbar
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollBarX : function(e) {
      this.getChildControl("pane").scrollToX(e.getData());
    },


    /**
     * Event handler for the scroll event of the vertical scrollbar
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollBarY : function(e) {
      this.getChildControl("pane").scrollToY(e.getData());
    },


    /**
     * Event handler for the horizontal scroll event of the pane
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollPaneX : function(e) {
      var scrollbar = this.getChildControl("scrollbar-x");
      if (scrollbar) {
        scrollbar.updatePosition(e.getData());
      }
    },


    /**
     * Event handler for the vertical scroll event of the pane
     *
     * @param e {qx.event.type.Data} The scroll event object
     */
    _onScrollPaneY : function(e) {
      var scrollbar = this.getChildControl("scrollbar-y");
      if (scrollbar) {
        scrollbar.updatePosition(e.getData());
      }
    },


    /**
     * Event handler for visibility changes of horizontal scrollbar.
     *
     * @param e {qx.event.type.Event} Property change event
     */
    _onChangeScrollbarXVisibility : function(e)
    {
      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      if (!showX) {
        this.scrollToX(0);
      }

      showX && showY ? this._showChildControl("corner") : this._excludeChildControl("corner");
    },


    /**
     * Event handler for visibility changes of horizontal scrollbar.
     *
     * @param e {qx.event.type.Event} Property change event
     */
    _onChangeScrollbarYVisibility : function(e)
    {
      var showX = this._isChildControlVisible("scrollbar-x");
      var showY = this._isChildControlVisible("scrollbar-y");

      if (!showY) {
        this.scrollToY(0);
      }

      showX && showY ? this._showChildControl("corner") : this._excludeChildControl("corner");
    },




    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Computes the visibility state for scrollbars.
     *
     */
    _computeScrollbars : function()
    {
      var pane = this.getChildControl("pane");
      var content = pane.getChildren()[0];
      if (!content)
      {
        this._excludeChildControl("scrollbar-x");
        this._excludeChildControl("scrollbar-y");
        return;
      }

      var innerSize = this.getInnerSize();
      var paneSize = pane.getInnerSize();
      var scrollSize = pane.getScrollSize();

      // if the widget has not yet been rendered, return and try again in the
      // resize event
      if (!paneSize || !scrollSize) {
        return;
      }

      var scrollbarX = this.getScrollbarX();
      var scrollbarY = this.getScrollbarY();

      if (scrollbarX === "auto" && scrollbarY === "auto")
      {
        // Check if the container is big enough to show
        // the full content.
        var showX = scrollSize.width > innerSize.width;
        var showY = scrollSize.height > innerSize.height;

        // Dependency check
        // We need a special intelligence here when only one
        // of the autosized axis requires a scrollbar
        // This scrollbar may then influence the need
        // for the other one as well.
        if ((showX || showY) && !(showX && showY))
        {
          if (showX) {
            showY = scrollSize.height > paneSize.height;
          } else if (showY) {
            showX = scrollSize.width > paneSize.width;
          }
        }
      }
      else
      {
        var showX = scrollbarX === "on";
        var showY = scrollbarY === "on";

        // Check auto values afterwards with already
        // corrected client dimensions
        if (scrollSize.width > (showX ? paneSize.width : innerSize.width) && scrollbarX === "auto") {
          showX = true;
        }

        if (scrollSize.height > (showX ? paneSize.height : innerSize.height) && scrollbarY === "auto") {
          showY = true;
        }
      }

      // Update scrollbars
      if (showX)
      {
        var barX = this.getChildControl("scrollbar-x");

        barX.show();
        barX.setMaximum(Math.max(0, scrollSize.width - paneSize.width));
        barX.setKnobFactor((scrollSize.width === 0) ? 0 : paneSize.width / scrollSize.width);
      }
      else
      {
        this._excludeChildControl("scrollbar-x");
      }

      if (showY)
      {
        var barY = this.getChildControl("scrollbar-y");

        barY.show();
        barY.setMaximum(Math.max(0, scrollSize.height - paneSize.height));
        barY.setKnobFactor((scrollSize.height === 0) ? 0 : paneSize.height / scrollSize.height);
      }
      else
      {
        this._excludeChildControl("scrollbar-y");
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * This class represents a scroll able pane. This means that this widget
 * may contain content which is bigger than the available (inner)
 * dimensions of this widget. The widget also offer methods to control
 * the scrolling position. It can only have exactly one child.
 */
qx.Class.define("qx.ui.core.scroll.ScrollPane",
{
  extend : qx.ui.core.Widget,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    this.set({
      minWidth: 0,
      minHeight: 0
    });

    // Automatically configure a "fixed" grow layout.
    this._setLayout(new qx.ui.layout.Grow());

    // Add resize listener to "translate" event
    this.addListener("resize", this._onUpdate);

    var contentEl = this.getContentElement();

    // Synchronizes the DOM scroll position with the properties
    contentEl.addListener("scroll", this._onScroll, this);

    // Fixed some browser quirks e.g. correcting scroll position
    // to the previous value on re-display of a pane
    contentEl.addListener("appear", this._onAppear, this);
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired on resize of both the container or the content. */
    update : "qx.event.type.Event",

    /** Fired on scroll animation end invoked by 'scroll*' methods. */
    scrollAnimationEnd : "qx.event.type.Event"
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The horizontal scroll position */
    scrollX :
    {
      check : "qx.lang.Type.isNumber(value)&&value>=0&&value<=this.getScrollMaxX()",
      apply : "_applyScrollX",
      event : "scrollX",
      init  : 0
    },

    /** The vertical scroll position */
    scrollY :
    {
      check : "qx.lang.Type.isNumber(value)&&value>=0&&value<=this.getScrollMaxY()",
      apply : "_applyScrollY",
      event : "scrollY",
      init  : 0
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __frame : null,


    /*
    ---------------------------------------------------------------------------
      CONTENT MANAGEMENT
    ---------------------------------------------------------------------------
    */

    /**
     * Configures the content of the scroll pane. Replaces any existing child
     * with the newly given one.
     *
     * @param widget {qx.ui.core.Widget?null} The content widget of the pane
     */
    add : function(widget)
    {
      var old = this._getChildren()[0];
      if (old)
      {
        this._remove(old);
        old.removeListener("resize", this._onUpdate, this);
      }

      if (widget)
      {
        this._add(widget);
        widget.addListener("resize", this._onUpdate, this);
      }
    },


    /**
     * Removes the given widget from the content. The pane is empty
     * afterwards as only one child is supported by the pane.
     *
     * @param widget {qx.ui.core.Widget?null} The content widget of the pane
     */
    remove : function(widget)
    {
      if (widget)
      {
        this._remove(widget);
        widget.removeListener("resize", this._onUpdate, this);
      }
    },


    /**
     * Returns an array containing the current content.
     *
     * @return {Object[]} The content array
     */
    getChildren : function() {
      return this._getChildren();
    },



    /*
    ---------------------------------------------------------------------------
      EVENT LISTENER
    ---------------------------------------------------------------------------
    */

    /**
     * Event listener for resize event of content and container
     *
     * @param e {Event} Resize event object
     */
    _onUpdate : function(e) {
      this.fireEvent("update");
    },


    /**
     * Event listener for scroll event of content
     *
     * @param e {qx.event.type.Event} Scroll event object
     */
    _onScroll : function(e)
    {
      var contentEl = this.getContentElement();

      this.setScrollX(contentEl.getScrollX());
      this.setScrollY(contentEl.getScrollY());
    },


    /**
     * Event listener for appear event of content
     *
     * @param e {qx.event.type.Event} Appear event object
     */
    _onAppear : function(e)
    {
      var contentEl = this.getContentElement();

      var internalX = this.getScrollX();
      var domX = contentEl.getScrollX();

      if (internalX != domX) {
        contentEl.scrollToX(internalX);
      }

      var internalY = this.getScrollY();
      var domY = contentEl.getScrollY();

      if (internalY != domY) {
        contentEl.scrollToY(internalY);
      }
    },





    /*
    ---------------------------------------------------------------------------
      ITEM LOCATION SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the top offset of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemTop : function(item)
    {
      var top = 0;

      do
      {
        top += item.getBounds().top;
        item = item.getLayoutParent();
      }
      while (item && item !== this);

      return top;
    },


    /**
     * Returns the top offset of the end of the given item in relation to the
     * inner height of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemBottom : function(item) {
      return this.getItemTop(item) + item.getBounds().height;
    },


    /**
     * Returns the left offset of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Top offset
     */
    getItemLeft : function(item)
    {
      var left = 0;
      var parent;

      do
      {
        left += item.getBounds().left;
        parent = item.getLayoutParent();
        if (parent) {
          left += parent.getInsets().left;
        }
        item = parent;
      }
      while (item && item !== this);

      return left;
    },


    /**
     * Returns the left offset of the end of the given item in relation to the
     * inner width of this widget.
     *
     * @param item {qx.ui.core.Widget} Item to query
     * @return {Integer} Right offset
     */
    getItemRight : function(item) {
      return this.getItemLeft(item) + item.getBounds().width;
    },





    /*
    ---------------------------------------------------------------------------
      DIMENSIONS
    ---------------------------------------------------------------------------
    */

    /**
     * The size (identical with the preferred size) of the content.
     *
     * @return {Map} Size of the content (keys: <code>width</code> and <code>height</code>)
     */
    getScrollSize : function() {
      return this.getChildren()[0].getBounds();
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
      var scrollSize = this.getScrollSize();

      if (paneSize && scrollSize) {
        return Math.max(0, scrollSize.width - paneSize.width);
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
      var scrollSize = this.getScrollSize();

      if (paneSize && scrollSize) {
        return Math.max(0, scrollSize.height - paneSize.height);
      }

      return 0;
    },


    /**
     * Scrolls the element's content to the given left coordinate
     *
     * @param value {Integer} The vertical position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToX : function(value, duration)
    {
      var max = this.getScrollMaxX();

      if (value < 0) {
        value = 0;
      } else if (value > max) {
        value = max;
      }

      this.stopScrollAnimation();

      if (duration) {
        var from = this.getScrollX();
        this.__frame = new qx.bom.AnimationFrame();
        this.__frame.on("end", function() {
          this.setScrollX(value);
          this.__frame = null;
          this.fireEvent("scrollAnimationEnd");
        }, this);
        this.__frame.on("frame", function(timePassed) {
          var newX = parseInt(timePassed/duration * (value - from) + from);
          this.setScrollX(newX);
        }, this);
        this.__frame.startSequence(duration);

      } else {
        this.setScrollX(value);
      }
    },


    /**
     * Scrolls the element's content to the given top coordinate
     *
     * @param value {Integer} The horizontal position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollToY : function(value, duration)
    {
      var max = this.getScrollMaxY();

      if (value < 0) {
        value = 0;
      } else if (value > max) {
        value = max;
      }

      this.stopScrollAnimation();

      if (duration) {
        var from = this.getScrollY();
        this.__frame = new qx.bom.AnimationFrame();
        this.__frame.on("end", function() {
          this.setScrollY(value);
          this.__frame = null;
          this.fireEvent("scrollAnimationEnd");
        }, this);
        this.__frame.on("frame", function(timePassed) {
          var newY = parseInt(timePassed/duration * (value - from) + from);
          this.setScrollY(newY);
        }, this);
        this.__frame.startSequence(duration);

      } else {
        this.setScrollY(value);
      }
    },


    /**
     * Scrolls the element's content horizontally by the given amount.
     *
     * @param x {Integer?0} Amount to scroll
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByX : function(x, duration) {
      this.scrollToX(this.getScrollX() + x, duration);
    },


    /**
     * Scrolls the element's content vertically by the given amount.
     *
     * @param y {Integer?0} Amount to scroll
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollByY : function(y, duration) {
      this.scrollToY(this.getScrollY() + y, duration);
    },


    /**
     * If an scroll animation is running, it will be stopped with that method.
     */
    stopScrollAnimation : function() {
      if (this.__frame) {
        this.__frame.cancelSequence();
        this.__frame = null;
      }
    },

    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyScrollX : function(value) {
      this.getContentElement().scrollToX(value);
    },


    // property apply
    _applyScrollY : function(value) {
      this.getContentElement().scrollToY(value);
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

************************************************************************ */

/**
 * The grow layout stretches all children to the full available size
 * but still respects limits configured by min/max values.
 *
 * It will place all children over each other with the top and left coordinates
 * set to <code>0</code>. The {@link qx.ui.container.Stack} and the
 * {@link qx.ui.core.scroll.ScrollPane} are using this layout.
 *
 * *Features*
 *
 * * Auto-sizing
 * * Respects minimum and maximum child dimensions
 *
 * *Item Properties*
 *
 * None
 *
 * *Example*
 *
 * <pre class="javascript">
 * var layout = new qx.ui.layout.Grow();
 *
 * var w1 = new qx.ui.core.Widget();
 * var w2 = new qx.ui.core.Widget();
 * var w3 = new qx.ui.core.Widget();
 *
 * var container = new qx.ui.container.Composite(layout);
 * container.add(w1);
 * container.add(w2);
 * container.add(w3);
 * </pre>
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/layout/grow.html'>
 * Extended documentation</a> and links to demos of this layout in the qooxdoo manual.
 */
qx.Class.define("qx.ui.layout.Grow",
{
  extend : qx.ui.layout.Abstract,



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      LAYOUT INTERFACE
    ---------------------------------------------------------------------------
    */

    // overridden
    verifyLayoutProperty : qx.core.Environment.select("qx.debug",
    {
      "true" : function(item, name, value) {
        this.assert(false, "The property '"+name+"' is not supported by the Grow layout!");
      },

      "false" : null
    }),


    // overridden
    renderLayout : function(availWidth, availHeight, padding)
    {
      var children = this._getLayoutChildren();
      var child, size, width, height;

      // Render children
      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];
        size = child.getSizeHint();

        width = availWidth;
        if (width < size.minWidth) {
          width = size.minWidth;
        } else if (width > size.maxWidth) {
          width = size.maxWidth;
        }

        height = availHeight;
        if (height < size.minHeight) {
          height = size.minHeight;
        } else if (height > size.maxHeight) {
          height = size.maxHeight;
        }

        child.renderLayout(padding.left, padding.top, width, height);
      }
    },


    // overridden
    _computeSizeHint : function()
    {
      var children = this._getLayoutChildren();
      var child, size;
      var neededWidth=0, neededHeight=0;
      var minWidth=0, minHeight=0;
      var maxWidth=Infinity, maxHeight=Infinity;

      // Iterate over children
      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];
        size = child.getSizeHint();

        neededWidth = Math.max(neededWidth, size.width);
        neededHeight = Math.max(neededHeight, size.height);

        minWidth = Math.max(minWidth, size.minWidth);
        minHeight = Math.max(minHeight, size.minHeight);

        maxWidth = Math.min(maxWidth, size.maxWidth);
        maxHeight = Math.min(maxHeight, size.maxHeight);
      }


      // Return hint
      return {
        width : neededWidth,
        height : neededHeight,

        minWidth : minWidth,
        minHeight : minHeight,

        maxWidth : maxWidth,
        maxHeight : maxHeight
      };
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * This class is responsible for checking the scrolling behavior of the client.
 *
 * This class is used by {@link qx.core.Environment} and should not be used
 * directly. Please check its class comment for details how to use it.
 *
 * @internal
 */
qx.Bootstrap.define("qx.bom.client.Scroll",
{
  statics :
  {
    /**
     * Check if the scrollbars should be positioned on top of the content. This
     * is true of OSX Lion when the scrollbars disappear automatically.
     *
     * @internal
     *
     * @return {Boolean} <code>true</code> if the scrollbars should be
     *   positioned on top of the content.
     */
    scrollBarOverlayed : function() {
      var scrollBarWidth = qx.bom.element.Scroll.getScrollbarWidth();
      var osx = qx.bom.client.OperatingSystem.getName() === "osx";
      var nativeScrollBars = qx.core.Environment.get("qx.nativeScrollBars");

      return scrollBarWidth === 0 && osx && nativeScrollBars;
    },


    /**
     * Checks if native scroll can be used for the current mobile device.
     *
     * @internal
     *
     * @return {Boolean} <code>true</code> if the current device is capable to
     * use native scroll.
     */
    getNativeScroll : function()
    {
      // iOS 8+
      if (qx.core.Environment.get("os.name") == "ios" &&
        parseInt(qx.core.Environment.get("browser.version"), 10) > 7) {
        return true;
      }

      // Firefox
      if (qx.core.Environment.get("browser.name") == "firefox") {
        return true;
      }

      // Android 4.4+
      if (qx.core.Environment.get("os.name") == "android")
      {
        var osVersion = qx.core.Environment.get("os.version");
        var splitVersion = osVersion.split(".");
        if (splitVersion[0] > 4 ||
            (splitVersion.length > 1 && splitVersion[0] > 3 && splitVersion[1] > 3)) {
          return true;
        }
      }

      // IE 10+
      if (qx.core.Environment.get("event.mspointer")) {
        return true;
      }

      return false;
    }
  },


  defer : function(statics) {
    qx.core.Environment.add("os.scrollBarOverlayed", statics.scrollBarOverlayed);
    qx.core.Environment.add("qx.mobile.nativescroll", statics.getNativeScroll);
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Container, which allows vertical and horizontal scrolling if the contents is
 * larger than the container.
 *
 * Note that this class can only have one child widget. This container has a
 * fixed layout, which cannot be changed.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   // create scroll container
 *   var scroll = new qx.ui.container.Scroll().set({
 *     width: 300,
 *     height: 200
 *   });
 *
 *   // add a widget which is larger than the container
 *   scroll.add(new qx.ui.core.Widget().set({
 *     width: 600,
 *     minWidth: 600,
 *     height: 400,
 *     minHeight: 400
 *   }));
 *
 *   this.getRoot().add(scroll);
 * </pre>
 *
 * This example creates a scroll container and adds a widget, which is larger
 * than the container. This will cause the container to display vertical
 * and horizontal toolbars.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/scroll.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.container.Scroll",
{
  extend : qx.ui.core.scroll.AbstractScrollArea,
  include : [qx.ui.core.MContentPadding],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param content {qx.ui.core.LayoutItem?null} The content widget of the scroll
   *    container.
   */
  construct : function(content)
  {
    this.base(arguments);

    if (content) {
      this.add(content);
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Sets the content of the scroll container. Scroll containers
     * may only have one child, so it always replaces the current
     * child with the given one.
     *
     * @param widget {qx.ui.core.Widget} Widget to insert
     */
    add : function(widget) {
      this.getChildControl("pane").add(widget);
    },


    /**
     * Returns the content of the scroll area.
     *
     * @param widget {qx.ui.core.Widget} Widget to remove
     */
    remove : function(widget) {
      this.getChildControl("pane").remove(widget);
    },


    /**
     * Returns the content of the scroll container.
     *
     * Scroll containers may only have one child. This
     * method returns an array containing the child or an empty array.
     *
     * @return {Object[]} The child array
     */
    getChildren : function() {
      return this.getChildControl("pane").getChildren();
    },


    /**
     * Returns the element, to which the content padding should be applied.
     *
     * @return {qx.ui.core.Widget} The content padding target.
     */
    _getContentPaddingTarget : function() {
      return this.getChildControl("pane");
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
     * Christian Hagendorn (chris_schmidt)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Each object, which should support single selection have to
 * implement this interface.
 */
qx.Interface.define("qx.ui.core.ISingleSelection",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */


  events :
  {
    /** Fires after the selection was modified */
    "changeSelection" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    /**
     * Returns an array of currently selected items.
     *
     * Note: The result is only a set of selected items, so the order can
     * differ from the sequence in which the items were added.
     *
     * @return {qx.ui.core.Widget[]} List of items.
     */
    getSelection : function() {
      return true;
    },

    /**
     * Replaces current selection with the given items.
     *
     * @param items {qx.ui.core.Widget[]} Items to select.
     * @throws {Error} if the item is not a child element.
     */
    setSelection : function(items) {
      return arguments.length == 1;
    },

    /**
     * Clears the whole selection at once.
     */
    resetSelection : function() {
      return true;
    },

    /**
     * Detects whether the given item is currently selected.
     *
     * @param item {qx.ui.core.Widget} Any valid selectable item
     * @return {Boolean} Whether the item is selected.
     * @throws {Error} if the item is not a child element.
     */
    isSelected : function(item) {
      return arguments.length == 1;
    },

    /**
     * Whether the selection is empty.
     *
     * @return {Boolean} Whether the selection is empty.
     */
    isSelectionEmpty : function() {
      return true;
    },

    /**
     * Returns all elements which are selectable.
     *
     * @param all {Boolean} true for all selectables, false for the
     *   selectables the user can interactively select
     * @return {qx.ui.core.Widget[]} The contained items.
     */
    getSelectables: function(all) {
      return arguments.length == 1;
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
     * Martin Wittemann (martinwittemann)
     * Jonathan Weiß (jonathan_rass)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * A tab view is a multi page view where only one page is visible
 * at each moment. It is possible to switch the pages using the
 * buttons rendered by each page.
 *
 * @childControl bar {qx.ui.container.SlideBar} slidebar for all tab buttons
 * @childControl pane {qx.ui.container.Stack} stack container to show one tab page
 */
qx.Class.define("qx.ui.tabview.TabView",
{
  extend : qx.ui.core.Widget,
  implement : qx.ui.core.ISingleSelection,
  include : [qx.ui.core.MContentPadding],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */


  /**
   * @param barPosition {String} Initial bar position ({@link #barPosition})
   */
  construct : function(barPosition)
  {
    this.base(arguments);

    this.__barPositionToState = {
      top : "barTop",
      right : "barRight",
      bottom : "barBottom",
      left : "barLeft"
    };

    this._createChildControl("bar");
    this._createChildControl("pane");

    // Create manager
    var mgr = this.__radioGroup = new qx.ui.form.RadioGroup;
    mgr.setWrap(false);
    mgr.addListener("changeSelection", this._onChangeSelection, this);

    // Initialize bar position
    if (barPosition != null) {
      this.setBarPosition(barPosition);
    } else {
      this.initBarPosition();
    }
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */


  events :
  {
    /** Fires after the selection was modified */
    "changeSelection" : "qx.event.type.Data"
  },


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
      init : "tabview"
    },

    /**
     * This property defines on which side of the TabView the bar should be positioned.
     */
    barPosition :
    {
      check : ["left", "right", "top", "bottom"],
      init : "top",
      apply : "_applyBarPosition"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    /** @type {qx.ui.form.RadioGroup} instance containing the radio group */
    __radioGroup : null,


    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "bar":
          control = new qx.ui.container.SlideBar();
          control.setZIndex(10);
          this._add(control);
          break;

        case "pane":
          control = new qx.ui.container.Stack;
          control.setZIndex(5);
          this._add(control, {flex:1});
          break;
      }

      return control || this.base(arguments, id);
    },

    /**
     * Returns the element, to which the content padding should be applied.
     *
     * @return {qx.ui.core.Widget} The content padding target.
     */
    _getContentPaddingTarget : function() {
      return this.getChildControl("pane");
    },


    /*
    ---------------------------------------------------------------------------
      CHILDREN HANDLING
    ---------------------------------------------------------------------------
    */


    /**
     * Adds a page to the tabview including its needed button
     * (contained in the page).
     *
     * @param page {qx.ui.tabview.Page} The page which should be added.
     */
    add : function(page)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(page instanceof qx.ui.tabview.Page)) {
          throw new Error("Incompatible child for TabView: " + page);
        }
      }

      var button = page.getButton();
      var bar = this.getChildControl("bar");
      var pane = this.getChildControl("pane");

      // Exclude page
      page.exclude();

      // Add button and page
      bar.add(button);
      pane.add(page);

      // Register button
      this.__radioGroup.add(button);

      // Add state to page
      page.addState(this.__barPositionToState[this.getBarPosition()]);

      // Update states
      page.addState("lastTab");
      var children = this.getChildren();
      if (children[0] == page) {
        page.addState("firstTab");
      } else {
        children[children.length-2].removeState("lastTab");
      }

      page.addListener("close", this._onPageClose, this);
    },

    /**
     * Adds a page to the tabview including its needed button
     * (contained in the page).
     *
     * @param page {qx.ui.tabview.Page} The page which should be added.
     * @param index {Integer?null} Optional position where to add the page.
     */
    addAt : function(page, index)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(page instanceof qx.ui.tabview.Page)) {
          throw new Error("Incompatible child for TabView: " + page);
        }
      }
      var children = this.getChildren();
      if(!(index == null) && index > children.length) {
        throw new Error("Index should be less than : " + children.length);
      }

      if(index == null) {
        index = children.length;
      }

      var button = page.getButton();
      var bar = this.getChildControl("bar");
      var pane = this.getChildControl("pane");

      // Exclude page
      page.exclude();

      // Add button and page
      bar.addAt(button, index);
      pane.addAt(page, index);

      // Register button
      this.__radioGroup.add(button);

      // Add state to page
      page.addState(this.__barPositionToState[this.getBarPosition()]);

      // Update states
      children = this.getChildren();
      if(index == children.length-1) {
        page.addState("lastTab");
      }

      if (children[0] == page) {
        page.addState("firstTab");
      } else {
        children[children.length-2].removeState("lastTab");
      }

      page.addListener("close", this._onPageClose, this);
    },

    /**
     * Removes a page (and its corresponding button) from the TabView.
     *
     * @param page {qx.ui.tabview.Page} The page to be removed.
     */
    remove : function(page)
    {
      var pane = this.getChildControl("pane");
      var bar = this.getChildControl("bar");
      var button = page.getButton();
      var children = pane.getChildren();

      // Try to select next page
      if (this.getSelection()[0] == page)
      {
        var index = children.indexOf(page);
        if (index == 0)
        {
          if (children[1]) {
            this.setSelection([children[1]]);
          } else {
            this.resetSelection();
          }
        }
        else
        {
          this.setSelection([children[index-1]]);
        }
      }

      // Remove the button and page
      bar.remove(button);
      pane.remove(page);

      // Remove the button from the radio group
      this.__radioGroup.remove(button);

      // Remove state from page
      page.removeState(this.__barPositionToState[this.getBarPosition()]);

      // Update states
      if (page.hasState("firstTab"))
      {
        page.removeState("firstTab");
        if (children[0]) {
          children[0].addState("firstTab");
        }
      }

      if (page.hasState("lastTab"))
      {
        page.removeState("lastTab");
        if (children.length > 0) {
          children[children.length-1].addState("lastTab");
        }
      }

      page.removeListener("close", this._onPageClose, this);
    },

    /**
     * Returns TabView's children widgets.
     *
     * @return {qx.ui.tabview.Page[]} List of children.
     */
    getChildren : function() {
      return this.getChildControl("pane").getChildren();
    },

    /**
     * Returns the position of the given page in the TabView.
     *
     * @param page {qx.ui.tabview.Page} The page to query for.
     * @return {Integer} Position of the page in the TabView.
     */
    indexOf : function(page) {
      return this.getChildControl("pane").indexOf(page);
    },


    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */


    /** @type {Map} Maps the bar position to an appearance state */
    __barPositionToState : null,

    /**
     * Apply method for the placeBarOnTop-Property.
     *
     * Passes the desired value to the layout of the tabview so
     * that the layout can handle it.
     * It also sets the states to all buttons so they know the
     * position of the bar.
     *
     * @param value {Boolean} The new value.
     * @param old {Boolean} The old value.
     */
    _applyBarPosition : function(value, old)
    {
      var bar = this.getChildControl("bar");
      var pane = this.getChildControl("pane");

      var horizontal = value == "left" || value == "right";
      var reversed = value == "right" || value == "bottom";

      var layoutClass = horizontal ? qx.ui.layout.HBox : qx.ui.layout.VBox;

      var layout = this._getLayout();
      if (layout && layout instanceof layoutClass) {
        // pass
      } else {
        this._setLayout(layout = new layoutClass);
      }

      // Update reversed
      layout.setReversed(reversed);

      // Sync orientation to bar
      bar.setOrientation(horizontal ? "vertical" : "horizontal");

      // Read children
      var children = this.getChildren();

      var i, l;
      // Toggle state to bar
      if (old)
      {
        var oldState = this.__barPositionToState[old];

        // Update bar
        bar.removeState(oldState);

        // Update pane
        pane.removeState(oldState);

        // Update pages
        for (i=0, l=children.length; i<l; i++) {
          children[i].removeState(oldState);
        }
      }

      if (value)
      {
        var newState = this.__barPositionToState[value];

        // Update bar
        bar.addState(newState);

        // Update pane
        pane.addState(newState);

        // Update pages
        for (i=0, l=children.length; i<l; i++) {
          children[i].addState(newState);
        }
      }
    },


    /*
    ---------------------------------------------------------------------------
      SELECTION API
    ---------------------------------------------------------------------------
    */

    /**
     * Returns an array of currently selected items.
     *
     * Note: The result is only a set of selected items, so the order can
     * differ from the sequence in which the items were added.
     *
     * @return {qx.ui.tabview.Page[]} List of items.
     */
    getSelection : function() {
      var buttons = this.__radioGroup.getSelection();
      var result = [];

      for (var i = 0; i < buttons.length; i++) {
        result.push(buttons[i].getUserData("page"));
      }

      return result;
    },

    /**
     * Replaces current selection with the given items.
     *
     * @param items {qx.ui.tabview.Page[]} Items to select.
     * @throws {Error} if one of the items is not a child element and if
     *    items contains more than one elements.
     */
    setSelection : function(items) {
      var buttons = [];

      for (var i = 0; i < items.length; i++) {
        buttons.push(items[i].getChildControl("button"));
      }
      this.__radioGroup.setSelection(buttons);
    },

    /**
     * Clears the whole selection at once.
     */
    resetSelection : function() {
      this.__radioGroup.resetSelection();
    },

    /**
     * Detects whether the given item is currently selected.
     *
     * @param item {qx.ui.tabview.Page} Any valid selectable item.
     * @return {Boolean} Whether the item is selected.
     * @throws {Error} if one of the items is not a child element.
     */
    isSelected : function(item) {
      var button = item.getChildControl("button");
      return this.__radioGroup.isSelected(button);
    },

    /**
     * Whether the selection is empty.
     *
     * @return {Boolean} Whether the selection is empty.
     */
    isSelectionEmpty : function() {
      return this.__radioGroup.isSelectionEmpty();
    },


    /**
     * Returns all elements which are selectable.
     *
     * @return {qx.ui.tabview.Page[]} The contained items.
     * @param all {Boolean} true for all selectables, false for the
     *   selectables the user can interactively select
     */
    getSelectables: function(all) {
      var buttons = this.__radioGroup.getSelectables(all);
      var result = [];

      for (var i = 0; i <buttons.length; i++) {
        result.push(buttons[i].getUserData("page"));
      }

      return result;
    },

    /**
     * Event handler for <code>changeSelection</code>.
     *
     * @param e {qx.event.type.Data} Data event.
     */
    _onChangeSelection : function(e)
    {
      var pane = this.getChildControl("pane");
      var button = e.getData()[0];
      var oldButton = e.getOldData()[0];
      var value = [];
      var old = [];

      if (button)
      {
        value = [button.getUserData("page")];
        pane.setSelection(value);
        button.focus();
        this.scrollChildIntoView(button, null, null, false);
      }
      else
      {
        pane.resetSelection();
      }

      if (oldButton) {
        old = [oldButton.getUserData("page")];
      }

      this.fireDataEvent("changeSelection", value, old);
    },

    /**
     * Event handler for <code>beforeChangeSelection</code>.
     *
     * @param e {qx.event.type.Event} Data event.
     */
    _onBeforeChangeSelection : function(e)
    {
      if (!this.fireNonBubblingEvent("beforeChangeSelection",
          qx.event.type.Event, [false, true])) {
        e.preventDefault();
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */


    /**
     * Event handler for the change of the selected item of the radio group.
     * @param e {qx.event.type.Data} The data event
     */
    _onRadioChangeSelection : function(e) {
      var element = e.getData()[0];
      if (element) {
        this.setSelection([element.getUserData("page")]);
      } else {
        this.resetSelection();
      }
    },


    /**
     * Removes the Page widget on which the close button was tapped.
     *
     * @param e {qx.event.type.Pointer} pointer event
     */
    _onPageClose : function(e)
    {
      // reset the old close button states, before remove page
      // see http://bugzilla.qooxdoo.org/show_bug.cgi?id=3763 for details
      var page = e.getTarget();
      var closeButton = page.getButton().getChildControl("close-button");
      closeButton.reset();

      this.remove(page);
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */


  destruct : function() {
    this._disposeObjects("__radioGroup");
    this.__barPositionToState = null;
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
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * This mixin links all methods to manage the single selection.
 *
 * The class which includes the mixin has to implements two methods:
 *
 * <ul>
 * <li><code>_getItems</code>, this method has to return a <code>Array</code>
 *    of <code>qx.ui.core.Widget</code> that should be managed from the manager.
 * </li>
 * <li><code>_isAllowEmptySelection</code>, this method has to return a
 *    <code>Boolean</code> value for allowing empty selection or not.
 * </li>
 * </ul>
 */
qx.Mixin.define("qx.ui.core.MSingleSelectionHandling",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fires after the selection was modified */
    "changeSelection" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    /** @type {qx.ui.core.SingleSelectionManager} the single selection manager */
    __manager : null,


    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */

    /**
     * Returns an array of currently selected items.
     *
     * Note: The result is only a set of selected items, so the order can
     * differ from the sequence in which the items were added.
     *
     * @return {qx.ui.core.Widget[]} List of items.
     */
    getSelection : function() {
      var selected = this.__getManager().getSelected();

      if (selected) {
        return [selected];
      } else {
        return [];
      }
    },

    /**
     * Replaces current selection with the given items.
     *
     * @param items {qx.ui.core.Widget[]} Items to select.
     * @throws {Error} if one of the items is not a child element and if
     *    items contains more than one elements.
     */
    setSelection : function(items) {
      switch(items.length)
      {
        case 0:
          this.resetSelection();
          break;
        case 1:
          this.__getManager().setSelected(items[0]);
          break;
        default:
          throw new Error("Could only select one item, but the selection" +
            " array contains " + items.length + " items!");
      }
    },

    /**
     * Clears the whole selection at once.
     */
    resetSelection : function() {
      this.__getManager().resetSelected();
    },

    /**
     * Detects whether the given item is currently selected.
     *
     * @param item {qx.ui.core.Widget} Any valid selectable item.
     * @return {Boolean} Whether the item is selected.
     * @throws {Error} if one of the items is not a child element.
     */
    isSelected : function(item) {
      return this.__getManager().isSelected(item);
    },

    /**
     * Whether the selection is empty.
     *
     * @return {Boolean} Whether the selection is empty.
     */
    isSelectionEmpty : function() {
      return this.__getManager().isSelectionEmpty();
    },


    /**
     * Returns all elements which are selectable.
     *
     * @param all {Boolean} true for all selectables, false for the
     *   selectables the user can interactively select
     * @return {qx.ui.core.Widget[]} The contained items.
     */
    getSelectables: function(all) {
      return this.__getManager().getSelectables(all);
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */


    /**
     * Event listener for <code>changeSelected</code> event on single
     * selection manager.
     *
     * @param e {qx.event.type.Data} Data event.
     */
    _onChangeSelected : function(e) {
      var newValue = e.getData();
      var oldVlaue = e.getOldData();

      newValue == null ? newValue = [] : newValue = [newValue];
      oldVlaue == null ? oldVlaue = [] : oldVlaue = [oldVlaue];

      this.fireDataEvent("changeSelection", newValue, oldVlaue);
    },

    /**
     * Return the selection manager if it is already exists, otherwise creates
     * the manager.
     *
     * @return {qx.ui.core.SingleSelectionManager} Single selection manager.
     */
    __getManager : function()
    {
      if (this.__manager == null)
      {
        var that = this;
        this.__manager = new qx.ui.core.SingleSelectionManager(
        {
          getItems : function() {
            return that._getItems();
          },

          isItemSelectable : function(item) {
            if (that._isItemSelectable) {
              return that._isItemSelectable(item);
            } else {
              return item.isVisible();
            }
          }
        });
        this.__manager.addListener("changeSelected", this._onChangeSelected, this);
      }
      this.__manager.setAllowEmptySelection(this._isAllowEmptySelection());

      return this.__manager;
    }
  },


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */


  destruct : function() {
    this._disposeObjects("__manager");
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
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Responsible for the single selection management.
 *
 * The class manage a list of {@link qx.ui.core.Widget} which are returned from
 * {@link qx.ui.core.ISingleSelectionProvider#getItems}.
 *
 * @internal
 */
qx.Class.define("qx.ui.core.SingleSelectionManager",
{
  extend : qx.core.Object,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */


  /**
   * Construct the single selection manager.
   *
   * @param selectionProvider {qx.ui.core.ISingleSelectionProvider} The provider
   * for selection.
   */
  construct : function(selectionProvider) {
    this.base(arguments);

    if (qx.core.Environment.get("qx.debug")) {
      qx.core.Assert.assertInterface(selectionProvider,
        qx.ui.core.ISingleSelectionProvider,
        "Invalid selectionProvider!");
    }

    this.__selectionProvider = selectionProvider;
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */


  events :
  {
    /** Fires after the selection was modified */
    "changeSelected" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */


  properties :
  {
    /**
     * If the value is <code>true</code> the manager allows an empty selection,
     * otherwise the first selectable element returned from the
     * <code>qx.ui.core.ISingleSelectionProvider</code> will be selected.
     */
    allowEmptySelection :
    {
      check : "Boolean",
      init : true,
      apply : "__applyAllowEmptySelection"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    /** @type {qx.ui.core.Widget} The selected widget. */
    __selected : null,

    /** @type {qx.ui.core.ISingleSelectionProvider} The provider for selection management */
    __selectionProvider : null,


    /*
    ---------------------------------------------------------------------------
       PUBLIC API
    ---------------------------------------------------------------------------
    */


    /**
     * Returns the current selected element.
     *
     * @return {qx.ui.core.Widget | null} The current selected widget or
     *    <code>null</code> if the selection is empty.
     */
    getSelected : function() {
      return this.__selected;
    },

    /**
     * Selects the passed element.
     *
     * @param item {qx.ui.core.Widget} Element to select.
     * @throws {Error} if the element is not a child element.
     */
    setSelected : function(item) {
      if (!this.__isChildElement(item)) {
        throw new Error("Could not select " + item +
          ", because it is not a child element!");
      }

      this.__setSelected(item);
    },

    /**
     * Reset the current selection. If {@link #allowEmptySelection} is set to
     * <code>true</code> the first element will be selected.
     */
    resetSelected : function(){
      this.__setSelected(null);
    },

    /**
     * Return <code>true</code> if the passed element is selected.
     *
     * @param item {qx.ui.core.Widget} Element to check if selected.
     * @return {Boolean} <code>true</code> if passed element is selected,
     *    <code>false</code> otherwise.
     * @throws {Error} if the element is not a child element.
     */
    isSelected : function(item) {
      if (!this.__isChildElement(item)) {
        throw new Error("Could not check if " + item + " is selected," +
          " because it is not a child element!");
      }
      return this.__selected === item;
    },

    /**
     * Returns <code>true</code> if selection is empty.
     *
     * @return {Boolean} <code>true</code> if selection is empty,
     *    <code>false</code> otherwise.
     */
    isSelectionEmpty : function() {
      return this.__selected == null;
    },

    /**
     * Returns all elements which are selectable.
     *
     * @param all {Boolean} true for all selectables, false for the
     *   selectables the user can interactively select
     * @return {qx.ui.core.Widget[]} The contained items.
     */
    getSelectables : function(all)
    {
      var items = this.__selectionProvider.getItems();
      var result = [];

      for (var i = 0; i < items.length; i++)
      {
        if (this.__selectionProvider.isItemSelectable(items[i])) {
          result.push(items[i]);
        }
      }

      // in case of an user selecable list, remove the enabled items
      if (!all) {
        for (var i = result.length -1; i >= 0; i--) {
          if (!result[i].getEnabled()) {
            result.splice(i, 1);
          }
        };
      }

      return result;
    },


    /*
    ---------------------------------------------------------------------------
       APPLY METHODS
    ---------------------------------------------------------------------------
    */


    // apply method
    __applyAllowEmptySelection : function(value, old)
    {
      if (!value) {
        this.__setSelected(this.__selected);
      }
    },


    /*
    ---------------------------------------------------------------------------
       HELPERS
    ---------------------------------------------------------------------------
    */

    /**
     * Set selected element.
     *
     * If passes value is <code>null</code>, the selection will be reseted.
     *
     * @param item {qx.ui.core.Widget | null} element to select, or
     *    <code>null</code> to reset selection.
     */
    __setSelected : function(item) {
      var oldSelected = this.__selected;
      var newSelected = item;

      if (newSelected != null && oldSelected === newSelected) {
        return;
      }

      if (!this.isAllowEmptySelection() && newSelected == null) {
        var firstElement = this.getSelectables(true)[0];

        if (firstElement) {
          newSelected = firstElement;
        }
      }

      this.__selected = newSelected;
      this.fireDataEvent("changeSelected", newSelected, oldSelected);
    },

    /**
     * Checks if passed element is a child element.
     *
     * @param item {qx.ui.core.Widget} Element to check if child element.
     * @return {Boolean} <code>true</code> if element is child element,
     *    <code>false</code> otherwise.
     */
    __isChildElement : function(item)
    {
      var items = this.__selectionProvider.getItems();

      for (var i = 0; i < items.length; i++)
      {
        if (items[i] === item)
        {
          return true;
        }
      }
      return false;
    }
  },



  /*
   *****************************************************************************
      DESTRUCTOR
   *****************************************************************************
   */
  destruct : function() {
    if (this.__selectionProvider.toHashCode) {
      this._disposeObjects("__selectionProvider");
    } else {
      this.__selectionProvider = null;
    }

    this._disposeObjects("__selected");
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
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */
/**
 * Defines the callback for the single selection manager.
 *
 * @internal
 */
qx.Interface.define("qx.ui.core.ISingleSelectionProvider",
{
  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Returns the elements which are part of the selection.
     *
     * @return {qx.ui.core.Widget[]} The widgets for the selection.
     */
    getItems: function() {},

    /**
     * Returns whether the given item is selectable.
     *
     * @param item {qx.ui.core.Widget} The item to be checked
     * @return {Boolean} Whether the given item is selectable
     */
    isItemSelectable : function(item) {}
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * This mixin offers the selection of the model properties.
 * It can only be included if the object including it implements the
 * {@link qx.ui.core.ISingleSelection} interface and the selectables implement
 * the {@link qx.ui.form.IModel} interface.
 */
qx.Mixin.define("qx.ui.form.MModelSelection",
{

  construct : function() {
    // create the selection array
    this.__modelSelection = new qx.data.Array();

    // listen to the changes
    this.__modelSelection.addListener("change", this.__onModelSelectionArrayChange, this);
    this.addListener("changeSelection", this.__onModelSelectionChange, this);
  },


  events :
  {
    /**
     * Pseudo event. It will never be fired because the array itself can not
     * be changed. But the event description is needed for the data binding.
     */
    changeModelSelection : "qx.event.type.Data"
  },


  members :
  {

    __modelSelection : null,
    __inSelectionChange : false,


    /**
     * Handler for the selection change of the including class e.g. SelectBox,
     * List, ...
     * It sets the new modelSelection via {@link #setModelSelection}.
     */
    __onModelSelectionChange : function() {
      if (this.__inSelectionChange) {
        return;
      }
      var data = this.getSelection();

      // create the array with the modes inside
      var modelSelection = [];
      for (var i = 0; i < data.length; i++) {
        var item = data[i];
        // fallback if getModel is not implemented
        var model = item.getModel ? item.getModel() : null;
        if (model !== null) {
          modelSelection.push(model);
        }
      };

      // only change the selection if you are sure that its correct [BUG #3748]
      if (modelSelection.length === data.length) {
        try {
          this.setModelSelection(modelSelection);
        } catch (e) {
          throw new Error(
            "Could not set the model selection. Maybe your models are not unique? " + e
          );
        }
      }
    },


    /**
     * Listener for the change of the internal model selection data array.
     */
    __onModelSelectionArrayChange : function() {
      this.__inSelectionChange = true;
      var selectables = this.getSelectables(true);
      var itemSelection = [];

      var modelSelection = this.__modelSelection.toArray();
      for (var i = 0; i < modelSelection.length; i++) {
        var model = modelSelection[i];
        for (var j = 0; j < selectables.length; j++) {
          var selectable = selectables[j];
          // fallback if getModel is not implemented
          var selectableModel = selectable.getModel ? selectable.getModel() : null;
          if (model === selectableModel) {
            itemSelection.push(selectable);
            break;
          }
        }
      }
      this.setSelection(itemSelection);
      this.__inSelectionChange = false;

      // check if the setting has worked
      var currentSelection = this.getSelection();
      if (!qx.lang.Array.equals(currentSelection, itemSelection)) {
        // if not, set the actual selection
        this.__onModelSelectionChange();
      }
    },


    /**
     * Returns always an array of the models of the selected items. If no
     * item is selected or no model is given, the array will be empty.
     *
     * *CAREFUL!* The model selection can only work if every item item in the
     * selection providing widget has a model property!
     *
     * @return {qx.data.Array} An array of the models of the selected items.
     */
    getModelSelection : function()
    {
      return this.__modelSelection;
    },


    /**
     * Takes the given models in the array and searches for the corresponding
     * selectables. If an selectable does have that model attached, it will be
     * selected.
     *
     * *Attention:* This method can have a time complexity of O(n^2)!
     *
     * *CAREFUL!* The model selection can only work if every item item in the
     * selection providing widget has a model property!
     *
     * @param modelSelection {Array} An array of models, which should be
     *   selected.
     */
    setModelSelection : function(modelSelection)
    {
      // check for null values
      if (!modelSelection)
      {
        this.__modelSelection.removeAll();
        return;
      }

      if (qx.core.Environment.get("qx.debug")) {
        this.assertArray(modelSelection, "Please use an array as parameter.");
      }

      // add the first two parameter
      modelSelection.unshift(this.__modelSelection.getLength()); // remove index
      modelSelection.unshift(0);  // start index

      var returnArray = this.__modelSelection.splice.apply(this.__modelSelection, modelSelection);
      returnArray.dispose();
    }
  },

  destruct : function() {
    this._disposeObjects("__modelSelection");
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Mixin used for the bubbling events. If you want to use this in your own model
 * classes, be sure that every property will call the
 * {@link #_applyEventPropagation} function on every change.
 */
qx.Mixin.define("qx.data.marshal.MEventBubbling",
{

  events :
  {
    /**
     * The change event which will be fired on every change in the model no
     * matter what property changes. This event bubbles so the root model will
     * fire a change event on every change of its children properties too.
     *
     * Note that properties are required to call
     * {@link #_applyEventPropagation} on apply for changes to be tracked as
     * desired. It is already taken care of that properties created with the
     * {@link qx.data.marshal.Json} marshaler call this method.
     *
     * The data will contain a map with the following four keys
     *   <li>value: The new value of the property</li>
     *   <li>old: The old value of the property.</li>
     *   <li>name: The name of the property changed including its parent
     *     properties separated by dots.</li>
     *   <li>item: The item which has the changed property.</li>
     * Due to that, the <code>getOldData</code> method will always return null
     * because the old data is contained in the map.
     */
    "changeBubble": "qx.event.type.Data"
  },


  members :
  {
    /**
     * Apply function for every property created with the
     * {@link qx.data.marshal.Json} marshaler. It fires and
     * {@link #changeBubble} event on every change. It also adds the chaining
     * listener if possible which is necessary for the bubbling of the events.
     *
     * @param value {var} The new value of the property.
     * @param old {var} The old value of the property.
     * @param name {String} The name of the changed property.
     */
    _applyEventPropagation : function(value, old, name)
    {
      this.fireDataEvent("changeBubble", {
        value: value, name: name, old: old, item: this
      });

      this._registerEventChaining(value, old, name);
    },


    /**
     * Registers for the given parameters the changeBubble listener, if
     * possible. It also removes the old listener, if an old item with
     * a changeBubble event is given.
     *
     * @param value {var} The new value of the property.
     * @param old {var} The old value of the property.
     * @param name {String} The name of the changed property.
     */
    _registerEventChaining : function(value, old, name)
    {
      // if an old value is given, remove the old listener if possible
      if (old != null && old.getUserData && old.getUserData("idBubble-" + this.$$hash) != null) {
        var listeners = old.getUserData("idBubble-" + this.$$hash);
        for (var i = 0; i < listeners.length; i++) {
          old.removeListenerById(listeners[i]);
        }
        old.setUserData("idBubble-" + this.$$hash, null);
      }

      // if the child supports chaining
      if ((value instanceof qx.core.Object)
        && qx.Class.hasMixin(value.constructor, qx.data.marshal.MEventBubbling)
      ) {
        // create the listener
        var listener = qx.lang.Function.bind(
          this.__changePropertyListener, this, name
        );
        // add the listener
        var id = value.addListener("changeBubble", listener, this);
        var listeners = value.getUserData("idBubble-" + this.$$hash);
        if (listeners == null)
        {
          listeners = [];
          value.setUserData("idBubble-" + this.$$hash, listeners);
        }
        listeners.push(id);
      }
    },


    /**
     * Listener responsible for formating the name and firing the change event
     * for the changed property.
     *
     * @param name {String} The name of the former properties.
     * @param e {qx.event.type.Data} The date event fired by the property
     *   change.
     */
    __changePropertyListener : function(name, e)
    {
      var data = e.getData();
      var value = data.value;
      var old = data.old;

      // if the target is an array
      if (qx.Class.hasInterface(e.getTarget().constructor, qx.data.IListData)) {

        if (data.name.indexOf) {
          var dotIndex = data.name.indexOf(".") != -1 ? data.name.indexOf(".") : data.name.length;
          var bracketIndex = data.name.indexOf("[") != -1 ? data.name.indexOf("[") : data.name.length;

          // braktes in the first spot is ok [BUG #5985]
          if (bracketIndex == 0) {
            var newName = name + data.name;
          } else if (dotIndex < bracketIndex) {
            var index = data.name.substring(0, dotIndex);
            var rest = data.name.substring(dotIndex + 1, data.name.length);
            if (rest[0] != "[") {
              rest = "." + rest;
            }
            var newName =  name + "[" + index + "]" + rest;
          } else if (bracketIndex < dotIndex) {
            var index = data.name.substring(0, bracketIndex);
            var rest = data.name.substring(bracketIndex, data.name.length);
            var newName =  name + "[" + index + "]" + rest;
          } else {
            var newName =  name + "[" + data.name + "]";
          }
        } else {
          var newName =  name + "[" + data.name + "]";
        }

      // if the target is not an array
      } else {
        // special case for array as first element of the chain [BUG #5985]
        if (parseInt(name) == name && name !== "") {
          name = "[" + name + "]";
        }
        var newName =  name + "." + data.name;
      }

      this.fireDataEvent(
        "changeBubble",
        {
          value: value,
          name: newName,
          old: old,
          item: data.item || e.getTarget()
        }
      );
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * The data array is a special array used in the data binding context of
 * qooxdoo. It does not extend the native array of JavaScript but its a wrapper
 * for it. All the native methods are included in the implementation and it
 * also fires events if the content or the length of the array changes in
 * any way. Also the <code>.length</code> property is available on the array.
 */
qx.Class.define("qx.data.Array",
{
  extend : qx.core.Object,
  include : qx.data.marshal.MEventBubbling,
  implement : [qx.data.IListData],

  /**
   * Creates a new instance of an array.
   *
   * @param param {var} The parameter can be some types.<br/>
   *   Without a parameter a new blank array will be created.<br/>
   *   If there is more than one parameter is given, the parameter will be
   *   added directly to the new array.<br/>
   *   If the parameter is a number, a new Array with the given length will be
   *   created.<br/>
   *   If the parameter is a JavaScript array, a new array containing the given
   *   elements will be created.
   */
  construct : function(param)
  {
    this.base(arguments);
    // if no argument is given
    if (param == undefined) {
      this.__array = [];

    // check for elements (create the array)
    } else if (arguments.length > 1) {
      // create an empty array and go through every argument and push it
      this.__array = [];
      for (var i = 0; i < arguments.length; i++) {
        this.__array.push(arguments[i]);
      }

    // check for a number (length)
    } else if (typeof param == "number") {
      this.__array = new Array(param);
    // check for an array itself
    } else if (param instanceof Array) {
      this.__array = qx.lang.Array.clone(param);

    // error case
    } else {
      this.__array = [];
      this.dispose();
      throw new Error("Type of the parameter not supported!");
    }

    // propagate changes
    for (var i=0; i<this.__array.length; i++) {
      this._applyEventPropagation(this.__array[i], null, i);
    }

    // update the length at startup
    this.__updateLength();

    // work against the console printout of the array
    if (qx.core.Environment.get("qx.debug")) {
      this[0] = "Please use 'toArray()' to see the content.";
    }
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Flag to set the dispose behavior of the array. If the property is set to
     * <code>true</code>, the array will dispose its content on dispose, too.
     */
    autoDisposeItems : {
      check : "Boolean",
      init : false
    }
  },

  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * The change event which will be fired if there is a change in the array.
     * The data contains a map with five key value pairs:
     * <li>start: The start index of the change.</li>
     * <li>end: The end index of the change.</li>
     * <li>type: The type of the change as a String. This can be 'add',
     * 'remove', 'order' or 'add/remove'</li>
     * <li>added: The items which has been added (as a JavaScript array)</li>
     * <li>removed: The items which has been removed (as a JavaScript array)</li>
     */
    "change" : "qx.event.type.Data",


    /**
     * The changeLength event will be fired every time the length of the
     * array changes.
     */
    "changeLength": "qx.event.type.Data"
  },


  members :
  {
    // private members
    __array : null,


    /**
     * Concatenates the current and the given array into a new one.
     *
     * @param array {Array} The javaScript array which should be concatenated
     *   to the current array.
     *
     * @return {qx.data.Array} A new array containing the values of both former
     *   arrays.
     */
    concat: function(array) {
      if (array) {
        var newArray = this.__array.concat(array);
      } else {
        var newArray = this.__array.concat();
      }
      return new qx.data.Array(newArray);
    },


    /**
     * Returns the array as a string using the given connector string to
     * connect the values.
     *
     * @param connector {String} the string which should be used to past in
     *  between of the array values.
     *
     * @return {String} The array as a string.
     */
    join: function(connector) {
      return this.__array.join(connector);
    },


    /**
     * Removes and returns the last element of the array.
     * An change event will be fired.
     *
     * @return {var} The last element of the array.
     */
    pop: function() {
      var item = this.__array.pop();
      this.__updateLength();
      // remove the possible added event listener
      this._registerEventChaining(null, item, this.length - 1);
      // fire change bubble event
      this.fireDataEvent("changeBubble", {
        value: [],
        name: this.length + "",
        old: [item],
        item: this
      });

      this.fireDataEvent("change",
        {
          start: this.length - 1,
          end: this.length - 1,
          type: "remove",
          removed : [item],
          added : []
        }, null
      );
      return item;
    },


    /**
     * Adds an element at the end of the array.
     *
     * @param varargs {var} Multiple elements. Every element will be added to
     *   the end of the array. An change event will be fired.
     *
     * @return {Number} The new length of the array.
     */
    push: function(varargs) {
      for (var i = 0; i < arguments.length; i++) {
        this.__array.push(arguments[i]);
        this.__updateLength();
        // apply to every pushed item an event listener for the bubbling
        this._registerEventChaining(arguments[i], null, this.length - 1);

        // fire change bubbles event
        this.fireDataEvent("changeBubble", {
          value: [arguments[i]],
          name: (this.length - 1) + "",
          old: [],
          item: this
        });

        // fire change event
        this.fireDataEvent("change",
          {
            start: this.length - 1,
            end: this.length - 1,
            type: "add",
            added: [arguments[i]],
            removed : []
          }, null
        );
      }
      return this.length;
    },


    /**
     * Reverses the order of the array. An change event will be fired.
     */
    reverse: function() {
      // ignore on empty arrays
      if (this.length == 0) {
        return;
      }

      var oldArray = this.__array.concat();
      this.__array.reverse();

      this.__updateEventPropagation(0, this.length);

      this.fireDataEvent("change",
        {start: 0, end: this.length - 1, type: "order", added: [], removed: []}, null
      );

      // fire change bubbles event
      this.fireDataEvent("changeBubble", {
        value: this.__array,
        name: "0-" + (this.__array.length - 1),
        old: oldArray,
        item: this
      });
    },


    /**
     * Removes the first element of the array and returns it. An change event
     * will be fired.
     *
     * @return {var} the former first element.
     */
    shift: function() {
      // ignore on empty arrays
      if (this.length == 0) {
        return;
      }

      var item = this.__array.shift();
      this.__updateLength();
      // remove the possible added event listener
      this._registerEventChaining(null, item, this.length -1);
      // as every item has changed its position, we need to update the event bubbling
      this.__updateEventPropagation(0, this.length);

      // fire change bubbles event
      this.fireDataEvent("changeBubble", {
        value: [],
        name: "0",
        old: [item],
        item: this
      });

      // fire change event
      this.fireDataEvent("change",
        {
          start: 0,
          end: this.length -1,
          type: "remove",
          removed : [item],
          added : []
        }, null
      );
      return item;
    },


    /**
     * Returns a new array based on the range specified by the parameters.
     *
     * @param from {Number} The start index.
     * @param to {Number?null} The zero-based end index. <code>slice</code> extracts
     *   up to but not including <code>to</code>. If omitted, slice extracts to the
     *   end of the array.
     *
     * @return {qx.data.Array} A new array containing the given range of values.
     */
    slice: function(from, to) {
      return new qx.data.Array(this.__array.slice(from, to));
    },


    /**
     * Method to remove and add new elements to the array. A change event
     * will be fired for every removal or addition unless the array is
     * identical before and after splicing.
     *
     * @param startIndex {Integer} The index where the splice should start
     * @param amount {Integer} Defines number of elements which will be removed
     *   at the given position.
     * @param varargs {var} All following parameters will be added at the given
     *   position to the array.
     * @return {qx.data.Array} An data array containing the removed elements.
     *   Keep in to dispose this one, even if you don't use it!
     */
    splice: function(startIndex, amount, varargs) {
      // store the old length
      var oldLength = this.__array.length;

      // invoke the slice on the array
      var returnArray = this.__array.splice.apply(this.__array, arguments);

      // fire a change event for the length
      if (this.__array.length != oldLength) {
        this.__updateLength();
      } else if (amount == arguments.length - 2) {
        // if we added as much items as we removed
        var addedItems = qx.lang.Array.fromArguments(arguments, 2)
        // check if the array content equals the content before the operation
        for (var i = 0; i < addedItems.length; i++) {
          if (addedItems[i] !== returnArray[i]) {
            break;
          }
          // if all added and removed items are equal
          if (i == addedItems.length -1) {
            // prevent all events and return a new array
            return new qx.data.Array();
          }
        }
      }
      // fire an event for the change
      var removed = amount > 0;
      var added = arguments.length > 2;
      if (removed || added) {
        var addedItems = qx.lang.Array.fromArguments(arguments, 2);

        if (returnArray.length == 0) {
          var type = "add";
          var end = startIndex + addedItems.length;
        } else if (addedItems.length == 0) {
          var type = "remove";
          var end = this.length - 1;
        } else {
          var type = "add/remove";
          var end = startIndex + Math.max(addedItems.length, returnArray.length) - 1;
        }

        this.fireDataEvent("change",
          {
            start: startIndex,
            end: end,
            type: type,
            added : addedItems,
            removed : returnArray
          }, null
        );
      }

      // remove the listeners first [BUG #7132]
      for (var i = 0; i < returnArray.length; i++) {
        this._registerEventChaining(null, returnArray[i], i);
      }

      // add listeners
      for (var i = 2; i < arguments.length; i++) {
        this._registerEventChaining(arguments[i], null, startIndex + (i - 2));
      }
      // apply event chaining for every item moved
      this.__updateEventPropagation(startIndex + (arguments.length - 2) - amount, this.length);

      // fire the changeBubble event
      if (removed || added) {
        var value = [];
        for (var i = 2; i < arguments.length; i++) {
          value[i-2] = arguments[i];
        }
        var endIndex = (startIndex + Math.max(arguments.length - 3 , amount - 1));
        var name = startIndex == endIndex ? endIndex : startIndex + "-" + endIndex;

        var eventData = {
          value: value,
          name: name + "",
          old: returnArray,
          item: this
        };
        this.fireDataEvent("changeBubble", eventData);
      }
      return (new qx.data.Array(returnArray));
    },


    /**
     * Sorts the array. If a function is given, this will be used to
     * compare the items. <code>changeBubble</code> event will only be fired,
     * if sorting result differs from original array.
     *
     * @param func {Function} A compare function comparing two parameters and
     *   should return a number.
     */
    sort: function(func) {
      // ignore if the array is empty
      if (this.length == 0) {
        return;
      }
      var oldArray = this.__array.concat();

      this.__array.sort.apply(this.__array, arguments);

      // prevent changeBubble event if nothing has been changed
      if (qx.lang.Array.equals(this.__array, oldArray) === true){
        return;
      }

      this.__updateEventPropagation(0, this.length);

      this.fireDataEvent("change",
        {start: 0, end: this.length - 1, type: "order", added: [], removed: []}, null
      );

      // fire change bubbles event
      this.fireDataEvent("changeBubble", {
        value: this.__array,
        name: "0-" + (this.length - 1),
        old: oldArray,
        item: this
      });
    },


    /**
     * Adds the given items to the beginning of the array. For every element,
     * a change event will be fired.
     *
     * @param varargs {var} As many elements as you want to add to the beginning.
     * @return {Integer} The new length of the array
     */
    unshift: function(varargs) {
      for (var i = arguments.length - 1; i >= 0; i--) {
        this.__array.unshift(arguments[i]);
        this.__updateLength();
        // apply to every item an event listener for the bubbling
        this.__updateEventPropagation(0, this.length);

        // fire change bubbles event
        this.fireDataEvent("changeBubble", {
          value: [this.__array[0]],
          name: "0",
          old: [this.__array[1]],
          item: this
        });

        // fire change event
        this.fireDataEvent("change",
          {
            start: 0,
            end: this.length - 1,
            type: "add",
            added : [arguments[i]],
            removed : []
          }, null
        );
      }
      return this.length;
    },


    /**
     * Returns the list data as native array. Beware of the fact that the
     * internal representation will be returnd and any manipulation of that
     * can cause a misbehavior of the array. This method should only be used for
     * debugging purposes.
     *
     * @return {Array} The native array.
     */
    toArray: function() {
      return this.__array;
    },


    /**
     * Replacement function for the getting of the array value.
     * array[0] should be array.getItem(0).
     *
     * @param index {Number} The index requested of the array element.
     *
     * @return {var} The element at the given index.
     */
    getItem: function(index) {
      return this.__array[index];
    },


    /**
     * Replacement function for the setting of an array value.
     * array[0] = "a" should be array.setItem(0, "a").
     * A change event will be fired if the value changes. Setting the same
     * value again will not lead to a change event.
     *
     * @param index {Number} The index of the array element.
     * @param item {var} The new item to set.
     */
    setItem: function(index, item) {
      var oldItem = this.__array[index];
      // ignore settings of already set items [BUG #4106]
      if (oldItem === item) {
        return;
      }
      this.__array[index] = item;
      // set an event listener for the bubbling
      this._registerEventChaining(item, oldItem, index);
      // only update the length if its changed
      if (this.length != this.__array.length) {
        this.__updateLength();
      }

      // fire change bubbles event
      this.fireDataEvent("changeBubble", {
        value: [item],
        name: index + "",
        old: [oldItem],
        item: this
      });

      // fire change event
      this.fireDataEvent("change",
        {
          start: index,
          end: index,
          type: "add/remove",
          added: [item],
          removed: [oldItem]
        }, null
      );
    },


    /**
     * This method returns the current length stored under .length on each
     * array.
     *
     * @return {Number} The current length of the array.
     */
    getLength: function() {
      return this.length;
    },


    /**
     * Returns the index of the item in the array. If the item is not in the
     * array, -1 will be returned.
     *
     * @param item {var} The item of which the index should be returned.
     * @return {Number} The Index of the given item.
     */
    indexOf: function(item) {
      return this.__array.indexOf(item);
    },

    /**
     * Returns the last index of the item in the array. If the item is not in the
     * array, -1 will be returned.
     *
     * @param item {var} The item of which the index should be returned.
     * @return {Number} The Index of the given item.
     */
    lastIndexOf: function(item) {
      return this.__array.lastIndexOf(item);
    },


    /**
     * Returns the toString of the original Array
     * @return {String} The array as a string.
     */
    toString: function() {
      if (this.__array != null) {
        return this.__array.toString();
      }
      return "";
    },


    /*
    ---------------------------------------------------------------------------
       IMPLEMENTATION OF THE QX.LANG.ARRAY METHODS
    ---------------------------------------------------------------------------
    */
    /**
     * Check if the given item is in the current array.
     *
     * @param item {var} The item which is possibly in the array.
     * @return {Boolean} true, if the array contains the given item.
     */
    contains: function(item) {
      return this.__array.indexOf(item) !== -1;
    },


    /**
     * Return a copy of the given arr
     *
     * @return {qx.data.Array} copy of this
     */
    copy : function() {
      return this.concat();
    },


    /**
     * Insert an element at a given position.
     *
     * @param index {Integer} Position where to insert the item.
     * @param item {var} The element to insert.
     */
    insertAt : function(index, item)
    {
      this.splice(index, 0, item).dispose();
    },


    /**
     * Insert an item into the array before a given item.
     *
     * @param before {var} Insert item before this object.
     * @param item {var} The item to be inserted.
     */
    insertBefore : function(before, item)
    {
      var index = this.indexOf(before);

      if (index == -1) {
        this.push(item);
      } else {
        this.splice(index, 0, item).dispose();
      }
    },


    /**
     * Insert an element into the array after a given item.
     *
     * @param after {var} Insert item after this object.
     * @param item {var} Object to be inserted.
     */
    insertAfter : function(after, item)
    {
      var index = this.indexOf(after);

      if (index == -1 || index == (this.length - 1)) {
        this.push(item);
      } else {
        this.splice(index + 1, 0, item).dispose();
      }
    },


    /**
     * Remove an element from the array at the given index.
     *
     * @param index {Integer} Index of the item to be removed.
     * @return {var} The removed item.
     */
    removeAt : function(index) {
      var returnArray = this.splice(index, 1);
      var item = returnArray.getItem(0);
      returnArray.dispose();
      return item;
    },


    /**
     * Remove all elements from the array.
     *
     * @return {Array} A native array containing the removed elements.
     */
    removeAll : function() {
      // remove all possible added event listeners
      for (var i = 0; i < this.__array.length; i++) {
        this._registerEventChaining(null, this.__array[i], i);
      }

      // ignore if array is empty
      if (this.getLength() == 0) {
        return [];
      }

      // store the old data
      var oldLength = this.getLength();
      var items = this.__array.concat();

      // change the length
      this.__array.length = 0;
      this.__updateLength();

      // fire change bubbles event
      this.fireDataEvent("changeBubble", {
        value: [],
        name: "0-" + (oldLength - 1),
        old: items,
        item: this
      });

      // fire the change event
      this.fireDataEvent("change",
        {
          start: 0,
          end: oldLength - 1,
          type: "remove",
          removed : items,
          added : []
        }, null
      );
      return items;
    },


    /**
     * Append the items of the given array.
     *
     * @param array {Array|qx.data.IListData} The items of this array will
     * be appended.
     * @throws {Error} if the argument is not an array.
     */
    append : function(array)
    {
      // qooxdoo array support
      if (array instanceof qx.data.Array) {
        array = array.toArray();
      }

      // this check is important because opera throws an uncatchable error if
      // apply is called without an array as argument.
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertArray(array, "The parameter must be an array.");
      }

      var oldLength = this.__array.length;
      Array.prototype.push.apply(this.__array, array);

      // add a listener to the new items
      for (var i = 0; i < array.length; i++) {
        this._registerEventChaining(array[i], null, oldLength + i);
      }

      var oldLength = this.length;
      this.__updateLength();

      // fire change bubbles
      var name =
        oldLength == (this.length-1) ?
        oldLength :
        oldLength + "-" + (this.length-1);
      this.fireDataEvent("changeBubble", {
        value: array,
        name: name + "",
        old: [],
        item: this
      });

      // fire the change event
      this.fireDataEvent("change",
        {
          start: oldLength,
          end: this.length - 1,
          type: "add",
          added : array,
          removed : []
        }, null
      );
    },


    /**
     * Remove the given item.
     *
     * @param item {var} Item to be removed from the array.
     * @return {var} The removed item.
     */
    remove : function(item)
    {
      var index = this.indexOf(item);

      if (index != -1)
      {
        this.splice(index, 1).dispose();
        return item;
      }
    },


    /**
     * Check whether the given array has the same content as this.
     * Checks only the equality of the arrays' content.
     *
     * @param array {qx.data.Array} The array to check.
     * @return {Boolean} Whether the two arrays are equal.
     */
    equals : function(array)
    {
      if (this.length !== array.length) {
        return false;
      }

      for (var i = 0; i < this.length; i++)
      {
        if (this.getItem(i) !== array.getItem(i)) {
          return false;
        }
      }

      return true;
    },


    /**
     * Returns the sum of all values in the array. Supports
     * numeric values only.
     *
     * @return {Number} The sum of all values.
     */
    sum : function()
    {
      var result = 0;
      for (var i = 0; i < this.length; i++) {
        result += this.getItem(i);
      }

      return result;
    },


    /**
     * Returns the highest value in the given array.
     * Supports numeric values only.
     *
     * @return {Number | null} The highest of all values or undefined if the
     *   array is empty.
     */
    max : function()
    {
      var result = this.getItem(0);

      for (var i = 1; i < this.length; i++)
      {
        if (this.getItem(i) > result) {
          result = this.getItem(i);
        }
      }

      return result === undefined ? null : result;
    },


    /**
     * Returns the lowest value in the array. Supports
     * numeric values only.
     *
     * @return {Number | null} The lowest of all values or undefined
     *   if the array is empty.
     */
    min : function()
    {
      var result = this.getItem(0);

      for (var i = 1; i < this.length; i++)
      {
        if (this.getItem(i) < result) {
          result = this.getItem(i);
        }
      }

      return result === undefined ? null : result;
    },


    /**
     * Invokes the given function for every item in the array.
     *
     * @param callback {Function} The function which will be call for every
     *   item in the array. It will be invoked with three parameters:
     *   the item, the index and the array itself.
     * @param context {var} The context in which the callback will be invoked.
     */
    forEach : function(callback, context)
    {
      for (var i = 0; i < this.__array.length; i++) {
        callback.call(context, this.__array[i], i, this);
      }
    },


    /*
    ---------------------------------------------------------------------------
      Additional JS1.6 methods
    ---------------------------------------------------------------------------
    */
    /**
     * Creates a new array with all elements that pass the test implemented by
     * the provided function. It returns a new data array instance so make sure
     * to think about disposing it.
     * @param callback {Function} The test function, which will be executed for every
     *   item in the array. The function will have three arguments.
     *   <li><code>item</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param self {var?undefined} The context of the callback.
     * @return {qx.data.Array} A new array instance containing only the items
     *  which passed the test.
     */
    filter : function(callback, self) {
      return new qx.data.Array(this.__array.filter(callback, self));
    },


    /**
     * Creates a new array with the results of calling a provided function on every
     * element in this array. It returns a new data array instance so make sure
     * to think about disposing it.
     * @param callback {Function} The mapping function, which will be executed for every
     *   item in the array. The function will have three arguments.
     *   <li><code>item</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param self {var?undefined} The context of the callback.
     * @return {qx.data.Array} A new array instance containing the new created items.
     */
    map : function(callback, self) {
      return new qx.data.Array(this.__array.map(callback, self));
    },


    /**
     * Tests whether any element in the array passes the test implemented by the
     * provided function.
     * @param callback {Function} The test function, which will be executed for every
     *   item in the array. The function will have three arguments.
     *   <li><code>item</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param self {var?undefined} The context of the callback.
     * @return {Boolean} <code>true</code>, if any element passed the test function.
     */
    some : function(callback, self) {
      return this.__array.some(callback, self);
    },


    /**
     * Tests whether every element in the array passes the test implemented by the
     * provided function.
     * @param callback {Function} The test function, which will be executed for every
     *   item in the array. The function will have three arguments.
     *   <li><code>item</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param self {var?undefined} The context of the callback.
     * @return {Boolean} <code>true</code>, if every element passed the test function.
     */
    every : function(callback, self) {
      return this.__array.every(callback, self);
    },


    /**
     * Apply a function against an accumulator and each value of the array
     * (from left-to-right) as to reduce it to a single value.
     * @param callback {Function} The accumulator function, which will be
     *   executed for every item in the array. The function will have four arguments.
     *   <li><code>previousItem</code>: the previous item</li>
     *   <li><code>currentItem</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param initValue {var?undefined} Object to use as the first argument to the first
     *   call of the callback.
     * @return {var} The returned value of the last accumulator call.
     */
    reduce : function(callback, initValue) {
      return this.__array.reduce(callback, initValue);
    },


    /**
     * Apply a function against an accumulator and each value of the array
     * (from right-to-left) as to reduce it to a single value.
     * @param callback {Function} The accumulator function, which will be
     *   executed for every item in the array. The function will have four arguments.
     *   <li><code>previousItem</code>: the previous item</li>
     *   <li><code>currentItem</code>: the current item in the array</li>
     *   <li><code>index</code>: the index of the current item</li>
     *   <li><code>array</code>: The native array instance, NOT the data array instance.</li>
     * @param initValue {var?undefined} Object to use as the first argument to the first
     *   call of the callback.
     * @return {var} The returned value of the last accumulator call.
     */
    reduceRight : function(callback, initValue) {
      return this.__array.reduceRight(callback, initValue);
    },


    /*
    ---------------------------------------------------------------------------
      INTERNAL HELPERS
    ---------------------------------------------------------------------------
    */
    /**
     * Internal function which updates the length property of the array.
     * Every time the length will be updated, a {@link #changeLength} data
     * event will be fired.
     */
    __updateLength: function() {
      var oldLength = this.length;
      this.length = this.__array.length;
      this.fireDataEvent("changeLength", this.length, oldLength);
    },


    /**
     * Helper to update the event propagation for a range of items.
     * @param from {Number} Start index.
     * @param to {Number} End index.
     */
    __updateEventPropagation : function(from, to) {
      for (var i=from; i < to; i++) {
        this._registerEventChaining(this.__array[i], this.__array[i], i);
      };
    }
  },



  /*
   *****************************************************************************
      DESTRUCTOR
   *****************************************************************************
  */

  destruct : function() {
    for (var i = 0; i < this.__array.length; i++) {
      var item = this.__array[i];
      this._applyEventPropagation(null, item, i);

      // dispose the items on auto dispose
      if (this.isAutoDisposeItems() && item && item instanceof qx.core.Object) {
        item.dispose();
      }
    }

    this.__array = null;
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * This interface should be used in all objects managing a set of items
 * implementing {@link qx.ui.form.IModel}.
 */
qx.Interface.define("qx.ui.form.IModelSelection",
{

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Tries to set the selection using the given array containing the
     * representative models for the selectables.
     *
     * @param value {Array} An array of models.
     */
    setModelSelection : function(value) {},


    /**
     * Returns an array of the selected models.
     *
     * @return {Array} An array containing the models of the currently selected
     *   items.
     */
    getModelSelection : function() {}
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
     * Christian Hagendorn (chris_schmidt)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * The radio group handles a collection of items from which only one item
 * can be selected. Selection another item will deselect the previously selected
 * item.
 *
 * This class is e.g. used to create radio groups or {@link qx.ui.form.RadioButton}
 * or {@link qx.ui.toolbar.RadioButton} instances.
 *
 * We also offer a widget for the same purpose which uses this class. So if
 * you like to act with a widget instead of a pure logic coupling of the
 * widgets, take a look at the {@link qx.ui.form.RadioButtonGroup} widget.
 */
qx.Class.define("qx.ui.form.RadioGroup",
{
  extend : qx.core.Object,
  implement : [
    qx.ui.core.ISingleSelection,
    qx.ui.form.IForm,
    qx.ui.form.IModelSelection
  ],
  include : [
    qx.ui.core.MSingleSelectionHandling,
    qx.ui.form.MModelSelection
  ],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */


  /**
   * @param varargs {qx.core.Object} A variable number of items, which are
   *     initially added to the radio group, the first item will be selected.
   */
  construct : function(varargs)
  {
    this.base(arguments);

    // create item array
    this.__items = [];

    // add listener before call add!!!
    this.addListener("changeSelection", this.__onChangeSelection, this);

    if (varargs != null) {
      this.add.apply(this, arguments);
    }
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */


  properties :
  {
    /**
     * Whether the radio group is enabled
     */
    enabled :
    {
      check : "Boolean",
      apply : "_applyEnabled",
      event : "changeEnabled",
      init: true
    },

    /**
     * Whether the selection should wrap around. This means that the successor of
     * the last item is the first item.
     */
    wrap :
    {
      check : "Boolean",
      init: true
    },

    /**
     * If is set to <code>true</code> the selection could be empty,
     * otherwise is always one <code>RadioButton</code> selected.
     */
    allowEmptySelection :
    {
      check : "Boolean",
      init : false,
      apply : "_applyAllowEmptySelection"
    },

    /**
     * Flag signaling if the group at all is valid. All children will have the
     * same state.
     */
    valid : {
      check : "Boolean",
      init : true,
      apply : "_applyValid",
      event : "changeValid"
    },

    /**
     * Flag signaling if the group is required.
     */
    required : {
      check : "Boolean",
      init : false,
      event : "changeRequired"
    },

    /**
     * Message which is shown in an invalid tooltip.
     */
    invalidMessage : {
      check : "String",
      init: "",
      event : "changeInvalidMessage",
      apply : "_applyInvalidMessage"
    },


    /**
     * Message which is shown in an invalid tooltip if the {@link #required} is
     * set to true.
     */
    requiredInvalidMessage : {
      check : "String",
      nullable : true,
      event : "changeInvalidMessage"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    /** @type {qx.ui.form.IRadioItem[]} The items of the radio group */
    __items : null,


    /*
    ---------------------------------------------------------------------------
      UTILITIES
    ---------------------------------------------------------------------------
    */


    /**
     * Get all managed items
     *
     * @return {qx.ui.form.IRadioItem[]} All managed items.
     */
    getItems : function() {
      return this.__items;
    },


    /*
    ---------------------------------------------------------------------------
      REGISTRY
    ---------------------------------------------------------------------------
    */


    /**
     * Add the passed items to the radio group.
     *
     * @param varargs {qx.ui.form.IRadioItem} A variable number of items to add.
     */
    add : function(varargs)
    {
      var items = this.__items;
      var item;

      for (var i=0, l=arguments.length; i<l; i++)
      {
        item = arguments[i];

        if (qx.lang.Array.contains(items, item)) {
          continue;
        }

        // Register listeners
        item.addListener("changeValue", this._onItemChangeChecked, this);

        // Push RadioButton to array
        items.push(item);

        // Inform radio button about new group
        item.setGroup(this);

        // Need to update internal value?
        if (item.getValue()) {
          this.setSelection([item]);
        }
      }

      // Select first item when only one is registered
      if (!this.isAllowEmptySelection() && items.length > 0 && !this.getSelection()[0]) {
        this.setSelection([items[0]]);
      }
    },

    /**
     * Remove an item from the radio group.
     *
     * @param item {qx.ui.form.IRadioItem} The item to remove.
     */
    remove : function(item)
    {
      var items = this.__items;
      if (qx.lang.Array.contains(items, item))
      {
        // Remove RadioButton from array
        qx.lang.Array.remove(items, item);

        // Inform radio button about new group
        if (item.getGroup() === this) {
          item.resetGroup();
        }

        // Deregister listeners
        item.removeListener("changeValue", this._onItemChangeChecked, this);

        // if the radio was checked, set internal selection to null
        if (item.getValue()) {
          this.resetSelection();
        }
      }
    },


    /**
     * Returns an array containing the group's items.
     *
     * @return {qx.ui.form.IRadioItem[]} The item array
     */
    getChildren : function()
    {
      return this.__items;
    },


    /*
    ---------------------------------------------------------------------------
      LISTENER FOR ITEM CHANGES
    ---------------------------------------------------------------------------
    */


    /**
     * Event listener for <code>changeValue</code> event of every managed item.
     *
     * @param e {qx.event.type.Data} Data event
     */
    _onItemChangeChecked : function(e)
    {
      var item = e.getTarget();
      if (item.getValue()) {
        this.setSelection([item]);
      } else if (this.getSelection()[0] == item) {
        this.resetSelection();
      }
    },


    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */
    // property apply
    _applyInvalidMessage : function(value, old) {
      for (var i = 0; i < this.__items.length; i++) {
        this.__items[i].setInvalidMessage(value);
      }
    },

    // property apply
    _applyValid: function(value, old) {
      for (var i = 0; i < this.__items.length; i++) {
        this.__items[i].setValid(value);
      }
    },

    // property apply
    _applyEnabled : function(value, old)
    {
      var items = this.__items;
      if (value == null)
      {
        for (var i=0, l=items.length; i<l; i++) {
          items[i].resetEnabled();
        }
      }
      else
      {
        for (var i=0, l=items.length; i<l; i++) {
          items[i].setEnabled(value);
        }
      }
    },

    // property apply
    _applyAllowEmptySelection : function(value, old)
    {
      if (!value && this.isSelectionEmpty()) {
        this.resetSelection();
      }
    },


    /*
    ---------------------------------------------------------------------------
      SELECTION
    ---------------------------------------------------------------------------
    */


    /**
     * Select the item following the given item.
     */
    selectNext : function()
    {
      var item = this.getSelection()[0];
      var items = this.__items;
      var index = items.indexOf(item);
      if (index == -1) {
        return;
      }

      var i = 0;
      var length = items.length;

      // Find next enabled item
      if (this.getWrap()) {
        index = (index + 1) % length;
      } else {
        index = Math.min(index + 1, length - 1);
      }

      while (i < length && !items[index].getEnabled())
      {
        index = (index + 1) % length;
        i++;
      }

      this.setSelection([items[index]]);
    },


    /**
     * Select the item previous the given item.
     */
    selectPrevious : function()
    {
      var item = this.getSelection()[0];
      var items = this.__items;
      var index = items.indexOf(item);
      if (index == -1) {
        return;
      }

      var i = 0;
      var length = items.length;

      // Find previous enabled item
      if (this.getWrap()) {
        index = (index - 1 + length) % length;
      } else {
        index = Math.max(index - 1, 0);
      }

      while (i < length && !items[index].getEnabled())
      {
        index = (index - 1 + length) % length;
        i++;
      }

      this.setSelection([items[index]]);
    },


    /*
    ---------------------------------------------------------------------------
      HELPER METHODS FOR SELECTION API
    ---------------------------------------------------------------------------
    */


    /**
     * Returns the items for the selection.
     *
     * @return {qx.ui.form.IRadioItem[]} Items to select.
     */
    _getItems : function() {
      return this.getItems();
    },

    /**
     * Returns if the selection could be empty or not.
     *
     * @return {Boolean} <code>true</code> If selection could be empty,
     *    <code>false</code> otherwise.
     */
    _isAllowEmptySelection: function() {
      return this.isAllowEmptySelection();
    },


    /**
     * Returns whether the item is selectable. In opposite to the default
     * implementation (which checks for visible items) every radio button
     * which is part of the group is selected even if it is currently not visible.
     *
     * @param item {qx.ui.form.IRadioItem} The item to check if its selectable.
     * @return {Boolean} <code>true</code> if the item is part of the radio group
     *    <code>false</code> otherwise.
     */
    _isItemSelectable : function(item) {
      return this.__items.indexOf(item) != -1;
    },


    /**
     * Event handler for <code>changeSelection</code>.
     *
     * @param e {qx.event.type.Data} Data event.
     */
    __onChangeSelection : function(e)
    {
      var value = e.getData()[0];
      var old = e.getOldData()[0];

      if (old) {
        old.setValue(false);
      }

      if (value) {
        value.setValue(true);
      }
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */


  destruct : function() {
    this._disposeArray("__items");
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
     See the LICENSE file in the project's left-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * Container, which provides scrolling in one dimension (vertical or horizontal).
 *
 * @childControl button-forward {qx.ui.form.RepeatButton} button to step forward
 * @childControl button-backward {qx.ui.form.RepeatButton} button to step backward
 * @childControl content {qx.ui.container.Composite} container to hold the content
 * @childControl scrollpane {qx.ui.core.scroll.ScrollPane} the scroll pane holds the content to enable scrolling
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   // create slide bar container
 *   slideBar = new qx.ui.container.SlideBar().set({
 *     width: 300
 *   });
 *
 *   // set layout
 *   slideBar.setLayout(new qx.ui.layout.HBox());
 *
 *   // add some widgets
 *   for (var i=0; i<10; i++)
 *   {
 *     slideBar.add((new qx.ui.core.Widget()).set({
 *       backgroundColor : (i % 2 == 0) ? "red" : "blue",
 *       width : 60
 *     }));
 *   }
 *
 *   this.getRoot().add(slideBar);
 * </pre>
 *
 * This example creates a SlideBar and add some widgets with alternating
 * background colors. Since the content is larger than the container, two
 * scroll buttons at the left and the right edge are shown.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/slidebar.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.container.SlideBar",
{
  extend : qx.ui.core.Widget,

  include :
  [
    qx.ui.core.MRemoteChildrenHandling,
    qx.ui.core.MRemoteLayoutHandling
  ],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param orientation {String?"horizontal"} The slide bar orientation
   */
  construct : function(orientation)
  {
    this.base(arguments);

    var scrollPane = this.getChildControl("scrollpane");
    this._add(scrollPane, {flex: 1});

    if (orientation != null) {
      this.setOrientation(orientation);
    } else {
      this.initOrientation();
    }

    this.addListener("roll", this._onRoll, this);
  },




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
      init : "slidebar"
    },

    /** Orientation of the bar */
    orientation :
    {
      check : ["horizontal", "vertical"],
      init : "horizontal",
      apply : "_applyOrientation"
    },

    /** The number of pixels to scroll if the buttons are pressed */
    scrollStep :
    {
      check : "Integer",
      init : 15,
      themeable : true
    }
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired on scroll animation end invoked by 'scroll*' methods. */
    scrollAnimationEnd : "qx.event.type.Event"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    getChildrenContainer : function() {
      return this.getChildControl("content");
    },


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "button-forward":
          control = new qx.ui.form.RepeatButton;
          control.addListener("execute", this._onExecuteForward, this);
          control.setFocusable(false);
          this._addAt(control, 2);
          break;

        case "button-backward":
          control = new qx.ui.form.RepeatButton;
          control.addListener("execute", this._onExecuteBackward, this);
          control.setFocusable(false);
          this._addAt(control, 0);
          break;

        case "content":
          control = new qx.ui.container.Composite();

          this.getChildControl("scrollpane").add(control);
          break;

        case "scrollpane":
          control = new qx.ui.core.scroll.ScrollPane();
          control.addListener("update", this._onResize, this);
          control.addListener("scrollX", this._onScroll, this);
          control.addListener("scrollY", this._onScroll, this);
          control.addListener("scrollAnimationEnd", this._onScrollAnimationEnd, this);
          break;
      }

      return control || this.base(arguments, id);
    },

    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      barLeft : true,
      barTop : true,
      barRight : true,
      barBottom : true
    },

    /*
    ---------------------------------------------------------------------------
      PUBLIC SCROLL API
    ---------------------------------------------------------------------------
    */

    /**
     * Scrolls the element's content by the given amount.
     *
     * @param offset {Integer?0} Amount to scroll
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollBy : function(offset, duration)
    {
      var pane = this.getChildControl("scrollpane");
      if (this.getOrientation() === "horizontal") {
        pane.scrollByX(offset, duration);
      } else {
        pane.scrollByY(offset, duration);
      }
    },


    /**
     * Scrolls the element's content to the given coordinate
     *
     * @param value {Integer} The position to scroll to.
     * @param duration {Number?} The time in milliseconds the scroll to should take.
     */
    scrollTo : function(value, duration)
    {
      var pane = this.getChildControl("scrollpane");
      if (this.getOrientation() === "horizontal") {
        pane.scrollToX(value, duration);
      } else {
        pane.scrollToY(value, duration);
      }
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */
    // overridden
    _applyEnabled : function(value, old, name) {
      this.base(arguments, value, old, name);
      this._updateArrowsEnabled();
    },


    // property apply
    _applyOrientation : function(value, old)
    {
      var oldLayouts = [this.getLayout(), this._getLayout()];
      var buttonForward = this.getChildControl("button-forward");
      var buttonBackward = this.getChildControl("button-backward");

      // old can also be null, so we have to check both explicitly to set
      // the states correctly.
      if (old == "vertical" && value == "horizontal")
      {
        buttonForward.removeState("vertical");
        buttonBackward.removeState("vertical");
        buttonForward.addState("horizontal");
        buttonBackward.addState("horizontal");
      }
      else if (old == "horizontal" && value == "vertical")
      {
        buttonForward.removeState("horizontal");
        buttonBackward.removeState("horizontal");
        buttonForward.addState("vertical");
        buttonBackward.addState("vertical");
      }


      if (value == "horizontal")
      {
        this._setLayout(new qx.ui.layout.HBox());
        this.setLayout(new qx.ui.layout.HBox());
      }
      else
      {
        this._setLayout(new qx.ui.layout.VBox());
        this.setLayout(new qx.ui.layout.VBox());
      }

      if (oldLayouts[0]) {
        oldLayouts[0].dispose();
      }

      if (oldLayouts[1]) {
        oldLayouts[1].dispose();
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */

    /**
     * Scrolls pane on roll events
     *
     * @param e {qx.event.type.Roll} the roll event
     */
    _onRoll : function(e)
    {
      // only wheel and touch
      if (e.getPointerType() == "mouse") {
        return;
      }

      var delta = 0;
      var pane = this.getChildControl("scrollpane");
      if (this.getOrientation() === "horizontal") {
        delta = e.getDelta().x;

        var position = pane.getScrollX();
        var max = pane.getScrollMaxX();
        var steps = parseInt(delta);

        // pass the event to the parent if both scrollbars are at the end
        if (!(
          steps < 0 && position <= 0 ||
          steps > 0 && position >= max ||
          delta == 0)
        ) {
          e.stop();
        } else {
          e.stopMomentum();
        }
      } else {
        delta = e.getDelta().y;

        var position = pane.getScrollY();
        var max = pane.getScrollMaxY();
        var steps = parseInt(delta);

        // pass the event to the parent if both scrollbars are at the end
        if (!(
          steps < 0 && position <= 0 ||
          steps > 0 && position >= max ||
          delta == 0
        )) {
          e.stop();
        } else {
          e.stopMomentum();
        }
      }
      this.scrollBy(parseInt(delta, 10));

      // block all momentum scrolling
      if (e.getMomentum()) {
        e.stop();
      }
    },


    /**
     * Update arrow enabled state after scrolling
     */
    _onScroll : function() {
      this._updateArrowsEnabled();
    },


    /**
     * Handler to fire the 'scrollAnimationEnd' event.
     */
    _onScrollAnimationEnd : function() {
      this.fireEvent("scrollAnimationEnd");
    },


    /**
     * Listener for resize event. This event is fired after the
     * first flush of the element which leads to another queuing
     * when the changes modify the visibility of the scroll buttons.
     *
     * @param e {Event} Event object
     */
    _onResize : function(e)
    {
      var content = this.getChildControl("scrollpane").getChildren()[0];
      if (!content) {
        return;
      }

      var innerSize = this.getInnerSize();
      var contentSize = content.getBounds();

      var overflow = (this.getOrientation() === "horizontal") ?
        contentSize.width > innerSize.width :
        contentSize.height > innerSize.height;

      if (overflow) {
        this._showArrows()
        this._updateArrowsEnabled();
      } else {
        this._hideArrows();
      }
    },


    /**
     * Scroll handler for left scrolling
     *
     */
    _onExecuteBackward : function() {
      this.scrollBy(-this.getScrollStep());
    },


    /**
     * Scroll handler for right scrolling
     *
     */
    _onExecuteForward : function() {
      this.scrollBy(this.getScrollStep());
    },


    /*
    ---------------------------------------------------------------------------
      UTILITIES
    ---------------------------------------------------------------------------
    */

    /**
     * Update arrow enabled state
     */
    _updateArrowsEnabled : function()
    {
      // set the disables state directly because we are overriding the
      // inheritance
      if (!this.getEnabled()) {
        this.getChildControl("button-backward").setEnabled(false);
        this.getChildControl("button-forward").setEnabled(false);
        return;
      }

      var pane = this.getChildControl("scrollpane");

      if (this.getOrientation() === "horizontal")
      {
        var position = pane.getScrollX();
        var max = pane.getScrollMaxX();
      }
      else
      {
        var position = pane.getScrollY();
        var max = pane.getScrollMaxY();
      }

      this.getChildControl("button-backward").setEnabled(position > 0);
      this.getChildControl("button-forward").setEnabled(position < max);
    },


    /**
     * Show the arrows (Called from resize event)
     *
     */
    _showArrows : function()
    {
      this._showChildControl("button-forward");
      this._showChildControl("button-backward");
    },


    /**
     * Hide the arrows (Called from resize event)
     *
     */
    _hideArrows : function()
    {
      this._excludeChildControl("button-forward");
      this._excludeChildControl("button-backward");

      this.scrollTo(0);
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
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)
     * Adrian Olaru (adrianolaru)

************************************************************************ */

/**
 * The stack container puts its child widgets on top of each other and only the
 * topmost widget is visible.
 *
 * This is used e.g. in the tab view widget. Which widget is visible can be
 * controlled by using the {@link #getSelection} method.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   // create stack container
 *   var stack = new qx.ui.container.Stack();
 *
 *   // add some children
 *   stack.add(new qx.ui.core.Widget().set({
 *    backgroundColor: "red"
 *   }));
 *   stack.add(new qx.ui.core.Widget().set({
 *    backgroundColor: "green"
 *   }));
 *   stack.add(new qx.ui.core.Widget().set({
 *    backgroundColor: "blue"
 *   }));
 *
 *   // select green widget
 *   stack.setSelection([stack.getChildren()[1]]);
 *
 *   this.getRoot().add(stack);
 * </pre>
 *
 * This example creates an stack with three children. Only the selected "green"
 * widget is visible.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/stack.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.container.Stack",
{
  extend : qx.ui.core.Widget,
  implement : qx.ui.core.ISingleSelection,
  include : [
    qx.ui.core.MSingleSelectionHandling,
    qx.ui.core.MChildrenHandling
  ],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */


  construct : function()
  {
    this.base(arguments);

    this._setLayout(new qx.ui.layout.Grow);

    this.addListener("changeSelection", this.__onChangeSelection, this);
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Whether the size of the widget depends on the selected child. When
     * disabled (default) the size is configured to the largest child.
     */
    dynamic :
    {
      check : "Boolean",
      init : false,
      apply : "_applyDynamic"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    // property apply
    _applyDynamic : function(value)
    {
      var children = this._getChildren();
      var selected = this.getSelection()[0];
      var child;

      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];

        if (child != selected)
        {
          if (value) {
            children[i].exclude();
          } else {
            children[i].hide();
          }
        }
      }
    },


    /*
    ---------------------------------------------------------------------------
      HELPER METHODS FOR SELECTION API
    ---------------------------------------------------------------------------
    */


    /**
     * Returns the widget for the selection.
     * @return {qx.ui.core.Widget[]} Widgets to select.
     */
    _getItems : function() {
      return this.getChildren();
    },

    /**
     * Returns if the selection could be empty or not.
     *
     * @return {Boolean} <code>true</code> If selection could be empty,
     *    <code>false</code> otherwise.
     */
    _isAllowEmptySelection : function() {
      return true;
    },

    /**
     * Returns whether the given item is selectable.
     *
     * @param item {qx.ui.core.Widget} The item to be checked
     * @return {Boolean} Whether the given item is selectable
     */
    _isItemSelectable : function(item) {
      return true;
    },

    /**
     * Event handler for <code>changeSelection</code>.
     *
     * Shows the new selected widget and hide the old one.
     *
     * @param e {qx.event.type.Data} Data event.
     */
    __onChangeSelection : function(e)
    {
      var old = e.getOldData()[0];
      var value = e.getData()[0];

      if (old)
      {
        if (this.isDynamic()) {
          old.exclude();
        } else {
          old.hide();
        }
      }

      if (value) {
        value.show();
      }
    },


    //overriden
    _afterAddChild : function(child) {
      var selected = this.getSelection()[0];

      if (!selected) {
        this.setSelection([child]);
      } else if (selected !== child) {
        if (this.isDynamic()) {
          child.exclude();
        } else {
          child.hide();
        }
      }
    },


    //overriden
    _afterRemoveChild : function(child) {
      if (this.getSelection()[0] === child) {
        var first = this._getChildren()[0];

        if (first) {
          this.setSelection([first]);
        } else {
          this.resetSelection();
        }
      }
    },


    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */

    /**
     * Go to the previous child in the children list.
     */
    previous : function()
    {
      var selected = this.getSelection()[0];
      var go = this._indexOf(selected)-1;
      var children = this._getChildren();

      if (go < 0) {
        go = children.length - 1;
      }

      var prev = children[go];
      this.setSelection([prev]);
    },

    /**
     * Go to the next child in the children list.
     */
    next : function()
    {
      var selected = this.getSelection()[0];
      var go = this._indexOf(selected)+1;
      var children = this._getChildren();

      var next = children[go] || children[0];

      this.setSelection([next]);
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
     * Martin Wittemann (martinwittemann)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * A page is the way to add content to a {@link TabView}. Each page gets a
 * button to switch to the page. Only one page is visible at a time.
 *
 * @childControl button {qx.ui.tabview.TabButton} tab button connected to the page
 */
qx.Class.define("qx.ui.tabview.Page",
{
  extend : qx.ui.container.Composite,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} Initial label of the tab
   * @param icon {String} Initial icon of the tab
   */
  construct : function(label, icon)
  {
    this.base(arguments);

    this._createChildControl("button");

    // init
    if (label != null) {
      this.setLabel(label);
    }

    if (icon != null) {
      this.setIcon(icon);
    }

  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired by {@link qx.ui.tabview.TabButton} if the close button is tapped.
     */
    "close" : "qx.event.type.Event"
  },


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
      init : "tabview-page"
    },


    /** The label/caption/text of the Page's button. */
    label :
    {
      check : "String",
      init : "",
      apply : "_applyLabel"
    },


    /** Any URI String supported by qx.ui.basic.Image to display an icon in Page's button. */
    icon :
    {
      check : "String",
      init : "",
      apply : "_applyIcon",
      nullable: true
    },

    /** Indicates if the close button of a TabButton should be shown. */
    showCloseButton :
    {
      check : "Boolean",
      init : false,
      apply : "_applyShowCloseButton"
    }

  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      barTop : 1,
      barRight : 1,
      barBottom : 1,
      barLeft : 1,
      firstTab : 1,
      lastTab : 1
    },



    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyIcon : function(value, old) {
      var btn = this.getChildControl("button");
      if (value) {
        btn.setIcon(value);
        btn._showChildControl("icon");
      } else {
        btn._excludeChildControl("icon");
      }
    },


    // property apply
    _applyLabel : function(value, old) {
      this.getChildControl("button").setLabel(value);
    },


    // overridden
    _applyEnabled: function(value, old)
    {
      this.base(arguments, value, old);

      // delegate to non-child widget button
      // since enabled is inheritable value may be null
      var btn = this.getChildControl("button");
      value == null ? btn.resetEnabled() : btn.setEnabled(value);
    },




    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "button":
          control = new qx.ui.tabview.TabButton;
          control.setAllowGrowX(true);
          control.setAllowGrowY(true);

          control.setUserData("page", this);
          control.addListener("close", this._onButtonClose, this);
          break;
      }

      return control || this.base(arguments, id);
    },

    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyShowCloseButton : function(value, old) {
      this.getChildControl("button").setShowCloseButton(value);
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */

    /**
     * Fires an "close" event when the close button of the TabButton of the page
     * is tapped.
     */
    _onButtonClose : function() {
      this.fireEvent("close");
    },


    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the button used within this page. This method is used by
     * the TabView to access the button.
     *
     * @internal
     * @return {qx.ui.form.RadioButton} The button associated with this page.
     */
    getButton: function() {
      return this.getChildControl("button");
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Each object, which should be managed by a {@link RadioGroup} have to
 * implement this interface.
 */
qx.Interface.define("qx.ui.form.IRadioItem",
{

  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the item was checked or unchecked */
    "changeValue" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Set whether the item is checked
     *
     * @param value {Boolean} whether the item should be checked
     */
    setValue : function(value) {},


    /**
     * Get whether the item is checked
     *
     * @return {Boolean} whether the item it checked
     */
    getValue : function() {},


    /**
     * Set the radiogroup, which manages this item
     *
     * @param value {qx.ui.form.RadioGroup} The radiogroup, which should
     *     manage the item.
     */
    setGroup : function(value) {
      this.assertInstance(value, qx.ui.form.RadioGroup);
    },


    /**
     * Get the radiogroup, which manages this item
     *
     * @return {qx.ui.form.RadioGroup} The radiogroup, which manages the item.
     */
    getGroup : function() {}
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * Can be included for implementing {@link qx.ui.form.IModel}. It only contains
 * a nullable property named 'model' with a 'changeModel' event.
 */
qx.Mixin.define("qx.ui.form.MModelProperty",
{
  properties :
  {
    /**
     * Model property for storing additional information for the including
     * object. It can act as value property on form items for example.
     *
     * Be careful using that property as this is used for the
     * {@link qx.ui.form.MModelSelection} it has some restrictions:
     *
     * * Don't use equal models in one widget using the
     *     {@link qx.ui.form.MModelSelection}.
     *
     * * Avoid setting only some model properties if the widgets are added to
     *     a {@link qx.ui.form.MModelSelection} widge.
     *
     * Both restrictions result of the fact, that the set models are deputies
     * for their widget.
     */
    model :
    {
      nullable : true,
      event : "changeModel",
      apply : "_applyModel",
      dereference : true
    }
  },


  members :
  {
    // apply method
    _applyModel : function(value, old) {
      // Empty implementation
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Form interface for all form widgets which have boolean as their primary
 * data type like a checkbox.
 */
qx.Interface.define("qx.ui.form.IBooleanForm",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the value was modified */
    "changeValue" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      VALUE PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the element's value.
     *
     * @param value {Boolean|null} The new value of the element.
     */
    setValue : function(value) {
      return arguments.length == 1;
    },


    /**
     * Resets the element's value to its initial value.
     */
    resetValue : function() {},


    /**
     * The element's user set value.
     *
     * @return {Boolean|null} The value.
     */
    getValue : function() {}
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Each object which wants to store data representative for the real item
 * should implement this interface.
 */
qx.Interface.define("qx.ui.form.IModel",
{

  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the model data changes */
    "changeModel" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Set the representative data for the item.
     *
     * @param value {var} The data.
     */
    setModel : function(value) {},


    /**
     * Returns the representative data for the item
     *
     * @return {var} The data.
     */
    getModel : function() {},


    /**
     * Sets the representative data to null.
     */
    resetModel : function() {}
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
 * Radio buttons can be used in radio groups to allow to the user to select
 * exactly one item from a list. Radio groups are established by adding
 * radio buttons to a radio manager {@link qx.ui.form.RadioGroup}.
 *
 * Example:
 * <pre class="javascript">
 *   var container = new qx.ui.container.Composite(new qx.ui.layout.VBox);
 *
 *   var female = new qx.ui.form.RadioButton("female");
 *   var male = new qx.ui.form.RadioButton("male");
 *
 *   var mgr = new qx.ui.form.RadioGroup();
 *   mgr.add(female, male);
 *
 *   container.add(male);
 *   container.add(female);
 * </pre>
 */
qx.Class.define("qx.ui.form.RadioButton",
{
  extend : qx.ui.form.Button,
  include : [
    qx.ui.form.MForm,
    qx.ui.form.MModelProperty
  ],
  implement : [
    qx.ui.form.IRadioItem,
    qx.ui.form.IForm,
    qx.ui.form.IBooleanForm,
    qx.ui.form.IModel
  ],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String?null} An optional label for the radio button.
   */
  construct : function(label)
  {
    if (qx.core.Environment.get("qx.debug")) {
      this.assertArgumentsCount(arguments, 0, 1);
    }

    this.base(arguments, label);

    // Add listeners
    this.addListener("execute", this._onExecute);
    this.addListener("keypress", this._onKeyPress);
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The assigned qx.ui.form.RadioGroup which handles the switching between registered buttons */
    group :
    {
      check  : "qx.ui.form.RadioGroup",
      nullable : true,
      apply : "_applyGroup"
    },

    /** The value of the widget. True, if the widget is checked. */
    value :
    {
      check : "Boolean",
      nullable : true,
      event : "changeValue",
      apply : "_applyValue",
      init: false
    },

    // overridden
    appearance :
    {
      refine : true,
      init : "radiobutton"
    },

    // overridden
    allowGrowX :
    {
      refine : true,
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
    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      checked : true,
      focused : true,
      invalid : true,
      hovered : true
    },

    // overridden (from MExecutable to keet the icon out of the binding)
    /**
     * @lint ignoreReferenceField(_bindableProperties)
     */
    _bindableProperties :
    [
      "enabled",
      "label",
      "toolTipText",
      "value",
      "menu"
    ],

    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyValue : function(value, old)
    {
      value ?
        this.addState("checked") :
        this.removeState("checked");
    },


    /** The assigned {@link qx.ui.form.RadioGroup} which handles the switching between registered buttons */
    _applyGroup : function(value, old)
    {
      if (old) {
        old.remove(this);
      }

      if (value) {
        value.add(this);
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENT-HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Event listener for the "execute" event.
     *
     * Sets the property "checked" to true.
     *
     * @param e {qx.event.type.Event} execute event
     */
    _onExecute : function(e) {
      var grp = this.getGroup();
      if (grp && grp.getAllowEmptySelection()) {
        this.toggleValue();
      } else {
        this.setValue(true);
      }
    },


    /**
     * Event listener for the "keyPress" event.
     *
     * Selects the previous RadioButton when pressing "Left" or "Up" and
     * Selects the next RadioButton when pressing "Right" and "Down"
     *
     * @param e {qx.event.type.KeySequence} KeyPress event
     */
    _onKeyPress : function(e)
    {

      var grp = this.getGroup();
      if (!grp) {
        return;
      }

      switch(e.getKeyIdentifier())
      {
        case "Left":
        case "Up":
          grp.selectPrevious();
          break;

        case "Right":
        case "Down":
          grp.selectNext();
          break;
      }
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
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * A TabButton is the tapable part sitting on the {@link qx.ui.tabview.Page}.
 * By tapping on the TabButton the user can set a Page active.
 *
 * @childControl label {qx.ui.basic.Label} label of the tab button
 * @childControl icon {qx.ui.basic.Image} icon of the tab button
 * @childControl close-button {qx.ui.form.Button} close button of the tab button
 */
qx.Class.define("qx.ui.tabview.TabButton",
{
  extend : qx.ui.form.RadioButton,
  implement : qx.ui.form.IRadioItem,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    var layout = new qx.ui.layout.Grid(2, 0);
    layout.setRowAlign(0, "left", "middle");
    layout.setColumnAlign(0, "right", "middle");

    this._getLayout().dispose();
    this._setLayout(layout);

    this.initShowCloseButton();
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired by {@link qx.ui.tabview.Page} if the close button is tapped.
     *
     * Event data: The tab button.
     */
    "close" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {

    /** Indicates if the close button of a TabButton should be shown. */
    showCloseButton :
    {
      check : "Boolean",
      init : false,
      apply : "_applyShowCloseButton"
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
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      focused : true,
      checked : true
    },

    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    _applyIconPosition : function(value, old)
    {

      var children = {
        icon : this.getChildControl("icon"),
        label : this.getChildControl("label"),
        closeButton : this.getShowCloseButton() ? this.getChildControl("close-button") : null
      };

      // Remove all children before adding them again
      for (var child in children)
      {
        if (children[child]) {
          this._remove(children[child]);
        }
      }

      switch (value)
      {
        case "top":
          this._add(children.label, {row: 3, column: 2});
          this._add(children.icon, {row: 1, column: 2});
          if (children.closeButton) {
            this._add(children.closeButton, {row: 0, column: 4});
          }
          break;

        case "bottom":
          this._add(children.label, {row: 1, column: 2});
          this._add(children.icon, {row: 3, column: 2});
          if (children.closeButton) {
            this._add(children.closeButton, {row: 0, column: 4});
          }
          break;

        case "left":
          this._add(children.label, {row: 0, column: 2});
          this._add(children.icon, {row: 0, column: 0});
          if (children.closeButton) {
            this._add(children.closeButton, {row: 0, column: 4});
          }
          break;

        case "right":
          this._add(children.label, {row: 0, column: 0});
          this._add(children.icon, {row: 0, column: 2});
          if (children.closeButton) {
            this._add(children.closeButton, {row: 0, column: 4});
          }
          break;
      }

    },


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id) {
        case "label":
          var control = new qx.ui.basic.Label(this.getLabel());
          control.setAnonymous(true);
          this._add(control, {row: 0, column: 2});
          this._getLayout().setColumnFlex(2, 1);
          break;

        case "icon":
          control = new qx.ui.basic.Image(this.getIcon());
          control.setAnonymous(true);
          this._add(control, {row: 0, column: 0});
          break;

        case "close-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.setKeepActive(true);
          control.addListener("tap", this._onCloseButtonTap, this);
          this._add(control, {row: 0, column: 4});

          if (!this.getShowCloseButton()) {
            control.exclude();
          }

          break;
      }

      return control || this.base(arguments, id);
    },

    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */


    /**
     * Fires a "close" event when the close button is tapped.
     */
    _onCloseButtonTap : function() {
      this.fireDataEvent("close", this);
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyShowCloseButton : function(value, old)
    {
      if (value) {
        this._showChildControl("close-button");
      } else {
        this._excludeChildControl("close-button");
      }
    },

    // property apply
    _applyCenter : function(value)
    {
      var layout = this._getLayout();

      if (value) {
        layout.setColumnAlign(2, "center", "middle");
      } else {
        layout.setColumnAlign(2, "left", "middle");
      }

    }

  }
});

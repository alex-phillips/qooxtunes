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
     * Jonathan Weiß (jonathan_rass)
     * Tristan Koch (tristankoch)

************************************************************************ */

/**
 * The TextField is a multi-line text input field.
 */
qx.Class.define("qx.ui.form.TextArea",
{
  extend : qx.ui.form.AbstractField,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {String?""} The text area's initial value
   */
  construct : function(value)
  {
    this.base(arguments, value);
    this.initWrap();

    this.addListener("roll", this._onRoll, this);
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Controls whether text wrap is activated or not. */
    wrap :
    {
      check : "Boolean",
      init : true,
      apply : "_applyWrap"
    },

    // overridden
    appearance :
    {
      refine : true,
      init : "textarea"
    },

    /** Factor for scrolling the <code>TextArea</code> with the mouse wheel. */
    singleStep :
    {
      check : "Integer",
      init : 20
    },

    /** Minimal line height. On default this is set to four lines. */
    minimalLineHeight :
    {
      check : "Integer",
      apply : "_applyMinimalLineHeight",
      init : 4
    },

    /**
    * Whether the <code>TextArea</code> should automatically adjust to
    * the height of the content.
    *
    * To set the initial height, modify {@link #minHeight}. If you wish
    * to set a minHeight below four lines of text, also set
    * {@link #minimalLineHeight}. In order to limit growing to a certain
    * height, set {@link #maxHeight} respectively. Please note that
    * autoSize is ignored when the {@link #height} property is in use.
    */
    autoSize :
    {
      check : "Boolean",
      apply : "_applyAutoSize",
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
    __areaClone : null,
    __areaHeight : null,
    __originalAreaHeight : null,

    // overridden
    setValue : function(value)
    {
      value = this.base(arguments, value);
      this.__autoSize();

      return value;
    },

    /**
     * Handles the roll for scrolling the <code>TextArea</code>.
     *
     * @param e {qx.event.type.Roll} roll event.
     */
    _onRoll : function(e) {
      // only wheel
      if (e.getPointerType() != "wheel") {
        return;
      }
      var contentElement = this.getContentElement();
      var scrollY = contentElement.getScrollY();

      contentElement.scrollToY(scrollY + (e.getDelta().y / 30) * this.getSingleStep());

      var newScrollY = contentElement.getScrollY();

      if (newScrollY != scrollY) {
        e.stop();
      }
    },

    /*
    ---------------------------------------------------------------------------
      AUTO SIZE
    ---------------------------------------------------------------------------
    */

    /**
    * Adjust height of <code>TextArea</code> so that content fits without scroll bar.
    *
    */
    __autoSize: function() {
      if (this.isAutoSize()) {
        var clone = this.__getAreaClone();

        if (clone && this.getBounds()) {

          // Remember original area height
          this.__originalAreaHeight = this.__originalAreaHeight || this._getAreaHeight();

          var scrolledHeight = this._getScrolledAreaHeight();

          // Show scroll-bar when above maxHeight, if defined
          if (this.getMaxHeight()) {
            var insets = this.getInsets();
            var innerMaxHeight = -insets.top + this.getMaxHeight() - insets.bottom;
            if (scrolledHeight > innerMaxHeight) {
                this.getContentElement().setStyle("overflowY", "auto");
            } else {
                this.getContentElement().setStyle("overflowY", "hidden");
            }
          }

          // Never shrink below original area height
          var desiredHeight = Math.max(scrolledHeight, this.__originalAreaHeight);

          // Set new height
          this._setAreaHeight(desiredHeight);

        // On init, the clone is not yet present. Try again on appear.
        } else {
          this.getContentElement().addListenerOnce("appear", function() {
            this.__autoSize();
          }, this);
        }
      }
    },

    /**
    * Get actual height of <code>TextArea</code>
    *
    * @return {Integer} Height of <code>TextArea</code>
    */
    _getAreaHeight: function() {
      return this.getInnerSize().height;
    },

    /**
    * Set actual height of <code>TextArea</code>
    *
    * @param height {Integer} Desired height of <code>TextArea</code>
    */
    _setAreaHeight: function(height) {
      if (this._getAreaHeight() !== height) {
        this.__areaHeight = height;

        qx.ui.core.queue.Layout.add(this);

        // Apply height directly. This works-around a visual glitch in WebKit
        // browsers where a line-break causes the text to be moved upwards
        // for one line. Since this change appears instantly whereas the queue
        // is computed later, a flicker is visible.
        qx.ui.core.queue.Manager.flush();

        this.__forceRewrap();
      }
    },

    /**
    * Get scrolled area height. Equals the total height of the <code>TextArea</code>,
    * as if no scroll-bar was visible.
    *
    * @return {Integer} Height of scrolled area
    */
    _getScrolledAreaHeight: function() {
      var clone = this.__getAreaClone();
      var cloneDom = clone.getDomElement();

      if (cloneDom) {

        // Clone created but not yet in DOM. Try again.
        if (!cloneDom.parentNode) {
          qx.html.Element.flush();
          return this._getScrolledAreaHeight();
        }

        // In WebKit and IE8, "wrap" must have been "soft" on DOM level before setting
        // "off" can disable wrapping. To fix, make sure wrap is toggled.
        // Otherwise, the height of an auto-size text area with wrapping
        // disabled initially is incorrectly computed as if wrapping was enabled.
        if (qx.core.Environment.get("engine.name") === "webkit" ||
            (qx.core.Environment.get("engine.name") == "mshtml")) {
          clone.setWrap(!this.getWrap(), true);
        }

        clone.setWrap(this.getWrap(), true);

        // Webkit needs overflow "hidden" in order to correctly compute height
        if (qx.core.Environment.get("engine.name") === "webkit" ||
            (qx.core.Environment.get("engine.name") == "mshtml")) {
          cloneDom.style.overflow = "hidden";
        }

        // IE >= 8 needs overflow "visible" in order to correctly compute height
        if (qx.core.Environment.get("engine.name") == "mshtml" &&
          qx.core.Environment.get("browser.documentmode") >= 8) {
          cloneDom.style.overflow = "visible";
          cloneDom.style.overflowX = "hidden";
        }

        // Update value
        clone.setValue(this.getValue() || "");

        // Force IE > 8 to update size measurements
        if (qx.core.Environment.get("engine.name") == "mshtml") {
          cloneDom.style.height = "auto";
          qx.html.Element.flush();
          cloneDom.style.height = "0";
        }

        // Recompute
        this.__scrollCloneToBottom(clone);

        if (qx.core.Environment.get("engine.name") == "mshtml" &&
            qx.core.Environment.get("browser.documentmode") == 8) {
          // Flush required for scrollTop to return correct value
          // when initial value should be taken into consideration
          if (!cloneDom.scrollTop) {
            qx.html.Element.flush();
          }
        }

        return cloneDom.scrollTop;
      }
    },

    /**
    * Returns the area clone.
    *
    * @return {Element|null} DOM Element or <code>null</code> if there is no
    * original element
    */
    __getAreaClone: function() {
      this.__areaClone = this.__areaClone || this.__createAreaClone();
      return this.__areaClone;
    },

    /**
    * Creates and prepares the area clone.
    *
    * @return {Element} Element
    */
    __createAreaClone: function() {
      var orig,
          clone,
          cloneDom,
          cloneHtml;

      orig = this.getContentElement();

      // An existing DOM element is required
      if (!orig.getDomElement()) {
        return null;
      }

      // Create DOM clone
      cloneDom = qx.bom.Element.clone(orig.getDomElement());

      // Convert to qx.html Element
      cloneHtml = new qx.html.Input("textarea");
      cloneHtml.useElement(cloneDom);
      clone = cloneHtml;

      // Push out of view
      // Zero height (i.e. scrolled area equals height)
      clone.setStyles({
        position: "absolute",
        top: 0,
        left: "-9999px",
        height: 0,
        overflow: "hidden"
      }, true);

      // Fix attributes
      clone.removeAttribute('id');
      clone.removeAttribute('name');
      clone.setAttribute("tabIndex", "-1");

      // Copy value
      clone.setValue(orig.getValue() || "");

      // Attach to DOM
      clone.insertBefore(orig);

      // Make sure scrollTop is actual height
      this.__scrollCloneToBottom(clone);

      return clone;
    },

    /**
    * Scroll <code>TextArea</code> to bottom. That way, scrollTop reflects the height
    * of the <code>TextArea</code>.
    *
    * @param clone {Element} The <code>TextArea</code> to scroll
    */
    __scrollCloneToBottom: function(clone) {
      clone = clone.getDomElement();
      if (clone) {
        clone.scrollTop = 10000;
      }
    },

    /*
    ---------------------------------------------------------------------------
      FIELD API
    ---------------------------------------------------------------------------
    */

    // overridden
    _createInputElement : function()
    {
      return new qx.html.Input("textarea", {
        overflowX: "auto",
        overflowY: "auto"
      });
    },


    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyWrap : function(value, old) {
      this.getContentElement().setWrap(value);
      if (this._placeholder) {
        var whiteSpace = value ? "normal" : "nowrap";
        this._placeholder.setStyle("whiteSpace", whiteSpace);
      }
      this.__autoSize();
    },

    // property apply
    _applyMinimalLineHeight : function() {
      qx.ui.core.queue.Layout.add(this);
    },

    // property apply
    _applyAutoSize: function(value, old) {
      if (qx.core.Environment.get("qx.debug")) {
        this.__warnAutoSizeAndHeight();
      }

      if (value) {
        this.__autoSize();
        this.addListener("input", this.__autoSize, this);

        // This is done asynchronously on purpose. The style given would
        // otherwise be overridden by the DOM changes queued in the
        // property apply for wrap. See [BUG #4493] for more details.
        if (!this.getBounds()) {
          this.addListenerOnce("appear", function() {
            this.getContentElement().setStyle("overflowY", "hidden");
          });
        } else {
          this.getContentElement().setStyle("overflowY", "hidden");
        }

      } else {
        this.removeListener("input", this.__autoSize);
        this.getContentElement().setStyle("overflowY", "auto");
      }
    },


    // property apply
    _applyDimension : function(value) {
      this.base(arguments);

      if (qx.core.Environment.get("qx.debug")) {
        this.__warnAutoSizeAndHeight();
      }

      if (value === this.getMaxHeight()) {
        this.__autoSize();
      }
    },

    /**
     * Force rewrapping of text.
     *
     * The distribution of characters depends on the space available.
     * Unfortunately, browsers do not reliably (or not at all) rewrap text when
     * the size of the text area changes.
     *
     * This method is called on change of the area's size.
     */
    __forceRewrap : function() {
      var content = this.getContentElement();
      var element = content.getDomElement();

      // Temporarily increase width
      var width = content.getStyle("width");
      content.setStyle("width", parseInt(width, 10) + 1000 + "px", true);

      // Force browser to render
      if (element) {
        qx.bom.element.Dimension.getWidth(element);
      }

      // Restore width
      content.setStyle("width", width, true);
    },

    /**
     * Warn when both autoSize and height property are set.
     *
     */
    __warnAutoSizeAndHeight: function() {
      if (this.isAutoSize() && this.getHeight()) {
        this.warn("autoSize is ignored when the height property is set. " +
                  "If you want to set an initial height, use the minHeight " +
                  "property instead.");
      }
    },

    /*
    ---------------------------------------------------------------------------
      LAYOUT
    ---------------------------------------------------------------------------
    */

    // overridden
    _getContentHint : function()
    {
      var hint = this.base(arguments);

      // lines of text
      hint.height = hint.height * this.getMinimalLineHeight();

      // 20 character wide
      hint.width = this._getTextSize().width * 20;

      if (this.isAutoSize()) {
        hint.height = this.__areaHeight || hint.height;
      }

      return hint;
    }
  },


  destruct : function() {
    this.setAutoSize(false);
    if (this.__areaClone) {
      this.__areaClone.dispose();
    }
  }
});
/* ************************************************************************

    qooxdoo - the new era of web development

    http://qooxdoo.org

    Copyright:
      2007 by Tartan Solutions, Inc, http://www.tartansolutions.com

    License:
      LGPL 2.1: http://www.gnu.org/licenses/lgpl.html
      EPL: http://www.eclipse.org/org/documents/epl-v10.php

    Authors:
      * Dan Hummon

************************************************************************ */

/**
 * The conditional cell renderer allows special per cell formatting based on
 * conditions on the cell's value.
 *
 * @require(qx.util.format.NumberFormat)
 */
qx.Class.define("qx.ui.table.cellrenderer.Conditional",
{
  extend : qx.ui.table.cellrenderer.Default,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param align {String|null}
   *   The default text alignment to format the cell with by default.
   *
   * @param color {String|null}
   *   The default font color to format the cell with by default.
   *
   * @param style {String|null}
   *   The default font style to format the cell with by default.
   *
   * @param weight {String|null}
   *   The default font weight to format the cell with by default.
   */
  construct : function(align, color, style, weight)
  {
    this.base(arguments);

    this.numericAllowed = ["==", "!=", ">", "<", ">=", "<="];
    this.betweenAllowed = ["between", "!between"];
    this.conditions = [];

    this.__defaultTextAlign = align || "";
    this.__defaultColor = color || "";
    this.__defaultFontStyle = style || "";
    this.__defaultFontWeight = weight || "";
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __defaultTextAlign : null,
    __defaultColor : null,
    __defaultFontStyle : null,
    __defaultFontWeight : null,


    /**
     * Applies the cell styles to the style map.
     * @param condition {Array} The matched condition
     * @param style {Map} map of already applied styles.
     */
    __applyFormatting : function(condition, style)
    {
      if (condition[1] != null) {
        style["text-align"] = condition[1];
      }

      if (condition[2] != null) {
        style["color"] = condition[2];
      }

      if (condition[3] != null) {
        style["font-style"] = condition[3];
      }

      if (condition[4] != null) {
        style["font-weight"] = condition[4];
      }
    },


    /**
     * The addNumericCondition method is used to add a basic numeric condition to
     * the cell renderer.
     *
     * Note: Passing null is different from passing an empty string in the align,
     * color, style and weight arguments. Null will allow pre-existing formatting
     * to pass through, where an empty string will clear it back to the default
     * formatting set in the constructor.
     *
     *
     * @param condition {String} The type of condition. Accepted strings are "==", "!=", ">", "<", ">=",
     *     and "<=".
     * @param value1 {Integer} The value to compare against.
     * @param align {String|null} The text alignment to format the cell with if the condition matches.
     * @param color {String|null} The font color to format the cell with if the condition matches.
     * @param style {String|null} The font style to format the cell with if the condition matches.
     * @param weight {String|null} The font weight to format the cell with if the condition matches.
     * @param target {String|null} The text value of the column to compare against. If this is null,
     *     comparisons will be against the contents of this cell.
     * @throws {Error} If the condition can not be recognized or value is null.
     */
    addNumericCondition : function(condition, value1, align, color, style, weight, target)
    {
      var temp = null;

      if (qx.lang.Array.contains(this.numericAllowed, condition))
      {
        if (value1 != null) {
          temp = [condition, align, color, style, weight, value1, target];
        }
      }

      if (temp != null) {
        this.conditions.push(temp);
      } else {
        throw new Error("Condition not recognized or value is null!");
      }
    },


    /**
     * The addBetweenCondition method is used to add a between condition to the
     * cell renderer.
     *
     * Note: Passing null is different from passing an empty string in the align,
     * color, style and weight arguments. Null will allow pre-existing formatting
     * to pass through, where an empty string will clear it back to the default
     * formatting set in the constructor.
     *
     *
     * @param condition {String} The type of condition. Accepted strings are "between" and "!between".
     * @param value1 {Integer} The first value to compare against.
     * @param value2 {Integer} The second value to compare against.
     * @param align {String|null} The text alignment to format the cell with if the condition matches.
     * @param color {String|null} The font color to format the cell with if the condition matches.
     * @param style {String|null} The font style to format the cell with if the condition matches.
     * @param weight {String|null} The font weight to format the cell with if the condition matches.
     * @param target {String|null} The text value of the column to compare against. If this is null,
     *     comparisons will be against the contents of this cell.
     * @throws {Error} If the condition can not be recognized or value is null.
     */
    addBetweenCondition : function(condition, value1, value2, align, color, style, weight, target)
    {
      if (qx.lang.Array.contains(this.betweenAllowed, condition))
      {
        if (value1 != null && value2 != null) {
          var temp = [condition, align, color, style, weight, value1, value2, target];
        }
      }

      if (temp != null) {
        this.conditions.push(temp);
      } else {
        throw new Error("Condition not recognized or value1/value2 is null!");
      }
    },


    /**
     * The addRegex method is used to add a regular expression condition to the
     * cell renderer.
     *
     * Note: Passing null is different from passing an empty string in the align,
     * color, style and weight arguments. Null will allow pre-existing formatting
     * to pass through, where an empty string will clear it back to the default
     * formatting set in the constructor.
     *
     *
     * @param regex {String} The regular expression to match against.
     * @param align {String|null} The text alignment to format the cell with if the condition matches.
     * @param color {String|null} The font color to format the cell with if the condition matches.
     * @param style {String|null} The font style to format the cell with if the condition matches.
     * @param weight {String|null} The font weight to format the cell with if the condition matches.
     * @param target {String|null} The text value of the column to compare against. If this is null,
     *     comparisons will be against the contents of this cell.
     * @throws {Error} If the regex is null.
     */
    addRegex : function(regex, align, color, style, weight, target)
    {
      if (regex != null) {
        var temp = ["regex", align, color, style, weight, regex, target];
      }

      if (temp != null) {
        this.conditions.push(temp);
      } else {
        throw new Error("regex cannot be null!");
      }
    },


    /**
     * Overridden; called whenever the cell updates. The cell will iterate through
     * each available condition and apply formatting for those that
     * match. Multiple conditions can match, but later conditions will override
     * earlier ones. Conditions with null values will stack with other conditions
     * that apply to that value.
     *
     * @param cellInfo {Map} The information about the cell.
     *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
     * @return {Map}
     */
    _getCellStyle : function(cellInfo)
    {
      var tableModel = cellInfo.table.getTableModel();
      var i;
      var cond_test;
      var compareValue;

      var style =
      {
        "text-align": this.__defaultTextAlign,
        "color": this.__defaultColor,
        "font-style": this.__defaultFontStyle,
        "font-weight": this.__defaultFontWeight
      };

      for (i in this.conditions)
      {
        cond_test = false;

        if (qx.lang.Array.contains(this.numericAllowed, this.conditions[i][0]))
        {
          if (this.conditions[i][6] == null) {
            compareValue = cellInfo.value;
          } else {
            compareValue = tableModel.getValueById(this.conditions[i][6], cellInfo.row);
          }

          switch(this.conditions[i][0])
          {
            case "==":
              if (compareValue == this.conditions[i][5]) {
                cond_test = true;
              }

              break;

            case "!=":
              if (compareValue != this.conditions[i][5]) {
                cond_test = true;
              }

              break;

            case ">":
              if (compareValue > this.conditions[i][5]) {
                cond_test = true;
              }

              break;

            case "<":
              if (compareValue < this.conditions[i][5]) {
                cond_test = true;
              }

              break;

            case ">=":
              if (compareValue >= this.conditions[i][5]) {
                cond_test = true;
              }

              break;

            case "<=":
              if (compareValue <= this.conditions[i][5]) {
                cond_test = true;
              }

              break;
          }
        }
        else if (qx.lang.Array.contains(this.betweenAllowed, this.conditions[i][0]))
        {
          if (this.conditions[i][7] == null) {
            compareValue = cellInfo.value;
          } else {
            compareValue = tableModel.getValueById(this.conditions[i][7], cellInfo.row);
          }

          switch(this.conditions[i][0])
          {
            case "between":
              if (compareValue >= this.conditions[i][5] && compareValue <= this.conditions[i][6]) {
                cond_test = true;
              }

              break;

            case "!between":
              if (compareValue < this.conditions[i][5] || compareValue > this.conditions[i][6]) {
                cond_test = true;
              }

              break;
          }
        }
        else if (this.conditions[i][0] == "regex")
        {
          if (this.conditions[i][6] == null) {
            compareValue = cellInfo.value;
          } else {
            compareValue = tableModel.getValueById(this.conditions[i][6], cellInfo.row);
          }

          var the_pattern = new RegExp(this.conditions[i][5], 'g');
          cond_test = the_pattern.test(compareValue);
        }

        // Apply formatting, if any.
        if (cond_test == true) {
          this.__applyFormatting(this.conditions[i], style);
        }
      }

      var styleString = [];
      for(var key in style) {
        if (style[key]) {
          styleString.push(key, ":", style[key], ";");
        }
      }
      return styleString.join("");
    }
  },

  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this.numericAllowed = this.betweenAllowed = this.conditions = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 OpenHex SPRL, http://www.openhex.org

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gaetan de Menten (ged)

************************************************************************ */

/**
 * Specific data cell renderer for numbers.
 */
qx.Class.define("qx.ui.table.cellrenderer.Number",
{
  extend : qx.ui.table.cellrenderer.Conditional,


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * NumberFormat used to format data. If the numberFormat contains a
     * prefix and/or postfix containing characters which needs to be escaped,
     * those need to be given to the numberFormat in their escaped form
     * because no escaping happens at the cellrenderer level.
     */
    numberFormat :
    {
      check : "qx.util.format.NumberFormat",
      init : null,
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
    _getContentHtml : function(cellInfo)
    {
      var nf = this.getNumberFormat();

      if (nf)
      {
        if (cellInfo.value || cellInfo.value == 0) {
          // I don't think we need to escape the resulting string, as I
          // don't know of any decimal or separator which use a character
          // which needs escaping. It is much more plausible to have a
          // prefix, postfix containing such characters but those can be
          // (should be) added in their escaped form to the number format.
          return nf.format(cellInfo.value);
        } else {
          return "";
        }
      }
      else
      {
        return cellInfo.value == 0 ? "0" : (cellInfo.value || "");
      }
    },


    // overridden
    _getCellClass : function(cellInfo) {
      return "qooxdoo-table-cell qooxdoo-table-cell-right";
    }
  }
});
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
     * Mustafa Sak (msak)

************************************************************************ */
/**
 * Commands can be used to globally define keyboard shortcuts. They could
 * also be used to assign an execution of a command sequence to multiple
 * widgets. It is possible to use the same Command in a MenuButton and
 * ToolBarButton for example.
 */
qx.Class.define("qx.ui.command.Command",
{
  extend : qx.core.Object,


  /**
   * @param shortcut {String} Shortcuts can be composed of optional modifier
   *    keys Control, Alt, Shift, Meta and a non modifier key.
   *    If no non modifier key is specified, the second paramater is evaluated.
   *    The key must be separated by a <code>+</code> or <code>-</code> character.
   *    Examples: Alt+F1, Control+C, Control+Alt+Delete
   */
  construct : function(shortcut)
  {
    this.base(arguments);
    this._shortcut = new qx.bom.Shortcut(shortcut);
    this._shortcut.addListener("execute", this.execute, this);

    if (shortcut !== undefined) {
      this.setShortcut(shortcut);
    }
  },


  events :
  {
    /**
     * Fired when the command is executed. Sets the "data" property of the
     * event to the object that issued the command.
     */
    "execute" : "qx.event.type.Data"
  },


  properties :
  {
    /** Whether the command should be activated. If 'false' execute event
     * wouldn't fire. This proprty will be used by command groups when
     * activating/deactivating all commands of the group.*/
    active :
    {
      init : true,
      check : "Boolean",
      event : "changeActive",
      apply : "_applyActive"
    },


    /** Whether the command should be respected/enabled. If 'false' execute event
     * wouldn't fire. If value of property {@link qx.ui.command.Command#active}
     * is 'false', enabled value can be set but has no effect until
     * {@link qx.ui.command.Command#active} will be set to 'true'.*/
    enabled :
    {
      init : true,
      check : "Boolean",
      event : "changeEnabled",
      apply : "_applyEnabled"
    },


    /** The command shortcut as a string */
    shortcut :
    {
      check : "String",
      apply : "_applyShortcut",
      nullable : true
    },


    /** The label, which will be set in all connected widgets (if available) */
    label :
    {
      check : "String",
      nullable : true,
      event : "changeLabel"
    },


    /** The icon, which will be set in all connected widgets (if available) */
    icon :
    {
      check : "String",
      nullable : true,
      event : "changeIcon"
    },


    /**
     * The tooltip text, which will be set in all connected
     * widgets (if available)
     */
    toolTipText :
    {
      check : "String",
      nullable : true,
      event : "changeToolTipText"
    },


    /** The value of the connected widgets */
    value :
    {
      nullable : true,
      event : "changeValue"
    },


    /** The menu, which will be set in all connected widgets (if available) */
    menu :
    {
      check : "qx.ui.menu.Menu",
      nullable : true,
      event : "changeMenu"
    }
  },


  members :
  {
    _shortcut : null,


    // property apply
    _applyActive : function(value)
    {
      if (value === false) {
        this._shortcut.setEnabled(false);
      } else {
        // syncronize value with current "enabled" value of this command
        this._shortcut.setEnabled(this.getEnabled());
      }
    },


    // property apply
    _applyEnabled : function(value)
    {
      if (this.getActive()) {
        this._shortcut.setEnabled(value);
      }
    },


    // property apply
    _applyShortcut : function(value) {
      this._shortcut.setShortcut(value);
    },


    /**
     * Fire the "execute" event on this command. If property
     * <code>active</code> and <code>enabled</code> set to
     * <code>true</code>.
     * @param target {Object?} Object which issued the execute event
     */
    execute : function(target)
    {
      if (this.getActive() && this.getEnabled()) {
        this.fireDataEvent("execute", target);
      }
    },


    /**
     * Returns the used shortcut as string using the currently selected locale.
     *
     * @return {String} shortcut
     */
    toString : function()
    {
      if (this._shortcut) {
          return this._shortcut.toString();
      }
      return this.base(arguments);
    }
  },


  destruct : function()
  {
    this._shortcut.removeListener("execute", this.execute, this);
    this._disposeObjects("_shortcut");
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Shortcuts can be used to globally define keyboard shortcuts.
 */
qx.Class.define("qx.bom.Shortcut",
{
  extend : qx.core.Object,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * Create a new instance of Command
   *
   * @param shortcut {String} shortcuts can be composed of optional modifier
   *    keys Control, Alt, Shift, Meta and a non modifier key.
   *    If no non modifier key is specified, the second paramater is evaluated.
   *    The key must be separated by a <code>+</code> or <code>-</code> character.
   *    Examples: Alt+F1, Control+C, Control+Alt+Delete
   */
  construct : function(shortcut)
  {
    this.base(arguments);

    this.__modifier = {};
    this.__key = null;

    if (shortcut != null) {
      this.setShortcut(shortcut);
    }

    this.initEnabled();
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired when the command is executed. Sets the "data" property of the event to
     * the object that issued the command.
     */
    "execute" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** whether the command should be respected/enabled */
    enabled :
    {
      init : true,
      check : "Boolean",
      event : "changeEnabled",
      apply : "_applyEnabled"
    },


    /** The command shortcut */
    shortcut :
    {
      check : "String",
      apply : "_applyShortcut",
      nullable : true
    },


    /**
     * Whether the execute event should be fired repeatedly if the user keep
     * the keys pressed.
     */
    autoRepeat :
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
    __modifier : "",
    __key : "",


    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Fire the "execute" event on this shortcut.
     *
     * @param target {Object} Object which issued the execute event
     */
    execute : function(target) {
      this.fireDataEvent("execute", target);
    },


    /**
     * Key down event handler.
     *
     * @param event {qx.event.type.KeySequence} The key event object
     */
    __onKeyDown : function(event)
    {
      if (this.getEnabled() && this.__matchesKeyEvent(event))
      {
        if (!this.isAutoRepeat()) {
          this.execute(event.getTarget());
        }
        event.stop();
      }
    },


    /**
     * Key press event handler.
     *
     * @param event {qx.event.type.KeySequence} The key event object
     */
    __onKeyPress : function(event)
    {
      if (this.getEnabled() && this.__matchesKeyEvent(event))
      {
        if (this.isAutoRepeat()) {
          this.execute(event.getTarget());
        }
        event.stop();
      }
    },



    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */


    // property apply
    _applyEnabled : function(value, old)
    {
      if (value) {
        qx.event.Registration.addListener(document.documentElement, "keydown", this.__onKeyDown, this);
        qx.event.Registration.addListener(document.documentElement, "keypress", this.__onKeyPress, this);
      } else {
        qx.event.Registration.removeListener(document.documentElement, "keydown", this.__onKeyDown, this);
        qx.event.Registration.removeListener(document.documentElement, "keypress", this.__onKeyPress, this);
      }
    },


    // property apply
    _applyShortcut : function(value, old)
    {
      if (value)
      {
        // do not allow whitespaces within shortcuts
        if (value.search(/[\s]+/) != -1)
        {
          var msg = "Whitespaces are not allowed within shortcuts";
          this.error(msg);
          throw new Error(msg);
        }

        this.__modifier = { "Control" : false,
                            "Shift"   : false,
                            "Meta"    : false,
                            "Alt"     : false };
        this.__key = null;

        // To support shortcuts with "+" and "-" as keys it is necessary
        // to split the given value in a different way to determine the
        // several keyIdentifiers
        var index;
        var a = [];
        while (value.length > 0 && index != -1)
        {
          // search for delimiters "+" and "-"
          index = value.search(/[-+]+/);

          // add identifiers - take value if no separator was found or
          // only one char is left (second part of shortcut)
          a.push((value.length == 1 || index == -1) ? value : value.substring(0, index));

          // extract the already detected identifier
          value = value.substring(index + 1);
        }
        var al = a.length;

        for (var i=0; i<al; i++)
        {
          var identifier = this.__normalizeKeyIdentifier(a[i]);

          switch(identifier)
          {
            case "Control":
            case "Shift":
            case "Meta":
            case "Alt":
              this.__modifier[identifier] = true;
              break;

            case "Unidentified":
              var msg = "Not a valid key name for a shortcut: " + a[i];
              this.error(msg);
              throw msg;

            default:
              if (this.__key)
              {
                var msg = "You can only specify one non modifier key!";
                this.error(msg);
                throw msg;
              }

              this.__key = identifier;
          }
        }
      }

      return true;
    },




    /*
    --------------------------------------------------------------------------
      INTERNAL MATCHING LOGIC
    ---------------------------------------------------------------------------
    */

    /**
     * Checks whether the given key event matches the shortcut's shortcut
     *
     * @param e {qx.event.type.KeySequence} the key event object
     * @return {Boolean} whether the shortcuts shortcut matches the key event
     */
    __matchesKeyEvent : function(e)
    {
      var key = this.__key;

      if (!key)
      {
        // no shortcut defined.
        return false;
      }

      // for check special keys
      // and check if a shortcut is a single char and special keys are pressed
      if (
        (!this.__modifier.Shift && e.isShiftPressed()) ||
        (this.__modifier.Shift && !e.isShiftPressed()) ||
        (!this.__modifier.Control && e.isCtrlPressed()) ||
        (this.__modifier.Control && !e.isCtrlPressed()) ||
        (!this.__modifier.Meta && e.isMetaPressed()) ||
        (this.__modifier.Meta && !e.isMetaPressed()) ||
        (!this.__modifier.Alt && e.isAltPressed()) ||
        (this.__modifier.Alt && !e.isAltPressed())
      ) {
        return false;
      }

      if (key == e.getKeyIdentifier()) {
        return true;
      }

      return false;
    },


    /*
    ---------------------------------------------------------------------------
      COMPATIBILITY TO COMMAND
    ---------------------------------------------------------------------------
    */

    /**
     * @lint ignoreReferenceField(__oldKeyNameToKeyIdentifierMap)
     */
    __oldKeyNameToKeyIdentifierMap :
    {
      // all other keys are converted by converting the first letter to uppercase
      esc             : "Escape",
      ctrl            : "Control",
      print           : "PrintScreen",
      del             : "Delete",
      pageup          : "PageUp",
      pagedown        : "PageDown",
      numlock         : "NumLock",
      numpad_0        : "0",
      numpad_1        : "1",
      numpad_2        : "2",
      numpad_3        : "3",
      numpad_4        : "4",
      numpad_5        : "5",
      numpad_6        : "6",
      numpad_7        : "7",
      numpad_8        : "8",
      numpad_9        : "9",
      numpad_divide   : "/",
      numpad_multiply : "*",
      numpad_minus    : "-",
      numpad_plus     : "+"
    },


    /**
     * Checks and normalizes the key identifier.
     *
     * @param keyName {String} name of the key.
     * @return {String} normalized keyIdentifier or "Unidentified" if a conversion was not possible
     */
    __normalizeKeyIdentifier : function(keyName)
    {
      var kbUtil = qx.event.util.Keyboard;
      var keyIdentifier = "Unidentified";

      if (kbUtil.isValidKeyIdentifier(keyName)) {
        return keyName;
      }

      if (keyName.length == 1 && keyName >= "a" && keyName <= "z") {
        return keyName.toUpperCase();
      }

      keyName = keyName.toLowerCase();
      var keyIdentifier = this.__oldKeyNameToKeyIdentifierMap[keyName] || qx.lang.String.firstUp(keyName);

      if (kbUtil.isValidKeyIdentifier(keyIdentifier)) {
        return keyIdentifier;
      } else {
        return "Unidentified";
      }
    },




    /*
    ---------------------------------------------------------------------------
      STRING CONVERSION
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the shortcut as string using the currently selected locale.
     *
     * @return {String} shortcut
     */
    toString : function()
    {
      var key = this.__key;

      var str = [];

      for (var modifier in this.__modifier) {
        // this.__modifier holds a map with shortcut combination keys
        // like "Control", "Alt", "Meta" and "Shift" as keys with
        // Boolean values
        if (this.__modifier[modifier])
        {
          str.push(qx.locale.Key.getKeyName("short", modifier));
        }
      }

      if (key) {
        str.push(qx.locale.Key.getKeyName("short", key));
      }

      return str.join("+");
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    // this will remove the event listener
    this.setEnabled(false);

    this.__modifier = this.__key = null;
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Static class, which contains functionality to localize the names of keyboard keys.
 */

qx.Class.define("qx.locale.Key",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Return localized name of a key identifier
     * {@link qx.event.type.KeySequence}
     *
     * @param size {String} format of the key identifier.
     *       Possible values: "short", "full"
     * @param keyIdentifier {String} key identifier to translate {@link qx.event.type.KeySequence}
     * @param locale {String} optional locale to be used
     * @return {String} localized key name
     */
    getKeyName : function(size, keyIdentifier, locale)
    {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertInArray(size, ["short", "full"]);
      }

      var key = "key_" + size + "_" + keyIdentifier;
      // Control is alsways named control on a mac and not Strg in German e.g.
      if (qx.core.Environment.get("os.name") == "osx" && keyIdentifier == "Control") {
        key += "_Mac";
      }
      var localizedKey = qx.locale.Manager.getInstance().translate(key, [], locale);

      if (localizedKey == key) {
        return qx.locale.Key._keyNames[key] || keyIdentifier;
      } else {
        return localizedKey;
      }
    }
  },


  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function(statics)
  {
    var keyNames = {};
    var Manager = qx.locale.Manager;

    // TRANSLATION: short representation of key names
    keyNames[Manager.marktr("key_short_Backspace")] = "Backspace";
    keyNames[Manager.marktr("key_short_Tab")] = "Tab";
    keyNames[Manager.marktr("key_short_Space")] = "Space";
    keyNames[Manager.marktr("key_short_Enter")] = "Enter";
    keyNames[Manager.marktr("key_short_Shift")] = "Shift";
    keyNames[Manager.marktr("key_short_Control")] = "Ctrl";
    keyNames[Manager.marktr("key_short_Control_Mac")] = "Ctrl";
    keyNames[Manager.marktr("key_short_Alt")] = "Alt";
    keyNames[Manager.marktr("key_short_CapsLock")] = "Caps";
    keyNames[Manager.marktr("key_short_Meta")] = "Meta";
    keyNames[Manager.marktr("key_short_Escape")] = "Esc";
    keyNames[Manager.marktr("key_short_Left")] = "Left";
    keyNames[Manager.marktr("key_short_Up")] = "Up";
    keyNames[Manager.marktr("key_short_Right")] = "Right";
    keyNames[Manager.marktr("key_short_Down")] = "Down";
    keyNames[Manager.marktr("key_short_PageUp")] = "PgUp";
    keyNames[Manager.marktr("key_short_PageDown")] = "PgDn";
    keyNames[Manager.marktr("key_short_End")] = "End";
    keyNames[Manager.marktr("key_short_Home")] = "Home";
    keyNames[Manager.marktr("key_short_Insert")] = "Ins";
    keyNames[Manager.marktr("key_short_Delete")] = "Del";
    keyNames[Manager.marktr("key_short_NumLock")] = "Num";
    keyNames[Manager.marktr("key_short_PrintScreen")] = "Print";
    keyNames[Manager.marktr("key_short_Scroll")] = "Scroll";
    keyNames[Manager.marktr("key_short_Pause")] = "Pause";
    keyNames[Manager.marktr("key_short_Win")] = "Win";
    keyNames[Manager.marktr("key_short_Apps")] = "Apps";

    // TRANSLATION: full/long representation of key names
    keyNames[Manager.marktr("key_full_Backspace")] = "Backspace";
    keyNames[Manager.marktr("key_full_Tab")] = "Tabulator";
    keyNames[Manager.marktr("key_full_Space")] = "Space";
    keyNames[Manager.marktr("key_full_Enter")] = "Enter";
    keyNames[Manager.marktr("key_full_Shift")] = "Shift";
    keyNames[Manager.marktr("key_full_Control")] = "Control";
    keyNames[Manager.marktr("key_full_Control_Mac")] = "Control";
    keyNames[Manager.marktr("key_full_Alt")] = "Alt";
    keyNames[Manager.marktr("key_full_CapsLock")] = "CapsLock";
    keyNames[Manager.marktr("key_full_Meta")] = "Meta";
    keyNames[Manager.marktr("key_full_Escape")] = "Escape";
    keyNames[Manager.marktr("key_full_Left")] = "Left";
    keyNames[Manager.marktr("key_full_Up")] = "Up";
    keyNames[Manager.marktr("key_full_Right")] = "Right";
    keyNames[Manager.marktr("key_full_Down")] = "Down";
    keyNames[Manager.marktr("key_full_PageUp")] = "PageUp";
    keyNames[Manager.marktr("key_full_PageDown")] = "PageDown";
    keyNames[Manager.marktr("key_full_End")] = "End";
    keyNames[Manager.marktr("key_full_Home")] = "Home";
    keyNames[Manager.marktr("key_full_Insert")] = "Insert";
    keyNames[Manager.marktr("key_full_Delete")] = "Delete";
    keyNames[Manager.marktr("key_full_NumLock")] = "NumLock";
    keyNames[Manager.marktr("key_full_PrintScreen")] = "PrintScreen";
    keyNames[Manager.marktr("key_full_Scroll")] = "Scroll";
    keyNames[Manager.marktr("key_full_Pause")] = "Pause";
    keyNames[Manager.marktr("key_full_Win")] = "Win";
    keyNames[Manager.marktr("key_full_Apps")] = "Apps";

    // Save
    statics._keyNames = keyNames;
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
 * Container for menubar buttons to display a classic application menu.
 */
qx.Class.define("qx.ui.menubar.MenuBar",
{
  extend : qx.ui.toolbar.ToolBar,



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Appearance of the widget */
    appearance :
    {
      refine : true,
      init : "menubar"
    }
  }
});

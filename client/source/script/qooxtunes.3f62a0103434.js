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

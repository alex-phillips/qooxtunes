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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * This mixin is included by all widgets which supports native overflowing.
 */
qx.Mixin.define("qx.ui.core.MNativeOverflow",
{
  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Whether the widget should have horizontal scrollbars.
     */
    overflowX :
    {
      check : ["hidden", "visible", "scroll", "auto"],
      nullable : true,
      apply : "_applyOverflowX"
    },

    /**
     * Whether the widget should have vertical scrollbars.
     */
    overflowY :
    {
      check : ["hidden", "visible", "scroll", "auto"],
      nullable : true,
      apply : "_applyOverflowY"
    },

    /**
     * Overflow group property
     */
    overflow : {
      group : [ "overflowX", "overflowY" ]
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
    _applyOverflowX : function(value) {
      this.getContentElement().setStyle("overflowX", value);
    },


    // property apply
    _applyOverflowY : function(value) {
      this.getContentElement().setStyle("overflowY", value);
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

************************************************************************ */

/**
 * The Html widget embeds plain HTML code into the application
 *
 * *Example*
 *
 * Here is a little example of how to use the canvas widget.
 *
 * <pre class='javascript'>
 * var html = new qx.ui.embed.Html();
 * html.setHtml("<h1>Hello World</h1>");
 * </pre>
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/html.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.embed.Html",
{
  extend : qx.ui.core.Widget,
  include : [qx.ui.core.MNativeOverflow],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param html {String} Initial HTML content
   */
  construct : function(html)
  {
    this.base(arguments);

    if (html != null) {
      this.setHtml(html);
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Any text string which can contain HTML, too */
    html :
    {
      check : "String",
      apply : "_applyHtml",
      event : "changeHtml",
      nullable : true
    },


    /**
     * The css classname for the html embed.
     * <b>IMPORTANT</b> Paddings and borders does not work
     * in the css class. These styles cause conflicts with
     * the layout engine.
     */
    cssClass :
    {
      check : "String",
      init : "",
      apply : "_applyCssClass"
    },


    // overridden
    selectable :
    {
      refine : true,
      init : true
    },


    // overridden
    focusable :
    {
      refine : true,
      init : true
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

    getFocusElement : function() {
      return this.getContentElement();
    },




    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyHtml : function(value, old)
    {
      var elem = this.getContentElement();
      // Workaround for http://bugzilla.qooxdoo.org/show_bug.cgi?id=7679
      if (qx.core.Environment.get("engine.name") == "mshtml" &&
        qx.core.Environment.get("browser.documentmode") == 9)
      {
        elem.setStyle("position", "relative");
      }

      // Insert HTML content
      elem.setAttribute("html", value||"");
    },


    // property apply
    _applyCssClass : function (value, old) {
      this.getContentElement().removeClass(old);
      this.getContentElement().addClass(value);
    },


    // overridden
    _applySelectable : function(value)
    {
      this.base(arguments, value);

      /*
       * We have to set the value to "text" in Webkit for the content element
       */
      if ((qx.core.Environment.get("engine.name") == "webkit"))
      {
        this.getContentElement().setStyle("userSelect", value ? "text" : "none");
      }
    },


    /*
    ---------------------------------------------------------------------------
      FONT SUPPORT
    ---------------------------------------------------------------------------
    */

    // overridden
    _applyFont : function(value, old)
    {
      var styles = value ? qx.theme.manager.Font.getInstance().resolve(value).getStyles() : qx.bom.Font.getDefaultStyles();

      // check if text color already set - if so this local value has higher priority
      if (this.getTextColor() != null) {
        delete styles["color"];
      }

      this.getContentElement().setStyles(styles);
    },




    /*
    ---------------------------------------------------------------------------
      TEXT COLOR SUPPORT
    ---------------------------------------------------------------------------
    */

    // overridden
    _applyTextColor : function(value, old)
    {
      if (value) {
        this.getContentElement().setStyle("color", qx.theme.manager.Color.getInstance().resolve(value));
      } else {
        this.getContentElement().removeStyle("color");
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
     * Andreas Ecker (ecker)

************************************************************************ */

/**
 * A check box widget with an optional label.
 */
qx.Class.define("qx.ui.form.CheckBox",
{
  extend : qx.ui.form.ToggleButton,
  include : [
    qx.ui.form.MForm,
    qx.ui.form.MModelProperty
  ],
  implement : [
    qx.ui.form.IForm,
    qx.ui.form.IModel
  ],

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String?null} An optional label for the check box.
   */
  construct : function(label)
  {
    if (qx.core.Environment.get("qx.debug")) {
      this.assertArgumentsCount(arguments, 0, 1);
    }

    this.base(arguments, label);

    // Initialize the checkbox to a valid value (the default is null which
    // is invalid)
    this.setValue(false);
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
      init : "checkbox"
    },

    // overridden
    allowGrowX :
    {
      refine : true,
      init : false
    }
  },

  members :
  {
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      invalid : true,
      focused : true,
      undetermined : true,
      checked : true,
      hovered : true
    },

    /**
     * overridden (from MExecutable to keep the icon out of the binding)
     * @lint ignoreReferenceField(_bindableProperties)
     */
    _bindableProperties :
    [
      "enabled",
      "label",
      "toolTipText",
      "value",
      "menu"
    ]
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
     * Tristan Koch (trkoch)

************************************************************************ */

/**
 * Indigo color theme
 */
qx.Theme.define("qx.theme.indigo.Color",
{
  colors :
  {
    // main
    "background" : "white",
    "dark-blue" : "#323335",
    "light-background" : "#F4F4F4",
    "font" : "#262626",


    "highlight" : "#3D72C9", // bright blue
    "highlight-shade" : "#5583D0", // bright blue

    // backgrounds
    "background-selected" : "#3D72C9",
    "background-selected-disabled" : "#CDCDCD",
    "background-selected-dark" : "#323335",
    "background-disabled" : "#F7F7F7",
    "background-disabled-checked" : "#BBBBBB",
    "background-pane" : "white",

    // tabview
    "tabview-unselected" : "#1866B5",
    "tabview-button-border" : "#134983",
    "tabview-label-active-disabled" : "#D9D9D9",

    // text colors
    "link" : "#24B",

    // scrollbar
    "scrollbar-bright" : "#F1F1F1",
    "scrollbar-dark" : "#EBEBEB",

    // form
    "button" : "#E8F0E3",
    "button-border" : "#BBB",
    "button-border-hovered" : "#939393",
    "invalid" : "#C00F00",
    "button-box-bright" : "#F9F9F9",
    "button-box-dark" : "#E3E3E3",
    "button-box-bright-pressed" : "#BABABA",
    "button-box-dark-pressed" : "#EBEBEB",
    "border-lead" : "#888888",

    // window
    "window-border" : "#dddddd",
    "window-border-inner" : "#F4F4F4",

    // group box
    "white-box-border" : "#dddddd",

    // shaddows
    "shadow" : qx.core.Environment.get("css.rgba") ? "rgba(0, 0, 0, 0.4)" : "#666666",

    // borders
    "border-main" : "#dddddd",
    "border-light" : "#B7B7B7",
    "border-light-shadow" : "#686868",

    // separator
    "border-separator" : "#808080",

    // text
    "text" : "#262626",
    "text-disabled" : "#A7A6AA",
    "text-selected" : "white",
    "text-placeholder" : "#CBC8CD",

    // tooltip
    "tooltip" : "#FE0",
    "tooltip-text" : "black",

    // table
    "table-header" : [ 242, 242, 242 ],
    "table-focus-indicator" : "#3D72C9",

    // used in table code
    "table-header-cell" : [ 235, 234, 219 ],
    "table-row-background-focused-selected" : "#3D72C9",
    "table-row-background-focused" : "#F4F4F4",
    "table-row-background-selected" : [ 51, 94, 168 ],
    "table-row-background-even" : "white",
    "table-row-background-odd" : "white",
    "table-row-selected" : [ 255, 255, 255 ],
    "table-row" : [ 0, 0, 0],
    "table-row-line" : "#EEE",
    "table-column-line" : "#EEE",

    // used in progressive code
    "progressive-table-header" : "#AAAAAA",
    "progressive-table-row-background-even" : [ 250, 248, 243 ],
    "progressive-table-row-background-odd" : [ 255, 255, 255 ],
    "progressive-progressbar-background" : "gray",
    "progressive-progressbar-indicator-done" : "#CCCCCC",
    "progressive-progressbar-indicator-undone" : "white",
    "progressive-progressbar-percent-background" : "gray",
    "progressive-progressbar-percent-text" : "white"
  }
});

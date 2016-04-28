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
 * Mixin handling the valid and required properties for the form widgets.
 */
qx.Mixin.define("qx.ui.form.MForm",
{

  construct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().addListener("changeLocale", this.__onChangeLocale, this);
    }
  },


  properties : {

    /**
     * Flag signaling if a widget is valid. If a widget is invalid, an invalid
     * state will be set.
     */
    valid : {
      check : "Boolean",
      init : true,
      apply : "_applyValid",
      event : "changeValid"
    },


    /**
     * Flag signaling if a widget is required.
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
      event : "changeInvalidMessage"
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


  members : {
    // apply method
    _applyValid: function(value, old) {
      value ? this.removeState("invalid") : this.addState("invalid");
    },


    /**
     * Locale change event handler
     *
     * @signature function(e)
     * @param e {Event} the change event
     */
    __onChangeLocale : qx.core.Environment.select("qx.dynlocale",
    {
      "true" : function(e)
      {
        // invalid message
        var invalidMessage = this.getInvalidMessage();
        if (invalidMessage && invalidMessage.translate) {
          this.setInvalidMessage(invalidMessage.translate());
        }
        // required invalid message
        var requiredInvalidMessage = this.getRequiredInvalidMessage();
        if (requiredInvalidMessage && requiredInvalidMessage.translate) {
          this.setRequiredInvalidMessage(requiredInvalidMessage.translate());
        }
      },

      "false" : null
    })
  },


  destruct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this.__onChangeLocale, this);
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * This is a basic form field with common functionality for
 * {@link TextArea} and {@link TextField}.
 *
 * On every keystroke the value is synchronized with the
 * value of the textfield. Value changes can be monitored by listening to the
 * {@link #input} or {@link #changeValue} events, respectively.
 */
qx.Class.define("qx.ui.form.AbstractField",
{
  extend : qx.ui.core.Widget,
  implement : [
    qx.ui.form.IStringForm,
    qx.ui.form.IForm
  ],
  include : [
    qx.ui.form.MForm
  ],
  type : "abstract",

  statics : {
    /** Stylesheet needed to style the native placeholder element. */
    __stylesheet : null,


    /**
     * Adds the CSS rules needed to style the native placeholder element.
     */
    __addPlaceholderRules : function() {
      var engine = qx.core.Environment.get("engine.name");
      var browser = qx.core.Environment.get("browser.name");
      var colorManager = qx.theme.manager.Color.getInstance();
      var color = colorManager.resolve("text-placeholder");
      var selector;

      if (engine == "gecko") {
        // see https://developer.mozilla.org/de/docs/CSS/:-moz-placeholder for details
       if (parseFloat(qx.core.Environment.get("engine.version")) >= 19) {
          selector = "input::-moz-placeholder, textarea::-moz-placeholder";
        } else {
          selector = "input:-moz-placeholder, textarea:-moz-placeholder";
        }
        qx.ui.style.Stylesheet.getInstance().addRule(selector, "color: " + color + " !important");
      } else if (engine == "webkit" && browser != "edge") {
        selector = "input.qx-placeholder-color::-webkit-input-placeholder, textarea.qx-placeholder-color::-webkit-input-placeholder";
        qx.ui.style.Stylesheet.getInstance().addRule(selector, "color: " + color);
      } else if (engine == "mshtml" || browser == "edge") {
        var separator = browser == "edge" ? "::" : ":";
        selector = ["input.qx-placeholder-color", "-ms-input-placeholder, textarea.qx-placeholder-color", "-ms-input-placeholder"].join(separator);
        qx.ui.style.Stylesheet.getInstance().addRule(selector, "color: " + color + " !important");
      }
    }
  },

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {String} initial text value of the input field ({@link #setValue}).
   */
  construct : function(value)
  {
    this.base(arguments);

    // shortcut for placeholder feature detection
    this.__useQxPlaceholder = !qx.core.Environment.get("css.placeholder");

    if (value != null) {
      this.setValue(value);
    }

    this.getContentElement().addListener(
      "change", this._onChangeContent, this
    );

    // use qooxdoo placeholder if no native placeholder is supported
    if (this.__useQxPlaceholder) {
      // assign the placeholder text after the appearance has been applied
      this.addListener("syncAppearance", this._syncPlaceholder, this);
    } else {
      // add rules for native placeholder color
      qx.ui.form.AbstractField.__addPlaceholderRules();
      // add a class to the input to restict the placeholder color
      this.getContentElement().addClass("qx-placeholder-color");
    }

    // translation support
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().addListener(
        "changeLocale", this._onChangeLocale, this
      );
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
     * The event is fired on every keystroke modifying the value of the field.
     *
     * The method {@link qx.event.type.Data#getData} returns the
     * current value of the text field.
     */
    "input" : "qx.event.type.Data",


    /**
     * The event is fired each time the text field looses focus and the
     * text field values has changed.
     *
     * If you change {@link #liveUpdate} to true, the changeValue event will
     * be fired after every keystroke and not only after every focus loss. In
     * that mode, the changeValue event is equal to the {@link #input} event.
     *
     * The method {@link qx.event.type.Data#getData} returns the
     * current text value of the field.
     */
    "changeValue" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Alignment of the text
     */
    textAlign :
    {
      check : [ "left", "center", "right" ],
      nullable : true,
      themeable : true,
      apply : "_applyTextAlign"
    },


    /** Whether the field is read only */
    readOnly :
    {
      check : "Boolean",
      apply : "_applyReadOnly",
      event : "changeReadOnly",
      init : false
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
    },

    /** Maximal number of characters that can be entered in the TextArea. */
    maxLength :
    {
      apply : "_applyMaxLength",
      check : "PositiveInteger",
      init : Infinity
    },

    /**
     * Whether the {@link #changeValue} event should be fired on every key
     * input. If set to true, the changeValue event is equal to the
     * {@link #input} event.
     */
    liveUpdate :
    {
      check : "Boolean",
      init : false
    },

    /**
     * String value which will be shown as a hint if the field is all of:
     * unset, unfocused and enabled. Set to null to not show a placeholder
     * text.
     */
    placeholder :
    {
      check : "String",
      nullable : true,
      apply : "_applyPlaceholder"
    },


    /**
     * RegExp responsible for filtering the value of the textfield. the RegExp
     * gives the range of valid values.
     * The following example only allows digits in the textfield.
     * <pre class='javascript'>field.setFilter(/[0-9]/);</pre>
     */
    filter :
    {
      check : "RegExp",
      nullable : true,
      init : null
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __nullValue : true,
    _placeholder : null,
    __oldValue : null,
    __oldInputValue : null,
    __useQxPlaceholder : true,
    __font : null,
    __webfontListenerId : null,


    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    // overridden
    getFocusElement : function() {
      var el = this.getContentElement();
      if (el) {
        return el;
      }
    },


    /**
     * Creates the input element. Derived classes may override this
     * method, to create different input elements.
     *
     * @return {qx.html.Input} a new input element.
     */
    _createInputElement : function() {
      return new qx.html.Input("text");
    },


    // overridden
    renderLayout : function(left, top, width, height)
    {
      var updateInsets = this._updateInsets;
      var changes = this.base(arguments, left, top, width, height);

      // Directly return if superclass has detected that no
      // changes needs to be applied
      if (!changes) {
        return;
      }

      var inner = changes.size || updateInsets;
      var pixel = "px";

      if (inner || changes.local || changes.margin) {
        var innerWidth = width;
        var innerHeight = height;
      }

      var input = this.getContentElement();

      // we don't need to update positions on native placeholders
      if (updateInsets && this.__useQxPlaceholder)
      {
        if (this.__useQxPlaceholder) {
          var insets = this.getInsets();
          this._getPlaceholderElement().setStyles({
            paddingTop : insets.top + pixel,
            paddingRight : insets.right + pixel,
            paddingBottom : insets.bottom + pixel,
            paddingLeft : insets.left + pixel
          });
        }
      }

      if (inner || changes.margin)
      {
        // we don't need to update dimensions on native placeholders
        if (this.__useQxPlaceholder) {
          var insets = this.getInsets();
          this._getPlaceholderElement().setStyles({
            "width": (innerWidth - insets.left - insets.right) + pixel,
            "height": (innerHeight - insets.top - insets.bottom) + pixel
          });
        }

        input.setStyles({
          "width": innerWidth + pixel,
          "height": innerHeight + pixel
        });

        this._renderContentElement(innerHeight, input);

      }

      if (changes.position) {
        if (this.__useQxPlaceholder) {
          this._getPlaceholderElement().setStyles({
            "left": left + pixel,
            "top": top + pixel
          });
        }
      }
    },


    /**
     * Hook into {@link qx.ui.form.AbstractField#renderLayout} method.
     * Called after the contentElement has a width and an innerWidth.
     *
     * Note: This was introduced to fix BUG#1585
     *
     * @param innerHeight {Integer} The inner height of the element.
     * @param element {Element} The element.
     */
    _renderContentElement : function(innerHeight, element) {
      //use it in child classes
    },


    // overridden
    _createContentElement : function()
    {
      // create and add the input element
      var el = this._createInputElement();

      // initialize the html input
      el.setSelectable(this.getSelectable());
      el.setEnabled(this.getEnabled());

      // Add listener for input event
      el.addListener("input", this._onHtmlInput, this);

      // Disable HTML5 spell checking
      el.setAttribute("spellcheck", "false");
      el.addClass("qx-abstract-field");

      // IE8 in standard mode needs some extra love here to receive events.
      if ((qx.core.Environment.get("engine.name") == "mshtml") &&
        (qx.core.Environment.get("browser.documentmode") == 8)) {
        el.setStyles({
          backgroundImage: "url(" + qx.util.ResourceManager.getInstance().toUri("qx/static/blank.gif") + ")"
        });
      }

      return el;
    },


    // overridden
    _applyEnabled : function(value, old)
    {
      this.base(arguments, value, old);

      this.getContentElement().setEnabled(value);

      if (this.__useQxPlaceholder) {
        if (value) {
          this._showPlaceholder();
        } else {
          this._removePlaceholder();
        }
      } else {
        var input = this.getContentElement();
        // remove the placeholder on disabled input elements
        input.setAttribute("placeholder", value ? this.getPlaceholder() : "");
      }
    },


    // default text sizes
    /**
     * @lint ignoreReferenceField(__textSize)
     */
    __textSize :
    {
      width : 16,
      height : 16
    },


    // overridden
    _getContentHint : function()
    {
      return {
        width : this.__textSize.width * 10,
        height : this.__textSize.height || 16
      };
    },


    // overridden
    _applyFont : function(value, old)
    {
      if (old && this.__font && this.__webfontListenerId) {
        this.__font.removeListenerById(this.__webfontListenerId);
        this.__webfontListenerId = null;
      }

      // Apply
      var styles;
      if (value)
      {
        this.__font = qx.theme.manager.Font.getInstance().resolve(value);
        if (this.__font instanceof qx.bom.webfonts.WebFont) {
          this.__webfontListenerId = this.__font.addListener("changeStatus", this._onWebFontStatusChange, this);
        }
        styles = this.__font.getStyles();
      }
      else
      {
        styles = qx.bom.Font.getDefaultStyles();
      }

      // check if text color already set - if so this local value has higher priority
      if (this.getTextColor() != null) {
        delete styles["color"];
      }

      // apply the font to the content element
      // IE 8 - 10 (but not 11 Preview) will ignore the lineHeight value
      // unless it's applied directly.
      if (qx.core.Environment.get("engine.name") == "mshtml" &&
        qx.core.Environment.get("browser.documentmode") < 11)
      {
        qx.html.Element.flush();
        this.getContentElement().setStyles(styles, true);
      } else {
        this.getContentElement().setStyles(styles);
      }

      // the font will adjust automatically on native placeholders
      if (this.__useQxPlaceholder) {
        // don't apply the color to the placeholder
        delete styles["color"];
        // apply the font to the placeholder
        this._getPlaceholderElement().setStyles(styles);
      }

      // Compute text size
      if (value) {
        this.__textSize = qx.bom.Label.getTextSize("A", styles);
      } else {
        delete this.__textSize;
      }

      // Update layout
      qx.ui.core.queue.Layout.add(this);
    },


    // overridden
    _applyTextColor : function(value, old)
    {
      if (value) {
        this.getContentElement().setStyle(
          "color", qx.theme.manager.Color.getInstance().resolve(value)
        );
      } else {
        this.getContentElement().removeStyle("color");
      }
    },


    // property apply
    _applyMaxLength : function(value, old) {
      if (value) {
        this.getContentElement().setAttribute("maxLength", value);
      } else {
        this.getContentElement().removeAttribute("maxLength");
      }
    },


    // overridden
    tabFocus : function() {
      this.base(arguments);

      this.selectAllText();
    },

    /**
     * Returns the text size.
     * @return {Map} The text size.
     */
    _getTextSize : function() {
      return this.__textSize;
    },

    /*
    ---------------------------------------------------------------------------
      EVENTS
    ---------------------------------------------------------------------------
    */

    /**
     * Event listener for native input events. Redirects the event
     * to the widget. Also checks for the filter and max length.
     *
     * @param e {qx.event.type.Data} Input event
     */
    _onHtmlInput : function(e)
    {
      var value = e.getData();
      var fireEvents = true;

      this.__nullValue = false;

      // value unchanged; Firefox fires "input" when pressing ESC [BUG #5309]
      if (this.__oldInputValue && this.__oldInputValue === value) {
        fireEvents = false;
      }

      // check for the filter
      if (this.getFilter() != null)
      {
        var filteredValue = "";
        var index = value.search(this.getFilter());
        var processedValue = value;
        while(index >= 0)
        {
          filteredValue = filteredValue + (processedValue.charAt(index));
          processedValue = processedValue.substring(index + 1, processedValue.length);
          index = processedValue.search(this.getFilter());
        }

        if (filteredValue != value)
        {
          fireEvents = false;
          value = filteredValue;
          this.getContentElement().setValue(value);
        }
      }

      // fire the events, if necessary
      if (fireEvents)
      {
        // store the old input value
        this.fireDataEvent("input", value, this.__oldInputValue);
        this.__oldInputValue = value;

        // check for the live change event
        if (this.getLiveUpdate()) {
          this.__fireChangeValueEvent(value);
        }
      }
    },

    /**
     * Triggers text size recalculation after a web font was loaded
     *
     * @param ev {qx.event.type.Data} "changeStatus" event
     */
    _onWebFontStatusChange : function(ev)
    {
      if (ev.getData().valid === true) {
        var styles = this.__font.getStyles();
        this.__textSize = qx.bom.Label.getTextSize("A", styles);
        qx.ui.core.queue.Layout.add(this);
      }
    },


    /**
     * Handles the firing of the changeValue event including the local cache
     * for sending the old value in the event.
     *
     * @param value {String} The new value.
     */
    __fireChangeValueEvent : function(value) {
      var old = this.__oldValue;
      this.__oldValue = value;
      if (old != value) {
        this.fireNonBubblingEvent(
          "changeValue", qx.event.type.Data, [value, old]
        );
      }
    },


    /*
    ---------------------------------------------------------------------------
      TEXTFIELD VALUE API
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the value of the textfield to the given value.
     *
     * @param value {String} The new value
     */
    setValue : function(value)
    {
      // handle null values
      if (value === null) {
        // just do nothing if null is already set
        if (this.__nullValue) {
          return value;
        }
        value = "";
        this.__nullValue = true;
      } else {
        this.__nullValue = false;
        // native placeholders will be removed by the browser
        if (this.__useQxPlaceholder) {
          this._removePlaceholder();
        }
      }

      if (qx.lang.Type.isString(value))
      {
        var elem = this.getContentElement();
        if (elem.getValue() != value)
        {
          var oldValue = elem.getValue();
          elem.setValue(value);
          var data = this.__nullValue ? null : value;
          this.__oldValue = oldValue;
          this.__fireChangeValueEvent(data);
          // reset the input value on setValue calls [BUG #6892]
          this.__oldInputValue = this.__oldValue;
        }
        // native placeholders will be shown by the browser
        if (this.__useQxPlaceholder) {
          this._showPlaceholder();
        }
        return value;
      }
      throw new Error("Invalid value type: " + value);
    },


    /**
     * Returns the current value of the textfield.
     *
     * @return {String|null} The current value
     */
    getValue : function() {
      var value = this.getContentElement().getValue();
      return this.__nullValue ? null : value;
    },


    /**
     * Resets the value to the default
     */
    resetValue : function() {
      this.setValue(null);
    },


    /**
     * Event listener for change event of content element
     *
     * @param e {qx.event.type.Data} Incoming change event
     */
    _onChangeContent : function(e)
    {
      this.__nullValue = e.getData() === null;
      this.__fireChangeValueEvent(e.getData());
    },


    /*
    ---------------------------------------------------------------------------
      TEXTFIELD SELECTION API
    ---------------------------------------------------------------------------
    */


    /**
     * Returns the current selection.
     * This method only works if the widget is already created and
     * added to the document.
     *
     * @return {String|null}
     */
    getTextSelection : function() {
      return this.getContentElement().getTextSelection();
    },


    /**
     * Returns the current selection length.
     * This method only works if the widget is already created and
     * added to the document.
     *
     * @return {Integer|null}
     */
    getTextSelectionLength : function() {
      return this.getContentElement().getTextSelectionLength();
    },


    /**
     * Returns the start of the text selection
     *
     * @return {Integer|null} Start of selection or null if not available
     */
    getTextSelectionStart : function() {
      return this.getContentElement().getTextSelectionStart();
    },


    /**
     * Returns the end of the text selection
     *
     * @return {Integer|null} End of selection or null if not available
     */
    getTextSelectionEnd : function() {
      return this.getContentElement().getTextSelectionEnd();
    },


    /**
     * Set the selection to the given start and end (zero-based).
     * If no end value is given the selection will extend to the
     * end of the textfield's content.
     * This method only works if the widget is already created and
     * added to the document.
     *
     * @param start {Integer} start of the selection (zero-based)
     * @param end {Integer} end of the selection
     */
    setTextSelection : function(start, end) {
      this.getContentElement().setTextSelection(start, end);
    },


    /**
     * Clears the current selection.
     * This method only works if the widget is already created and
     * added to the document.
     *
     */
    clearTextSelection : function() {
      this.getContentElement().clearTextSelection();
    },


    /**
     * Selects the whole content
     *
     */
    selectAllText : function() {
      this.setTextSelection(0);
    },


    /*
    ---------------------------------------------------------------------------
      PLACEHOLDER HELPERS
    ---------------------------------------------------------------------------
    */

    // overridden
    setLayoutParent : function(parent)
    {
      this.base(arguments, parent);
      if (this.__useQxPlaceholder) {
        if (parent) {
          this.getLayoutParent().getContentElement().add(this._getPlaceholderElement());
        } else {
          var placeholder = this._getPlaceholderElement();
          placeholder.getParent().remove(placeholder);
        }
      }
    },


    /**
     * Helper to show the placeholder text in the field. It checks for all
     * states and possible conditions and shows the placeholder only if allowed.
     */
    _showPlaceholder : function()
    {
      var fieldValue = this.getValue() || "";
      var placeholder = this.getPlaceholder();
      if (
        placeholder != null &&
        fieldValue == "" &&
        !this.hasState("focused") &&
        !this.hasState("disabled")
      )
      {
        if (this.hasState("showingPlaceholder"))
        {
          this._syncPlaceholder();
        }
        else
        {
          // the placeholder will be set as soon as the appearance is applied
          this.addState("showingPlaceholder");
        }
      }
    },


    /**
     * Remove the fake placeholder
     */
    _onPointerDownPlaceholder : function() {
      window.setTimeout(function() {
        this.focus();
      }.bind(this), 0);
    },


    /**
     * Helper to remove the placeholder. Deletes the placeholder text from the
     * field and removes the state.
     */
    _removePlaceholder: function() {
      if (this.hasState("showingPlaceholder")) {
        if (this.__useQxPlaceholder) {
          this._getPlaceholderElement().setStyle("visibility", "hidden");
        }
        this.removeState("showingPlaceholder");
      }
    },


    /**
     * Updates the placeholder text with the DOM
     */
    _syncPlaceholder : function ()
    {
      if (this.hasState("showingPlaceholder") && this.__useQxPlaceholder) {
        this._getPlaceholderElement().setStyle("visibility", "visible");
      }
    },


    /**
     * Returns the placeholder label and creates it if necessary.
     */
    _getPlaceholderElement : function()
    {
      if (this._placeholder == null) {
        // create the placeholder
        this._placeholder = new qx.html.Label();
        var colorManager = qx.theme.manager.Color.getInstance();
        this._placeholder.setStyles({
          "zIndex" : 11,
          "position" : "absolute",
          "color" : colorManager.resolve("text-placeholder"),
          "whiteSpace": "normal", // enable wrap by default
          "cursor": "text",
          "visibility" : "hidden"
        });

        this._placeholder.addListener("pointerdown", this._onPointerDownPlaceholder, this);
      }
      return this._placeholder;
    },


    /**
     * Locale change event handler
     *
     * @signature function(e)
     * @param e {Event} the change event
     */
    _onChangeLocale : qx.core.Environment.select("qx.dynlocale",
    {
      "true" : function(e)
      {
        var content = this.getPlaceholder();
        if (content && content.translate) {
          this.setPlaceholder(content.translate());
        }
      },

      "false" : null
    }),


    // overridden
    _onChangeTheme : function() {
      this.base(arguments);
      if (this._placeholder) {
        // delete the placeholder element because it uses a theme dependent color
        this._placeholder.dispose();
        this._placeholder = null;
      }
      if (!this.__useQxPlaceholder && qx.ui.form.AbstractField.__stylesheet) {
        qx.bom.Stylesheet.removeSheet(qx.ui.form.AbstractField.__stylesheet);
        qx.ui.form.AbstractField.__stylesheet = null;
        qx.ui.form.AbstractField.__addPlaceholderRules();
      }
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyPlaceholder : function(value, old)
    {
      if (this.__useQxPlaceholder) {
        this._getPlaceholderElement().setValue(value);
        if (value != null) {
          this.addListener("focusin", this._removePlaceholder, this);
          this.addListener("focusout", this._showPlaceholder, this);
          this._showPlaceholder();
        } else {
          this.removeListener("focusin", this._removePlaceholder, this);
          this.removeListener("focusout", this._showPlaceholder, this);
          this._removePlaceholder();
        }
      } else {
        // only apply if the widget is enabled
        if (this.getEnabled()) {
          this.getContentElement().setAttribute("placeholder", value);

          if (qx.core.Environment.get("browser.name") === "firefox" &&
              parseFloat(qx.core.Environment.get("browser.version")) < 36 &&
              this.getContentElement().getNodeName() === "textarea" &&
              !this.getContentElement().getDomElement())
          {
            /* qx Bug #8870: Firefox 35 will not display a text area's
               placeholder text if the attribute is set before the
               element is added to the DOM. This is fixed in FF 36. */
            this.addListenerOnce("appear", function() {
              this.getContentElement().getDomElement().removeAttribute("placeholder");
              this.getContentElement().getDomElement().setAttribute("placeholder", value);
            }, this);
          }
        }
      }
    },


    // property apply
    _applyTextAlign : function(value, old) {
      this.getContentElement().setStyle("textAlign", value);
    },


    // property apply
    _applyReadOnly : function(value, old)
    {
      var element = this.getContentElement();

      element.setAttribute("readOnly", value);

      if (value)
      {
        this.addState("readonly");
        this.setFocusable(false);
      }
      else
      {
        this.removeState("readonly");
        this.setFocusable(true);
      }
    }

  },


  defer : function(statics) {
    var css = "border: none;" +
      "padding: 0;" +
      "margin: 0;" +
      "display : block;" +
      "background : transparent;" +
      "outline: none;" +
      "appearance: none;" +
      "position: absolute;" +
      "autoComplete: off;" +
      "resize: none;" +
      "border-radius: 0;";

    qx.ui.style.Stylesheet.getInstance().addRule(".qx-abstract-field", css);
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */
  destruct : function()
  {
    if (this._placeholder) {
      this._placeholder.removeListener("pointerdown", this._onPointerDownPlaceholder, this);
      var parent = this._placeholder.getParent();
      if (parent) {
        parent.remove(this._placeholder);
      }
      this._placeholder.dispose();
    }

    this._placeholder = this.__font = null;

    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this._onChangeLocale, this);
    }

    if (this.__font && this.__webfontListenerId) {
      this.__font.removeListenerById(this.__webfontListenerId);
    }

    this.getContentElement().removeListener("input", this._onHtmlInput, this);
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * A Input wrap any valid HTML input element and make it accessible
 * through the normalized qooxdoo element interface.
 */
qx.Class.define("qx.html.Input",
{
  extend : qx.html.Element,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param type {String} The type of the input field. Valid values are
   *   <code>text</code>, <code>textarea</code>, <code>select</code>,
   *   <code>checkbox</code>, <code>radio</code>, <code>password</code>,
   *   <code>hidden</code>, <code>submit</code>, <code>image</code>,
   *   <code>file</code>, <code>search</code>, <code>reset</code>,
   *   <code>select</code> and <code>textarea</code>.
   * @param styles {Map?null} optional map of CSS styles, where the key is the name
   *    of the style and the value is the value to use.
   * @param attributes {Map?null} optional map of element attributes, where the
   *    key is the name of the attribute and the value is the value to use.
   */
  construct : function(type, styles, attributes)
  {
    // Update node name correctly
    if (type === "select" || type === "textarea") {
      var nodeName = type;
    } else {
      nodeName = "input";
    }

    this.base(arguments, nodeName, styles, attributes);

    this.__type = type;
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __type : null,
    // used for webkit only
    __selectable : null,
    __enabled : null,

    /*
    ---------------------------------------------------------------------------
      ELEMENT API
    ---------------------------------------------------------------------------
    */

    //overridden
    _createDomElement : function() {
      return qx.bom.Input.create(this.__type);
    },


    // overridden
    _applyProperty : function(name, value)
    {
      this.base(arguments, name, value);
      var element = this.getDomElement();

      if (name === "value") {
        qx.bom.Input.setValue(element, value);
      } else if (name === "wrap") {
        qx.bom.Input.setWrap(element, value);

        // qx.bom.Input#setWrap has the side-effect that the CSS property
        // overflow is set via DOM methods, causing queue and DOM to get
        // out of sync. Mirror all overflow properties to handle the case
        // when group and x/y property differ.
        this.setStyle("overflow", element.style.overflow, true);
        this.setStyle("overflowX", element.style.overflowX, true);
        this.setStyle("overflowY", element.style.overflowY, true);
      }
    },


    /**
     * Set the input element enabled / disabled.
     * Webkit needs a special treatment because the set color of the input
     * field changes automatically. Therefore, we use
     * <code>-webkit-user-modify: read-only</code> and
     * <code>-webkit-user-select: none</code>
     * for disabling the fields in webkit. All other browsers use the disabled
     * attribute.
     *
     * @param value {Boolean} true, if the inpout element should be enabled.
     */
    setEnabled : function(value)
    {
      this.__enabled = value;

      this.setAttribute("disabled", value===false);

      if (qx.core.Environment.get("engine.name") == "webkit") {
        if (!value) {
          this.setStyles({
            "userModify": "read-only",
            "userSelect": "none"
          });
        } else {
          this.setStyles({
            "userModify": null,
            "userSelect": this.__selectable ? null : "none"
          });
        }
      }
    },


    /**
     * Set whether the element is selectable. It uses the qooxdoo attribute
     * qxSelectable with the values 'on' or 'off'.
     * In webkit, a special css property will be used and checks for the
     * enabled state.
     *
     * @param value {Boolean} True, if the element should be selectable.
     */
    setSelectable : qx.core.Environment.select("engine.name",
    {
      "webkit" : function(value)
      {
        this.__selectable = value;

        // Only apply the value when it is enabled
        this.base(arguments, this.__enabled && value);
      },

      "default" : function(value)
      {
        this.base(arguments, value);
      }
    }),



    /*
    ---------------------------------------------------------------------------
      INPUT API
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the value of the input element.
     *
     * @param value {var} the new value
     * @return {qx.html.Input} This instance for for chaining support.
     */
    setValue : function(value)
    {
      var element = this.getDomElement();

      if (element)
      {
        // Do not overwrite when already correct (on input events)
        // This is needed to keep caret position while typing.
        if (element.value != value) {
          qx.bom.Input.setValue(element, value);
        }
      } else {
        this._setProperty("value", value);
      }

      return this;
    },


    /**
     * Get the current value.
     *
     * @return {String} The element's current value.
     */
    getValue : function()
    {
      var element = this.getDomElement();

      if (element) {
        return qx.bom.Input.getValue(element);
      }

      return this._getProperty("value") || "";
    },


    /**
     * Sets the text wrap behavior of a text area element.
     *
     * This property uses the style property "wrap" (IE) respectively "whiteSpace"
     *
     * @param wrap {Boolean} Whether to turn text wrap on or off.
     * @param direct {Boolean?false} Whether the execution should be made
     *  directly when possible
     * @return {qx.html.Input} This instance for for chaining support.
     */
    setWrap : function(wrap, direct)
    {
      if (this.__type === "textarea") {
        this._setProperty("wrap", wrap, direct);
      } else {
        throw new Error("Text wrapping is only support by textareas!");
      }

      return this;
    },


    /**
     * Gets the text wrap behavior of a text area element.
     *
     * This property uses the style property "wrap" (IE) respectively "whiteSpace"
     *
     * @return {Boolean} Whether wrapping is enabled or disabled.
     */
    getWrap : function()
    {
      if (this.__type === "textarea") {
        return this._getProperty("wrap");
      } else {
        throw new Error("Text wrapping is only support by textareas!");
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

   ======================================================================

   This class contains code based on the following work:

   * jQuery
     http://jquery.com
     Version 1.3.1

     Copyright:
       2009 John Resig

     License:
       MIT: http://www.opensource.org/licenses/mit-license.php

************************************************************************ */

/**
 * Cross browser abstractions to work with input elements.
 *
 * @require(qx.lang.Array#contains)
 */
qx.Bootstrap.define("qx.bom.Input",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** @type {Map} Internal data structures with all supported input types */
    __types :
    {
      text : 1,
      textarea : 1,
      select : 1,
      checkbox : 1,
      radio : 1,
      password : 1,
      hidden : 1,
      submit : 1,
      image : 1,
      file : 1,
      search : 1,
      reset : 1,
      button : 1
    },


    /**
     * Creates an DOM input/textarea/select element.
     *
     * Attributes may be given directly with this call. This is critical
     * for some attributes e.g. name, type, ... in many clients.
     *
     * Note: <code>select</code> and <code>textarea</code> elements are created
     * using the identically named <code>type</code>.
     *
     * @param type {String} Any valid type for HTML, <code>select</code>
     *   and <code>textarea</code>
     * @param attributes {Map} Map of attributes to apply
     * @param win {Window} Window to create the element for
     * @return {Element} The created input node
     */
    create : function(type, attributes, win)
    {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertKeyInMap(type, this.__types, "Unsupported input type.");
      }

      // Work on a copy to not modify given attributes map
      var attributes = attributes ? qx.lang.Object.clone(attributes) : {};

      var tag;

      if (type === "textarea" || type === "select")
      {
        tag = type;
      }
      else
      {
        tag = "input";
        attributes.type = type;
      }

      return qx.dom.Element.create(tag, attributes, win);
    },


    /**
     * Applies the given value to the element.
     *
     * Normally the value is given as a string/number value and applied
     * to the field content (textfield, textarea) or used to
     * detect whether the field is checked (checkbox, radiobutton).
     *
     * Supports array values for selectboxes (multiple-selection)
     * and checkboxes or radiobuttons (for convenience).
     *
     * Please note: To modify the value attribute of a checkbox or
     * radiobutton use {@link qx.bom.element.Attribute#set} instead.
     *
     * @param element {Element} element to update
     * @param value {String|Number|Array} the value to apply
     */
    setValue : function(element, value)
    {
      var tag = element.nodeName.toLowerCase();
      var type = element.type;
      var Array = qx.lang.Array;
      var Type = qx.lang.Type;

      if (typeof value === "number") {
        value += "";
      }

      if ((type === "checkbox" || type === "radio"))
      {
        if (Type.isArray(value)) {
          element.checked = Array.contains(value, element.value);
        } else {
          element.checked = element.value == value;
        }
      }
      else if (tag === "select")
      {
        var isArray = Type.isArray(value);
        var options = element.options;
        var subel, subval;

        for (var i=0, l=options.length; i<l; i++)
        {
          subel = options[i];
          subval = subel.getAttribute("value");
          if (subval == null) {
            subval = subel.text;
          }

          subel.selected = isArray ?
             Array.contains(value, subval) : value == subval;
        }

        if (isArray && value.length == 0) {
          element.selectedIndex = -1;
        }
      }
      else if ((type === "text" || type === "textarea") &&
        (qx.core.Environment.get("engine.name") == "mshtml"))
      {
        // These flags are required to detect self-made property-change
        // events during value modification. They are used by the Input
        // event handler to filter events.
        element.$$inValueSet = true;
        element.value = value;
        element.$$inValueSet = null;
      } else {
        element.value = value;
      }
    },


    /**
     * Returns the currently configured value.
     *
     * Works with simple input fields as well as with
     * select boxes or option elements.
     *
     * Returns an array in cases of multi-selection in
     * select boxes but in all other cases a string.
     *
     * @param element {Element} DOM element to query
     * @return {String|Array} The value of the given element
     */
    getValue : function(element)
    {
      var tag = element.nodeName.toLowerCase();

      if (tag === "option") {
        return (element.attributes.value || {}).specified ? element.value : element.text;
      }

      if (tag === "select")
      {
        var index = element.selectedIndex;

        // Nothing was selected
        if (index < 0) {
          return null;
        }

        var values = [];
        var options = element.options;
        var one = element.type == "select-one";
        var clazz = qx.bom.Input;
        var value;

        // Loop through all the selected options
        for (var i=one ? index : 0, max=one ? index+1 : options.length; i<max; i++)
        {
          var option = options[i];

          if (option.selected)
          {
            // Get the specifc value for the option
            value = clazz.getValue(option);

            // We don't need an array for one selects
            if (one) {
              return value;
            }

            // Multi-Selects return an array
            values.push(value);
          }
        }

        return values;
      }
      else
      {
        return (element.value || "").replace(/\r/g, "");
      }
    },


    /**
     * Sets the text wrap behaviour of a text area element.
     * This property uses the attribute "wrap" respectively
     * the style property "whiteSpace"
     *
     * @signature function(element, wrap)
     * @param element {Element} DOM element to modify
     * @param wrap {Boolean} Whether to turn text wrap on or off.
     */
    setWrap : qx.core.Environment.select("engine.name",
    {
      "mshtml" : function(element, wrap) {
        var wrapValue = wrap ? "soft" : "off";

        // Explicitly set overflow-y CSS property to auto when wrapped,
        // allowing the vertical scroll-bar to appear if necessary
        var styleValue = wrap ? "auto" : "";

        element.wrap = wrapValue;
        element.style.overflowY = styleValue;
      },

      "gecko" : function(element, wrap)
      {
        var wrapValue = wrap ? "soft" : "off";
        var styleValue = wrap ? "" : "auto";

        element.setAttribute("wrap", wrapValue);
        element.style.overflow = styleValue;
      },

      "webkit" : function(element, wrap)
      {
        var wrapValue = wrap ? "soft" : "off";
        var styleValue = wrap ? "" : "auto";

        element.setAttribute("wrap", wrapValue);
        element.style.overflow = styleValue;
      },

      "default" : function(element, wrap) {
        element.style.whiteSpace = wrap ? "normal" : "nowrap";
      }
    })
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
     * Adrian Olaru (adrianolaru)

************************************************************************ */

/**
 * The TextField is a single-line text input field.
 */
qx.Class.define("qx.ui.form.TextField",
{
  extend : qx.ui.form.AbstractField,


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
      init : "textfield"
    },

    // overridden
    allowGrowY :
    {
      refine : true,
      init : false
    },

    // overridden
    allowShrinkY :
    {
      refine : true,
      init : false
    }
  },

  members : {

    // overridden
    _renderContentElement : function(innerHeight, element) {
     if ((qx.core.Environment.get("engine.name") == "mshtml") &&
         (parseInt(qx.core.Environment.get("engine.version"), 10) < 9
         || qx.core.Environment.get("browser.documentmode") < 9))
     {
       element.setStyles({
         "line-height" : innerHeight + 'px'
       });
     }
    },


    // overridden
    _createContentElement : function() {
      var el = this.base(arguments);
      var deviceType = qx.core.Environment.get("device.type");
      if (deviceType == "tablet" || deviceType == "mobile") {
        el.addListener("keypress", this._onKeyPress, this);
      }

      return el;
    },


    /**
    * Close the virtual keyboard if the Enter key is pressed.
    * @param evt {qx.event.type.KeySequence} the keypress event.
    */
    _onKeyPress : function(evt) {
      // On return
      if (evt.getKeyIdentifier() == "Enter") {
        this.blur();
      }
    }
  },

  destruct : function() {
    this.getContentElement().removeListener("keypress", this._onKeyPress, this);
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
 * A password input field, which hides the entered text.
 */
qx.Class.define("qx.ui.form.PasswordField",
{
  extend : qx.ui.form.TextField,

  members :
  {
    // overridden
    _createInputElement : function() {
      return new qx.html.Input("password");
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
 * The menu is a popup like control which supports buttons. It comes
 * with full keyboard navigation and an improved timeout based pointer
 * control behavior.
 *
 * This class is the container for all derived instances of
 * {@link qx.ui.menu.AbstractButton}.
 *
 * @childControl slidebar {qx.ui.menu.MenuSlideBar} shows a slidebar to easily navigate inside the menu (if too little space is left)
 */
qx.Class.define("qx.ui.menu.Menu",
{
  extend : qx.ui.core.Widget,

  include : [
    qx.ui.core.MPlacement,
    qx.ui.core.MRemoteChildrenHandling
  ],


  construct : function()
  {
    this.base(arguments);

    // Use hard coded layout
    this._setLayout(new qx.ui.menu.Layout);

    // Automatically add to application's root
    var root = this.getApplicationRoot();
    root.add(this);

    // Register pointer listeners
    this.addListener("pointerover", this._onPointerOver);
    this.addListener("pointerout", this._onPointerOut);

    // add resize listener
    this.addListener("resize", this._onResize, this);
    root.addListener("resize", this._onResize, this);

    this._blocker = new qx.ui.core.Blocker(root);

    // Initialize properties
    this.initVisibility();
    this.initKeepFocus();
    this.initKeepActive();
  },



  properties :
  {
    /*
    ---------------------------------------------------------------------------
      WIDGET PROPERTIES
    ---------------------------------------------------------------------------
    */

    // overridden
    appearance :
    {
      refine : true,
      init : "menu"
    },

    // overridden
    allowGrowX :
    {
      refine : true,
      init: false
    },

    // overridden
    allowGrowY :
    {
      refine : true,
      init: false
    },

    // overridden
    visibility :
    {
      refine : true,
      init : "excluded"
    },

    // overridden
    keepFocus :
    {
      refine : true,
      init : true
    },

    // overridden
    keepActive :
    {
      refine : true,
      init : true
    },


    /*
    ---------------------------------------------------------------------------
      STYLE OPTIONS
    ---------------------------------------------------------------------------
    */

    /** The spacing between each cell of the menu buttons */
    spacingX :
    {
      check : "Integer",
      apply : "_applySpacingX",
      init : 0,
      themeable : true
    },

    /** The spacing between each menu button */
    spacingY :
    {
      check : "Integer",
      apply : "_applySpacingY",
      init : 0,
      themeable : true
    },

    /**
    * Default icon column width if no icons are rendered.
    * This property is ignored as soon as an icon is present.
    */
    iconColumnWidth :
    {
      check : "Integer",
      init : 0,
      themeable : true,
      apply : "_applyIconColumnWidth"
    },

    /** Default arrow column width if no sub menus are rendered */
    arrowColumnWidth :
    {
      check : "Integer",
      init : 0,
      themeable : true,
      apply : "_applyArrowColumnWidth"
    },

    /**
     * Color of the blocker
     */
    blockerColor :
    {
      check : "Color",
      init : null,
      nullable: true,
      apply : "_applyBlockerColor",
      themeable: true
    },

    /**
     * Opacity of the blocker
     */
    blockerOpacity :
    {
      check : "Number",
      init : 1,
      apply : "_applyBlockerOpacity",
      themeable: true
    },


    /*
    ---------------------------------------------------------------------------
      FUNCTIONALITY PROPERTIES
    ---------------------------------------------------------------------------
    */

    /** The currently selected button */
    selectedButton :
    {
      check : "qx.ui.core.Widget",
      nullable : true,
      apply : "_applySelectedButton"
    },

    /** The currently opened button (sub menu is visible) */
    openedButton :
    {
      check : "qx.ui.core.Widget",
      nullable : true,
      apply : "_applyOpenedButton"
    },

    /** Widget that opened the menu */
    opener :
    {
      check : "qx.ui.core.Widget",
      nullable : true
    },




    /*
    ---------------------------------------------------------------------------
      BEHAVIOR PROPERTIES
    ---------------------------------------------------------------------------
    */

    /** Interval in ms after which sub menus should be opened */
    openInterval :
    {
      check : "Integer",
      themeable : true,
      init : 250,
      apply : "_applyOpenInterval"
    },

    /** Interval in ms after which sub menus should be closed  */
    closeInterval :
    {
      check : "Integer",
      themeable : true,
      init : 250,
      apply : "_applyCloseInterval"
    },

    /** Blocks the background if value is <code>true<code> */
    blockBackground :
    {
      check : "Boolean",
      themeable : true,
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

    __scheduledOpen : null,
    __onAfterSlideBarAdd : null,

    /** @type {qx.ui.core.Blocker} blocker for background blocking */
    _blocker : null,

    /*
    ---------------------------------------------------------------------------
      PUBLIC API
    ---------------------------------------------------------------------------
    */

    /**
     * Opens the menu and configures the opener
     */
    open : function()
    {
      if (this.getOpener() != null)
      {
        var isPlaced = this.placeToWidget(this.getOpener(), true);
        if(isPlaced) {
          this.__updateSlideBar();
          this.show();

          this._placementTarget = this.getOpener();
        } else {
          this.warn("Could not open menu instance because 'opener' widget is not visible");
        }
      } else {
        this.warn("The menu instance needs a configured 'opener' widget!");
      }
    },


    /**
     * Opens the menu at the pointer position
     *
     * @param e {qx.event.type.Pointer} Pointer event to align to
     */
    openAtPointer : function(e)
    {
      this.placeToPointer(e);
      this.__updateSlideBar();
      this.show();

      this._placementTarget = {
        left: e.getDocumentLeft(),
        top: e.getDocumentTop()
      };
    },


    /**
     * Opens the menu in relation to the given point
     *
     * @param point {Map} Coordinate of any point with the keys <code>left</code>
     *   and <code>top</code>.
     */
    openAtPoint : function(point)
    {
      this.placeToPoint(point);
      this.__updateSlideBar();
      this.show();

      this._placementTarget = point;
    },


    /**
     * Convenience method to add a separator to the menu
     */
    addSeparator : function() {
      this.add(new qx.ui.menu.Separator);
    },


    /**
     * Returns the column sizes detected during the pre-layout phase
     *
     * @return {Array} List of all column widths
     */
    getColumnSizes : function() {
      return this._getMenuLayout().getColumnSizes();
    },


    /**
     * Return all selectable menu items.
     *
     * @return {qx.ui.core.Widget[]} selectable widgets
     */
    getSelectables : function() {
      var result = [];
      var children = this.getChildren();

      for (var i = 0; i < children.length; i++)
      {
        if (children[i].isEnabled()) {
          result.push(children[i]);
        }
      }

      return result;
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyIconColumnWidth : function(value, old) {
      this._getMenuLayout().setIconColumnWidth(value);
    },


    // property apply
    _applyArrowColumnWidth : function(value, old) {
      this._getMenuLayout().setArrowColumnWidth(value);
    },


    // property apply
    _applySpacingX : function(value, old) {
      this._getMenuLayout().setColumnSpacing(value);
    },


    // property apply
    _applySpacingY : function(value, old) {
      this._getMenuLayout().setSpacing(value);
    },


    // overridden
    _applyVisibility : function(value, old)
    {
      this.base(arguments, value, old);

      var mgr = qx.ui.menu.Manager.getInstance();

      if (value === "visible")
      {
        // Register to manager (zIndex handling etc.)
        mgr.add(this);

        // Mark opened in parent menu
        var parentMenu = this.getParentMenu();
        if (parentMenu) {
          parentMenu.setOpenedButton(this.getOpener());
        }
      }
      else if (old === "visible")
      {
        // Deregister from manager (zIndex handling etc.)
        mgr.remove(this);

        // Unmark opened in parent menu
        var parentMenu = this.getParentMenu();
        if (parentMenu && parentMenu.getOpenedButton() == this.getOpener()) {
          parentMenu.resetOpenedButton();
        }

        // Clear properties
        this.resetOpenedButton();
        this.resetSelectedButton();
      }

      this.__updateBlockerVisibility();
    },


    /**
     * Updates the blocker's visibility
     */
    __updateBlockerVisibility : function()
    {
      if (this.isVisible())
      {
        if (this.getBlockBackground()) {
          var zIndex = this.getZIndex();
          this._blocker.blockContent(zIndex - 1);
        }
      }
      else
      {
        if (this._blocker.isBlocked()) {
          this._blocker.unblock();
        }
      }
    },


    /**
     * Get the parent menu. Returns <code>null</code> if the menu doesn't have a
     * parent menu.
     *
     * @return {Menu|null} The parent menu.
     */
    getParentMenu : function()
    {
      var widget = this.getOpener();
      if (!widget || !(widget instanceof qx.ui.menu.AbstractButton)) {
        return null;
      }

      if (widget && widget.getContextMenu() === this) {
        return null;
      }

      while (widget && !(widget instanceof qx.ui.menu.Menu)) {
        widget = widget.getLayoutParent();
      }
      return widget;
    },


    // property apply
    _applySelectedButton : function(value, old)
    {
      if (old) {
        old.removeState("selected");
      }

      if (value) {
        value.addState("selected");
      }
    },


    // property apply
    _applyOpenedButton : function(value, old)
    {
      if (old && old.getMenu()) {
        old.getMenu().exclude();
      }

      if (value) {
        value.getMenu().open();
      }
    },


    // property apply
    _applyBlockerColor : function(value, old) {
      this._blocker.setColor(value);
    },


    // property apply
    _applyBlockerOpacity : function(value, old) {
      this._blocker.setOpacity(value);
    },


    /*
    ---------------------------------------------------------------------------
    SCROLLING SUPPORT
    ---------------------------------------------------------------------------
    */

    // overridden
    getChildrenContainer : function() {
      return this.getChildControl("slidebar", true) || this;
    },


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "slidebar":
          var control = new qx.ui.menu.MenuSlideBar();

          var layout = this._getLayout();
          this._setLayout(new qx.ui.layout.Grow());

          var slidebarLayout = control.getLayout();
          control.setLayout(layout);
          slidebarLayout.dispose();

          var children = qx.lang.Array.clone(this.getChildren());
          for (var i=0; i<children.length; i++) {
            control.add(children[i]);
          }

          this.removeListener("resize", this._onResize, this);
          control.getChildrenContainer().addListener("resize", this._onResize, this);

          this._add(control);

        break;
      }

      return control || this.base(arguments, id);
    },


    /**
     * Get the menu layout manager
     *
     * @return {Layout} The menu layout manager
     */
    _getMenuLayout : function()
    {
      if (this.hasChildControl("slidebar")) {
        return this.getChildControl("slidebar").getChildrenContainer().getLayout();
      } else {
        return this._getLayout();
      }
    },


    /**
     * Get the menu bounds
     *
     * @return {Map} The menu bounds
     */
    _getMenuBounds : function()
    {
      if (this.hasChildControl("slidebar")) {
        return this.getChildControl("slidebar").getChildrenContainer().getBounds();
      } else {
        return this.getBounds();
      }
    },


    /**
     * Computes the size of the menu. This method is used by the
     * {@link qx.ui.core.MPlacement} mixin.
     * @return {Map} The menu bounds
     */
    _computePlacementSize : function() {
      return this._getMenuBounds();
    },


    /**
     * Updates the visibility of the slidebar based on the menu's current size
     * and position.
     */
    __updateSlideBar : function()
    {
      var menuBounds = this._getMenuBounds();
      if (!menuBounds)
      {
        this.addListenerOnce("resize", this.__updateSlideBar, this);
        return;
      }

      var rootHeight = this.getLayoutParent().getBounds().height;
      var top = this.getLayoutProperties().top;
      var left = this.getLayoutProperties().left;

      // Adding the slidebar must be deferred because this call can happen
      // during the layout flush, which make it impossible to move existing
      // layout to the slidebar
      if (top < 0)
      {
        this._assertSlideBar(function() {
          this.setHeight(menuBounds.height + top);
          this.moveTo(left, 0);
        });
      }
      else if (top + menuBounds.height > rootHeight)
      {
        this._assertSlideBar(function() {
          this.setHeight(rootHeight - top);
        });
      }
      else
      {
        this.setHeight(null);
      }
    },


    /**
     * Schedules the addition of the slidebar and calls the given callback
     * after the slidebar has been added.
     *
     * @param callback {Function} the callback to call
     * @return {var|undefined} The return value of the callback if the slidebar
     * already exists, or <code>undefined</code> if it doesn't
     */
    _assertSlideBar : function(callback)
    {
      if (this.hasChildControl("slidebar")) {
        return callback.call(this);
      }

      this.__onAfterSlideBarAdd = callback;
      qx.ui.core.queue.Widget.add(this);
    },


    // overridden
    syncWidget : function(jobs)
    {
      this.getChildControl("slidebar");
      if (this.__onAfterSlideBarAdd)
      {
        this.__onAfterSlideBarAdd.call(this);
        delete this.__onAfterSlideBarAdd;
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * Update position if the menu or the root is resized
     */
    _onResize : function()
    {
      if (this.isVisible())
      {
        var target = this._placementTarget;
        if (!target) {
          return;
        } else if (target instanceof qx.ui.core.Widget) {
          this.placeToWidget(target, true);
        } else if (target.top !== undefined) {
          this.placeToPoint(target);
        } else {
          throw new Error("Unknown target: " + target);
        }
        this.__updateSlideBar();
      }
    },


    /**
     * Event listener for pointerover event.
     *
     * @param e {qx.event.type.Pointer} pointerover event
     */
    _onPointerOver : function(e)
    {
      // Cache manager
      var mgr = qx.ui.menu.Manager.getInstance();

      // Be sure this menu is kept
      mgr.cancelClose(this);

      // Change selection
      var target = e.getTarget();
      if (target.isEnabled() && target instanceof qx.ui.menu.AbstractButton)
      {
        // Select button directly
        this.setSelectedButton(target);

        var subMenu = target.getMenu && target.getMenu();
        if (subMenu)
        {
          subMenu.setOpener(target);

          // Finally schedule for opening
          mgr.scheduleOpen(subMenu);

          // Remember scheduled menu for opening
          this.__scheduledOpen = subMenu;
        }
        else
        {
          var opened = this.getOpenedButton();
          if (opened) {
            mgr.scheduleClose(opened.getMenu());
          }

          if (this.__scheduledOpen)
          {
            mgr.cancelOpen(this.__scheduledOpen);
            this.__scheduledOpen = null;
          }
        }
      }
      else if (!this.getOpenedButton())
      {
        // When no button is opened reset the selection
        // Otherwise keep it
        this.resetSelectedButton();
      }
    },


    /**
     * Event listener for pointerout event.
     *
     * @param e {qx.event.type.Pointer} pointerout event
     */
    _onPointerOut : function(e)
    {
      // Cache manager
      var mgr = qx.ui.menu.Manager.getInstance();

      // Detect whether the related target is out of the menu
      if (!qx.ui.core.Widget.contains(this, e.getRelatedTarget()))
      {
        // Update selected property
        // Force it to the open sub menu in cases where that is opened
        // Otherwise reset it. Menus which are left by the cursor should
        // not show any selection.
        var opened = this.getOpenedButton();
        opened ? this.setSelectedButton(opened) : this.resetSelectedButton();

        // Cancel a pending close request for the currently
        // opened sub menu
        if (opened) {
          mgr.cancelClose(opened.getMenu());
        }

        // When leaving this menu to the outside, stop
        // all pending requests to open any other sub menu
        if (this.__scheduledOpen) {
          mgr.cancelOpen(this.__scheduledOpen);
        }
      }
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (!qx.core.ObjectRegistry.inShutDown) {
      qx.ui.menu.Manager.getInstance().remove(this);
    }

    this.getApplicationRoot().removeListener("resize", this._onResize, this);
    this._placementTarget = null;
    this._disposeObjects("_blocker");
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
 * Layouter used by the qooxdoo menu's to render their buttons
 *
 * @internal
 */
qx.Class.define("qx.ui.menu.Layout",
{
  extend : qx.ui.layout.VBox,


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Spacing between each cell on the menu buttons */
    columnSpacing :
    {
      check : "Integer",
      init : 0,
      apply : "_applyLayoutChange"
    },

    /**
     * Whether a column and which column should automatically span
     * when the following cell is empty. Spanning may be disabled
     * through setting this property to <code>null</code>.
     */
    spanColumn :
    {
      check : "Integer",
      init : 1,
      nullable : true,
      apply : "_applyLayoutChange"
    },

    /** Default icon column width if no icons are rendered */
    iconColumnWidth :
    {
      check : "Integer",
      init : 0,
      themeable : true,
      apply : "_applyLayoutChange"
    },

    /** Default arrow column width if no sub menus are rendered */
    arrowColumnWidth :
    {
      check : "Integer",
      init : 0,
      themeable : true,
      apply : "_applyLayoutChange"
    }
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __columnSizes : null,

    /*
    ---------------------------------------------------------------------------
      LAYOUT INTERFACE
    ---------------------------------------------------------------------------
    */

    // overridden
    _computeSizeHint : function()
    {
      var children = this._getLayoutChildren();
      var child, sizes, spacing;

      var spanColumn = this.getSpanColumn();
      var columnSizes = this.__columnSizes = [0, 0, 0, 0];
      var columnSpacing = this.getColumnSpacing();
      var spanColumnWidth = 0;
      var maxInset = 0;

      // Compute column sizes and insets
      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];

        if (child.isAnonymous()) {
          continue;
        }

        sizes = child.getChildrenSizes();

        for (var column=0; column<sizes.length; column++)
        {
          if (spanColumn != null && column == spanColumn && sizes[spanColumn+1] == 0) {
            spanColumnWidth = Math.max(spanColumnWidth, sizes[column]);
          } else {
            columnSizes[column] = Math.max(columnSizes[column], sizes[column])
          }
        }

        var insets = children[i].getInsets();
        maxInset = Math.max(maxInset, insets.left + insets.right);
      }

      // Fix label column width is cases where the maximum button with no shortcut
      // is larger than the maximum button with a shortcut
      if (spanColumn != null && columnSizes[spanColumn] + columnSpacing + columnSizes[spanColumn+1] < spanColumnWidth) {
        columnSizes[spanColumn] = spanColumnWidth - columnSizes[spanColumn+1] - columnSpacing;
      }

      // When merging the cells for label and shortcut
      // ignore the spacing between them
      if (spanColumnWidth == 0) {
        spacing = columnSpacing * 2;
      } else {
        spacing = columnSpacing * 3;
      }

      // Fix zero size icon column
      if (columnSizes[0] == 0) {
        columnSizes[0] = this.getIconColumnWidth();
      }

      // Fix zero size arrow column
      if (columnSizes[3] == 0) {
        columnSizes[3] = this.getArrowColumnWidth();
      }

      var height = this.base(arguments).height;

      // Build hint
      return {
        minHeight: height,
        height : height,
        width : qx.lang.Array.sum(columnSizes) + maxInset + spacing
      };
    },



    /*
    ---------------------------------------------------------------------------
      CUSTOM ADDONS
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the column sizes detected during the pre-layout phase
     *
     * @return {Array} List of all column widths
     */
    getColumnSizes : function() {
      return this.__columnSizes || null;
    }
  },

  /*
   *****************************************************************************
      DESTRUCT
   *****************************************************************************
   */

  destruct : function() {
    this.__columnSizes = null;
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
 * This widget draws a separator line between two instances of
 * {@link qx.ui.menu.AbstractButton} and is inserted into the
 * {@link qx.ui.menu.Menu}.
 *
 * For convenience reasons there is also
 * a method {@link qx.ui.menu.Menu#addSeparator} to append instances
 * of this class to the menu.
 */
qx.Class.define("qx.ui.menu.Separator",
{
  extend : qx.ui.core.Widget,




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
      init : "menu-separator"
    },

    // overridden
    anonymous :
    {
      refine : true,
      init : true
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
 * This singleton manages visible menu instances and supports some
 * core features to schedule menu open/close with timeout support.
 *
 * It also manages the whole keyboard support for the currently
 * registered widgets.
 *
 * The zIndex order is also managed by this class.
 */
qx.Class.define("qx.ui.menu.Manager",
{
  type : "singleton",
  extend : qx.core.Object,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // Create data structure
    this.__objects = [];

    var el = document.body;
    var Registration = qx.event.Registration;

    // React on pointer/mouse events, but on native, to support inline applications
    Registration.addListener(window.document.documentElement, "pointerdown", this._onPointerDown, this, true);
    Registration.addListener(el, "roll", this._onRoll, this, true);

    // React on keypress events
    Registration.addListener(el, "keydown", this._onKeyUpDown, this, true);
    Registration.addListener(el, "keyup", this._onKeyUpDown, this, true);
    Registration.addListener(el, "keypress", this._onKeyPress, this, true);

    // only use the blur event to hide windows on non touch devices [BUG #4033]
    // When the menu is located on top of an iFrame, the select will fail
    if (!qx.core.Environment.get("event.touch")) {
      // Hide all when the window is blurred
      qx.bom.Element.addListener(window, "blur", this.hideAll, this);
    }

    // Create open timer
    this.__openTimer = new qx.event.Timer();
    this.__openTimer.addListener("interval", this._onOpenInterval, this);

    // Create close timer
    this.__closeTimer = new qx.event.Timer();
    this.__closeTimer.addListener("interval", this._onCloseInterval, this);
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __scheduleOpen : null,
    __scheduleClose : null,
    __openTimer : null,
    __closeTimer : null,
    __objects : null,




    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Query engine for menu children.
     *
     * @param menu {qx.ui.menu.Menu} Any menu instance
     * @param start {Integer} Child index to start with
     * @param iter {Integer} Iteration count, normally <code>+1</code> or <code>-1</code>
     * @param loop {Boolean?false} Whether to wrap when reaching the begin/end of the list
     * @return {qx.ui.menu.Button} Any menu button or <code>null</code>
     */
    _getChild : function(menu, start, iter, loop)
    {
      var children = menu.getChildren();
      var length = children.length;
      var child;

      for (var i=start; i<length && i>=0; i+=iter)
      {
        child = children[i];
        if (child.isEnabled() && !child.isAnonymous() && child.isVisible()) {
          return child;
        }
      }

      if (loop)
      {
        i = i == length ? 0 : length-1;
        for (; i!=start; i+=iter)
        {
          child = children[i];
          if (child.isEnabled() && !child.isAnonymous() && child.isVisible()) {
            return child;
          }
        }
      }

      return null;
    },


    /**
     * Whether the given widget is inside any Menu instance.
     *
     * @param widget {qx.ui.core.Widget} Any widget
     * @return {Boolean} <code>true</code> when the widget is part of any menu
     */
    _isInMenu : function(widget)
    {
      while(widget)
      {
        if (widget instanceof qx.ui.menu.Menu) {
          return true;
        }

        widget = widget.getLayoutParent();
      }

      return false;
    },


    /**
     * Whether the given widget is one of the menu openers.
     *
     * @param widget {qx.ui.core.Widget} Any widget
     * @return {Boolean} <code>true</code> if the widget is a menu opener
     */
    _isMenuOpener : function(widget)
    {
      var menus = this.__objects;

      for (var i = 0; i < menus.length; i++) {
        if (menus[i].getOpener() === widget) {
          return true;
        }
      }

      return false;
    },


    /**
     * Returns an instance of a menu button if the given widget is a child
     *
     * @param widget {qx.ui.core.Widget} any widget
     * @return {qx.ui.menu.Button} Any menu button instance or <code>null</code>
     */
    _getMenuButton : function(widget)
    {
      while(widget)
      {
        if (widget instanceof qx.ui.menu.AbstractButton) {
          return widget;
        }

        widget = widget.getLayoutParent();
      }

      return null;
    },


    /*
    ---------------------------------------------------------------------------
      PUBLIC METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Adds a menu to the list of visible menus.
     *
     * @param obj {qx.ui.menu.Menu} Any menu instance.
     */
    add : function(obj)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(obj instanceof qx.ui.menu.Menu)) {
          throw new Error("Object is no menu: " + obj);
        }
      }

      var reg = this.__objects;
      reg.push(obj);
      obj.setZIndex(1e6+reg.length);
    },


    /**
     * Remove a menu from the list of visible menus.
     *
     * @param obj {qx.ui.menu.Menu} Any menu instance.
     */
    remove : function(obj)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (!(obj instanceof qx.ui.menu.Menu)) {
          throw new Error("Object is no menu: " + obj);
        }
      }

      var reg = this.__objects;
      if (reg) {
        qx.lang.Array.remove(reg, obj);
      }
    },


    /**
     * Hides all currently opened menus.
     */
    hideAll : function()
    {
      var reg = this.__objects;
      if (reg)
      {
        for (var i=reg.length-1; i>=0; i--) {
          reg[i].exclude();
        }
      }
    },


    /**
     * Returns the menu which was opened at last (which
     * is the active one this way)
     *
     * @return {qx.ui.menu.Menu} The current active menu or <code>null</code>
     */
    getActiveMenu : function()
    {
      var reg = this.__objects;
      return reg.length > 0 ? reg[reg.length-1] : null;
    },




    /*
    ---------------------------------------------------------------------------
      SCHEDULED OPEN/CLOSE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Schedules the given menu to be opened after the
     * {@link qx.ui.menu.Menu#openInterval} configured by the
     * menu instance itself.
     *
     * @param menu {qx.ui.menu.Menu} The menu to schedule for open
     */
    scheduleOpen : function(menu)
    {
      // Cancel close of given menu first
      this.cancelClose(menu);

      // When the menu is already visible
      if (menu.isVisible())
      {
        // Cancel all other open requests
        if (this.__scheduleOpen) {
          this.cancelOpen(this.__scheduleOpen);
        }
      }

      // When the menu is not visible and not scheduled already
      // then schedule it for opening
      else if (this.__scheduleOpen != menu)
      {
        // menu.debug("Schedule open");
        this.__scheduleOpen = menu;
        this.__openTimer.restartWith(menu.getOpenInterval());
      }
    },


    /**
     * Schedules the given menu to be closed after the
     * {@link qx.ui.menu.Menu#closeInterval} configured by the
     * menu instance itself.
     *
     * @param menu {qx.ui.menu.Menu} The menu to schedule for close
     */
    scheduleClose : function(menu)
    {
      // Cancel open of the menu first
      this.cancelOpen(menu);

      // When the menu is already invisible
      if (!menu.isVisible())
      {
        // Cancel all other close requests
        if (this.__scheduleClose) {
          this.cancelClose(this.__scheduleClose);
        }
      }

      // When the menu is visible and not scheduled already
      // then schedule it for closing
      else if (this.__scheduleClose != menu)
      {
        // menu.debug("Schedule close");
        this.__scheduleClose = menu;
        this.__closeTimer.restartWith(menu.getCloseInterval());
      }
    },


    /**
     * When the given menu is scheduled for open this pending
     * request is canceled.
     *
     * @param menu {qx.ui.menu.Menu} The menu to cancel for open
     */
    cancelOpen : function(menu)
    {
      if (this.__scheduleOpen == menu)
      {
        // menu.debug("Cancel open");
        this.__openTimer.stop();
        this.__scheduleOpen = null;
      }
    },


    /**
     * When the given menu is scheduled for close this pending
     * request is canceled.
     *
     * @param menu {qx.ui.menu.Menu} The menu to cancel for close
     */
    cancelClose : function(menu)
    {
      if (this.__scheduleClose == menu)
      {
        // menu.debug("Cancel close");
        this.__closeTimer.stop();
        this.__scheduleClose = null;
      }
    },


    /*
    ---------------------------------------------------------------------------
      TIMER EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Event listener for a pending open request. Configured to the interval
     * of the current menu to open.
     *
     * @param e {qx.event.type.Event} Interval event
     */
    _onOpenInterval : function(e)
    {
      // Stop timer
      this.__openTimer.stop();

      // Open menu and reset flag
      this.__scheduleOpen.open();
      this.__scheduleOpen = null;
    },


    /**
     * Event listener for a pending close request. Configured to the interval
     * of the current menu to close.
     *
     * @param e {qx.event.type.Event} Interval event
     */
    _onCloseInterval : function(e)
    {
      // Stop timer, reset scheduling flag
      this.__closeTimer.stop();

      // Close menu and reset flag
      this.__scheduleClose.exclude();
      this.__scheduleClose = null;
    },


    /*
    ---------------------------------------------------------------------------
      CONTEXTMENU EVENT HANDLING
    ---------------------------------------------------------------------------
    */


    /**
     * Internal function registers a handler to stop next
     * <code>contextmenu</code> event.
     * This function will be called by {@link qx.ui.menu.Button#_onTap}, if
     * right click was pressed.
     *
     * @internal
     */
    preventContextMenuOnce : function()
    {
      qx.event.Registration.addListener(document.body, "contextmenu", this.__onPreventContextMenu, this, true);
    },


    /**
     * Internal event handler to stop <code>contextmenu</code> event bubbling,
     * if target is inside the opened menu.
     *
     * @param e {qx.event.type.Mouse} contextmenu event
     *
     * @internal
     */
    __onPreventContextMenu : function(e)
    {
      var target = e.getTarget();
      target = qx.ui.core.Widget.getWidgetByElement(target, true);
      if (this._isInMenu(target)) {
        e.stopPropagation();
        e.preventDefault();
      }

      // stop only once
      qx.event.Registration.removeListener(document.body, "contextmenu", this.__onPreventContextMenu, this, true);
    },


    /*
    ---------------------------------------------------------------------------
      POINTER EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Event handler for pointerdown events
     *
     * @param e {qx.event.type.Pointer} pointerdown event
     */
    _onPointerDown : function(e)
    {
      var target = e.getTarget();
      target = qx.ui.core.Widget.getWidgetByElement(target, true);

      // If the target is 'null' the tap appears on a DOM element witch is not
      // a widget. This happens normally with an inline application, when the user
      // taps not in the inline application. In this case all all currently
      // open menus should be closed.
      if (target == null) {
        this.hideAll();
        return;
      }

      // If the target is the one which has opened the current menu
      // we ignore the pointerdown to let the button process the event
      // further with toggling or ignoring the tap.
      if (target.getMenu && target.getMenu() && target.getMenu().isVisible()) {
        return;
      }

      // All taps not inside a menu will hide all currently open menus
      if (this.__objects.length > 0 && !this._isInMenu(target)) {
        this.hideAll();
      }
    },


    /*
    ---------------------------------------------------------------------------
      KEY EVENT HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * @type {Map} Map of all keys working on an active menu selection
     * @lint ignoreReferenceField(__selectionKeys)
     */
    __selectionKeys :
    {
      "Enter" : 1,
      "Space" : 1
    },


    /**
     * @type {Map} Map of all keys working without a selection
     * @lint ignoreReferenceField(__navigationKeys)
     */
    __navigationKeys :
    {
      "Escape" : 1,
      "Up" : 1,
      "Down" : 1,
      "Left" : 1,
      "Right" : 1
    },


    /**
     * Event handler for all keyup/keydown events. Stops all events
     * when any menu is opened.
     *
     * @param e {qx.event.type.KeySequence} Keyboard event
     */
    _onKeyUpDown : function(e)
    {
      var menu = this.getActiveMenu();
      if (!menu) {
        return;
      }

      // Stop for all supported key combos
      var iden = e.getKeyIdentifier();
      if (this.__navigationKeys[iden] || (this.__selectionKeys[iden] && menu.getSelectedButton())) {
        e.stopPropagation();
      }
    },


    /**
     * Event handler for all keypress events. Delegates the event to the more
     * specific methods defined in this class.
     *
     * Currently processes the keys: <code>Up</code>, <code>Down</code>,
     * <code>Left</code>, <code>Right</code> and <code>Enter</code>.
     *
     * @param e {qx.event.type.KeySequence} Keyboard event
     */
    _onKeyPress : function(e)
    {
      var menu = this.getActiveMenu();
      if (!menu) {
        return;
      }

      var iden = e.getKeyIdentifier();
      var navigation = this.__navigationKeys[iden];
      var selection = this.__selectionKeys[iden];

      if (navigation)
      {
        switch(iden)
        {
          case "Up":
            this._onKeyPressUp(menu);
            break;

          case "Down":
            this._onKeyPressDown(menu);
            break;

          case "Left":
            this._onKeyPressLeft(menu);
            break;

          case "Right":
            this._onKeyPressRight(menu);
            break;

          case "Escape":
            this.hideAll();
            break;
        }

        e.stopPropagation();
        e.preventDefault();
      }
      else if (selection)
      {
        // Do not process these events when no item is hovered
        var button = menu.getSelectedButton();
        if (button)
        {
          switch(iden)
          {
            case "Enter":
              this._onKeyPressEnter(menu, button, e);
              break;

            case "Space":
              this._onKeyPressSpace(menu, button, e);
              break;
          }

          e.stopPropagation();
          e.preventDefault();
        }
      }
    },


    /**
     * Event handler for <code>Up</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     */
    _onKeyPressUp : function(menu)
    {
      // Query for previous child
      var selectedButton = menu.getSelectedButton();
      var children = menu.getChildren();
      var start = selectedButton ? menu.indexOf(selectedButton)-1 : children.length-1;
      var nextItem = this._getChild(menu, start, -1, true);

      // Reconfigure property
      if (nextItem) {
        menu.setSelectedButton(nextItem);
      } else {
        menu.resetSelectedButton();
      }
    },


    /**
     * Event handler for <code>Down</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     */
    _onKeyPressDown : function(menu)
    {
      // Query for next child
      var selectedButton = menu.getSelectedButton();
      var start = selectedButton ? menu.indexOf(selectedButton)+1 : 0;
      var nextItem = this._getChild(menu, start, 1, true);

      // Reconfigure property
      if (nextItem) {
        menu.setSelectedButton(nextItem);
      } else {
        menu.resetSelectedButton();
      }
    },


    /**
     * Event handler for <code>Left</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     */
    _onKeyPressLeft : function(menu)
    {
      var menuOpener = menu.getOpener();
      if (!menuOpener) {
        return;
      }

      // Back to the "parent" menu
      if (menuOpener instanceof qx.ui.menu.AbstractButton)
      {
        var parentMenu = menuOpener.getLayoutParent();

        parentMenu.resetOpenedButton();
        parentMenu.setSelectedButton(menuOpener);
      }

      // Goto the previous toolbar button
      else if (menuOpener instanceof qx.ui.menubar.Button)
      {
        var buttons = menuOpener.getMenuBar().getMenuButtons();
        var index = buttons.indexOf(menuOpener);

        // This should not happen, definitely!
        if (index === -1) {
          return;
        }

        // Get previous button, fallback to end if first arrived
        var prevButton = null;
        var length =  buttons.length;
        for (var i = 1; i <= length; i++)
        {
          var button = buttons[(index - i + length) % length];
          if(button.isEnabled() && button.isVisible()) {
            prevButton = button;
            break;
          }
        }

        if (prevButton && prevButton != menuOpener) {
          prevButton.open(true);
        }
      }
    },


    /**
     * Event handler for <code>Right</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     */
    _onKeyPressRight : function(menu)
    {
      var selectedButton = menu.getSelectedButton();

      // Open sub-menu of hovered item and select first child
      if (selectedButton)
      {
        var subMenu = selectedButton.getMenu();

        if (subMenu)
        {
          // Open previously hovered item
          menu.setOpenedButton(selectedButton);

          // Hover first item in new submenu
          var first = this._getChild(subMenu, 0, 1);
          if (first) {
            subMenu.setSelectedButton(first);
          }

          return;
        }
      }

      // No hover and no open item
      // When first button has a menu, open it, otherwise only hover it
      else if (!menu.getOpenedButton())
      {
        var first = this._getChild(menu, 0, 1);

        if (first)
        {
          menu.setSelectedButton(first);

          if (first.getMenu()) {
            menu.setOpenedButton(first);
          }

          return;
        }
      }

      // Jump to the next toolbar button
      var menuOpener = menu.getOpener();

      // Look up opener hierarchy for menu button
      if (menuOpener instanceof qx.ui.menu.Button && selectedButton)
      {
        // From one inner selected button try to find the top level
        // menu button which has opened the whole menu chain.
        while (menuOpener)
        {
          menuOpener = menuOpener.getLayoutParent();
          if (menuOpener instanceof qx.ui.menu.Menu)
          {
            menuOpener = menuOpener.getOpener();
            if (menuOpener instanceof qx.ui.menubar.Button) {
              break;
            }
          }
          else
          {
            break;
          }
        }

        if (!menuOpener) {
          return;
        }
      }

      // Ask the toolbar for the next menu button
      if (menuOpener instanceof qx.ui.menubar.Button)
      {
        var buttons = menuOpener.getMenuBar().getMenuButtons();
        var index = buttons.indexOf(menuOpener);

        // This should not happen, definitely!
        if (index === -1) {
          return;
        }

        // Get next button, fallback to first if end arrived
        var nextButton = null;
        var length =  buttons.length;
        for (var i = 1; i <= length; i++)
        {
          var button = buttons[(index + i) % length];
          if(button.isEnabled() && button.isVisible()) {
            nextButton = button;
            break;
          }
        }

        if (nextButton && nextButton != menuOpener) {
          nextButton.open(true);
        }
      }
    },


    /**
     * Event handler for <code>Enter</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     * @param button {qx.ui.menu.AbstractButton} The selected button
     * @param e {qx.event.type.KeySequence} The keypress event
     */
    _onKeyPressEnter : function(menu, button, e)
    {
      // Route keypress event to the selected button
      if (button.hasListener("keypress"))
      {
        // Clone and reconfigure event
        var clone = e.clone();
        clone.setBubbles(false);
        clone.setTarget(button);

        // Finally dispatch the clone
        button.dispatchEvent(clone);
      }

      // Hide all open menus
      this.hideAll();
    },


    /**
     * Event handler for <code>Space</code> key
     *
     * @param menu {qx.ui.menu.Menu} The active menu
     * @param button {qx.ui.menu.AbstractButton} The selected button
     * @param e {qx.event.type.KeySequence} The keypress event
     */
    _onKeyPressSpace : function(menu, button, e)
    {
      // Route keypress event to the selected button
      if (button.hasListener("keypress"))
      {
        // Clone and reconfigure event
        var clone = e.clone();
        clone.setBubbles(false);
        clone.setTarget(button);

        // Finally dispatch the clone
        button.dispatchEvent(clone);
      }
    },


    /**
     * Event handler for roll which hides all windows on scroll.
     *
     * @param e {qx.event.type.Roll} The roll event.
     */
    _onRoll : function(e) {
      var target = e.getTarget();
      target = qx.ui.core.Widget.getWidgetByElement(target, true);

      if (
        this.__objects.length > 0
        && !this._isInMenu(target)
        && !this._isMenuOpener(target)
        && !e.getMomentum()
      ) {
        this.hideAll();
      }
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    var Registration = qx.event.Registration;
    var el = document.body;

    // React on pointerdown events
    Registration.removeListener(window.document.documentElement, "pointerdown", this._onPointerDown, this, true);

    // React on keypress events
    Registration.removeListener(el, "keydown", this._onKeyUpDown, this, true);
    Registration.removeListener(el, "keyup", this._onKeyUpDown, this, true);
    Registration.removeListener(el, "keypress", this._onKeyPress, this, true);

    this._disposeObjects("__openTimer", "__closeTimer");
    this._disposeArray("__objects");
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
 * The abstract menu button class is used for all type of menu content
 * for example normal buttons, checkboxes or radiobuttons.
 *
 * @childControl icon {qx.ui.basic.Image} icon of the button
 * @childControl label {qx.ui.basic.Label} label of the button
 * @childControl shortcut {qx.ui.basic.Label} shows if specified the shortcut
 * @childControl arrow {qx.ui.basic.Image} shows the arrow to show an additional widget (e.g. popup or submenu)
 */
qx.Class.define("qx.ui.menu.AbstractButton",
{
  extend : qx.ui.core.Widget,
  include : [qx.ui.core.MExecutable],
  implement : [qx.ui.form.IExecutable],
  type : "abstract",


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // Use hard coded layout
    this._setLayout(new qx.ui.menu.ButtonLayout);

    // Add listeners
    this.addListener("tap", this._onTap);
    this.addListener("keypress", this._onKeyPress);

    // Add command listener
    this.addListener("changeCommand", this._onChangeCommand, this);
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    blockToolTip :
    {
      refine : true,
      init : true
    },

    /** The label text of the button */
    label :
    {
      check : "String",
      apply : "_applyLabel",
      nullable : true,
      event: "changeLabel"
    },

    /** Whether a sub menu should be shown and which one */
    menu :
    {
      check : "qx.ui.menu.Menu",
      apply : "_applyMenu",
      nullable : true,
      dereference : true,
      event : "changeMenu"
    },

    /** The icon to use */
    icon :
    {
      check : "String",
      apply : "_applyIcon",
      themeable : true,
      nullable : true,
      event: "changeIcon"
    },

    /** Indicates whether the label for the command (shortcut) should be visible or not. */
    showCommandLabel :
    {
      check : "Boolean",
      apply : "_applyShowCommandLabel",
      themeable : true,
      init : true,
      event: "changeShowCommandLabel"
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
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "icon":
          control = new qx.ui.basic.Image;
          control.setAnonymous(true);
          this._add(control, {column:0});
          break;

        case "label":
          control = new qx.ui.basic.Label;
          control.setAnonymous(true);
          this._add(control, {column:1});
          break;

        case "shortcut":
          control = new qx.ui.basic.Label;
          control.setAnonymous(true);
          if (!this.getShowCommandLabel()) {
            control.exclude();
          }
          this._add(control, {column:2});
          break;

        case "arrow":
          control = new qx.ui.basic.Image;
          control.setAnonymous(true);
          this._add(control, {column:3});
          break;
      }

      return control || this.base(arguments, id);
    },


    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates : {
      selected : 1
    },




    /*
    ---------------------------------------------------------------------------
      LAYOUT UTILS
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the dimensions of all children
     *
     * @return {Array} Preferred width of each child
     */
    getChildrenSizes : function()
    {
      var iconWidth=0, labelWidth=0, shortcutWidth=0, arrowWidth=0;

      if (this._isChildControlVisible("icon"))
      {
        var icon = this.getChildControl("icon");
        iconWidth = icon.getMarginLeft() + icon.getSizeHint().width + icon.getMarginRight();
      }

      if (this._isChildControlVisible("label"))
      {
        var label = this.getChildControl("label");
        labelWidth = label.getMarginLeft() + label.getSizeHint().width + label.getMarginRight();
      }

      if (this._isChildControlVisible("shortcut"))
      {
        var shortcut = this.getChildControl("shortcut");
        shortcutWidth = shortcut.getMarginLeft() + shortcut.getSizeHint().width + shortcut.getMarginRight();
      }

      if (this._isChildControlVisible("arrow"))
      {
        var arrow = this.getChildControl("arrow");
        arrowWidth = arrow.getMarginLeft() + arrow.getSizeHint().width + arrow.getMarginRight();
      }

      return [ iconWidth, labelWidth, shortcutWidth, arrowWidth ];
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */


    /**
     * Event listener for tap
     *
     * @param e {qx.event.type.Pointer} pointer event
     */
    _onTap : function(e)
    {
      if (e.isLeftPressed()) {
        this.execute();
        qx.ui.menu.Manager.getInstance().hideAll();
      }

      // right click
      else {
        // only prevent contextmenu event if button has no further context menu.
        if (!this.getContextMenu()) {
          qx.ui.menu.Manager.getInstance().preventContextMenuOnce();
        }
      }
    },


    /**
     * Event listener for keypress event
     *
     * @param e {qx.event.type.KeySequence} keypress event
     */
    _onKeyPress : function(e) {
      this.execute();
    },


    /**
     * Event listener for command changes. Updates the text of the shortcut.
     *
     * @param e {qx.event.type.Data} Property change event
     */
    _onChangeCommand : function(e)
    {
      var command = e.getData();

      // do nothing if no command is set
      if (command == null) {
        return;
      }

      if (qx.core.Environment.get("qx.dynlocale"))
      {
        var oldCommand = e.getOldData();
        if (!oldCommand) {
          qx.locale.Manager.getInstance().addListener("changeLocale", this._onChangeLocale, this);
        }
        if (!command) {
          qx.locale.Manager.getInstance().removeListener("changeLocale", this._onChangeLocale, this);
        }
      }

      var cmdString = command != null ? command.toString() : "";
      this.getChildControl("shortcut").setValue(cmdString);
    },


    /**
     * Update command string on locale changes
     */
    _onChangeLocale : qx.core.Environment.select("qx.dynlocale",
    {
      "true" : function(e) {
        var command = this.getCommand();
        if (command != null) {
          this.getChildControl("shortcut").setValue(command.toString());
        }
      },

      "false" : null
    }),


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyIcon : function(value, old)
    {
      if (value) {
        this._showChildControl("icon").setSource(value);
      } else {
        this._excludeChildControl("icon");
      }
    },

    // property apply
    _applyLabel : function(value, old)
    {
      if (value) {
        this._showChildControl("label").setValue(value);
      } else {
        this._excludeChildControl("label");
      }
    },

    // property apply
    _applyMenu : function(value, old)
    {
      if (old)
      {
        old.resetOpener();
        old.removeState("submenu");
      }

      if (value)
      {
        this._showChildControl("arrow");

        value.setOpener(this);
        value.addState("submenu");
      }
      else
      {
        this._excludeChildControl("arrow");
      }
    },

    // property apply
    _applyShowCommandLabel : function(value, old)
    {
      if (value) {
        this._showChildControl("shortcut");
      } else {
        this._excludeChildControl("shortcut");
      }
    }
  },


  /*
   *****************************************************************************
      DESTRUCTOR
   *****************************************************************************
   */

  destruct : function()
  {
    this.removeListener("changeCommand", this._onChangeCommand, this);

    if (this.getMenu())
    {
      if (!qx.core.ObjectRegistry.inShutDown) {
        this.getMenu().destroy();
      }
    }

    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this._onChangeLocale, this);
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
 * Layout used for the menu buttons which may contain four elements. A icon,
 * a label, a shortcut text and an arrow (for a sub menu)
 *
 * @internal
 */
qx.Class.define("qx.ui.menu.ButtonLayout",
{
  extend : qx.ui.layout.Abstract,



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    verifyLayoutProperty : qx.core.Environment.select("qx.debug",
    {
      "true" : function(item, name, value) {
        this.assert(name=="column", "The property '"+name+"' is not supported by the MenuButton layout!");
      },

      "false" : null
    }),


    // overridden
    renderLayout : function(availWidth, availHeight, padding)
    {
      var children = this._getLayoutChildren();
      var child;
      var column;

      var columnChildren = [];
      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];
        column = child.getLayoutProperties().column;
        columnChildren[column] = child;
      }

      var menu = this.__getMenu(children[0]);

      var columns = menu.getColumnSizes();
      var spacing = menu.getSpacingX();

      // stretch label column
      var neededWidth = qx.lang.Array.sum(columns) + spacing * (columns.length - 1);
      if (neededWidth < availWidth) {
        columns[1] += availWidth - neededWidth;
      }


      var left = padding.left, top = padding.top;
      var Util = qx.ui.layout.Util;

      for (var i=0, l=columns.length; i<l; i++)
      {
        child = columnChildren[i];

        if (child)
        {
          var hint = child.getSizeHint();
          var childTop = top + Util.computeVerticalAlignOffset(child.getAlignY()||"middle", hint.height, availHeight, 0, 0);
          var offsetLeft = Util.computeHorizontalAlignOffset(child.getAlignX()||"left", hint.width, columns[i], child.getMarginLeft(), child.getMarginRight());
          child.renderLayout(left + offsetLeft, childTop, hint.width, hint.height);
        }

        if (columns[i] > 0) {
          left += columns[i] + spacing;
        }
      }
    },


    /**
     * Get the widget's menu
     *
     * @param widget {qx.ui.core.Widget} the widget to get the menu for
     * @return {qx.ui.menu.Menu} the menu
     */
    __getMenu : function(widget)
    {
      while (!(widget instanceof qx.ui.menu.Menu)) {
        widget = widget.getLayoutParent();
      }
      return widget;
    },


    // overridden
    _computeSizeHint : function()
    {
      var children = this._getLayoutChildren();
      var neededHeight = 0;
      var neededWidth = 0;

      for (var i=0, l=children.length; i<l; i++)
      {
        var hint = children[i].getSizeHint();
        neededWidth += hint.width;
        neededHeight = Math.max(neededHeight, hint.height);
      }

      return {
        width : neededWidth,
        height : neededHeight
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
 * A button which opens the connected menu when tapping on it.
 */
qx.Class.define("qx.ui.form.MenuButton",
{
  extend : qx.ui.form.Button,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} Initial label
   * @param icon {String?null} Initial icon
   * @param menu {qx.ui.menu.Menu} Connect to menu instance
   */
  construct : function(label, icon, menu)
  {
    this.base(arguments, label, icon);

    // Initialize properties
    if (menu != null) {
      this.setMenu(menu);
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The menu instance to show when tapping on the button */
    menu :
    {
      check : "qx.ui.menu.Menu",
      nullable : true,
      apply : "_applyMenu",
      event : "changeMenu"
    },

    // overridden
    appearance :
    {
      refine : true,
      init : "menubutton"
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
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */
    // overridden
    _applyVisibility : function(value, old) {
      this.base(arguments, value, old);

      // hide the menu too
      var menu = this.getMenu();
      if (value != "visible" && menu) {
        menu.hide();
      }
    },


    // property apply
    _applyMenu : function(value, old)
    {
      if (old)
      {
        old.removeListener("changeVisibility", this._onMenuChange, this);
        old.resetOpener();
      }

      if (value)
      {
        value.addListener("changeVisibility", this._onMenuChange, this);
        value.setOpener(this);

        value.removeState("submenu");
        value.removeState("contextmenu");
      }
    },




    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Positions and shows the attached menu widget.
     *
     * @param selectFirst {Boolean?false} Whether the first menu button should be selected
     */
    open : function(selectFirst)
    {
      var menu = this.getMenu();

      if (menu)
      {
        // Hide all menus first
        qx.ui.menu.Manager.getInstance().hideAll();

        // Open the attached menu
        menu.setOpener(this);
        menu.open();

        // Select first item
        if (selectFirst)
        {
          var first = menu.getSelectables()[0];
          if (first) {
            menu.setSelectedButton(first);
          }
        }
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */

    /**
     * Listener for visibility property changes of the attached menu
     *
     * @param e {qx.event.type.Data} Property change event
     */
    _onMenuChange : function(e)
    {
      var menu = this.getMenu();

      if (menu.isVisible()) {
        this.addState("pressed");
      } else {
        this.removeState("pressed");
      }
    },


    // overridden
    _onPointerDown : function(e) {
      // call the base function to get into the capture phase [BUG #4340]
      this.base(arguments, e);

      // only open on left clicks [BUG #5125]
      if(e.getButton() != "left") {
        return;
      }

      var menu = this.getMenu();
      if (menu) {
        // Toggle sub menu visibility
        if (!menu.isVisible()) {
          this.open();
        } else {
          menu.exclude();
        }

        // Event is processed, stop it for others
        e.stopPropagation();
      }
    },


    // overridden
    _onPointerUp : function(e) {
      // call base for firing the execute event
      this.base(arguments, e);

      // Just stop propagation to stop menu manager
      // from getting the event
      e.stopPropagation();
    },


    // overridden
    _onPointerOver : function(e) {
      // Add hovered state
      this.addState("hovered");
    },


    // overridden
    _onPointerOut : function(e) {
      // Just remove the hover state
      this.removeState("hovered");
    },


    // overridden
    _onKeyDown : function(e)
    {
      switch(e.getKeyIdentifier())
      {
        case "Enter":
          this.removeState("abandoned");
          this.addState("pressed");

          var menu = this.getMenu();
          if (menu)
          {
            // Toggle sub menu visibility
            if (!menu.isVisible()) {
              this.open();
            } else {
              menu.exclude();
            }
          }

          e.stopPropagation();
      }
    },


    // overridden
    _onKeyUp : function(e) {
      // no action required here
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
 * A menubar button
 */
qx.Class.define("qx.ui.menubar.Button",
{
  extend : qx.ui.form.MenuButton,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function(label, icon, menu)
  {
    this.base(arguments, label, icon, menu);

    this.removeListener("keydown", this._onKeyDown);
    this.removeListener("keyup", this._onKeyUp);
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
      init : "menubar-button"
    },

    show :
    {
      refine : true,
      init : "inherit"
    },

    focusable :
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
    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Inspects the parent chain to find the MenuBar
     *
     * @return {qx.ui.menubar.MenuBar} MenuBar instance or <code>null</code>.
     */
    getMenuBar : function()
    {
      var parent = this;
      while (parent)
      {
        /* this method is also used by toolbar.MenuButton, so we need to check
           for a ToolBar instance. */
        if (parent instanceof qx.ui.toolbar.ToolBar) {
          return parent;
        }

        parent = parent.getLayoutParent();
      }

      return null;
    },


    // overridden
    open : function(selectFirst) {
      this.base(arguments, selectFirst);

      var menubar = this.getMenuBar();
      if (menubar) {
        menubar._setAllowMenuOpenHover(true);
      }
    },


    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */

    /**
     * Listener for visibility property changes of the attached menu
     *
     * @param e {qx.event.type.Data} Property change event
     */
    _onMenuChange : function(e)
    {
      var menu = this.getMenu();
      var menubar = this.getMenuBar();

      if (menu.isVisible())
      {
        this.addState("pressed");

        // Sync with open menu property
        if (menubar) {
          menubar.setOpenMenu(menu);
        }
      }
      else
      {
        this.removeState("pressed");

        // Sync with open menu property
        if (menubar && menubar.getOpenMenu() == menu) {
          menubar.resetOpenMenu();
          menubar._setAllowMenuOpenHover(false);
        }
      }
    },

    // overridden
    _onPointerUp : function(e)
    {
      this.base(arguments, e);

      // Set state 'pressed' to visualize that the menu is open.
      var menu = this.getMenu();
      if (menu && menu.isVisible() && !this.hasState("pressed")) {
        this.addState("pressed");
      }
    },

    /**
     * Event listener for pointerover event
     *
     * @param e {qx.event.type.Pointer} pointerover event object
     */
    _onPointerOver : function(e)
    {
      // Add hovered state
      this.addState("hovered");

      // Open submenu
      if (this.getMenu() && e.getPointerType() == "mouse")
      {
        var menubar = this.getMenuBar();

        if (menubar && menubar._isAllowMenuOpenHover())
        {
          // Hide all open menus
          qx.ui.menu.Manager.getInstance().hideAll();

          // Set it again, because hideAll remove it.
          menubar._setAllowMenuOpenHover(true);

          // Then show the attached menu
          if (this.isEnabled()) {
            this.open();
          }
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
     * Martin Wittemann (martinwittemann)
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * The Toolbar class is the main part of the toolbar widget.
 *
 * It can handle added {@link Button}s, {@link CheckBox}es, {@link RadioButton}s
 * and {@link Separator}s in its {@link #add} method. The {@link #addSpacer} method
 * adds a spacer at the current toolbar position. This means that the widgets
 * added after the method call of {@link #addSpacer} are aligned to the right of
 * the toolbar.
 *
 * For more details on the documentation of the toolbar widget, take a look at the
 * documentation of the {@link qx.ui.toolbar}-Package.
 */
qx.Class.define("qx.ui.toolbar.ToolBar",
{
  extend : qx.ui.core.Widget,
  include : qx.ui.core.MChildrenHandling,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // add needed layout
    this._setLayout(new qx.ui.layout.HBox());

    // initialize the overflow handling
    this.__removedItems = [];
    this.__removePriority = [];
  },




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
      init : "toolbar"
    },

    /** Holds the currently open menu (when the toolbar is used for menus) */
    openMenu :
    {
      check : "qx.ui.menu.Menu",
      event : "changeOpenMenu",
      nullable : true
    },

    /** Whether icons, labels, both or none should be shown. */
    show :
    {
      init : "both",
      check : [ "both", "label", "icon" ],
      inheritable : true,
      apply : "_applyShow",
      event : "changeShow"
    },

    /** The spacing between every child of the toolbar */
    spacing :
    {
      nullable : true,
      check : "Integer",
      themeable : true,
      apply : "_applySpacing"
    },

    /**
     * Widget which will be shown if at least one toolbar item is hidden.
     * Keep in mind to add this widget to the toolbar before you set it as
     * indicator!
     */
    overflowIndicator :
    {
      check : "qx.ui.core.Widget",
      nullable : true,
      apply : "_applyOverflowIndicator"
    },

    /** Enables the overflow handling which automatically removes items.*/
    overflowHandling :
    {
      init : false,
      check : "Boolean",
      apply : "_applyOverflowHandling"
    }
  },



  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired if an item will be hidden by the {@link #overflowHandling}.*/
    "hideItem" : "qx.event.type.Data",

    /** Fired if an item will be show by the {@link #overflowHandling}.*/
    "showItem" : "qx.event.type.Data"
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
      OVERFLOW HANDLING
    ---------------------------------------------------------------------------
    */

    __removedItems : null,
    __removePriority : null,


    // overridden
    _computeSizeHint : function()
    {
      // get the original hint
      var hint = this.base(arguments);
      if (true && this.getOverflowHandling()) {
        var minWidth = 0;
        // if an overflow widget is given, use its width + spacing as min width
        var overflowWidget = this.getOverflowIndicator();
        if (overflowWidget) {
          minWidth = overflowWidget.getSizeHint().width + this.getSpacing();
        }
        // reset the minWidth because we reduce the count of elements
        hint.minWidth = minWidth;
      }
      return hint;
    },


    /**
     * Resize event handler.
     *
     * @param e {qx.event.type.Data} The resize event.
     */
    _onResize : function(e) {
      this._recalculateOverflow(e.getData().width);
    },


    /**
     * Responsible for calculation the overflow based on the available width.
     *
     * @param width {Integer?null} The available width.
     * @param requiredWidth {Integer?null} The required width for the widget
     *   if available.
     */
    _recalculateOverflow : function(width, requiredWidth)
    {
     // do nothing if overflow handling is not enabled
     if (!this.getOverflowHandling()) {
       return;
     }

     // get all required sizes
     requiredWidth = requiredWidth || this.getSizeHint().width;
     var overflowWidget = this.getOverflowIndicator();
     var overflowWidgetWidth = 0;
     if (overflowWidget) {
       overflowWidgetWidth = overflowWidget.getSizeHint().width;
     }

     if (width == undefined && this.getBounds() != null) {
       width = this.getBounds().width;
     }

     // if we still don't have a width, than we are not added to a parrent
     if (width == undefined) {
       // we should ignore it in that case
       return;
     }

     // if we have not enough space
     if (width < requiredWidth) {
       do {
         // get the next child
         var childToHide = this._getNextToHide();
         // if there is no child to hide, just do nothing
         if (!childToHide) {
           return;
         }
         // get margins or spacing
         var margins = childToHide.getMarginLeft() + childToHide.getMarginRight();
         margins = Math.max(margins, this.getSpacing());
         var childWidth = childToHide.getSizeHint().width + margins;
         this.__hideChild(childToHide);

         // new width is the requiredWidth - the removed childs width
         requiredWidth -= childWidth;

         // show the overflowWidgetWidth
         if (overflowWidget && overflowWidget.getVisibility() != "visible") {
           overflowWidget.setVisibility("visible");
           // if we need to add the overflow indicator, we need to add its width
           requiredWidth += overflowWidgetWidth;
           // add spacing or margins
           var overflowWidgetMargins =
             overflowWidget.getMarginLeft() +
             overflowWidget.getMarginRight();
           requiredWidth += Math.max(overflowWidgetMargins, this.getSpacing());
         }
       } while (requiredWidth > width);

       // if we can possibly show something
     } else if (this.__removedItems.length > 0) {

       do {
         var removedChild = this.__removedItems[0];
         // if we have something we can show
         if (removedChild) {
           // get the margins or spacing
           var margins = removedChild.getMarginLeft() + removedChild.getMarginRight();
           margins = Math.max(margins, this.getSpacing());

           // check if the element has been rendered before [BUG #4542]
           if (removedChild.getContentElement().getDomElement() == null) {
             // if not, apply the decorator element because it can change the
             // width of the child with padding e.g.
             removedChild.syncAppearance();
             // also invalidate the layout cache to trigger size hint
             // recalculation
             removedChild.invalidateLayoutCache();
           }
           var removedChildWidth = removedChild.getSizeHint().width;

           // check if it fits in in case its the last child to replace
           var fits = false;
           // if we can remove the overflow widget if its available

           if (this.__removedItems.length == 1 && overflowWidgetWidth > 0) {
             var addedMargin = margins - this.getSpacing();
             var wouldRequiredWidth =
               requiredWidth -
               overflowWidgetWidth +
               removedChildWidth +
               addedMargin;
             fits = width > wouldRequiredWidth;
           }

           // if it just fits in || it fits in when we remove the overflow widget
           if (width > requiredWidth + removedChildWidth + margins || fits) {
             this.__showChild(removedChild);
             requiredWidth += removedChildWidth;
             // check if we need to remove the overflow widget
             if (overflowWidget && this.__removedItems.length == 0) {

               overflowWidget.setVisibility("excluded");
             }
           } else {
             return;
           }
         }
       } while (width >= requiredWidth && this.__removedItems.length > 0);
     }
    },


    /**
     * Helper to show a toolbar item.
     *
     * @param child {qx.ui.core.Widget} The widget to show.
     */
    __showChild : function(child)
    {
      child.setVisibility("visible");
      this.__removedItems.shift();
      this.fireDataEvent("showItem", child)
    },


    /**
     * Helper to exclude a toolbar item.
     *
     * @param child {qx.ui.core.Widget} The widget to exclude.
     */
    __hideChild : function(child)
    {
      // ignore the call if no child is given
      if (!child) {
        return;
      }
      this.__removedItems.unshift(child);
      child.setVisibility("excluded");
      this.fireDataEvent("hideItem", child);
    },


    /**
     * Responsible for returning the next item to remove. In It checks the
     * priorities added by {@link #setRemovePriority}. If all priorized widgets
     * already excluded, it takes the widget added at last.
     *
     * @return {qx.ui.core.Widget|null} The widget which should be removed next.
     *   If null is returned, no widget is availablew to remove.
     */
    _getNextToHide : function()
    {
      // get the elements by priority
      for (var i = this.__removePriority.length - 1; i >= 0; i--) {
        var item = this.__removePriority[i];
        // maybe a priority is left out and spacers don't have the visibility
        if (item && item.getVisibility && item.getVisibility() == "visible") {
          return item;
        }
      };

      // if there is non found by priority, check all available widgets
      var children = this._getChildren();
      for (var i = children.length -1; i >= 0; i--) {
        var child = children[i]
        // ignore the overflow widget
        if (child == this.getOverflowIndicator()) {
          continue;
        }
        // spacer don't have the visibility
        if (child.getVisibility && child.getVisibility() == "visible") {
          return child;
        }
      };
    },


    /**
     * The removal of the toolbar items is priority based. You can change these
     * priorities with this method. The higher a priority, the earlier it will
     * be excluded. Remmeber to use every priority only once! If you want
     * override an already set priority, use the override parameter.
     * Keep in mind to only use already added items.
     *
     * @param item {qx.ui.core.Widget} The item to give the priority.
     * @param priority {Integer} The priority, higher means removed earlier.
     * @param override {Boolean} true, if the priority should be overridden.
     */
    setRemovePriority : function(item, priority, override)
    {
      // security check for overriding priorities
      if (!override && this.__removePriority[priority] != undefined) {
        throw new Error("Priority already in use!");
      }
      this.__removePriority[priority] = item;
    },


    // property apply
    _applyOverflowHandling : function(value, old)
    {
      // invalidate the own and the parrents layout cach because the size hint changes
      this.invalidateLayoutCache();
      var parent = this.getLayoutParent();
      if (parent) {
        parent.invalidateLayoutCache();
      }

      // recalculate if possible
      var bounds = this.getBounds()
      if (bounds && bounds.width) {
        this._recalculateOverflow(bounds.width);
      }

      // if the handling has been enabled
      if (value) {
        // add the resize listener
        this.addListener("resize", this._onResize, this);

      // if the handlis has been disabled
      } else {
        this.removeListener("resize", this._onResize, this);

        // set the overflow indicator to excluded
        var overflowIndicator = this.getOverflowIndicator();
        if (overflowIndicator) {
          overflowIndicator.setVisibility("excluded");
        }

        // set all buttons back to visible
        for (var i = 0; i < this.__removedItems.length; i++) {
          this.__removedItems[i].setVisibility("visible");
        };
        // reset the removed items
        this.__removedItems = [];
      }
    },


    // property apply
    _applyOverflowIndicator : function(value, old)
    {
      if (old) {
        this._remove(old);
      }

      if (value) {
        // check if its a child of the toolbar
        if (this._indexOf(value) == -1) {
          throw new Error("Widget must be child of the toolbar.");
        }
        // hide the widget
        value.setVisibility("excluded");
      }
    },


    /*
    ---------------------------------------------------------------------------
      MENU OPEN
    ---------------------------------------------------------------------------
    */

    __allowMenuOpenHover : false,

    /**
     * Indicate if a menu could be opened on hover or not.
     *
     * @internal
     * @param value {Boolean} <code>true</code> if a menu could be opened,
     *    <code>false</code> otherwise.
     */
    _setAllowMenuOpenHover : function(value) {
      this.__allowMenuOpenHover = value
    },

    /**
     * Return if a menu could be opened on hover or not.
     *
     * @internal
     * @return {Boolean} <code>true</code> if a menu could be opened,
     *    <code>false</code> otherwise.
     */
    _isAllowMenuOpenHover : function () {
      return this.__allowMenuOpenHover;
    },


    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applySpacing : function(value, old)
    {
      var layout = this._getLayout();
      value == null ? layout.resetSpacing() : layout.setSpacing(value);
    },


    // property apply
    _applyShow : function(value) {
      var children = this._getChildren();
      for (var i=0; i < children.length; i++) {
        if (children[i].setShow) {
          children[i].setShow(value);
        }
      };
    },


    /*
    ---------------------------------------------------------------------------
      CHILD HANDLING
    ---------------------------------------------------------------------------
    */
    // overridden
    _add : function(child, options) {
      this.base(arguments, child, options);
      // sync the show property (bug #6743) - but only if show wasn't explicitly set for the child (bug #6823)
      if (child.setShow && !qx.util.PropertyUtil.getUserValue(child, "show")) {
        child.setShow(this.getShow());
      }

      var newWidth =
        this.getSizeHint().width +
        child.getSizeHint().width +
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _addAt : function(child, index, options) {
      this.base(arguments, child, index, options);
      // sync the show property (bug #6743) - but only if show wasn't explicitly set for the child (bug #6823)
      if (child.setShow && !qx.util.PropertyUtil.getUserValue(child, "show")) {
        child.setShow(this.getShow());
      }

      var newWidth =
        this.getSizeHint().width +
        child.getSizeHint().width +
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _addBefore : function(child, before, options) {
      this.base(arguments, child, before, options);
      // sync the show property (bug #6743) - but only if show wasn't explicitly set for the child (bug #6823)
      if (child.setShow && !qx.util.PropertyUtil.getUserValue(child, "show")) {
        child.setShow(this.getShow());
      }

      var newWidth =
        this.getSizeHint().width +
        child.getSizeHint().width +
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _addAfter : function(child, after, options) {
      this.base(arguments, child, after, options);
      // sync the show property (bug #6743) - but only if show wasn't explicitly set for the child (bug #6823)
      if (child.setShow && !qx.util.PropertyUtil.getUserValue(child, "show")) {
        child.setShow(this.getShow());
      }

      var newWidth =
        this.getSizeHint().width +
        child.getSizeHint().width +
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _remove : function(child) {
      this.base(arguments, child);
      var newWidth =
        this.getSizeHint().width -
        child.getSizeHint().width -
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _removeAt : function(index) {
      var child = this._getChildren()[index];
      this.base(arguments, index);
      var newWidth =
        this.getSizeHint().width -
        child.getSizeHint().width -
        2 * this.getSpacing();
      this._recalculateOverflow(null, newWidth);
    },

    // overridden
    _removeAll : function() {
      this.base(arguments);
      this._recalculateOverflow(null, 0);
    },


    /*
    ---------------------------------------------------------------------------
      UTILITIES
    ---------------------------------------------------------------------------
    */

    /**
     * Add a spacer to the toolbar. The spacer has a flex
     * value of one and will stretch to the available space.
     *
     * @return {qx.ui.core.Spacer} The newly added spacer object. A reference
     *   to the spacer is needed to remove this spacer from the layout.
     */
    addSpacer : function()
    {
      var spacer = new qx.ui.core.Spacer;
      this._add(spacer, {flex:1});
      return spacer;
    },


    /**
     * Adds a separator to the toolbar.
     */
    addSeparator : function() {
      this.add(new qx.ui.toolbar.Separator);
    },


    /**
     * Returns all nested buttons which contains a menu to show. This is mainly
     * used for keyboard support.
     *
     * @return {Array} List of all menu buttons
     */
    getMenuButtons : function()
    {
      var children = this.getChildren();
      var buttons = [];
      var child;

      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];

        if (child instanceof qx.ui.menubar.Button) {
          buttons.push(child);
        } else if (child instanceof qx.ui.toolbar.Part) {
          buttons.push.apply(buttons, child.getMenuButtons());
        }
      }

      return buttons;
    }
  },


  destruct : function() {
    if (this.hasListener("resize")) {
      this.removeListener("resize", this._onResize, this);
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
 * A Spacer is a "virtual" widget, which can be placed into any layout and takes
 * the space a normal widget of the same size would take.
 *
 * Spacers are invisible and very light weight because they don't require any
 * DOM modifications.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var container = new qx.ui.container.Composite(new qx.ui.layout.HBox());
 *   container.add(new qx.ui.core.Widget());
 *   container.add(new qx.ui.core.Spacer(50));
 *   container.add(new qx.ui.core.Widget());
 * </pre>
 *
 * This example places two widgets and a spacer into a container with a
 * horizontal box layout. In this scenario the spacer creates an empty area of
 * 50 pixel width between the two widgets.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/spacer.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.core.Spacer",
{
  extend : qx.ui.core.LayoutItem,



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

 /**
  * @param width {Integer?null} the initial width
  * @param height {Integer?null} the initial height
  */
  construct : function(width, height)
  {
    this.base(arguments);

    // Initialize dimensions
    this.setWidth(width != null ? width : 0);
    this.setHeight(height != null ? height : 0);
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Helper method called from the visibility queue to detect outstanding changes
     * to the appearance.
     *
     * @internal
     */
    checkAppearanceNeeds : function() {
      // placeholder to improve compatibility with Widget.
    },


    /**
     * Recursively adds all children to the given queue
     *
     * @param queue {Map} The queue to add widgets to
     */
    addChildrenToQueue : function(queue) {
      // placeholder to improve compatibility with Widget.
    },


    /**
     * Removes this widget from its parent and dispose it.
     *
     * Please note that the widget is not disposed synchronously. The
     * real dispose happens after the next queue flush.
     *
     */
    destroy : function()
    {
      if (this.$$disposed) {
        return;
      }

      var parent = this.$$parent;
      if (parent) {
        parent._remove(this);
      }

      qx.ui.core.queue.Dispose.add(this);
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
 * A widget used for decoration proposes to structure a toolbar. Each
 * Separator renders a line between the buttons around.
 */
qx.Class.define("qx.ui.toolbar.Separator",
{
  extend : qx.ui.core.Widget,





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
      init : "toolbar-separator"
    },

    // overridden
    anonymous :
    {
      refine : true,
      init : true
    },

    // overridden
    width :
    {
      refine : true,
      init : 0
    },

    // overridden
    height :
    {
      refine : true,
      init : 0
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
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * A part is a container for multiple toolbar buttons. Each part comes
 * with a handle which may be used in later versions to drag the part
 * around and move it to another position. Currently mainly used
 * for structuring large toolbars beyond the capabilities of the
 * {@link Separator}.
 *
 * @childControl handle {qx.ui.basic.Image} prat handle to visualize the separation
 * @childControl container {qx.ui.toolbar.PartContainer} holds the content of the toolbar part
 */
qx.Class.define("qx.ui.toolbar.Part",
{
  extend : qx.ui.core.Widget,
  include : [qx.ui.core.MRemoteChildrenHandling],



  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // Hard coded HBox layout
    this._setLayout(new qx.ui.layout.HBox);

    // Force creation of the handle
    this._createChildControl("handle");
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
      init : "toolbar/part"
    },

    /** Whether icons, labels, both or none should be shown. */
    show :
    {
      init : "both",
      check : [ "both", "label", "icon" ],
      inheritable : true,
      event : "changeShow"
    },

    /** The spacing between every child of the toolbar */
    spacing :
    {
      nullable : true,
      check : "Integer",
      themeable : true,
      apply : "_applySpacing"
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
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "handle":
          control = new qx.ui.basic.Image();
          control.setAlignY("middle");
          this._add(control);
          break;

        case "container":
          control = new qx.ui.toolbar.PartContainer();
          control.addListener("syncAppearance", this.__onSyncAppearance, this);
          this._add(control);
          control.addListener("changeChildren", function() {
            this.__onSyncAppearance();
          }, this);
          break;
      }

      return control || this.base(arguments, id);
    },

    // overridden
    getChildrenContainer : function() {
      return this.getChildControl("container");
    },




    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    _applySpacing : function(value, old)
    {
      var layout = this.getChildControl("container").getLayout();
      value == null ? layout.resetSpacing() : layout.setSpacing(value);
    },




    /*
    ---------------------------------------------------------------------------
      UTILITIES
    ---------------------------------------------------------------------------
    */
    /**
     * Helper which applies the left, right and middle states.
     */
    __onSyncAppearance : function() {
      // check every child
      var children = this.getChildrenContainer().getChildren();
      children = children.filter(function(child) {
        return child.getVisibility() == "visible";
      });
      for (var i = 0; i < children.length; i++) {
        // if its the first child
        if (i == 0 && i != children.length - 1) {
          children[i].addState("left");
          children[i].removeState("right");
          children[i].removeState("middle");
        // if its the last child
        } else if (i == children.length - 1 && i != 0) {
          children[i].addState("right");
          children[i].removeState("left");
          children[i].removeState("middle");
        // if there is only one child
        } else if (i == 0 && i == children.length - 1) {
          children[i].removeState("left");
          children[i].removeState("middle");
          children[i].removeState("right");
        } else {
          children[i].addState("middle");
          children[i].removeState("right");
          children[i].removeState("left");
        }
      };
    },


    /**
     * Adds a separator to the toolbar part.
     */
    addSeparator : function() {
      this.add(new qx.ui.toolbar.Separator);
    },


    /**
     * Returns all nested buttons which contains a menu to show. This is mainly
     * used for keyboard support.
     *
     * @return {Array} List of all menu buttons
     */
    getMenuButtons : function()
    {
      var children = this.getChildren();
      var buttons = [];
      var child;

      for (var i=0, l=children.length; i<l; i++)
      {
        child = children[i];

        if (child instanceof qx.ui.menubar.Button) {
          buttons.push(child);
        }
      }

      return buttons;
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
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */

/**
 * The container used by {@link Part} to insert the buttons.
 *
 * @internal
 */
qx.Class.define("qx.ui.toolbar.PartContainer",
{
  extend : qx.ui.container.Composite,


  construct : function()
  {
    this.base(arguments);
    this._setLayout(new qx.ui.layout.HBox);
  },


  events : {
    /** Fired if a child has been added or removed */
    changeChildren : "qx.event.type.Event"
  },

  properties :
  {
    appearance :
    {
      refine : true,
      init : "toolbar/part/container"
    },

    /** Whether icons, labels, both or none should be shown. */
    show :
    {
      init : "both",
      check : [ "both", "label", "icon" ],
      inheritable : true,
      event : "changeShow"
    }
  },


  members : {
    // overridden
    _afterAddChild : function(child) {
      this.fireEvent("changeChildren");
    },


    // overridden
    _afterRemoveChild : function(child) {
      this.fireEvent("changeChildren");
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
 * The real menu button class which supports a command and an icon. All
 * other features are inherited from the {@link qx.ui.menu.AbstractButton}
 * class.
 */
qx.Class.define("qx.ui.menu.Button",
{
  extend : qx.ui.menu.AbstractButton,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} Initial label
   * @param icon {String} Initial icon
   * @param command {qx.ui.command.Command} Initial command (shortcut)
   * @param menu {qx.ui.menu.Menu} Initial sub menu
   */
  construct : function(label, icon, command, menu)
  {
    this.base(arguments);

    // Initialize with incoming arguments
    if (label != null) {
      this.setLabel(label);
    }

    if (icon != null) {
      this.setIcon(icon);
    }

    if (command != null) {
      this.setCommand(command);
    }

    if (menu != null) {
      this.setMenu(menu);
    }
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
      init : "menu-button"
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
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */


    // overridden
    _onTap : function(e)
    {
      if (e.isLeftPressed() && this.getMenu()) {
        this.execute();
        // don't close menus if the button is a sub menu button
        this.getMenu().open();
        return;
      }

      this.base(arguments, e);
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
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The MenuSlideBar is used to scroll menus if they don't fit on the screen.
 *
 * @childControl button-forward {qx.ui.form.HoverButton} scrolls forward of hovered
 * @childControl button-backward {qx.ui.form.HoverButton} scrolls backward if hovered
 *
 * @internal
 */
qx.Class.define("qx.ui.menu.MenuSlideBar",
{
  extend : qx.ui.container.SlideBar,

  construct : function()
  {
    this.base(arguments, "vertical");
  },

  properties :
  {
    appearance :
    {
      refine : true,
      init : "menu-slidebar"
    }
  },

  members :
  {
    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "button-forward":
          control = new qx.ui.form.HoverButton();
          control.addListener("execute", this._onExecuteForward, this);
          this._addAt(control, 2);
          break;

        case "button-backward":
          control = new qx.ui.form.HoverButton();
          control.addListener("execute", this._onExecuteBackward, this);
          this._addAt(control, 0);
          break;
      }

      return control || this.base(arguments, id);
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
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * The HoverButton is an {@link qx.ui.basic.Atom}, which fires repeatedly
 * execute events while the pointer is over the widget.
 *
 * The rate at which the execute event is fired accelerates is the pointer keeps
 * inside of the widget. The initial delay and the interval time can be set using
 * the properties {@link #firstInterval} and {@link #interval}. The
 * {@link #execute} events will be fired in a shorter amount of time if the pointer
 * remains over the widget, until the min {@link #minTimer} is reached.
 * The {@link #timerDecrease} property sets the amount of milliseconds which will
 * decreased after every firing.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var button = new qx.ui.form.HoverButton("Hello World");
 *
 *   button.addListener("execute", function(e) {
 *     alert("Button is hovered");
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
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/hoverbutton.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.form.HoverButton",
{
  extend : qx.ui.basic.Atom,
  include : [qx.ui.core.MExecutable],
  implement : [qx.ui.form.IExecutable],

  /**
   * @param label {String} Label to use
   * @param icon {String?null} Icon to use
   */
  construct : function(label, icon)
  {
    this.base(arguments, label, icon);

    this.addListener("pointerover", this._onPointerOver, this);
    this.addListener("pointerout", this._onPointerOut, this);

    this.__timer = new qx.event.AcceleratingTimer();
    this.__timer.addListener("interval", this._onInterval, this);
  },


  properties :
  {
    // overridden
    appearance :
    {
      refine : true,
      init : "hover-button"
    },

    /**
     * Interval used after the first run of the timer. Usually a smaller value
     * than the "firstInterval" property value to get a faster reaction.
     */
    interval :
    {
      check : "Integer",
      init  : 80
    },

    /**
     * Interval used for the first run of the timer. Usually a greater value
     * than the "interval" property value to a little delayed reaction at the first
     * time.
     */
    firstInterval :
    {
      check : "Integer",
      init  : 200
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
    __timer : null,


    /**
     * Start timer on pointer over
     *
     * @param e {qx.event.type.Pointer} The pointer event
     */
    _onPointerOver : function(e)
    {
      if (!this.isEnabled() || e.getTarget() !== this) {
        return;
      }

      this.__timer.set({
        interval: this.getInterval(),
        firstInterval: this.getFirstInterval(),
        minimum: this.getMinTimer(),
        decrease: this.getTimerDecrease()
      }).start();

      this.addState("hovered");
    },


    /**
     * Stop timer on pointer out
     *
     * @param e {qx.event.type.Pointer} The pointer event
     */
    _onPointerOut : function(e)
    {
      this.__timer.stop();
      this.removeState("hovered");

      if (!this.isEnabled() || e.getTarget() !== this) {
        return;
      }
    },


    /**
     * Fire execute event on timer interval event
     */
    _onInterval : function()
    {
      if (this.isEnabled())
      {
        this.execute();
      } else {
        this.__timer.stop();
      }
    }
  },


  destruct : function() {
    this._disposeObjects("__timer");
  }
});

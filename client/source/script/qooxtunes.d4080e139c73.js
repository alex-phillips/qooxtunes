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

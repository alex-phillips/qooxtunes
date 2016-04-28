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
 * The form object is responsible for managing form items. For that, it takes
 * advantage of two existing qooxdoo classes.
 * The {@link qx.ui.form.Resetter} is used for resetting and the
 * {@link qx.ui.form.validation.Manager} is used for all validation purposes.
 *
 * The view code can be found in the used renderer ({@link qx.ui.form.renderer}).
 */
qx.Class.define("qx.ui.form.Form",
{
  extend : qx.core.Object,


  construct : function()
  {
    this.base(arguments);

    this.__groups = [];
    this._buttons = [];
    this._buttonOptions = [];
    this._validationManager = this._createValidationManager();
    this._resetter = this._createResetter();
  },


  events : {
    /** Fired as soon as something changes in the form.*/
    "change" : "qx.event.type.Event"
  },


  members :
  {
    __groups : null,
    _validationManager : null,
    _groupCounter : 0,
    _buttons : null,
    _buttonOptions : null,
    _resetter : null,

    /*
    ---------------------------------------------------------------------------
       ADD
    ---------------------------------------------------------------------------
    */

    /**
     * Adds a form item to the form including its internal
     * {@link qx.ui.form.validation.Manager} and {@link qx.ui.form.Resetter}.
     *
     * *Hint:* The order of all add calls represent the order in the layout.
     *
     * @param item {qx.ui.form.IForm} A supported form item.
     * @param label {String} The string, which should be used as label.
     * @param validator {Function | qx.ui.form.validation.AsyncValidator ? null}
     *   The validator which is used by the validation
     *   {@link qx.ui.form.validation.Manager}.
     * @param name {String?null} The name which is used by the data binding
     *   controller {@link qx.data.controller.Form}.
     * @param validatorContext {var?null} The context of the validator.
     * @param options {Map?null} An additional map containin custom data which
     *   will be available in your form renderer specific to the added item.
     */
    add : function(item, label, validator, name, validatorContext, options) {
      if (this.__isFirstAdd()) {
        this.__groups.push({
          title: null, items: [], labels: [], names: [],
          options: [], headerOptions: {}
        });
      }
      // save the given arguments
      this.__groups[this._groupCounter].items.push(item);
      this.__groups[this._groupCounter].labels.push(label);
      this.__groups[this._groupCounter].options.push(options);
      // if no name is given, use the label without not working character
      if (name == null) {
        name = label.replace(
          /\s+|&|-|\+|\*|\/|\||!|\.|,|:|\?|;|~|%|\{|\}|\(|\)|\[|\]|<|>|=|\^|@|\\/g, ""
        );
      }
      this.__groups[this._groupCounter].names.push(name);

      // add the item to the validation manager
      this._validationManager.add(item, validator, validatorContext);
      // add the item to the reset manager
      this._resetter.add(item);
      // fire the change event
      this.fireEvent("change");
    },


    /**
     * Adds a group header to the form.
     *
     * *Hint:* The order of all add calls represent the order in the layout.
     *
     * @param title {String} The title of the group header.
     * @param options {Map?null} A special set of custom data which will be
     *   given to the renderer.
     */
    addGroupHeader : function(title, options) {
      if (!this.__isFirstAdd()) {
        this._groupCounter++;
      }
      this.__groups.push({
        title: title, items: [], labels: [], names: [],
        options: [], headerOptions: options
      });
      // fire the change event
      this.fireEvent("change");
    },


    /**
     * Adds a button to the form.
     *
     * *Hint:* The order of all add calls represent the order in the layout.
     *
     * @param button {qx.ui.form.Button} The button to add.
     * @param options {Map?null} An additional map containin custom data which
     *   will be available in your form renderer specific to the added button.
     */
    addButton : function(button, options) {
      this._buttons.push(button);
      this._buttonOptions.push(options || null);
      // fire the change event
      this.fireEvent("change");
    },


    /**
     * Returns whether something has already been added.
     *
     * @return {Boolean} true, if nothing has been added jet.
     */
    __isFirstAdd : function() {
      return this.__groups.length === 0;
    },


    /*
    ---------------------------------------------------------------------------
       REMOVE
    ---------------------------------------------------------------------------
    */


    /**
     * Removes the given item from the form.
     *
     * @param item {qx.ui.form.IForm} A supported form item.
     * @return {Boolean} <code>true</code>, if the item could be removed.
     */
    remove : function(item) {
      for (var i = 0; i < this.__groups.length; i++) {
        var group = this.__groups[i];
        for (var j = 0; j < group.items.length; j++) {
          var storedItem = group.items[j];
          if (storedItem === item) {
            // remove all stored data
            group.items.splice(j, 1);
            group.labels.splice(j, 1);
            group.names.splice(j, 1);
            group.options.splice(j, 1);

            // remove the item to the validation manager
            this._validationManager.remove(item);
            // remove the item to the reset manager
            this._resetter.remove(item);

            // fire the change event
            this.fireEvent("change");
            return true;
          }
        }
      }
      return false;
    },


    /**
     * Removes the given group header from the form. All items in the group will be moved to
     * another group (usually the previous group). If there is more than one group with
     * the same title, only the first group will be removed.
     *
     * @param title {String} The title.
     * @return {Boolean} <code>true</code>, if the header could be removed.
     */
    removeGroupHeader : function(title) {
      for (var i = 0; i < this.__groups.length; i++) {
        var group = this.__groups[i];
        if (group.title === title) {
          var targetGroup;

          // if it's the first group
          if (i == 0) {
            // if it's the only group
            if (this.__groups.length == 1) {
              // remove the title and the header options
              group.title = null;
              group.headerOptions = {};
              // fire the change event
              this.fireEvent("change");
              return true;
            } else {
              // add to the next
              targetGroup = this.__groups[i+1];
            }
          } else {
            // add to the previous group
            targetGroup = this.__groups[i-1];
          }

          // copy the data over
          targetGroup.items = targetGroup.items.concat(group.items);
          targetGroup.labels = targetGroup.labels.concat(group.labels);
          targetGroup.names = targetGroup.names.concat(group.names);
          targetGroup.options = targetGroup.options.concat(group.options);

          // delete the group
          this.__groups.splice(i, 1);

          this._groupCounter--;

          // fire the change event
          this.fireEvent("change");
          return true;
        }
      }
      return false;
    },


    /**
     * Removes the given button from the form.
     *
     * @param button {qx.ui.form.Button} The button to remove.
     * @return {Boolean} <code>true</code>, if the button could be removed.
     */
    removeButton : function(button) {
      for (var i = 0; i < this._buttons.length; i++) {
        var storedButton = this._buttons[i];
        if (storedButton === button) {
          this._buttons.splice(i, 1);
          this._buttonOptions.splice(i, 1);
          // fire the change event
          this.fireEvent("change");
          return true;
        }
      }
      return false;
    },


    /**
     * Returns all added items as a map.
     *
     * @return {Map} A map containing for every item an entry with its name.
     */
    getItems : function() {
      var items = {};
      // go threw all groups
      for (var i = 0; i < this.__groups.length; i++) {
        var group = this.__groups[i];
        // get all items
        for (var j = 0; j < group.names.length; j++) {
          var name = group.names[j];
          items[name] = group.items[j];
        }
      }
      return items;
    },


    /*
    ---------------------------------------------------------------------------
       RESET SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Resets the form. This means reseting all form items and the validation.
     */
    reset : function() {
      this._resetter.reset();
      this._validationManager.reset();
    },


    /**
     * Redefines the values used for resetting. It calls
     * {@link qx.ui.form.Resetter#redefine} to get that.
     */
    redefineResetter : function() {
      this._resetter.redefine();
    },


    /**
     * Redefines the value used for resetting of the given item. It calls
     * {@link qx.ui.form.Resetter#redefineItem} to get that.
     *
     * @param item {qx.ui.core.Widget} The item to redefine.
     */
    redefineResetterItem : function(item) {
      this._resetter.redefineItem(item);
    },



    /*
    ---------------------------------------------------------------------------
       VALIDATION
    ---------------------------------------------------------------------------
    */

    /**
     * Validates the form using the
     * {@link qx.ui.form.validation.Manager#validate} method.
     *
     * @return {Boolean | null} The validation result.
     */
    validate : function() {
      return this._validationManager.validate();
    },


    /**
     * Returns the internally used validation manager. If you want to do some
     * enhanced validation tasks, you need to use the validation manager.
     *
     * @return {qx.ui.form.validation.Manager} The used manager.
     */
    getValidationManager : function() {
      return this._validationManager;
    },


    /*
    ---------------------------------------------------------------------------
       RENDERER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Accessor method for the renderer which returns all added items in a
     * array containing a map of all items:
     * {title: title, items: [], labels: [], names: []}
     *
     * @return {Array} An array containing all necessary data for the renderer.
     * @internal
     */
    getGroups : function() {
      return this.__groups;
    },


    /**
     * Accessor method for the renderer which returns all added buttons in an
     * array.
     * @return {Array} An array containing all added buttons.
     * @internal
     */
    getButtons : function() {
      return this._buttons;
    },


    /**
     * Accessor method for the renderer which returns all added options for
     * the buttons in an array.
     * @return {Array} An array containing all added options for the buttons.
     * @internal
     */
    getButtonOptions : function() {
      return this._buttonOptions;
    },



    /*
    ---------------------------------------------------------------------------
       INTERNAL
    ---------------------------------------------------------------------------
    */

    /**
     * Creates and returns the used validation manager.
     *
     * @return {qx.ui.form.validation.Manager} The validation manager.
     */
    _createValidationManager : function() {
      return new qx.ui.form.validation.Manager();
    },


    /**
     * Creates and returns the used resetter.
     *
     * @return {qx.ui.form.Resetter} the resetter class.
     */
    _createResetter : function() {
      return new qx.ui.form.Resetter();
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */
  destruct : function()
  {
    // holding references to widgets --> must set to null
    this.__groups = this._buttons = this._buttonOptions = null;
    this._validationManager.dispose();
    this._resetter.dispose();
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
 * This validation manager is responsible for validation of forms.
 *
 * @ignore(qx.ui.tooltip)
 * @ignore(qx.ui.tooltip.Manager.*)
 */
qx.Class.define("qx.ui.form.validation.Manager",
{
  extend : qx.core.Object,

  construct : function()
  {
    this.base(arguments);

    // storage for all form items
    this.__formItems = [];
    // storage for all results of async validation calls
    this.__asyncResults = {};
    // set the default required field message
    this.setRequiredFieldMessage(qx.locale.Manager.tr("This field is required"));
  },


  events :
  {
    /**
     * Change event for the valid state.
     */
    "changeValid" : "qx.event.type.Data",

    /**
     * Signals that the validation is done. This is not needed on synchronous
     * validation (validation is done right after the call) but very important
     * in the case an asynchronous validator will be used.
     */
    "complete" : "qx.event.type.Event"
  },


  properties :
  {
    /**
     * The validator of the form itself. You can set a function (for
     * synchronous validation) or a {@link qx.ui.form.validation.AsyncValidator}.
     * In both cases, the function can have all added form items as first
     * argument and the manager as a second argument. The manager should be used
     * to set the {@link #invalidMessage}.
     *
     * Keep in mind that the validator is optional if you don't need the
     * validation in the context of the whole form.
     * @type {Function | AsyncValidator}
     */
    validator :
    {
      check : "value instanceof Function || qx.Class.isSubClassOf(value.constructor, qx.ui.form.validation.AsyncValidator)",
      init : null,
      nullable : true
    },

    /**
     * The invalid message should store the message why the form validation
     * failed. It will be added to the array returned by
     * {@link #getInvalidMessages}.
     */
    invalidMessage :
    {
      check : "String",
      init: ""
    },


    /**
     * This message will be shown if a required field is empty and no individual
     * {@link qx.ui.form.MForm#requiredInvalidMessage} is given.
     */
    requiredFieldMessage :
    {
      check : "String",
      init : ""
    },


    /**
     * The context for the form validation.
     */
    context :
    {
      nullable : true
    }
  },


  members :
  {
    __formItems : null,
    __valid : null,
    __asyncResults : null,
    __syncValid : null,


    /**
     * Add a form item to the validation manager.
     *
     * The form item has to implement at least two interfaces:
     * <ol>
     *   <li>The {@link qx.ui.form.IForm} Interface</li>
     *   <li>One of the following interfaces:
     *     <ul>
     *       <li>{@link qx.ui.form.IBooleanForm}</li>
     *       <li>{@link qx.ui.form.IColorForm}</li>
     *       <li>{@link qx.ui.form.IDateForm}</li>
     *       <li>{@link qx.ui.form.INumberForm}</li>
     *       <li>{@link qx.ui.form.IStringForm}</li>
     *     </ul>
     *   </li>
     * </ol>
     * The validator can be a synchronous or asynchronous validator. In
     * both cases the validator can either returns a boolean or fire an
     * {@link qx.core.ValidationError}. For synchronous validation, a plain
     * JavaScript function should be used. For all asynchronous validations,
     * a {@link qx.ui.form.validation.AsyncValidator} is needed to wrap the
     * plain function.
     *
     * @param formItem {qx.ui.core.Widget} The form item to add.
     * @param validator {Function | qx.ui.form.validation.AsyncValidator}
     *   The validator.
     * @param context {var?null} The context of the validator.
     */
    add: function(formItem, validator, context) {
      // check for the form API
      if (!this.__supportsInvalid(formItem)) {
        throw new Error("Added widget not supported.");
      }
      // check for the data type
      if (this.__supportsSingleSelection(formItem) && !formItem.getValue) {
        // check for a validator
        if (validator != null) {
          throw new Error("Widgets supporting selection can only be validated " +
          "in the form validator");
        }
      }
      var dataEntry =
      {
        item : formItem,
        validator : validator,
        valid : null,
        context : context
      };
      this.__formItems.push(dataEntry);
    },


    /**
     * Remove a form item from the validation manager.
     *
     * @param formItem {qx.ui.core.Widget} The form item to remove.
     * @return {qx.ui.core.Widget?null} The removed form item or
     *  <code>null</code> if the item could not be found.
     */
    remove : function(formItem)
    {
      var items = this.__formItems;

      for (var i = 0, len = items.length; i < len; i++)
      {
        if (formItem === items[i].item)
        {
          items.splice(i, 1);
          return formItem;
        }
      }

      return null;
    },


    /**
     * Returns registered form items from the validation manager.
     *
     * @return {Array} The form items which will be validated.
     */
    getItems : function()
    {
      var items = [];
      for (var i=0; i < this.__formItems.length; i++) {
        items.push(this.__formItems[i].item);
      };
      return items;
    },


    /**
     * Invokes the validation. If only synchronous validators are set, the
     * result of the whole validation is available at the end of the method
     * and can be returned. If an asynchronous validator is set, the result
     * is still unknown at the end of this method so nothing will be returned.
     * In both cases, a {@link #complete} event will be fired if the validation
     * has ended. The result of the validation can then be accessed with the
     * {@link #getValid} method.
     *
     * @return {Boolean|undefined} The validation result, if available.
     */
    validate : function() {
      var valid = true;
      this.__syncValid = true; // collaboration of all synchronous validations
      var items = [];

      // check all validators for the added form items
      for (var i = 0; i < this.__formItems.length; i++) {
        var formItem = this.__formItems[i].item;
        var validator = this.__formItems[i].validator;

        // store the items in case of form validation
        items.push(formItem);

        // ignore all form items without a validator
        if (validator == null) {
          // check for the required property
          var validatorResult = this.__validateRequired(formItem);
          valid = valid && validatorResult;
          this.__syncValid = validatorResult && this.__syncValid;
          continue;
        }

        var validatorResult = this.__validateItem(
          this.__formItems[i], formItem.getValue()
        );
        // keep that order to ensure that null is returned on async cases
        valid = validatorResult && valid;
        if (validatorResult != null) {
          this.__syncValid = validatorResult && this.__syncValid;
        }
      }

      // check the form validator (be sure to invoke it even if the form
      // items are already false, so keep the order!)
      var formValid = this.__validateForm(items);
      if (qx.lang.Type.isBoolean(formValid)) {
        this.__syncValid = formValid && this.__syncValid;
      }
      valid = formValid && valid;

      this._setValid(valid);

      if (qx.lang.Object.isEmpty(this.__asyncResults)) {
        this.fireEvent("complete");
      }
      return valid;
    },


    /**
     * Checks if the form item is required. If so, the value is checked
     * and the result will be returned. If the form item is not required, true
     * will be returned.
     *
     * @param formItem {qx.ui.core.Widget} The form item to check.
     * @return {var} Validation result
     */
    __validateRequired : function(formItem) {
      if (formItem.getRequired()) {
        // if its a widget supporting the selection
        if (this.__supportsSingleSelection(formItem)) {
          var validatorResult = !!formItem.getSelection()[0];
        // otherwise, a value should be supplied
        } else {
          var value = formItem.getValue();
          var validatorResult = !!value || value === 0;
        }
        formItem.setValid(validatorResult);
        var individualMessage = formItem.getRequiredInvalidMessage();
        var message = individualMessage ? individualMessage : this.getRequiredFieldMessage();
        formItem.setInvalidMessage(message);
        return validatorResult;
      }
      return true;
    },


    /**
     * Validates a form item. This method handles the differences of
     * synchronous and asynchronous validation and returns the result of the
     * validation if possible (synchronous cases). If the validation is
     * asynchronous, null will be returned.
     *
     * @param dataEntry {Object} The map stored in {@link #add}
     * @param value {var} The currently set value
     * @return {Boolean|null} Validation result or <code>null</code> for async
     * validation
     */
    __validateItem : function(dataEntry, value) {
      var formItem = dataEntry.item;
      var context = dataEntry.context;
      var validator = dataEntry.validator;

      // check for asynchronous validation
      if (this.__isAsyncValidator(validator)) {
        // used to check if all async validations are done
        this.__asyncResults[formItem.toHashCode()] = null;
        validator.validate(formItem, formItem.getValue(), this, context);
        return null;
      }

      var validatorResult = null;

      try {
        var validatorResult = validator.call(context || this, value, formItem);
        if (validatorResult === undefined) {
          validatorResult = true;
        }

      } catch (e) {
        if (e instanceof qx.core.ValidationError) {
          validatorResult = false;
          if (e.message && e.message != qx.type.BaseError.DEFAULTMESSAGE) {
            var invalidMessage = e.message;
          } else {
            var invalidMessage = e.getComment();
          }
          formItem.setInvalidMessage(invalidMessage);
        } else {
          throw e;
        }
      }

      formItem.setValid(validatorResult);
      dataEntry.valid = validatorResult;

      return validatorResult;
    },


    /**
     * Validates the form. It checks for asynchronous validation and handles
     * the differences to synchronous validation. If no form validator is given,
     * true will be returned. If a synchronous validator is given, the
     * validation result will be returned. In asynchronous cases, null will be
     * returned cause the result is not available.
     *
     * @param items {qx.ui.core.Widget[]} An array of all form items.
     * @return {Boolean|null} description
     */
    __validateForm: function(items) {
      var formValidator = this.getValidator();
      var context = this.getContext() || this;

      if (formValidator == null) {
        return true;
      }

      // reset the invalidMessage
      this.setInvalidMessage("");

      if (this.__isAsyncValidator(formValidator)) {
        this.__asyncResults[this.toHashCode()] = null;
        formValidator.validateForm(items, this, context);
        return null;
      }

      try {
        var formValid = formValidator.call(context, items, this);
        if (formValid === undefined) {
          formValid = true;
        }
      } catch (e) {
        if (e instanceof qx.core.ValidationError) {
          formValid = false;

          if (e.message && e.message != qx.type.BaseError.DEFAULTMESSAGE) {
            var invalidMessage = e.message;
          } else {
            var invalidMessage = e.getComment();
          }
          this.setInvalidMessage(invalidMessage);
        } else {
          throw e;
        }
      }
      return formValid;
    },


    /**
     * Helper function which checks, if the given validator is synchronous
     * or asynchronous.
     *
     * @param validator {Function|qx.ui.form.validation.AsyncValidator}
     *   The validator to check.
     * @return {Boolean} True, if the given validator is asynchronous.
     */
    __isAsyncValidator : function(validator) {
      var async = false;
      if (!qx.lang.Type.isFunction(validator)) {
        async = qx.Class.isSubClassOf(
          validator.constructor, qx.ui.form.validation.AsyncValidator
        );
      }
      return async;
    },


    /**
     * Returns true, if the given item implements the {@link qx.ui.form.IForm}
     * interface.
     *
     * @param formItem {qx.core.Object} The item to check.
     * @return {Boolean} true, if the given item implements the
     *   necessary interface.
     */
    __supportsInvalid : function(formItem) {
      var clazz = formItem.constructor;
      return qx.Class.hasInterface(clazz, qx.ui.form.IForm);
    },


    /**
     * Returns true, if the given item implements the
     * {@link qx.ui.core.ISingleSelection} interface.
     *
     * @param formItem {qx.core.Object} The item to check.
     * @return {Boolean} true, if the given item implements the
     *   necessary interface.
     */
    __supportsSingleSelection : function(formItem) {
      var clazz = formItem.constructor;
      return qx.Class.hasInterface(clazz, qx.ui.core.ISingleSelection);
    },


    /**
     * Sets the valid state of the manager. It generates the event if
     * necessary and stores the new value.
     *
     * @param value {Boolean|null} The new valid state of the manager.
     */
    _setValid: function(value) {
      this._showToolTip(value);
      var oldValue = this.__valid;
      this.__valid = value;
      // check for the change event
      if (oldValue != value) {
        this.fireDataEvent("changeValid", value, oldValue);
      }
    },


    /**
     * Responsible for showing a tooltip in case the validation is done for
     * widgets based on qx.ui.core.Widget.
     * @param valid {Boolean} <code>false</code>, if the tooltip should be shown
     */
    _showToolTip : function(valid) {
      // ignore if we don't have a tooltip manager e.g. mobile apps
      if (!qx.ui.tooltip || !qx.ui.tooltip.Manager) {
        return;
      }
      var tooltip = qx.ui.tooltip.Manager.getInstance().getSharedErrorTooltip();

      if (!valid) {
        var firstInvalid;
        for (var i = 0; i < this.__formItems.length; i++) {
          var item = this.__formItems[i].item;
          if (!item.isValid()) {
            firstInvalid = item;
            // only for desktop widgets
            if (!(item.getContentLocation)) {
              return;
            }
            // only consider items on the screen
            if (item.isSeeable() === false) {
              continue;
            }

            tooltip.setLabel(item.getInvalidMessage());

            if (tooltip.getPlaceMethod() == "mouse") {
              var location = item.getContentLocation();
              var top = location.top - tooltip.getOffsetTop();
              tooltip.placeToPoint({left: location.right, top: top});
            } else {
              tooltip.placeToWidget(item);
            }

            tooltip.show();
            return;
          }
        }
      } else {
        tooltip.exclude();
      }
    },


    /**
     * Returns the valid state of the manager.
     *
     * @return {Boolean|null} The valid state of the manager.
     */
    getValid: function() {
      return this.__valid;
    },


    /**
     * Returns the valid state of the manager.
     *
     * @return {Boolean|null} The valid state of the manager.
     */
    isValid: function() {
      return this.getValid();
    },


    /**
     * Returns an array of all invalid messages of the invalid form items and
     * the form manager itself.
     *
     * @return {String[]} All invalid messages.
     */
    getInvalidMessages: function() {
      var messages = [];
      // combine the messages of all form items
      for (var i = 0; i < this.__formItems.length; i++) {
        var formItem = this.__formItems[i].item;
        if (!formItem.getValid()) {
          messages.push(formItem.getInvalidMessage());
        }
      }
      // add the forms fail message
      if (this.getInvalidMessage() != "") {
        messages.push(this.getInvalidMessage());
      }

      return messages;
    },


    /**
     * Selects invalid form items
     *
     * @return {Array} invalid form items
     */
    getInvalidFormItems : function() {
      var res = [];
      for (var i = 0; i < this.__formItems.length; i++) {
        var formItem = this.__formItems[i].item;
        if (!formItem.getValid()) {
          res.push(formItem);
        }
      }

      return res;
    },


    /**
     * Resets the validator.
     */
    reset: function() {
      // reset all form items
      for (var i = 0; i < this.__formItems.length; i++) {
        var dataEntry = this.__formItems[i];
        // set the field to valid
        dataEntry.item.setValid(true);
      }
      // set the manager to its initial valid value
      this.__valid = null;
      this._showToolTip(true);
    },


    /**
     * Internal helper method to set the given item to valid for asynchronous
     * validation calls. This indirection is used to determinate if the
     * validation process is completed or if other asynchronous validators
     * are still validating. {@link #__checkValidationComplete} checks if the
     * validation is complete and will be called at the end of this method.
     *
     * @param formItem {qx.ui.core.Widget} The form item to set the valid state.
     * @param valid {Boolean} The valid state for the form item.
     *
     * @internal
     */
    setItemValid: function(formItem, valid) {
      // store the result
      this.__asyncResults[formItem.toHashCode()] = valid;
      formItem.setValid(valid);
      this.__checkValidationComplete();
    },


    /**
     * Internal helper method to set the form manager to valid for asynchronous
     * validation calls. This indirection is used to determinate if the
     * validation process is completed or if other asynchronous validators
     * are still validating. {@link #__checkValidationComplete} checks if the
     * validation is complete and will be called at the end of this method.
     *
     * @param valid {Boolean} The valid state for the form manager.
     *
     * @internal
     */
    setFormValid : function(valid) {
      this.__asyncResults[this.toHashCode()] = valid;
      this.__checkValidationComplete();
    },


    /**
     * Checks if all asynchronous validators have validated so the result
     * is final and the {@link #complete} event can be fired. If that's not
     * the case, nothing will happen in the method.
     */
    __checkValidationComplete : function() {
      var valid = this.__syncValid;

      // check if all async validators are done
      for (var hash in this.__asyncResults) {
        var currentResult = this.__asyncResults[hash];
        valid = currentResult && valid;
        // the validation is not done so just do nothing
        if (currentResult == null) {
          return;
        }
      }
      // set the actual valid state of the manager
      this._setValid(valid);
      // reset the results
      this.__asyncResults = {};
      // fire the complete event (no entry in the results with null)
      this.fireEvent("complete");
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */
  destruct : function()
  {
    this.__formItems = null;
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
 * This class is responsible for validation in all asynchronous cases and
 * should always be used with {@link qx.ui.form.validation.Manager}.
 *
 *
 * It acts like a wrapper for asynchronous validation functions. These
 * validation function must be set in the constructor. The form manager will
 * invoke the validation and the validator function will be called with two
 * arguments:
 * <ul>
 *  <li>asyncValidator: A reference to the corresponding validator.</li>
 *  <li>value: The value of the assigned input field.</li>
 * </ul>
 * These two parameters are needed to set the validation status of the current
 * validator. {@link #setValid} is responsible for doing that.
 *
 *
 * *Warning:* Instances of this class can only be used with one input
 * field at a time. Multi usage is not supported!
 *
 * *Warning:* Calling {@link #setValid} synchronously does not work. If you
 * have an synchronous validator, please check
 * {@link qx.ui.form.validation.Manager#add}. If you have both cases, you have
 * to wrap the synchronous call in a timeout to make it asychronous.
 */
qx.Class.define("qx.ui.form.validation.AsyncValidator",
{
  extend : qx.core.Object,

  /**
   * @param validator {Function} The validator function, which has to be
   *   asynchronous.
   */
  construct : function(validator)
  {
    this.base(arguments);
    // save the validator function
    this.__validatorFunction = validator;
  },

  members :
  {
    __validatorFunction : null,
    __item : null,
    __manager : null,
    __usedForForm : null,

    /**
     * The validate function should only be called by
     * {@link qx.ui.form.validation.Manager}.
     *
     * It stores the given information and calls the validation function set in
     * the constructor. The method is used for form fields only. Validating a
     * form itself will be invokes with {@link #validateForm}.
     *
     * @param item {qx.ui.core.Widget} The form item which should be validated.
     * @param value {var} The value of the form item.
     * @param manager {qx.ui.form.validation.Manager} A reference to the form
     *   manager.
     * @param context {var?null} The context of the validator.
     *
     * @internal
     */
    validate: function(item, value, manager, context) {
      // mark as item validator
      this.__usedForForm = false;
      // store the item and the manager
      this.__item = item;
      this.__manager = manager;
      // invoke the user set validator function
      this.__validatorFunction.call(context || this, this, value);
    },


    /**
     * The validateForm function should only be called by
     * {@link qx.ui.form.validation.Manager}.
     *
     * It stores the given information and calls the validation function set in
     * the constructor. The method is used for forms only. Validating a
     * form item will be invokes with {@link #validate}.
     *
     * @param items {qx.ui.core.Widget[]} All form items of the form manager.
     * @param manager {qx.ui.form.validation.Manager} A reference to the form
     *   manager.
     * @param context {var?null} The context of the validator.
     *
     * @internal
     */
    validateForm : function(items, manager, context) {
      this.__usedForForm = true;
      this.__manager = manager;
      this.__validatorFunction.call(context, items, this);
    },


    /**
     * This method should be called within the asynchronous callback to tell the
     * validator the result of the validation.
     *
     * @param valid {Boolean} The boolean state of the validation.
     * @param message {String?} The invalidMessage of the validation.
     */
    setValid: function(valid, message) {
      // valid processing
      if (this.__usedForForm) {
        // message processing
        if (message !== undefined) {
          this.__manager.setInvalidMessage(message);
        }
        this.__manager.setFormValid(valid);
      } else {
        // message processing
        if (message !== undefined) {
          this.__item.setInvalidMessage(message);
        }
        this.__manager.setItemValid(this.__item, valid);
      }
    }
  },


  /*
   *****************************************************************************
      DESTRUCT
   *****************************************************************************
   */

  destruct : function() {
    this.__manager = this.__item = null;
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
 * The resetter is responsible for managing a set of items and resetting these
 * items on a {@link #reset} call. It can handle all form items supplying a
 * value property and all widgets implementing the single selection linked list
 * or select box.
 */
qx.Class.define("qx.ui.form.Resetter",
{
  extend : qx.core.Object,


  construct : function()
  {
    this.base(arguments);

    this.__items = [];
  },

  members :
  {
    __items : null,

    /**
     * Adding a widget to the reseter will get its current value and store
     * it for resetting. To access the value, the given item needs to specify
     * a value property or implement the {@link qx.ui.core.ISingleSelection}
     * interface.
     *
     * @param item {qx.ui.core.Widget} The widget which should be added.
     */
    add : function(item) {
      // check the init values
      if (this._supportsValue(item)) {
        var init = item.getValue();
      } else if (this.__supportsSingleSelection(item)) {
        var init = item.getSelection();
      } else if (this.__supportsDataBindingSelection(item)) {
        var init = item.getSelection().concat();
      } else {
        throw new Error("Item " + item + " not supported for reseting.");
      }
      // store the item and its init value
      this.__items.push({item: item, init: init});
    },


    /**
     * Removes a widget to the reseter
     *
     * @param item {qx.ui.core.Widget} The widget which should be removed.
     * @return {Boolean} <code>true</code>, if the widget has been removed.
     */
    remove : function(item) {
      for (var i = 0; i < this.__items.length; i++) {
        var storedItem = this.__items[i];
        if (storedItem.item === item) {
          this.__items.splice(i, 1);
          return true;
        }
      }
      return false;
    },


    /**
     * Resets all added form items to their initial value. The initial value
     * is the value in the widget during the {@link #add}.
     */
    reset: function() {
      // reset all form items
      for (var i = 0; i < this.__items.length; i++) {
        var dataEntry = this.__items[i];
        // set the init value
        this.__setItem(dataEntry.item, dataEntry.init);
      }
    },


    /**
     * Resets a single given item. The item has to be added to the resetter
     * instance before. Otherwise, an error is thrown.
     *
     * @param item {qx.ui.core.Widget} The widget, which should be resetted.
     */
    resetItem : function(item)
    {
      // get the init value
      var init;
      for (var i = 0; i < this.__items.length; i++) {
        var dataEntry = this.__items[i];
        if (dataEntry.item === item) {
          init = dataEntry.init;
          break;
        }
      };

      // check for the available init value
      if (init === undefined) {
        throw new Error("The given item has not been added.");
      }

      this.__setItem(item, init);
    },


    /**
     * Internal helper for setting an item to a given init value. It checks
     * for the supported APIs and uses the fitting API.
     *
     * @param item {qx.ui.core.Widget} The item to reset.
     * @param init {var} The value to set.
     */
    __setItem : function(item, init)
    {
      // set the init value
      if (this._supportsValue(item)) {
        item.setValue(init);
      } else if (
        this.__supportsSingleSelection(item) ||
        this.__supportsDataBindingSelection(item)
      ) {
        item.setSelection(init);
      }
    },


    /**
     * Takes the current values of all added items and uses these values as
     * init values for resetting.
     */
    redefine: function() {
      // go threw all added items
      for (var i = 0; i < this.__items.length; i++) {
        var item = this.__items[i].item;
        // set the new init value for the item
        this.__items[i].init = this.__getCurrentValue(item);
      }
    },


    /**
     * Takes the current value of the given item and stores this value as init
     * value for resetting.
     *
     * @param item {qx.ui.core.Widget} The item to redefine.
     */
    redefineItem : function(item)
    {
      // get the data entry
      var dataEntry;
      for (var i = 0; i < this.__items.length; i++) {
        if (this.__items[i].item === item) {
          dataEntry = this.__items[i];
          break;
        }
      };

      // check for the available init value
      if (dataEntry === undefined) {
        throw new Error("The given item has not been added.");
      }

      // set the new init value for the item
      dataEntry.init = this.__getCurrentValue(dataEntry.item);
    },


    /**
     * Internal helper top access the value of a given item.
     *
     * @param item {qx.ui.core.Widget} The item to access.
     * @return {var} The item's value
     */
    __getCurrentValue : function(item)
    {
      if (this._supportsValue(item)) {
        return item.getValue();
      } else if (
        this.__supportsSingleSelection(item) ||
        this.__supportsDataBindingSelection(item)
      ) {
        return item.getSelection();
      }
    },


    /**
     * Returns true, if the given item implements the
     * {@link qx.ui.core.ISingleSelection} interface.
     *
     * @param formItem {qx.core.Object} The item to check.
     * @return {Boolean} true, if the given item implements the
     *   necessary interface.
     */
    __supportsSingleSelection : function(formItem) {
      var clazz = formItem.constructor;
      return qx.Class.hasInterface(clazz, qx.ui.core.ISingleSelection);
    },


    /**
     * Returns true, if the given item implements the
     * {@link qx.data.controller.ISelection} interface.
     *
     * @param formItem {qx.core.Object} The item to check.
     * @return {Boolean} true, if the given item implements the
     *   necessary interface.
     */
    __supportsDataBindingSelection : function(formItem) {
      var clazz = formItem.constructor;
      return qx.Class.hasInterface(clazz, qx.data.controller.ISelection);
    },


    /**
     * Returns true, if the value property is supplied by the form item.
     *
     * @param formItem {qx.core.Object} The item to check.
     * @return {Boolean} true, if the given item implements the
     *   necessary interface.
     */
    _supportsValue : function(formItem) {
      var clazz = formItem.constructor;
      return (
        qx.Class.hasInterface(clazz, qx.ui.form.IBooleanForm) ||
        qx.Class.hasInterface(clazz, qx.ui.form.IColorForm) ||
        qx.Class.hasInterface(clazz, qx.ui.form.IDateForm) ||
        qx.Class.hasInterface(clazz, qx.ui.form.INumberForm) ||
        qx.Class.hasInterface(clazz, qx.ui.form.IStringForm)
      );
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */
  destruct : function()
  {
    // holding references to widgets --> must set to null
    this.__items = null;
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
 * data type like a colorchooser.
 */
qx.Interface.define("qx.ui.form.IColorForm",
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
     * @param value {Color|null} The new value of the element.
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
     * @return {Color|null} The value.
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
 * Form interface for all form widgets which have date as their primary
 * data type like datechooser's.
 */
qx.Interface.define("qx.ui.form.IDateForm",
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
     * @param value {Date|null} The new value of the element.
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
     * @return {Date|null} The value.
     */
    getValue : function() {}
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
 * This interface defines the necessary features a form renderer should have.
 * Keep in mind that all renderes has to be widgets.
 */
qx.Interface.define("qx.ui.form.renderer.IFormRenderer",
{
  members :
  {
    /**
     * Add a group of form items with the corresponding names. The names should
     * be displayed as hint for the user what to do with the form item.
     * The title is optional and can be used as grouping for the given form
     * items.
     *
     * @param items {qx.ui.core.Widget[]} An array of form items to render.
     * @param names {String[]} An array of names for the form items.
     * @param title {String?} A title of the group you are adding.
     * @param itemsOptions {Array?null} The added additional data.
     * @param headerOptions {Map?null} The options map as defined by the form
     *   for the current group header.
     */
    addItems : function(items, names, title, itemsOptions, headerOptions) {},


    /**
     * Adds a button the form renderer.
     *
     * @param button {qx.ui.form.Button} A button which should be added to
     *   the form.
     * @param options {Map?null} The added additional data.
     */
    addButton : function(button, options) {}

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
 * Abstract renderer for {@link qx.ui.form.Form}. This abstract renderer should
 * be the superclass of all form renderer. It takes the form, which is
 * supplied as constructor parameter and configures itself. So if you need to
 * set some additional information on your renderer before adding the widgets,
 * be sure to do that before calling this.base(arguments, form).
 */
qx.Class.define("qx.ui.form.renderer.AbstractRenderer",
{
  type : "abstract",
  extend : qx.ui.core.Widget,
  implement : qx.ui.form.renderer.IFormRenderer,

  /**
   * @param form {qx.ui.form.Form} The form to render.
   */
  construct : function(form)
  {
    this.base(arguments);

    this._labels = [];

    // translation support
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().addListener(
        "changeLocale", this._onChangeLocale, this
      );
      this._names = [];
    }
    this._form = form;
    this._render();

    form.addListener("change", this._onFormChange, this);
  },


  members :
  {
    _names : null,
    _form : null,
    _labels : null,


    /**
     * Renders the form: add's the items and buttons.
     */
    _render : function() {
      // add the groups
      var groups = this._form.getGroups();
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        this.addItems(
          group.items, group.labels, group.title, group.options, group.headerOptions
        );
      }

      // add the buttons
      var buttons = this._form.getButtons();
      var buttonOptions = this._form.getButtonOptions();
      for (var i = 0; i < buttons.length; i++) {
        this.addButton(buttons[i], buttonOptions[i]);
      }
    },


    /**
     * Handler responsible for updating the rendered widget as soon as the
     * form changes.
     */
    _onFormChange : function() {
      this._removeAll();
      // remove all created labels
      for (var i=0; i < this._labels.length; i++) {
        this._labels[i].dispose();
      }
      this._labels = [];

      this._render();
    },


    /**
     * Helper to bind the item's visibility to the label's visibility.
     * @param item {qx.ui.core.Widget} The form element.
     * @param label {qx.ui.basic.Label} The label for the form element.
     */
    _connectVisibility : function(item, label) {
      // map the items visibility to the label
      item.bind("visibility", label, "visibility");
    },


    /**
     * Locale change event handler
     *
     * @signature function(e)
     * @param e {Event} the change event
     */
    _onChangeLocale : qx.core.Environment.select("qx.dynlocale",
    {
      "true" : function(e) {
        for (var i = 0; i < this._names.length; i++) {
          var entry = this._names[i];
          if (entry.name && entry.name.translate) {
            entry.name = entry.name.translate();
          }
          var newText = this._createLabelText(entry.name, entry.item);
          entry.label.setValue(newText);
        }
      },

      "false" : null
    }),


    /**
     * Creates the label text for the given form item.
     *
     * @param name {String} The content of the label without the
     *   trailing * and :
     * @param item {qx.ui.form.IForm} The item, which has the required state.
     * @return {String} The text for the given item.
     */
    _createLabelText : function(name, item)
    {
      var required = "";
      if (item.getRequired()) {
       required = " <span style='color:red'>*</span> ";
      }

      // Create the label. Append a colon only if there's text to display.
      var colon = name.length > 0 || item.getRequired() ? " :" : "";
      return name + required + colon;
    },


    // interface implementation
    addItems : function(items, names, title) {
      throw new Error("Abstract method call");
    },


    // interface implementation
    addButton : function(button) {
      throw new Error("Abstract method call");
    }
  },



  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this._onChangeLocale, this);
    }
    this._names = null;
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
 * Single column renderer for {@link qx.ui.form.Form}.
 */
qx.Class.define("qx.ui.form.renderer.Single",
{
  extend : qx.ui.form.renderer.AbstractRenderer,


  construct : function(form)
  {
    var layout = new qx.ui.layout.Grid();
    layout.setSpacing(6);
    layout.setColumnFlex(0, 1);
    layout.setColumnAlign(0, "right", "top");
    this._setLayout(layout);

    this.base(arguments, form);
  },


  members :
  {
    _row : 0,
    _buttonRow : null,


    // overridden
    _onFormChange : function() {
      if (this._buttonRow) {
        this._buttonRow.destroy();
        this._buttonRow = null;
      }
      this._row = 0;
      this.base(arguments);
    },


    /**
     * Add a group of form items with the corresponding names. The names are
     * displayed as label.
     * The title is optional and is used as grouping for the given form
     * items.
     *
     * @param items {qx.ui.core.Widget[]} An array of form items to render.
     * @param names {String[]} An array of names for the form items.
     * @param title {String?} A title of the group you are adding.
     */
    addItems : function(items, names, title) {
      // add the header
      if (title != null) {
        this._add(
          this._createHeader(title), {row: this._row, column: 0, colSpan: 2}
        );
        this._row++;
      }

      // add the items
      for (var i = 0; i < items.length; i++) {
        var label = this._createLabel(names[i], items[i]);
        this._add(label, {row: this._row, column: 0});
        var item = items[i];
        label.setBuddy(item);
        this._add(item, {row: this._row, column: 1});
        this._row++;

        this._connectVisibility(item, label);

        // store the names for translation
        if (qx.core.Environment.get("qx.dynlocale")) {
          this._names.push({name: names[i], label: label, item: items[i]});
        }
      }
    },


    /**
     * Adds a button the form renderer. All buttons will be added in a
     * single row at the bottom of the form.
     *
     * @param button {qx.ui.form.Button} The button to add.
     */
    addButton : function(button) {
      if (this._buttonRow == null) {
        // create button row
        this._buttonRow = new qx.ui.container.Composite();
        this._buttonRow.setMarginTop(5);
        var hbox = new qx.ui.layout.HBox();
        hbox.setAlignX("right");
        hbox.setSpacing(5);
        this._buttonRow.setLayout(hbox);
        // add the button row
        this._add(this._buttonRow, {row: this._row, column: 0, colSpan: 2});
        // increase the row
        this._row++;
      }

      // add the button
      this._buttonRow.add(button);
    },


    /**
     * Returns the set layout for configuration.
     *
     * @return {qx.ui.layout.Grid} The grid layout of the widget.
     */
    getLayout : function() {
      return this._getLayout();
    },


    /**
     * Creates a label for the given form item.
     *
     * @param name {String} The content of the label without the
     *   trailing * and :
     * @param item {qx.ui.core.Widget} The item, which has the required state.
     * @return {qx.ui.basic.Label} The label for the given item.
     */
    _createLabel : function(name, item) {
      var label = new qx.ui.basic.Label(this._createLabelText(name, item));
      // store labels for disposal
      this._labels.push(label);
      label.setRich(true);
      label.setAppearance("form-renderer-label");
      return label;
    },


    /**
     * Creates a header label for the form groups.
     *
     * @param title {String} Creates a header label.
     * @return {qx.ui.basic.Label} The header for the form groups.
     */
    _createHeader : function(title) {
      var header = new qx.ui.basic.Label(title);
      // store labels for disposal
      this._labels.push(header);
      header.setFont("bold");
      if (this._row != 0) {
        header.setMarginTop(10);
      }
      header.setAlignX("left");
      return header;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */
  destruct : function()
  {
    // first, remove all buttons from the button row because they
    // should not be disposed
    if (this._buttonRow) {
      this._buttonRow.removeAll();
      this._disposeObjects("_buttonRow");
    }
  }
});

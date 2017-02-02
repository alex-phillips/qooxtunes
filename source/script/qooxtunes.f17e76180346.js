/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * This class is used to send HTTP requests to the server.
 *
 * Note: This class will be deprecated in a future release. Instead,
 * please use classes found in {@link qx.io.request}.
 */
qx.Class.define("qx.io.remote.Request",
{
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param vUrl {String}
   *   Target url to issue the request to.
   *
   * @param vMethod {String}
   *   Determines http method (GET, POST, PUT, etc.) to use. See "method" property
   *   for valid values and default value.
   *
   * @param vResponseType {String}
   *   The mime type of the response. Default is text/plain.
   */
  construct : function(vUrl, vMethod, vResponseType)
  {
    this.base(arguments);

    this.__requestHeaders = {};
    this.__urlParameters = {};
    this.__dataParameters = {};
    this.__formFields = {};

    if (vUrl !== undefined) {
      this.setUrl(vUrl);
    }

    if (vMethod !== undefined) {
      this.setMethod(vMethod);
    }

    if (vResponseType !== undefined) {
      this.setResponseType(vResponseType);
    }

    this.setProhibitCaching(true);

    // Get the next sequence number for this request
    this.__seqNum = ++qx.io.remote.Request.__seqNum;
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events : {

    /** Fired when the Request object changes its state to 'created' */
    "created" : "qx.event.type.Event",

    /** Fired when the Request object changes its state to 'configured' */
    "configured" : "qx.event.type.Event",

    /** Fired when the Request object changes its state to 'sending' */
    "sending" : "qx.event.type.Event",

    /** Fired when the Request object changes its state to 'receiving' */
    "receiving" : "qx.event.type.Event",

    /**
     * Fired once the request has finished successfully. The event object
     * can be used to read the transferred data.
     */
    "completed" : "qx.io.remote.Response",

    /** Fired when the pending request has been aborted. */
    "aborted" : "qx.event.type.Event",

    /** Fired when the pending request failes. */
    "failed" : "qx.io.remote.Response",

    /** Fired when the pending request times out. */
    "timeout" : "qx.io.remote.Response"
  },



  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /*
    ---------------------------------------------------------------------------
      SEQUENCE NUMBER
    ---------------------------------------------------------------------------
    */

    /**
     * Sequence (id) number of a request, used to associate a response or error
     * with its initiating request.
     */
    __seqNum : 0,

    /**
     * Returns true if the given HTTP method allows a request body being transferred to the server.
     * This is currently POST and PUT. Other methods require their data being encoded into
     * the URL
     *
     * @param httpMethod {String} one of the values of the method property
     * @return {Boolean}
     */
    methodAllowsRequestBody : function(httpMethod) {
      return (httpMethod == "POST") || (httpMethod == "PUT");
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
     * Target url to issue the request to.
     */
    url :
    {
      check : "String",
      init : ""
    },


    /**
     * Determines what type of request to issue (GET, POST, PUT, HEAD, DELETE).
     */
    method :
    {
      check : [ "GET", "POST", "PUT", "HEAD", "DELETE" ],
      apply : "_applyMethod",
      init : "GET"
    },


    /**
     * Set the request to asynchronous.
     */
    asynchronous :
    {
      check : "Boolean",
      init : true
    },


    /**
     * Set the data to be sent via this request
     */
    data :
    {
      check : "String",
      nullable : true
    },


    /**
     * Username to use for HTTP authentication.
     * Set to NULL if HTTP authentication is not used.
     */
    username :
    {
      check : "String",
      nullable : true
    },


    /**
     * Password to use for HTTP authentication.
     * Set to NULL if HTTP authentication is not used.
     */
    password :
    {
      check : "String",
      nullable : true
    },


    /**
     * The state that the request is in, while being processed.
     */
    state :
    {
      check : [ "configured", "queued", "sending", "receiving", "completed", "aborted", "timeout", "failed" ],
      init : "configured",
      apply : "_applyState",
      event : "changeState"
    },


    /**
     * Response type of request.
     *
     * The response type is a MIME type, default is text/plain. Other supported
     * MIME types are text/javascript, text/html, application/json,
     * application/xml.
     */
    responseType :
    {
      check : [ "text/plain", "text/javascript", "application/json", "application/xml", "text/html" ],
      init : "text/plain",
      apply : "_applyResponseType"
    },


    /**
     * Number of milliseconds before the request is being timed out.
     *
     * If this property is null, the timeout for the request comes is the
     * qx.io.remote.RequestQueue's property defaultTimeout.
     */
    timeout :
    {
      check : "Integer",
      nullable : true
    },


    /**
     * Prohibit request from being cached.
     *
     * Setting the value to <i>true</i> adds a parameter "nocache" to the
     * request URL with a value of the current time, as well as adding request
     * headers Pragma:no-cache and Cache-Control:no-cache.
     *
     * Setting the value to <i>false</i> removes the parameter and request
     * headers.
     *
     * As a special case, this property may be set to the string value
     * "no-url-params-on-post" which will prevent the nocache parameter from
     * being added to the URL if the POST method is used but will still add
     * the Pragma and Cache-Control headers.  This is useful if your backend
     * does nasty things like mixing parameters specified in the URL into
     * form fields in the POST request.  (One example of this nasty behavior
     * is known as "mixed mode" in Oracle, as described here:
     * http://docs.oracle.com/cd/B32110_01/web.1013/b28963/concept.htm#i1005684)
     */
    prohibitCaching :
    {
      check : function(v)
      {
        return typeof v == "boolean" || v === "no-url-params-on-post";
      },
      init : true,
      apply : "_applyProhibitCaching"
    },


    /**
     * Indicate that the request is cross domain.
     *
     * A request is cross domain if the request's URL points to a host other than
     * the local host. This switches the concrete implementation that is used for
     * sending the request from qx.io.remote.transport.XmlHttp to
     * qx.io.remote.transport.Script, because only the latter can handle cross
     * domain requests.
     */
    crossDomain :
    {
      check : "Boolean",
      init : false
    },


    /**
     * Indicate that the request will be used for a file upload.
     *
     * The request will be used for a file upload.  This switches the concrete
     * implementation that is used for sending the request from
     * qx.io.remote.transport.XmlHttp to qx.io.remote.IFrameTransport, because only
     * the latter can handle file uploads.
     */
    fileUpload :
    {
      check : "Boolean",
      init : false
    },


    /**
     * The transport instance used for the request.
     *
     * This is necessary to be able to abort an asynchronous request.
     */
    transport :
    {
      check : "qx.io.remote.Exchange",
      nullable : true
    },


    /**
     * Use Basic HTTP Authentication.
     */
    useBasicHttpAuth :
    {
      check : "Boolean",
      init : false
    },

    /**
     * If true and the responseType property is set to "application/json", getContent() will
     * return a Javascript map containing the JSON contents, i. e. the result qx.lang.Json.parse().
     * If false, the raw string data will be returned and the parsing must be done manually.
     * This is usefull for special JSON dialects / extensions which are not supported by
     * qx.lang.Json.
     *
     * Note that this is currently only respected by qx.io.remote.transport.XmlHttp, i. e.
     * if the transport used is the one using XMLHttpRequests. The other transports
     * do not support JSON parsing, so this property has no effect.
     */
    parseJson :
    {
      check : "Boolean",
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

    __requestHeaders : null,
    __urlParameters : null,
    __dataParameters : null,
    __formFields : null,
    __seqNum : null,

    /*
    ---------------------------------------------------------------------------
      CORE METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Schedule this request for transport to server.
     *
     * The request is added to the singleton class qx.io.remote.RequestQueue's
     * list of pending requests.
     *
     */
    send : function() {
      qx.io.remote.RequestQueue.getInstance().add(this);
    },


    /**
     * Abort sending this request.
     *
     * The request is removed from the singleton class qx.io.remote.RequestQueue's
     * list of pending events. If the request haven't been scheduled this
     * method is a noop.
     *
     */
    abort : function() {
      qx.io.remote.RequestQueue.getInstance().abort(this);
    },


    /**
     * Abort sending this request if it has not already been aborted.
     *
     */
    reset : function()
    {
      switch(this.getState())
      {
        case "sending":
        case "receiving":
          this.error("Aborting already sent request!");

          // no break

        case "queued":
          this.abort();
          break;
      }
    },




    /*
    ---------------------------------------------------------------------------
      STATE ALIASES
    ---------------------------------------------------------------------------
    */

    /**
     * Determine if this request is in the configured state.
     *
     * @return {Boolean} <true> if the request is in the configured state; <false> otherwise.
     */
    isConfigured : function() {
      return this.getState() === "configured";
    },


    /**
     * Determine if this request is in the queued state.
     *
     * @return {Boolean} <true> if the request is in the queued state; <false> otherwise.
     */
    isQueued : function() {
      return this.getState() === "queued";
    },


    /**
     * Determine if this request is in the sending state.
     *
     * @return {Boolean} <true> if the request is in the sending state; <false> otherwise.
     */
    isSending : function() {
      return this.getState() === "sending";
    },


    /**
     * Determine if this request is in the receiving state.
     *
     * @return {Boolean} <true> if the request is in the receiving state; <false> otherwise.
     */
    isReceiving : function() {
      return this.getState() === "receiving";
    },


    /**
     * Determine if this request is in the completed state.
     *
     * @return {Boolean} <true> if the request is in the completed state; <false> otherwise.
     */
    isCompleted : function() {
      return this.getState() === "completed";
    },


    /**
     * Determine if this request is in the aborted state.
     *
     * @return {Boolean} <true> if the request is in the aborted state; <false> otherwise.
     */
    isAborted : function() {
      return this.getState() === "aborted";
    },


    /**
     * Determine if this request is in the timeout state.
     *
     * @return {Boolean} <true> if the request is in the timeout state; <false> otherwise.
     */
    isTimeout : function() {
      return this.getState() === "timeout";
    },


    /**
     * Determine if this request is in the failed state.
     *
     * @return {Boolean} <true> if the request is in the failed state; <false> otherwise.
     */
    isFailed : function() {
      return this.getState() === "failed";
    },




    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Dispatches a clone of the given event on this instance
     *
     * @param e {qx.event.type.Event} The original event
     */
    __forwardEvent : qx.event.GlobalError.observeMethod(function(e)
    {
      var clonedEvent = e.clone();
      clonedEvent.setTarget(this);
      this.dispatchEvent(clonedEvent);
    }),



    /**
     * Event handler called when the request enters the queued state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _onqueued : function(e)
    {
      // Modify internal state
      this.setState("queued");

      // Bubbling up
      this.__forwardEvent(e);
    },


    /**
     * Event handler called when the request enters the sending state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _onsending : function(e)
    {
      // Modify internal state
      this.setState("sending");

      // Bubbling up
      this.__forwardEvent(e);
    },


    /**
     * Event handler called when the request enters the receiving state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _onreceiving : function(e)
    {
      // Modify internal state
      this.setState("receiving");

      // Bubbling up
      this.__forwardEvent(e);
    },


    /**
     * Event handler called when the request enters the completed state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _oncompleted : function(e)
    {
      // Modify internal state
      this.setState("completed");

      // Bubbling up
      this.__forwardEvent(e);

      // Automatically dispose after event completion
      this.dispose();
    },


    /**
     * Event handler called when the request enters the aborted state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _onaborted : function(e)
    {
      // Modify internal state
      this.setState("aborted");

      // Bubbling up
      this.__forwardEvent(e);

      // Automatically dispose after event completion
      this.dispose();
    },


    /**
     * Event handler called when the request enters the timeout state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _ontimeout : function(e)
    {
      /*
        // User's handler can block until timeout.
        switch(this.getState())
        {
          // If we're no longer running...
          case "completed":
          case "timeout":
          case "aborted":
          case "failed":
            // then don't bubble up the timeout event
            return;
        }


    */  // Modify internal state
      this.setState("timeout");

      // Bubbling up
      this.__forwardEvent(e);

      // Automatically dispose after event completion
      this.dispose();
    },


    /**
     * Event handler called when the request enters the failed state.
     *
     * @param e {qx.event.type.Event} Event indicating state change
     */
    _onfailed : function(e)
    {
      // Modify internal state
      this.setState("failed");

      // Bubbling up
      this.__forwardEvent(e);

      // Automatically dispose after event completion
      this.dispose();
    },




    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyState : function(value, old)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("State: " + value);
        }
      }
    },


    // property apply
    _applyProhibitCaching : function(value, old)
    {
      if (! value)
      {
        this.removeParameter("nocache");
        this.removeRequestHeader("Pragma");
        this.removeRequestHeader("Cache-Control");
        return;
      }

      // If value isn't "no-url-params-on-post" or this isn't a POST request
      if (value !== "no-url-params-on-post" ||
          this.getMethod() != "POST")
      {
        // ... then add a parameter to the URL to make it unique on each
        // request.  The actual id, "nocache" is irrelevant; it's the fact
        // that a (usually) different date is added to the URL on each request
        // that prevents caching.
        this.setParameter("nocache", new Date().valueOf());
      }
      else
      {
        // Otherwise, we don't want the nocache parameer in the URL.
        this.removeParameter("nocache");
      }

      // Add the HTTP 1.0 request to avoid use of a cache
      this.setRequestHeader("Pragma", "no-cache");

      // Add the HTTP 1.1 request to avoid use of a cache
      this.setRequestHeader("Cache-Control", "no-cache");
    },


    // property apply
    _applyMethod : function(value, old)
    {
      if (qx.io.remote.Request.methodAllowsRequestBody(value)) {
        this.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      } else {
        this.removeRequestHeader("Content-Type");
      }

      // Re-test the prohibit caching property.  We may need to add or remove
      // the "nocache" parameter.  We explicitly call the _apply method since
      // it wouldn't be called normally when setting the value to its already
      // existant value.
      var prohibitCaching = this.getProhibitCaching();
      this._applyProhibitCaching(prohibitCaching, prohibitCaching);
    },


    // property apply
    _applyResponseType : function(value, old) {
      this.setRequestHeader("X-Qooxdoo-Response-Type", value);
    },




    /*
    ---------------------------------------------------------------------------
      REQUEST HEADER
    ---------------------------------------------------------------------------
    */

    /**
     * Add a request header to the request.
     *
     * Example: request.setRequestHeader("Content-Type", "text/html")
     *
     * Please note: Some browsers, such as Safari 3 and 4, will capitalize
     * header field names. This is in accordance with RFC 2616[1], which states
     * that HTTP 1.1 header names are case-insensitive, so your server backend
     * should be case-agnostic when dealing with request headers.
     *
     * [1]<a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2">RFC 2616: HTTP Message Headers</a>
     *
     * @param vId {String} The identifier to use for this added header
     * @param vValue {String} The value to use for this added header
     */
    setRequestHeader : function(vId, vValue) {
      this.__requestHeaders[vId] = vValue;
    },


    /**
     * Remove a previously-added request header
     *
     * @param vId {String} The id of the header to be removed
     */
    removeRequestHeader : function(vId) {
      delete this.__requestHeaders[vId];
    },


    /**
     * Retrieve the value of a header which was previously set
     *
     * @param vId {String} The id of the header value being requested
     * @return {String} The value of the header with the specified id
     */
    getRequestHeader : function(vId) {
      return this.__requestHeaders[vId] || null;
    },


    /**
     * Return the object containing all of the headers which have been added.
     *
     * @return {Object} The returned object has as its property names each of the ids of headers
     *     which have been added, and as each property value, the value of the
     *     property corresponding to that id.
     */
    getRequestHeaders : function() {
      return this.__requestHeaders;
    },




    /*
    ---------------------------------------------------------------------------
      PARAMETERS
    ---------------------------------------------------------------------------
    */

    /**
     * Add a parameter to the request.
     *
     * @param vId {String}
     *   String identifier of the parameter to add.
     *
     * @param vValue {var}
     *   Value of parameter. May be a string (for one parameter) or an array
     *   of strings (for setting multiple parameter values with the same
     *   parameter name).
     *
     * @param bAsData {Boolean}
     *   If <i>false</i>, add the parameter to the URL.  If <i>true</i> then
     *   instead the parameters added by calls to this method will be combined
     *   into a string added as the request data, as if the entire set of
     *   parameters had been pre-build and passed to setData().
     *
     * Note: Parameters requested to be sent as data will be silently dropped
     *       if data is manually added via a call to setData().
     *
     * Note: Some transports, e.g. Script, do not support passing parameters
     *       as data.
     *
     */
    setParameter : function(vId, vValue, bAsData)
    {
      if (bAsData)
      {
        this.__dataParameters[vId] = vValue;
      }
      else
      {
        this.__urlParameters[vId] = vValue;
      }
    },


    /**
     * Remove a parameter from the request.
     *
     * @param vId {String}
     *   Identifier of the parameter to remove.
     *
     * @param bFromData {Boolean}
     *   If <i>false</i> then remove the parameter of the URL parameter list.
     *   If <i>true</i> then remove it from the list of parameters to be sent
     *   as request data.
     *
     */
    removeParameter : function(vId, bFromData)
    {
      if (bFromData)
      {
        delete this.__dataParameters[vId];
      }
      else
      {
        delete this.__urlParameters[vId];
      }
    },


    /**
     * Get a parameter in the request.
     *
     * @param vId {String}
     *   Identifier of the parameter to get.
     *
     * @param bFromData {Boolean}
     *   If <i>false</i> then retrieve the parameter from the URL parameter
     *   list. If <i>true</i> then retrieve it from the list of parameters to
     *   be sent as request data.
     *
     * @return {var}
     *   The requested parameter value
     *
     */
    getParameter : function(vId, bFromData)
    {
      if (bFromData)
      {
        return this.__dataParameters[vId] || null;
      }
      else
      {
        return this.__urlParameters[vId] || null;
      }
    },


    /**
     * Returns the object containg all parameters for the request.
     *
     * @param bFromData {Boolean}
     *   If <i>false</i> then retrieve the URL parameter list.
     *   If <i>true</i> then retrieve the data parameter list.
     *
     * @return {Object}
     *   The returned object has as its property names each of the ids of
     *   parameters which have been added, and as each property value, the
     *   value of the property corresponding to that id.
     */
    getParameters : function(bFromData)
    {
      return (bFromData ? this.__dataParameters : this.__urlParameters);
    },




    /*
    ---------------------------------------------------------------------------
      FORM FIELDS
    ---------------------------------------------------------------------------
    */

    /**
     * Add a form field to the POST request.
     *
     * NOTE: Adding any programatic form fields using this method will switch the
     *       Transport implementation to IframeTransport.
     *
     * NOTE: Use of these programatic form fields disallow use of synchronous
     *       requests and cross-domain requests.  Be sure that you do not need
     *       those features when setting these programatic form fields.
     *
     * @param vId {String} String identifier of the form field to add.
     * @param vValue {String} Value of form field
     */
    setFormField : function(vId, vValue) {
      this.__formFields[vId] = vValue;
    },


    /**
     * Remove a form field from the POST request.
     *
     * @param vId {String} Identifier of the form field to remove.
     */
    removeFormField : function(vId) {
      delete this.__formFields[vId];
    },


    /**
     * Get a form field in the POST request.
     *
     * @param vId {String} Identifier of the form field to get.
     * @return {String|null} Value of form field or <code>null</code> if no value
     *    exists for the passed identifier.
     */
    getFormField : function(vId) {
      return this.__formFields[vId] || null;
    },


    /**
     * Returns the object containg all form fields for the POST request.
     *
     * @return {Object} The returned object has as its property names each of the ids of
     *     form fields which have been added, and as each property value, the value
     *     of the property corresponding to that id.
     */
    getFormFields : function() {
      return this.__formFields;
    },


    /**
     * Obtain the sequence (id) number used for this request
     *
     * @return {Integer} The sequence number of this request
     */
    getSequenceNumber : function() {
      return this.__seqNum;
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.setTransport(null);
    this.__requestHeaders = this.__urlParameters = this.__dataParameters =
      this.__formFields = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * Handles scheduling of requests to be sent to a server.
 *
 * This class is a singleton and is used by qx.io.remote.Request to schedule its
 * requests. It should not be used directly.
 *
 * @internal
 */
qx.Class.define("qx.io.remote.RequestQueue",
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

    this.__queue = [];
    this.__active = [];

    this.__totalRequests = 0;

    // timeout handling
    this.__timer = new qx.event.Timer(500);
    this.__timer.addListener("interval", this._oninterval, this);
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {

    /**
     * Indicates whether queue is enabled or not.
     */
    enabled :
    {
      init : true,
      check : "Boolean",
      apply : "_applyEnabled"
    },

    /**
     * The maximum number of total requests.
     */
    maxTotalRequests :
    {
      check : "Integer",
      nullable : true
    },


    /**
     * Maximum number of parallel requests.
     */
    maxConcurrentRequests :
    {
      check : "Integer",
      init : qx.core.Environment.get("io.maxrequests")
    },


    /**
     * Default timeout for remote requests in milliseconds.
     */
    defaultTimeout :
    {
      check : "Integer",
      init : 5000
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __queue : null,
    __active : null,
    __totalRequests : null,
    __timer : null,

    /*
    ---------------------------------------------------------------------------
      QUEUE HANDLING
    ---------------------------------------------------------------------------
    */


    /**
     * Get a list of queued requests
     *
     * @return {Request[]} The list of queued requests
     */
    getRequestQueue : function() {
      return this.__queue;
    },


    /**
     * Get a list of active queued requests, each one wrapped in an instance of
     * {@link qx.io.remote.Exchange}
     *
     * @return {Exchange[]} The list of active queued requests, each one
     *   wrapped in an instance of {@link qx.io.remote.Exchange}
     */
    getActiveQueue : function() {
      return this.__active;
    },


    /**
     * Generates debug output
     */
    _debug : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote"))
        {
          // Debug output
          var vText = this.__active.length + "/" + (this.__queue.length + this.__active.length);

          this.debug("Progress: " + vText);
          window.status = "Request-Queue Progress: " + vText;
        }
      }
    },


    /**
     * Checks the queue if any request is left to send and uses the transport
     * layer to send the open requests.
     * This method calls itself until every request in the queue is send.
     *
     */
    _check : function()
    {
      // Debug output
      this._debug();

      // Check queues and stop timer if not needed anymore
      if (this.__active.length == 0 && this.__queue.length == 0) {
        this.__timer.stop();
      }

      // Checking if enabled
      if (!this.getEnabled()) {
        return;
      }

      // Checking active queue fill
      if ( this.__queue.length == 0 ||(this.__queue[0].isAsynchronous() && this.__active.length >= this.getMaxConcurrentRequests())) {
        return;
      }

      // Checking number of total requests
      if (this.getMaxTotalRequests() != null && this.__totalRequests >= this.getMaxTotalRequests()) {
        return;
      }

      var vRequest = this.__queue.shift();
      var vTransport = new qx.io.remote.Exchange(vRequest);

      // Increment counter
      this.__totalRequests++;

      // Add to active queue
      this.__active.push(vTransport);

      // Debug output
      this._debug();

      // Establish event connection between qx.io.remote.Exchange and me.
      vTransport.addListener("sending", this._onsending, this);
      vTransport.addListener("receiving", this._onreceiving, this);
      vTransport.addListener("completed", this._oncompleted, this);
      vTransport.addListener("aborted", this._oncompleted, this);
      vTransport.addListener("timeout", this._oncompleted, this);
      vTransport.addListener("failed", this._oncompleted, this);

      // Store send timestamp
      vTransport._start = (new Date).valueOf();

      // Send
      vTransport.send();

      // Retry
      if (this.__queue.length > 0) {
        this._check();
      }
    },


    /**
     * Removes a transport object from the active queue and disposes the
     * transport object in order stop the request.
     *
     * @param vTransport {qx.io.remote.Exchange} Transport object
     */
    _remove : function(vTransport)
    {
      // Remove from active transports
      qx.lang.Array.remove(this.__active, vTransport);

      // Dispose transport object
      vTransport.dispose();

      // Check again
      this._check();
    },




    /*
    ---------------------------------------------------------------------------
      EVENT HANDLING
    ---------------------------------------------------------------------------
    */

    __activeCount : 0,


    /**
     * Listens for the "sending" event of the transport object and increases
     * the counter for active requests.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onsending : function(e)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote"))
        {
          this.__activeCount++;
          e.getTarget()._counted = true;

          this.debug("ActiveCount: " + this.__activeCount);
        }
      }

      e.getTarget().getRequest()._onsending(e);
    },


    /**
     * Listens for the "receiving" event of the transport object and delegate
     * the event to the current request object.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onreceiving : function(e) {
      e.getTarget().getRequest()._onreceiving(e);
    },


    /**
     * Listens for the "completed" event of the transport object and decreases
     * the counter for active requests.
     *
     * @param e {qx.event.type.Event} event object
     */
    _oncompleted : function(e)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote"))
        {
          if (e.getTarget()._counted)
          {
            this.__activeCount--;
            this.debug("ActiveCount: " + this.__activeCount);
          }
        }
      }

      // delegate the event to the handler method of the request depending
      // on the current type of the event ( completed|aborted|timeout|failed )
      var request = e.getTarget().getRequest();
      var requestHandler = "_on" + e.getType();

      // remove the request from the queue,
      // keep local reference, see [BUG #4422]
      this._remove(e.getTarget());

      // It's possible that the request handler can fail, possibly due to
      // being sent garbage data. We want to prevent that from crashing
      // the program, but instead display an error.
      try
      {
        if (request[requestHandler])
        {
          request[requestHandler](e);
        }
      }
      catch(ex)
      {
        this.error("Request " + request + " handler " + requestHandler +
          " threw an error: ", ex);

        // Issue an "aborted" event so the application gets notified.
        // If that too fails, or if there's no "aborted" handler, ignore it.
        try
        {
          if (request["_onaborted"])
          {
            var event = qx.event.Registration.createEvent("aborted",
                                                      qx.event.type.Event);
            request["_onaborted"](event);
          }
        }
        catch(ex1)
        {
        }
      }
    },




    /*
    ---------------------------------------------------------------------------
      TIMEOUT HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * Listens for the "interval" event of the transport object and checks
     * if the active requests are timed out.
     *
     * @param e {qx.event.type.Event} event object
     */
    _oninterval : function(e)
    {
      var vActive = this.__active;

      if (vActive.length == 0)
      {
        this.__timer.stop();
        return;
      }

      var vCurrent = (new Date).valueOf();
      var vTransport;
      var vRequest;
      var vDefaultTimeout = this.getDefaultTimeout();
      var vTimeout;
      var vTime;

      for (var i=vActive.length-1; i>=0; i--)
      {
        vTransport = vActive[i];
        vRequest = vTransport.getRequest();

        if (vRequest.isAsynchronous())
        {
          vTimeout = vRequest.getTimeout();

          // if timer is disabled...
          if (vTimeout == 0)
          {
            // then ignore it.
            continue;
          }

          if (vTimeout == null) {
            vTimeout = vDefaultTimeout;
          }

          vTime = vCurrent - vTransport._start;

          if (vTime > vTimeout)
          {
            this.warn("Timeout: transport " + vTransport.toHashCode());
            this.warn(vTime + "ms > " + vTimeout + "ms");
            vTransport.timeout();
          }
        }
      }
    },




    /*
    ---------------------------------------------------------------------------
      MODIFIERS
    ---------------------------------------------------------------------------
    */


    // property apply
    _applyEnabled : function(value, old)
    {
      if (value) {
        this._check();
      }

      this.__timer.setEnabled(value);
    },




    /*
    ---------------------------------------------------------------------------
      CORE METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Add the request to the pending requests queue.
     *
     * @param vRequest {var} The request
     */
    add : function(vRequest)
    {
      vRequest.setState("queued");

      if (vRequest.isAsynchronous()) {
        this.__queue.push(vRequest);
      } else {
        this.__queue.unshift(vRequest);
      }

      this._check();

      if (this.getEnabled()) {
        this.__timer.start();
      }
    },


    /**
     * Remove the request from the pending requests queue.
     *
     *  The underlying transport of the request is forced into the aborted
     *  state ("aborted") and listeners of the "aborted"
     *  signal are notified about the event. If the request isn't in the
     *  pending requests queue, this method is a noop.
     *
     * @param vRequest {var} The request
     */
    abort : function(vRequest)
    {
      var vTransport = vRequest.getTransport();

      if (vTransport) {
        vTransport.abort();
      } else if (qx.lang.Array.contains(this.__queue, vRequest)) {
        qx.lang.Array.remove(this.__queue, vRequest);
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
    this._disposeArray("__active");
    this._disposeObjects("__timer");
    this.__queue = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman
     2006 STZ-IDA, Germany, http://www.stz-ida.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)
     * Andreas Junghans (lucidcake)

************************************************************************ */

/**
 * Transport layer to control which transport class (XmlHttp, Iframe or Script)
 * can be used.
 *
 * @use(qx.io.remote.transport.Iframe)
 * @use(qx.io.remote.transport.Script)
 * @internal
 */
qx.Class.define("qx.io.remote.Exchange",
{
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * Constructor method.
   *
   * @param vRequest {qx.io.remote.Request} request object
   */
  construct : function(vRequest)
  {
    this.base(arguments);

    this.setRequest(vRequest);
    vRequest.setTransport(this);
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events : {
    /** Fired whenever a request is send */
    "sending" : "qx.event.type.Event",

    /** Fired whenever a request is received */
    "receiving" : "qx.event.type.Event",

    /** Fired whenever a request is completed */
    "completed" : "qx.io.remote.Response",

    /** Fired whenever a request is aborted */
    "aborted" : "qx.event.type.Event",

    /** Fired whenever a request has failed */
    "failed" : "qx.io.remote.Response",

    /** Fired whenever a request has timed out */
    "timeout" : "qx.io.remote.Response"
  },



  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /* ************************************************************************
       Class data, properties and methods
    ************************************************************************ */

    /*
    ---------------------------------------------------------------------------
      TRANSPORT TYPE HANDLING
    ---------------------------------------------------------------------------
    */

    /**
     * Predefined order of types.
     *
     * @internal
     */
    typesOrder : [ "qx.io.remote.transport.XmlHttp", "qx.io.remote.transport.Iframe", "qx.io.remote.transport.Script" ],

    /**
     * Marker for initialized types.
     *
     * @internal
     */
    typesReady : false,

    /**
     * Map of all available types.
     *
     * @internal
     */
    typesAvailable : {},

    /**
     * Map of all supported types.
     *
     * @internal
     */
    typesSupported : {},


    /**
     * Registers a transport type.
     * At the moment one out of XmlHttp, Iframe or Script.
     *
     * @param vClass {Object} transport class
     * @param vId {String} unique id
     */
    registerType : function(vClass, vId) {
      qx.io.remote.Exchange.typesAvailable[vId] = vClass;
    },


    /**
     * Initializes the available type of transport classes and
     * checks for the supported ones.
     *
     * @throws {Error} an error if no supported transport type is available
     */
    initTypes : function()
    {
      if (qx.io.remote.Exchange.typesReady) {
        return;
      }

      for (var vId in qx.io.remote.Exchange.typesAvailable)
      {
        var vTransporterImpl = qx.io.remote.Exchange.typesAvailable[vId];

        if (vTransporterImpl.isSupported()) {
          qx.io.remote.Exchange.typesSupported[vId] = vTransporterImpl;
        }
      }

      qx.io.remote.Exchange.typesReady = true;

      if (qx.lang.Object.isEmpty(qx.io.remote.Exchange.typesSupported)) {
        throw new Error("No supported transport types were found!");
      }
    },


    /**
     * Checks which supported transport class can handle the request with the
     * given content type.
     *
     * @param vImpl {Object} transport implementation
     * @param vNeeds {Map} requirements for the request like e.g. "cross-domain"
     * @param vResponseType {String} content type
     * @return {Boolean} <code>true</code> if the transport implementation supports
     * the request's requirements
     */
    canHandle : function(vImpl, vNeeds, vResponseType)
    {
      if (!qx.lang.Array.contains(vImpl.handles.responseTypes, vResponseType)) {
        return false;
      }

      for (var vKey in vNeeds)
      {
        if (!vImpl.handles[vKey]) {
          return false;
        }
      }

      return true;
    },




    /*
    ---------------------------------------------------------------------------
      MAPPING
    ---------------------------------------------------------------------------
    */

    /**
     * http://msdn.microsoft.com/en-us/library/ie/ms534359%28v=vs.85%29.aspx
     *
     * 0: UNINITIALIZED
     * The object has been created, but not initialized (the open method has not been called).
     *
     * 1: LOADING
     * The object has been created, but the send method has not been called.
     *
     * 2: LOADED
     * The send method has been called, but the status and headers are not yet available.
     *
     * 3: INTERACTIVE
     * Some data has been received. Calling the responseBody and responseText properties at this state to obtain partial results will return an error, because status and response headers are not fully available.
     *
     * 4: COMPLETED
     * All the data has been received, and the complete data is available in the
     *
     * @internal
     */
    _nativeMap :
    {
      0 : "created",
      1 : "configured",
      2 : "sending",
      3 : "receiving",
      4 : "completed"
    },




    /*
    ---------------------------------------------------------------------------
      UTILS
    ---------------------------------------------------------------------------
    */

    /**
     * Called from the transport class when a request was completed.
     *
     * @param vStatusCode {Integer} status code of the request
     * @param vReadyState {String} readystate of the request
     * @param vIsLocal {Boolean} whether the request is a local one
     * @return {Boolean | var} Returns boolean value depending on the status code
     */
    wasSuccessful : function(vStatusCode, vReadyState, vIsLocal)
    {
      if (vIsLocal)
      {
        switch(vStatusCode)
        {
          case null:
          case 0:
            return true;

          case -1:
            // Not Available (OK for readystates: MSXML<4=1-3, MSXML>3=1-2, Gecko=1)
            return vReadyState < 4;

          default:
            // at least older versions of Safari don't set the status code for local file access
            return typeof vStatusCode === "undefined";
        }
      }
      else
      {
        switch(vStatusCode)
        {
          case -1: // Not Available (OK for readystates: MSXML<4=1-3, MSXML>3=1-2, Gecko=1)
            if (qx.core.Environment.get("qx.debug"))
            {
              if (qx.core.Environment.get("qx.debug.io.remote") && vReadyState > 3) {
                qx.log.Logger.debug(this, "Failed with statuscode: -1 at readyState " + vReadyState);
              }
            }

            return vReadyState < 4;

          case 200: // OK
          case 304: // Not Modified
            return true;

          case 201: // Created
          case 202: // Accepted
          case 203: // Non-Authoritative Information
          case 204: // No Content
          case 205: // Reset Content
            return true;

          case 206: // Partial Content
            if (qx.core.Environment.get("qx.debug"))
            {
              if (qx.core.Environment.get("qx.debug.io.remote") && vReadyState === 4) {
                qx.log.Logger.debug(this, "Failed with statuscode: 206 (Partial content while being complete!)");
              }
            }

            return vReadyState !== 4;

          case 300: // Multiple Choices
          case 301: // Moved Permanently
          case 302: // Moved Temporarily
          case 303: // See Other
          case 305: // Use Proxy
          case 400: // Bad Request
          case 401: // Unauthorized
          case 402: // Payment Required
          case 403: // Forbidden
          case 404: // Not Found
          case 405: // Method Not Allowed
          case 406: // Not Acceptable
          case 407: // Proxy Authentication Required
          case 408: // Request Time-Out
          case 409: // Conflict
          case 410: // Gone
          case 411: // Length Required
          case 412: // Precondition Failed
          case 413: // Request Entity Too Large
          case 414: // Request-URL Too Large
          case 415: // Unsupported Media Type
          case 500: // Server Error
          case 501: // Not Implemented
          case 502: // Bad Gateway
          case 503: // Out of Resources
          case 504: // Gateway Time-Out
          case 505: // HTTP Version not supported
            if (qx.core.Environment.get("qx.debug"))
            {
              if (qx.core.Environment.get("qx.debug.io.remote")) {
                qx.log.Logger.debug(this, "Failed with typical HTTP statuscode: " + vStatusCode);
              }
            }

            return false;


            // The following case labels are wininet.dll error codes that may
            // be encountered.

            // Server timeout
          case 12002:
            // Internet Name Not Resolved
          case 12007:
            // 12029 to 12031 correspond to dropped connections.
          case 12029:
          case 12030:
          case 12031:
            // Connection closed by server.
          case 12152:
            // See above comments for variable status.
          case 13030:
            if (qx.core.Environment.get("qx.debug"))
            {
              if (qx.core.Environment.get("qx.debug.io.remote")) {
                qx.log.Logger.debug(this, "Failed with MSHTML specific HTTP statuscode: " + vStatusCode);
              }
            }

            return false;

          default:
            // Handle all 20x status codes as OK as defined in the corresponding RFC
            // http://www.w3.org/Protocols/rfc2616/rfc2616.html
            if (vStatusCode > 206 && vStatusCode < 300) {
              return true;
            }

            qx.log.Logger.debug(this, "Unknown status code: " + vStatusCode + " (" + vReadyState + ")");
            return false;
        }
      }
    },


    /**
     * Status code to string conversion
     *
     * @param vStatusCode {Integer} request status code
     * @return {String} String presentation of status code
     */
    statusCodeToString : function(vStatusCode)
    {
      switch(vStatusCode)
      {
        case -1:
          return "Not available";

        case 0:
          // Attempt to generate a potentially meaningful error.
          // Get the current URL
          var url = window.location.href;

          // Are we on a local page obtained via file: protocol?
          if (qx.lang.String.startsWith(url.toLowerCase(), "file:"))
          {
            // Yup. Can't issue remote requests from here.
            return ("Unknown status code. " +
                    "Possibly due to application URL using 'file:' protocol?");
          }
          else
          {
            return ("Unknown status code. " +
                    "Possibly due to a cross-domain request?");
          }
          break;

        case 200:
          return "Ok";

        case 304:
          return "Not modified";

        case 206:
          return "Partial content";

        case 204:
          return "No content";

        case 300:
          return "Multiple choices";

        case 301:
          return "Moved permanently";

        case 302:
          return "Moved temporarily";

        case 303:
          return "See other";

        case 305:
          return "Use proxy";

        case 400:
          return "Bad request";

        case 401:
          return "Unauthorized";

        case 402:
          return "Payment required";

        case 403:
          return "Forbidden";

        case 404:
          return "Not found";

        case 405:
          return "Method not allowed";

        case 406:
          return "Not acceptable";

        case 407:
          return "Proxy authentication required";

        case 408:
          return "Request time-out";

        case 409:
          return "Conflict";

        case 410:
          return "Gone";

        case 411:
          return "Length required";

        case 412:
          return "Precondition failed";

        case 413:
          return "Request entity too large";

        case 414:
          return "Request-URL too large";

        case 415:
          return "Unsupported media type";

        case 500:
          return "Server error";

        case 501:
          return "Not implemented";

        case 502:
          return "Bad gateway";

        case 503:
          return "Out of resources";

        case 504:
          return "Gateway time-out";

        case 505:
          return "HTTP version not supported";

        case 12002:
          return "Server timeout";

        case 12029:
          return "Connection dropped";

        case 12030:
          return "Connection dropped";

        case 12031:
          return "Connection dropped";

        case 12152:
          return "Connection closed by server";

        case 13030:
          return "MSHTML-specific HTTP status code";

        default:
          return "Unknown status code";
      }
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Set the request to send with this transport. */
    request :
    {
      check : "qx.io.remote.Request",
      nullable : true
    },


    /**
     * Set the implementation to use to send the request with.
     *
     *  The implementation should be a subclass of qx.io.remote.transport.Abstract and
     *  must implement all methods in the transport API.
     */
    implementation :
    {
      check : "qx.io.remote.transport.Abstract",
      nullable : true,
      apply : "_applyImplementation"
    },

    /** Current state of the transport layer. */
    state :
    {
      check : [ "configured", "sending", "receiving", "completed", "aborted", "timeout", "failed" ],
      init : "configured",
      event : "changeState",
      apply : "_applyState"
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
      CORE METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Sends the request.
     *
     * @return {var | Boolean} Returns true if the request was sent.
     * @lint ignoreUnused(field)
     */
    send : function()
    {
      var vRequest = this.getRequest();

      if (!vRequest) {
        return this.error("Please attach a request object first");
      }

      qx.io.remote.Exchange.initTypes();

      var vUsage = qx.io.remote.Exchange.typesOrder;
      var vSupported = qx.io.remote.Exchange.typesSupported;

      // Mapping settings to contenttype and needs to check later
      // if the selected transport implementation can handle
      // fulfill these requirements.
      var vResponseType = vRequest.getResponseType();
      var vNeeds = {};

      if (vRequest.getAsynchronous()) {
        vNeeds.asynchronous = true;
      } else {
        vNeeds.synchronous = true;
      }

      if (vRequest.getCrossDomain()) {
        vNeeds.crossDomain = true;
      }

      if (vRequest.getFileUpload()) {
        vNeeds.fileUpload = true;
      }

      // See if there are any programtic form fields requested
      for (var field in vRequest.getFormFields())
      {
        // There are.
        vNeeds.programaticFormFields = true;

        // No need to search further
        break;
      }

      var vTransportImpl, vTransport;

      for (var i=0, l=vUsage.length; i<l; i++)
      {
        vTransportImpl = vSupported[vUsage[i]];

        if (vTransportImpl)
        {
          if (!qx.io.remote.Exchange.canHandle(vTransportImpl, vNeeds, vResponseType)) {
            continue;
          }

          try
          {
            if (qx.core.Environment.get("qx.debug"))
            {
              if (qx.core.Environment.get("qx.debug.io.remote")) {
                this.debug("Using implementation: " + vTransportImpl.classname);
              }
            }

            vTransport = new vTransportImpl;
            this.setImplementation(vTransport);

            vTransport.setUseBasicHttpAuth(vRequest.getUseBasicHttpAuth());

            vTransport.send();
            return true;
          }
          catch(ex)
          {
            this.error("Request handler throws error");
            this.error(ex);
            return false;
          }
        }
      }

      this.error("There is no transport implementation available to handle this request: " + vRequest);
    },


    /**
     * Force the transport into the aborted ("aborted")
     *  state.
     *
     */
    abort : function()
    {
      var vImplementation = this.getImplementation();

      if (vImplementation)
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.debug("Abort: implementation " + vImplementation.toHashCode());
          }
        }

        vImplementation.abort();
      }
      else
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.debug("Abort: forcing state to be aborted");
          }
        }

        this.setState("aborted");
      }
    },


    /**
     * Force the transport into the timeout state.
     *
     */
    timeout : function()
    {
      var vImplementation = this.getImplementation();

      if (vImplementation)
      {
        var str = "";
        for (var key in vImplementation.getParameters())
        {
          str += "&" + key + "=" + vImplementation.getParameters()[key];
        }
        this.warn("Timeout: implementation " + vImplementation.toHashCode() + ", "
                  + vImplementation.getUrl() + " [" + vImplementation.getMethod() + "], " + str);
        vImplementation.timeout();
      }
      else
      {
        this.warn("Timeout: forcing state to timeout");
        this.setState("timeout");
      }

      // Disable future timeouts in case user handler blocks
      this.__disableRequestTimeout();
    },


    /*
    ---------------------------------------------------------------------------
      PRIVATES
    ---------------------------------------------------------------------------
    */

    /**
     * Disables the timer of the request to prevent that the timer is expiring
     * even if the user handler (e.g. "completed") was already called.
     *
     */
    __disableRequestTimeout : function() {
      var vRequest = this.getRequest();
      if (vRequest) {
        vRequest.setTimeout(0);
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Event listener for "sending" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onsending : function(e) {
      this.setState("sending");
    },


    /**
     * Event listener for "receiving" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onreceiving : function(e) {
      this.setState("receiving");
    },


    /**
     * Event listener for "completed" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _oncompleted : function(e) {
      this.setState("completed");
    },


    /**
     * Event listener for "abort" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onabort : function(e) {
      this.setState("aborted");
    },


    /**
     * Event listener for "failed" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _onfailed : function(e) {
      this.setState("failed");
    },


    /**
     * Event listener for "timeout" event.
     *
     * @param e {qx.event.type.Event} event object
     */
    _ontimeout : function(e) {
      this.setState("timeout");
    },




    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    /**
     * Apply method for the implementation property.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyImplementation : function(value, old)
    {
      if (old)
      {
        old.removeListener("sending", this._onsending, this);
        old.removeListener("receiving", this._onreceiving, this);
        old.removeListener("completed", this._oncompleted, this);
        old.removeListener("aborted", this._onabort, this);
        old.removeListener("timeout", this._ontimeout, this);
        old.removeListener("failed", this._onfailed, this);
      }

      if (value)
      {
        var vRequest = this.getRequest();

        value.setUrl(vRequest.getUrl());
        value.setMethod(vRequest.getMethod());
        value.setAsynchronous(vRequest.getAsynchronous());

        value.setUsername(vRequest.getUsername());
        value.setPassword(vRequest.getPassword());

        value.setParameters(vRequest.getParameters(false));
        value.setFormFields(vRequest.getFormFields());
        value.setRequestHeaders(vRequest.getRequestHeaders());

        // Set the parseJson property which is currently only supported for XmlHttp transport
        // (which is the only transport supporting JSON parsing so far).
        if (value instanceof qx.io.remote.transport.XmlHttp){
          value.setParseJson(vRequest.getParseJson());
        }

        var data = vRequest.getData();
        if (data === null)
        {
          var vParameters = vRequest.getParameters(true);
          var vParametersList = [];

          for (var vId in vParameters)
          {
            var paramValue = vParameters[vId];

            if (paramValue instanceof Array)
            {
              for (var i=0; i<paramValue.length; i++)
              {
                vParametersList.push(encodeURIComponent(vId) +
                                     "=" +
                                     encodeURIComponent(paramValue[i]));
              }
            }
            else
            {
              vParametersList.push(encodeURIComponent(vId) +
                                   "=" +
                                   encodeURIComponent(paramValue));
            }
          }

          if (vParametersList.length > 0)
          {
            value.setData(vParametersList.join("&"));
          }
        }
        else
        {
          value.setData(data);
        }

        value.setResponseType(vRequest.getResponseType());

        value.addListener("sending", this._onsending, this);
        value.addListener("receiving", this._onreceiving, this);
        value.addListener("completed", this._oncompleted, this);
        value.addListener("aborted", this._onabort, this);
        value.addListener("timeout", this._ontimeout, this);
        value.addListener("failed", this._onfailed, this);
      }
    },


    /**
     * Apply method for the state property.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyState : function(value, old)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("State: " + old + " => " + value);
        }
      }

      switch(value)
      {
        case "sending":
          this.fireEvent("sending");
          break;

        case "receiving":
          this.fireEvent("receiving");
          break;

        case "completed":
        case "aborted":
        case "timeout":
        case "failed":
          var vImpl = this.getImplementation();

          if (!vImpl)
          {
            // implementation has already been disposed
            break;
          }


          // Disable future timeouts in case user handler blocks
          this.__disableRequestTimeout();

          if (this.hasListener(value))
          {
            var vResponse = qx.event.Registration.createEvent(value, qx.io.remote.Response);

            if (value == "completed")
            {
              var vContent = vImpl.getResponseContent();
              vResponse.setContent(vContent);

              /*
               * Was there acceptable content?  This might occur, for example, if
               * the web server was shut down unexpectedly and thus the connection
               * closed with no data having been sent.
               */

              if (vContent === null)
              {
                // Nope.  Change COMPLETED to FAILED.
                if (qx.core.Environment.get("qx.debug"))
                {
                  if (qx.core.Environment.get("qx.debug.io.remote")) {
                    this.debug("Altered State: " + value + " => failed");
                  }
                }

                value = "failed";
              }
            }
            else if (value == "failed")
            {
              vResponse.setContent(vImpl.getResponseContent());
            }

            vResponse.setStatusCode(vImpl.getStatusCode());
            vResponse.setResponseHeaders(vImpl.getResponseHeaders());

            this.dispatchEvent(vResponse);

          }

          // Disconnect and dispose implementation
          this.setImplementation(null);
          vImpl.dispose();

          // Fire event to listeners
          //this.fireDataEvent(vEventType, vResponse);

          break;
      }
    }
  },




  /*
  *****************************************************************************
     ENVIRONMENT SETTINGS
  *****************************************************************************
  */

  environment : {
    "qx.debug.io.remote"       : false,
    "qx.debug.io.remote.data"  : false
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    var vImpl = this.getImplementation();

    if (vImpl)
    {
      this.setImplementation(null);
      vImpl.dispose();
    }

    this.setRequest(null);
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
 * Abstract for all transport implementations
 */
qx.Class.define("qx.io.remote.transport.Abstract",
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

    this.setRequestHeaders({});
    this.setParameters({});
    this.setFormFields({});
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events : {
    /** Event when a request is created */
    "created" : "qx.event.type.Event",

    /** Event when a request is configured */
    "configured" : "qx.event.type.Event",

    /** Event when a request is send */
    "sending" : "qx.event.type.Event",

    /** Event when a request is received */
    "receiving" : "qx.event.type.Event",

    /** Event when a request is completed */
    "completed" : "qx.event.type.Event",

    /** Event when a request is aborted */
    "aborted" : "qx.event.type.Event",

    /** Event when a request has failed */
    "failed" : "qx.event.type.Event",

    /** Event when a request has timed out */
    "timeout" : "qx.event.type.Event"
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Target url to issue the request to */
    url :
    {
      check : "String",
      nullable : true
    },


    /** Determines what type of request to issue */
    method :
    {
      check : "String",
      nullable : true,
      init : "GET"
    },


    /** Set the request to asynchronous */
    asynchronous :
    {
      check : "Boolean",
      nullable : true,
      init : true
    },


    /** Set the data to be sent via this request */
    data :
    {
      check : "String",
      nullable : true
    },


    /** Username to use for HTTP authentication */
    username :
    {
      check : "String",
      nullable : true
    },


    /** Password to use for HTTP authentication */
    password :
    {
      check : "String",
      nullable : true
    },


    /** The state of the current request */
    state :
    {
      check : [ "created", "configured", "sending", "receiving", "completed", "aborted", "timeout", "failed" ],
      init : "created",
      event : "changeState",
      apply : "_applyState"
    },


    /** Request headers */
    requestHeaders :
    {
      check : "Object",
      nullable : true
    },


    /** Request parameters to send. */
    parameters :
    {
      check : "Object",
      nullable : true
    },


    /** Request form fields to send. */
    formFields :
    {
      check : "Object",
      nullable : true
    },


    /** Response Type */
    responseType :
    {
      check : "String",
      nullable : true
    },


    /** Use Basic HTTP Authentication */
    useBasicHttpAuth :
    {
      check : "Boolean",
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
    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Sending a request.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @throws {Error} the abstract function warning.
     */
    send : function() {
      throw new Error("send is abstract");
    },


    /**
     * Force the transport into the aborted state ("aborted").
     *
     * Listeners of the "aborted" signal are notified about the event.
     *
     */
    abort : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.warn("Aborting...");
        }
      }

      this.setState("aborted");
    },


    /**
     * Force the transport into the timeout state ("timeout").
     *
     * Listeners of the "timeout" signal are notified about the event.
     *
     */
    timeout : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.warn("Timeout...");
        }
      }

      this.setState("timeout");
    },


    /**
     * Force the transport into the failed state ("failed").
     *
     * Listeners of the "failed" signal are notified about the event.
     *
     */
    failed : function()
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.warn("Failed...");
        }
      }

      this.setState("failed");
    },




    /*
    ---------------------------------------------------------------------------
      REQUEST HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Add a request header to this transports qx.io.remote.Request.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @param vLabel {String} Request header name
     * @param vValue {var} Value for the header
     * @throws {Error} the abstract function warning.
     */
    setRequestHeader : function(vLabel, vValue) {
      throw new Error("setRequestHeader is abstract");
    },




    /*
    ---------------------------------------------------------------------------
      RESPONSE HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the request header of the request.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @param vLabel {String} Response header name
     * @return {Object}
     * @throws {Error} the abstract function warning.
     */
    getResponseHeader : function(vLabel) {
      throw new Error("getResponseHeader is abstract");
    },


    /**
     * Provides an hash of all response headers.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {Object}
     * @throws {Error} the abstract function warning.
     */
    getResponseHeaders : function() {
      throw new Error("getResponseHeaders is abstract");
    },




    /*
    ---------------------------------------------------------------------------
      STATUS SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the current status code of the request if available or -1 if not.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {Integer}
     * @throws {Error} the abstract function warning.
     */
    getStatusCode : function() {
      throw new Error("getStatusCode is abstract");
    },


    /**
     * Provides the status text for the current request if available and null otherwise.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {String}
     * @throws {Error} the abstract function warning.
     */
    getStatusText : function() {
      throw new Error("getStatusText is abstract");
    },




    /*
    ---------------------------------------------------------------------------
      RESPONSE DATA SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Provides the response text from the request when available and null otherwise.
     * By passing true as the "partial" parameter of this method, incomplete data will
     * be made available to the caller.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {String}
     * @throws {Error} the abstract function warning.
     */
    getResponseText : function() {
      throw new Error("getResponseText is abstract");
    },


    /**
     * Provides the XML provided by the response if any and null otherwise.
     * By passing true as the "partial" parameter of this method, incomplete data will
     * be made available to the caller.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {Object}
     * @throws {Error} the abstract function warning.
     */
    getResponseXml : function() {
      throw new Error("getResponseXml is abstract");
    },


    /**
     * Returns the length of the content as fetched thus far.
     *
     * This method is virtual and concrete subclasses are supposed to
     * implement it.
     *
     * @abstract
     * @return {Integer}
     * @throws {Error} the abstract function warning.
     */
    getFetchedLength : function() {
      throw new Error("getFetchedLength is abstract");
    },




    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    /**
     * Apply method for "state" property. For each state value a corresponding
     * event is fired to inform the listeners.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyState : function(value, old)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("State: " + value);
        }
      }

      switch(value)
      {
        case "created":
          this.fireEvent("created");
          break;

        case "configured":
          this.fireEvent("configured");
          break;

        case "sending":
          this.fireEvent("sending");
          break;

        case "receiving":
          this.fireEvent("receiving");
          break;

        case "completed":
          this.fireEvent("completed");
          break;

        case "aborted":
          this.fireEvent("aborted");
          break;

        case "failed":
          this.fireEvent("failed");
          break;

        case "timeout":
          this.fireEvent("timeout");
          break;
      }

      return true;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.setRequestHeaders(null);
    this.setParameters(null);
    this.setFormFields(null);
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman
     2006 STZ-IDA, Germany, http://www.stz-ida.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)
     * Andreas Junghans (lucidcake)

************************************************************************ */

/* ************************************************************************


************************************************************************ */

/**
 * Transports requests to a server using an IFRAME.
 *
 * This class should not be used directly by client programmers.
 *
 * @asset(qx/static/blank.gif)
 */
qx.Class.define("qx.io.remote.transport.Iframe",
{
  extend : qx.io.remote.transport.Abstract,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    // Unique identifiers for iframe and form
    var vUniqueId = (new Date).valueOf();
    var vFrameName = "frame_" + vUniqueId;
    var vFormName = "form_" + vUniqueId;

    // This is to prevent the "mixed secure and insecure content" warning in IE with https
    var vFrameSource;
    if ((qx.core.Environment.get("engine.name") == "mshtml")) {
      vFrameSource = "javascript:void(0)";
    }

    // Create a hidden iframe.
    // The purpose of the iframe is to receive data coming back from the server (see below).
    this.__frame = qx.bom.Iframe.create({id: vFrameName, name: vFrameName, src: vFrameSource});

    qx.bom.element.Style.set(this.__frame, "display", "none");

    // Create form element with textarea as conduit for request data.
    // The target of the form is the hidden iframe, which means the response
    // coming back from the server is written into the iframe.
    this.__form = qx.dom.Element.create("form", {id: vFormName, name: vFormName, target: vFrameName});
    qx.bom.element.Style.set(this.__form, "display", "none");
    qx.dom.Element.insertEnd(this.__form, qx.dom.Node.getBodyElement(document));

    this.__data = qx.dom.Element.create("textarea", {id: "_data_", name: "_data_"});
    qx.dom.Element.insertEnd(this.__data, this.__form);

    // Finally, attach iframe to DOM and add listeners
    qx.dom.Element.insertEnd(this.__frame, qx.dom.Node.getBodyElement(document));
    qx.event.Registration.addListener(this.__frame, "load", this._onload, this);

    // qx.event.handler.Iframe does not yet support the readystatechange event
    this.__onreadystatechangeWrapper = qx.lang.Function.listener(this._onreadystatechange, this);
    qx.bom.Event.addNativeListener(this.__frame, "readystatechange", this.__onreadystatechangeWrapper);
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Capabilities of this transport type.
     *
     * @internal
     */
    handles :
    {
      synchronous           : false,
      asynchronous          : true,
      crossDomain           : false,
      fileUpload            : true,
      programaticFormFields : true,
      responseTypes         : [ "text/plain", "text/javascript", "application/json", "application/xml", "text/html" ]
    },


    /**
     * Returns always true, because iframe transport is supported by all browsers.
     *
     * @return {Boolean}
     */
    isSupported : function() {
      return true;
    },




    /*
    ---------------------------------------------------------------------------
      EVENT LISTENER
    ---------------------------------------------------------------------------
    */

    /**
     * For reference:
     * http://msdn.microsoft.com/en-us/library/ie/ms534359%28v=vs.85%29.aspx
     *
     * @internal
     */
    _numericMap :
    {
      "uninitialized" : 1,
      "loading"       : 2,
      "loaded"        : 2,
      "interactive"   : 3,
      "complete"      : 4
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __data : null,
    __lastReadyState : 0,
    __form : null,
    __frame : null,
    __onreadystatechangeWrapper : null,

    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Sends a request with the use of a form.
     *
     */
    send : function()
    {
      var vMethod = this.getMethod();
      var vUrl = this.getUrl();

      // --------------------------------------
      //   Adding parameters
      // --------------------------------------
      var vParameters = this.getParameters(false);
      var vParametersList = [];

      for (var vId in vParameters)
      {
        var value = vParameters[vId];

        if (value instanceof Array)
        {
          for (var i=0; i<value.length; i++) {
            vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value[i]));
          }
        }
        else
        {
          vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value));
        }
      }

      if (vParametersList.length > 0) {
        vUrl += (vUrl.indexOf("?") >= 0 ? "&" : "?") + vParametersList.join("&");
      }

      // --------------------------------------------------------
      //   Adding data parameters (if no data is already present)
      // --------------------------------------------------------
      if (this.getData() === null)
      {
        var vParameters = this.getParameters(true);
        var vParametersList = [];

        for (var vId in vParameters)
        {
          var value = vParameters[vId];

          if (value instanceof Array)
          {
            for (var i=0; i<value.length; i++)
            {
              vParametersList.push(encodeURIComponent(vId) +
                                   "=" +
                                   encodeURIComponent(value[i]));
            }
          }
          else
          {
            vParametersList.push(encodeURIComponent(vId) +
                                 "=" +
                                 encodeURIComponent(value));
          }
        }

        if (vParametersList.length > 0)
        {
          this.setData(vParametersList.join("&"));
        }
      }

      // --------------------------------------
      //   Adding form fields
      // --------------------------------------
      var vFormFields = this.getFormFields();

      for (var vId in vFormFields)
      {
        var vField = document.createElement("textarea");
        vField.name = vId;
        vField.appendChild(document.createTextNode(vFormFields[vId]));
        this.__form.appendChild(vField);
      }

      // --------------------------------------
      //   Preparing form
      // --------------------------------------
      this.__form.action = vUrl;
      this.__form.method = vMethod;

      // --------------------------------------
      //   Sending data
      // --------------------------------------
      this.__data.appendChild(document.createTextNode(this.getData()));
      this.__form.submit();
      this.setState("sending");
    },


    /**
     * Converting complete state to numeric value and update state property
     *
     * @signature function(e)
     * @param e {qx.event.type.Event} event object
     */
    _onload : qx.event.GlobalError.observeMethod(function(e)
    {

      // Timing-issue in Opera
      // Do not switch state to complete in case load event fires before content
      // of iframe was updated
      if (qx.core.Environment.get("engine.name") == "opera" && this.getIframeHtmlContent() == "") {
        return;
      }

      if (this.__form.src) {
        return;
      }

      this._switchReadyState(qx.io.remote.transport.Iframe._numericMap.complete);
    }),


    /**
     * Converting named readyState to numeric value and update state property
     *
     * @signature function(e)
     * @param e {qx.event.type.Event} event object
     */
    _onreadystatechange : qx.event.GlobalError.observeMethod(function(e) {
      this._switchReadyState(qx.io.remote.transport.Iframe._numericMap[this.__frame.readyState]);
    }),


    /**
     * Switches the readystate by setting the internal state.
     *
     * @param vReadyState {String} readystate value
     */
    _switchReadyState : function(vReadyState)
    {
      // Ignoring already stopped requests
      switch(this.getState())
      {
        case "completed":
        case "aborted":
        case "failed":
        case "timeout":
          this.warn("Ignore Ready State Change");
          return;
      }

      // Updating internal state
      while (this.__lastReadyState < vReadyState) {
        this.setState(qx.io.remote.Exchange._nativeMap[++this.__lastReadyState]);
      }
    },




    /*
    ---------------------------------------------------------------------------
      REQUEST HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Sets a request header with the given value.
     *
     * This method is not implemented at the moment.
     *
     * @param vLabel {String} request header name
     * @param vValue {var} request header value
     */
    setRequestHeader : function(vLabel, vValue) {},


    /*
    ---------------------------------------------------------------------------
      RESPONSE HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the value of the given response header.
     *
     * This method is not implemented at the moment and returns always "null".
     *
     * @param vLabel {String} Response header name
     * @return {null} Returns null
     */
    getResponseHeader : function(vLabel) {
      return null;
    },

    /**
     * Provides an hash of all response headers.
     *
     * This method is not implemented at the moment and returns an empty map.
     *
     * @return {Map} empty map
     */
    getResponseHeaders : function() {
      return {};
    },

    /*
    ---------------------------------------------------------------------------
      STATUS SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the current status code of the request if available or -1 if not.
     * This method needs implementation (returns always 200).
     *
     * @return {Integer} status code
     */
    getStatusCode : function() {
      return 200;
    },

    /**
     * Provides the status text for the current request if available and null otherwise.
     * This method needs implementation (returns always an empty string)
     *
     * @return {String} status code text
     */
    getStatusText : function() {
      return "";
    },

    /*
    ---------------------------------------------------------------------------
      FRAME UTILITIES
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the DOM window object of the used iframe.
     *
     * @return {Object} DOM window object
     */
    getIframeWindow : function() {
      return qx.bom.Iframe.getWindow(this.__frame);
    },


    /**
     * Returns the document node of the used iframe.
     *
     * @return {Object} document node
     */
    getIframeDocument : function() {
      return qx.bom.Iframe.getDocument(this.__frame);
    },


    /**
     * Returns the body node of the used iframe.
     *
     * @return {Object} body node
     */
    getIframeBody : function() {
      return qx.bom.Iframe.getBody(this.__frame);
    },




    /*
    ---------------------------------------------------------------------------
      RESPONSE DATA SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the iframe content (innerHTML) as text.
     *
     * @return {String} iframe content as text
     */
    getIframeTextContent : function()
    {
      var vBody = this.getIframeBody();

      if (!vBody) {
        return null;
      }

      if (!vBody.firstChild) {
        return "";
      }

      // Mshtml returns the content inside a PRE
      // element if we use plain text
      if (vBody.firstChild.tagName &&
          vBody.firstChild.tagName.toLowerCase() == "pre") {
        return vBody.firstChild.innerHTML;
      } else {
        return vBody.innerHTML;
      }
    },


    /**
     * Returns the iframe content as HTML.
     *
     * @return {String} iframe content as HTML
     */
    getIframeHtmlContent : function()
    {
      var vBody = this.getIframeBody();
      return vBody ? vBody.innerHTML : null;
    },


    /**
     * Returns the length of the content as fetched thus far.
     * This method needs implementation (returns always 0).
     *
     * @return {Integer} Returns 0
     */
    getFetchedLength : function() {
      return 0;
    },

    /**
     * Returns the content of the response
     *
     * @return {null | String} null or text of the response (=iframe content).
     */
    getResponseContent : function()
    {
      if (this.getState() !== "completed")
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.warn("Transfer not complete, ignoring content!");
          }
        }

        return null;
      }

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("Returning content for responseType: " + this.getResponseType());
        }
      }

      var vText = this.getIframeTextContent();

      switch(this.getResponseType())
      {
        case "text/plain":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }
          return vText;

        case "text/html":
          vText = this.getIframeHtmlContent();
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }
          return vText;

        case "application/json":
          vText = this.getIframeHtmlContent();
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }

          try {
            return vText && vText.length > 0 ? qx.lang.Json.parse(vText) : null;
          } catch(ex) {
            return this.error("Could not execute json: (" + vText + ")", ex);
          }

        case "text/javascript":
          vText = this.getIframeHtmlContent();
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }

          try {
            return vText && vText.length > 0 ? window.eval(vText) : null;
          } catch(ex) {
            return this.error("Could not execute javascript: (" + vText + ")", ex);
          }

        case "application/xml":
          vText = this.getIframeDocument();
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }
          return vText;

        default:
          this.warn("No valid responseType specified (" + this.getResponseType() + ")!");
          return null;
      }
    }
  },



  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function()
  {
    // basic registration to qx.io.remote.Exchange
    // the real availability check (activeX stuff and so on) follows at the first real request
    qx.io.remote.Exchange.registerType(qx.io.remote.transport.Iframe, "qx.io.remote.transport.Iframe");
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (this.__frame)
    {
      qx.event.Registration.removeListener(this.__frame, "load", this._onload, this);
      qx.bom.Event.removeNativeListener(this.__frame, "readystatechange", this.__onreadystatechangeWrapper);

      // Reset source to a blank image for gecko
      // Otherwise it will switch into a load-without-end behaviour
      if ((qx.core.Environment.get("engine.name") == "gecko")) {
        this.__frame.src = qx.util.ResourceManager.getInstance().toUri("qx/static/blank.gif");
      }

      // Finally, remove element node
      qx.dom.Element.remove(this.__frame);
    }

    if (this.__form) {
      qx.dom.Element.remove(this.__form);
    }

    this.__frame = this.__form = this.__data = null;
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
 * This handler provides a "load" event for iframes
 */
qx.Class.define("qx.event.handler.Iframe",
{
  extend : qx.core.Object,
  implement : qx.event.IEventHandler,





  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** @type {Integer} Priority of this handler */
    PRIORITY : qx.event.Registration.PRIORITY_NORMAL,

    /** @type {Map} Supported event types */
    SUPPORTED_TYPES : {
      load: 1,
      navigate: 1
    },

    /** @type {Integer} Which target check to use */
    TARGET_CHECK : qx.event.IEventHandler.TARGET_DOMNODE,

    /** @type {Integer} Whether the method "canHandleEvent" must be called */
    IGNORE_CAN_HANDLE : false,

    /**
     * Internal function called by iframes created using {@link qx.bom.Iframe}.
     *
     * @signature function(target)
     * @internal
     * @param target {Element} DOM element which is the target of this event
     */
    onevent : qx.event.GlobalError.observeMethod(function(target) {

      // Fire navigate event when actual URL diverges from stored URL
      var currentUrl = qx.bom.Iframe.queryCurrentUrl(target);

      if (currentUrl !== target.$$url) {
        qx.event.Registration.fireEvent(target, "navigate", qx.event.type.Data, [currentUrl]);
        target.$$url = currentUrl;
      }

      // Always fire load event
      qx.event.Registration.fireEvent(target, "load");
    })
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
      EVENT HANDLER INTERFACE
    ---------------------------------------------------------------------------
    */

    // interface implementation
    canHandleEvent : function(target, type) {
      return target.tagName.toLowerCase() === "iframe"
    },


    // interface implementation
    registerEvent : function(target, type, capture) {
      // Nothing needs to be done here
    },


    // interface implementation
    unregisterEvent : function(target, type, capture) {
      // Nothing needs to be done here
    }


  },





  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function(statics) {
    qx.event.Registration.addHandler(statics);
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
     * Christian Hagendorn (Chris_schmidt)

************************************************************************ */

/**
 * Cross browser abstractions to work with iframes.
 *
 * @require(qx.event.handler.Iframe)
 */
qx.Class.define("qx.bom.Iframe",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * @type {Map} Default attributes for creation {@link #create}.
     */
    DEFAULT_ATTRIBUTES :
    {
      onload : "qx.event.handler.Iframe.onevent(this)",
      frameBorder: 0,
      frameSpacing: 0,
      marginWidth: 0,
      marginHeight: 0,
      hspace: 0,
      vspace: 0,
      border: 0,
      allowTransparency: true
    },

    /**
     * Creates an DOM element.
     *
     * Attributes may be given directly with this call. This is critical
     * for some attributes e.g. name, type, ... in many clients.
     *
     * @param attributes {Map?null} Map of attributes to apply
     * @param win {Window?null} Window to create the element for
     * @return {Element} The created iframe node
     */
    create : function(attributes, win)
    {
      // Work on a copy to not modify given attributes map
      var attributes = attributes ? qx.lang.Object.clone(attributes) : {};
      var initValues = qx.bom.Iframe.DEFAULT_ATTRIBUTES;

      for (var key in initValues)
      {
        if (attributes[key] == null) {
          attributes[key] = initValues[key];
        }
      }

      return qx.dom.Element.create("iframe", attributes, win);
    },


    /**
     * Get the DOM window object of an iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Window?null} The DOM window object of the iframe or null.
     * @signature function(iframe)
     */
    getWindow : function(iframe)
    {
      try {
        return iframe.contentWindow;
      } catch(ex) {
        return null;
      }
    },


    /**
     * Get the DOM document object of an iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Document} The DOM document object of the iframe.
     */
    getDocument : function(iframe)
    {
      if ("contentDocument" in iframe) {
        try {
          return iframe.contentDocument;
        } catch(ex) {
          return null;
        }
      }

      try {
        var win = this.getWindow(iframe);
        return win ? win.document : null;
      } catch(ex) {
        return null;
      }
    },


    /**
     * Get the HTML body element of the iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Element} The DOM node of the <code>body</code> element of the iframe.
     */
    getBody : function(iframe)
    {
      try
      {
        var doc = this.getDocument(iframe);
        return doc ? doc.getElementsByTagName("body")[0] : null;
      }
      catch(ex)
      {
        return null
      }
    },


    /**
     * Sets iframe's source attribute to given value
     *
     * @param iframe {Element} DOM element of the iframe.
     * @param source {String} URL to be set.
     * @signature function(iframe, source)
     */
    setSource : function(iframe, source)
    {
      try
      {
        // the guru says ...
        // it is better to use 'replace' than 'src'-attribute, since 'replace'
        // does not interfere with the history (which is taken care of by the
        // history manager), but there has to be a loaded document
        if (this.getWindow(iframe) && qx.dom.Hierarchy.isRendered(iframe))
        {
          /*
            Some gecko users might have an exception here:
            Exception... "Component returned failure code: 0x805e000a
            [nsIDOMLocation.replace]"  nsresult: "0x805e000a (<unknown>)"
          */
          try
          {
            // Webkit on Mac can't set the source when the iframe is still
            // loading its current page
            if ((qx.core.Environment.get("engine.name") == "webkit") &&
                qx.core.Environment.get("os.name") == "osx")
            {
              var contentWindow = this.getWindow(iframe);
              if (contentWindow) {
                contentWindow.stop();
              }
            }
            this.getWindow(iframe).location.replace(source);
          }
          catch(ex)
          {
            iframe.src = source;
          }
        }
        else
        {
          iframe.src = source;
        }

      // This is a programmer provided source. Remember URL for this source
      // for later comparison with current URL. The current URL can diverge
      // if the end-user navigates in the Iframe.
      this.__rememberUrl(iframe);

      }
      catch(ex) {
        qx.log.Logger.warn("Iframe source could not be set!");
      }
    },


    /**
     * Returns the current (served) URL inside the iframe
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {String} Returns the location href or null (if a query is not possible/allowed)
     */
    queryCurrentUrl : function(iframe)
    {
      var doc = this.getDocument(iframe);

      try
      {
        if (doc && doc.location) {
          return doc.location.href;
        }
      }
      catch(ex) {};

      return "";
    },


    /**
    * Remember actual URL of iframe.
    *
    * @param iframe {Element} DOM element of the iframe.
    */
    __rememberUrl: function(iframe)
    {

      // URL can only be detected after load. Retrieve and store URL once.
      var callback = function() {
        qx.bom.Event.removeNativeListener(iframe, "load", callback);
        iframe.$$url = qx.bom.Iframe.queryCurrentUrl(iframe);
      }

      qx.bom.Event.addNativeListener(iframe, "load", callback);
    }

  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman
     2006 STZ-IDA, Germany, http://www.stz-ida.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)
     * Andreas Junghans (lucidcake)

************************************************************************ */

/**
 * Transports requests to a server using dynamic script tags.
 *
 * This class should not be used directly by client programmers.
 */
qx.Class.define("qx.io.remote.transport.Script",
{
  extend : qx.io.remote.transport.Abstract,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    var vUniqueId = ++qx.io.remote.transport.Script.__uniqueId;

    if (vUniqueId >= 2000000000) {
      qx.io.remote.transport.Script.__uniqueId = vUniqueId = 1;
    }

    this.__element = null;
    this.__uniqueId = vUniqueId;
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Unique identifier for each instance.
     *
     * @internal
     */
    __uniqueId : 0,

    /**
     * Registry for all script transport instances.
     *
     * @internal
     */
    _instanceRegistry : {},

    /**
     * Internal URL parameter prefix.
     *
     * @internal
     */
    ScriptTransport_PREFIX : "_ScriptTransport_",

    /**
     * Internal URL parameter ID.
     *
     * @internal
     */
    ScriptTransport_ID_PARAM : "_ScriptTransport_id",

    /**
     * Internal URL parameter data prefix.
     *
     * @internal
     */
    ScriptTransport_DATA_PARAM : "_ScriptTransport_data",

    /**
     * Capabilities of this transport type.
     *
     * @internal
     */
    handles :
    {
      synchronous           : false,
      asynchronous          : true,
      crossDomain           : true,
      fileUpload            : false,
      programaticFormFields : false,
      responseTypes         : [ "text/plain", "text/javascript", "application/json" ]
    },


    /**
     * Returns always true, because script transport is supported by all browsers.
     * @return {Boolean} <code>true</code>
     */
    isSupported : function() {
      return true;
    },




    /*
    ---------------------------------------------------------------------------
      EVENT LISTENER
    ---------------------------------------------------------------------------
    */

    /**
     * For reference:
     * http://msdn.microsoft.com/en-us/library/ie/ms534359%28v=vs.85%29.aspx
     *
     * @internal
     */
    _numericMap :
    {
      "uninitialized" : 1,
      "loading"       : 2,
      "loaded"        : 2,
      "interactive"   : 3,
      "complete"      : 4
    },


    /**
     * This method can be called by the script loaded by the ScriptTransport
     * class.
     *
     * @signature function(id, content)
     * @param id {String} Id of the corresponding transport object,
     *     which is passed as an URL parameter to the server an
     * @param content {String} This string is passed to the content property
     *     of the {@link qx.io.remote.Response} object.
     */
    _requestFinished : qx.event.GlobalError.observeMethod(function(id, content)
    {
      var vInstance = qx.io.remote.transport.Script._instanceRegistry[id];

      if (vInstance == null)
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.warn("Request finished for an unknown instance (probably aborted or timed out before)");
          }
        }
      }
      else
      {
        vInstance._responseContent = content;
        vInstance._switchReadyState(qx.io.remote.transport.Script._numericMap.complete);
      }
    })
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __lastReadyState : 0,
    __element : null,
    __uniqueId : null,

    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Sends the request using "script" elements
     *
     */
    send : function()
    {
      var vUrl = this.getUrl();

      // --------------------------------------
      //   Adding parameters
      // --------------------------------------
      vUrl += (vUrl.indexOf("?") >= 0 ? "&" : "?") + qx.io.remote.transport.Script.ScriptTransport_ID_PARAM + "=" + this.__uniqueId;

      var vParameters = this.getParameters();
      var vParametersList = [];

      for (var vId in vParameters)
      {
        if (vId.indexOf(qx.io.remote.transport.Script.ScriptTransport_PREFIX) == 0) {
          this.error("Illegal parameter name. The following prefix is used internally by qooxdoo): " + qx.io.remote.transport.Script.ScriptTransport_PREFIX);
        }

        var value = vParameters[vId];

        if (value instanceof Array)
        {
          for (var i=0; i<value.length; i++) {
            vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value[i]));
          }
        }
        else
        {
          vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value));
        }
      }

      if (vParametersList.length > 0) {
        vUrl += "&" + vParametersList.join("&");
      }

      // --------------------------------------
      //   Sending data
      // --------------------------------------
      var vData = this.getData();

      if (vData != null) {
        vUrl += "&" + qx.io.remote.transport.Script.ScriptTransport_DATA_PARAM + "=" + encodeURIComponent(vData);
      }

      qx.io.remote.transport.Script._instanceRegistry[this.__uniqueId] = this;
      this.__element = document.createElement("script");

      // IE needs this (it ignores the
      // encoding from the header sent by the
      // server for dynamic script tags)
      this.__element.charset = "utf-8";
      this.__element.src = vUrl;

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote.data"))
        {
          this.debug("Request: " + vUrl);
        }
      }

      document.body.appendChild(this.__element);
    },


    /**
     * Switches the readystate by setting the internal state.
     *
     * @param vReadyState {String} readystate value
     */
    _switchReadyState : function(vReadyState)
    {
      // Ignoring already stopped requests
      switch(this.getState())
      {
        case "completed":
        case "aborted":
        case "failed":
        case "timeout":
          this.warn("Ignore Ready State Change");
          return;
      }

      // Updating internal state
      while (this.__lastReadyState < vReadyState) {
        this.setState(qx.io.remote.Exchange._nativeMap[++this.__lastReadyState]);
      }
    },




    /*
    ---------------------------------------------------------------------------
      REQUEST HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Sets a request header with the given value.
     *
     * This method is not implemented at the moment.
     *
     * @param vLabel {String} Request header name
     * @param vValue {var} Request header value
     */
    setRequestHeader : function(vLabel, vValue) {},

    /*
    ---------------------------------------------------------------------------
      RESPONSE HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the value of the given response header.
     *
     * This method is not implemented at the moment and returns always "null".
     *
     * @param vLabel {String} Response header name
     * @return {null} Returns null
     */
    getResponseHeader : function(vLabel) {
      return null;
    },

    /**
     * Provides an hash of all response headers.
     *
     * This method is not implemented at the moment and returns an empty map.
     *
     * @return {Map} empty map
     */
    getResponseHeaders : function() {
      return {};
    },

    /*
    ---------------------------------------------------------------------------
      STATUS SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the current status code of the request if available or -1 if not.
     * This method needs implementation (returns always 200).
     *
     * @return {Integer} status code
     */
    getStatusCode : function() {
      return 200;
    },

    /**
     * Provides the status text for the current request if available and null otherwise.
     * This method needs implementation (returns always an empty string)
     *
     * @return {String} always an empty string.
     */
    getStatusText : function() {
      return "";
    },

    /*
    ---------------------------------------------------------------------------
      RESPONSE DATA SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the length of the content as fetched thus far.
     * This method needs implementation (returns always 0).
     *
     * @return {Integer} Returns 0
     */
    getFetchedLength : function() {
      return 0;
    },

    /**
     * Returns the content of the response.
     *
     * @return {null | String} If successful content of response as string.
     */
    getResponseContent : function()
    {
      if (this.getState() !== "completed")
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.warn("Transfer not complete, ignoring content!");
          }
        }

        return null;
      }

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("Returning content for responseType: " + this.getResponseType());
        }
      }

      switch(this.getResponseType())
      {
        case "text/plain":
          // server is responsible for using a string as the response
        case "application/json":
        case "text/javascript":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + this._responseContent);
            }
          }
          var ret = this._responseContent;
          return (ret === 0 ? 0 : (ret || null));

        default:
          this.warn("No valid responseType specified (" + this.getResponseType() + ")!");
          return null;
      }
    }
  },



  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function()
  {
    // basic registration to qx.io.remote.Exchange
    // the real availability check (activeX stuff and so on) follows at the first real request
    qx.io.remote.Exchange.registerType(qx.io.remote.transport.Script, "qx.io.remote.transport.Script");
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (this.__element)
    {
      delete qx.io.remote.transport.Script._instanceRegistry[this.__uniqueId];
      document.body.removeChild(this.__element);
    }

    this.__element = this._responseContent = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de
     2006 Derrell Lipman

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Derrell Lipman (derrell)

************************************************************************ */

/**
 * Transports requests to a server using the native XmlHttpRequest object.
 *
 * This class should not be used directly by client programmers.
 */
qx.Class.define("qx.io.remote.transport.XmlHttp",
{
  extend : qx.io.remote.transport.Abstract,


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Capabilities of this transport type.
     *
     * @internal
     */
    handles :
    {
      synchronous           : true,
      asynchronous          : true,
      crossDomain           : false,
      fileUpload            : false,
      programaticFormFields : false,
      responseTypes         : [ "text/plain", "text/javascript", "application/json", "application/xml", "text/html" ]
    },


    /**
     * Return a new XMLHttpRequest object suitable for the client browser.
     *
     * @return {Object} native XMLHttpRequest object
     * @signature function()
     */
    createRequestObject : qx.core.Environment.select("engine.name",
    {
      "default" : function() {
        return new XMLHttpRequest;
      },

      // IE7's native XmlHttp does not care about trusted zones. To make this
      // work in the localhost scenario, you can use the following registry setting:
      //
      // [HKEY_CURRENT_USER\Software\Microsoft\Internet Explorer\Main\
      // FeatureControl\FEATURE_XMLHTTP_RESPECT_ZONEPOLICY]
      // "Iexplore.exe"=dword:00000001
      //
      // Generally it seems that the ActiveXObject is more stable. jQuery
      // seems to use it always. We prefer the ActiveXObject for the moment, but allow
      // fallback to XMLHTTP if ActiveX is disabled.
      "mshtml" : function()
      {
        if (window.ActiveXObject && qx.xml.Document.XMLHTTP) {
          return new ActiveXObject(qx.xml.Document.XMLHTTP);
        }

        if (window.XMLHttpRequest) {
          return new XMLHttpRequest;
        }
      }
    }),


    /**
     * Whether the transport type is supported by the client.
     *
     * @return {Boolean} supported or not
     */
    isSupported : function() {
      return !!this.createRequestObject();
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
     * If true and the responseType property is set to "application/json", getResponseContent() will
     * return a Javascript map containing the JSON contents, i. e. the result qx.lang.Json.parse().
     * If false, the raw string data will be returned and the parsing must be done manually.
     * This is usefull for special JSON dialects / extensions which are not supported by
     * qx.lang.Json.
     */
    parseJson :
    {
      check : "Boolean",
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
      CORE METHODS
    ---------------------------------------------------------------------------
    */

    __localRequest : false,
    __lastReadyState : 0,
    __request : null,


    /**
     * Returns the native request object
     *
     * @return {Object} native XmlHTTPRequest object
     */
    getRequest : function()
    {
      if (this.__request === null)
      {
        this.__request = qx.io.remote.transport.XmlHttp.createRequestObject();
        this.__request.onreadystatechange = qx.lang.Function.bind(this._onreadystatechange, this);
      }

      return this.__request;
    },




    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Implementation for sending the request
     *
     */
    send : function()
    {
      this.__lastReadyState = 0;

      var vRequest = this.getRequest();
      var vMethod = this.getMethod();
      var vAsynchronous = this.getAsynchronous();
      var vUrl = this.getUrl();

      // --------------------------------------
      //   Local handling
      // --------------------------------------
      var vLocalRequest = (window.location.protocol === "file:" && !(/^http(s){0,1}\:/.test(vUrl)));
      this.__localRequest = vLocalRequest;

      // --------------------------------------
      //   Adding URL parameters
      // --------------------------------------
      var vParameters = this.getParameters(false);
      var vParametersList = [];

      for (var vId in vParameters)
      {
        var value = vParameters[vId];

        if (value instanceof Array)
        {
          for (var i=0; i<value.length; i++) {
            vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value[i]));
          }
        }
        else
        {
          vParametersList.push(encodeURIComponent(vId) + "=" + encodeURIComponent(value));
        }
      }

      if (vParametersList.length > 0) {
        vUrl += (vUrl.indexOf("?") >= 0 ? "&" : "?") + vParametersList.join("&");
      }

      // --------------------------------------------------------
      //   Adding data parameters (if no data is already present)
      // --------------------------------------------------------
      if (this.getData() === null)
      {
        var vParameters = this.getParameters(true);
        var vParametersList = [];

        for (var vId in vParameters)
        {
          var value = vParameters[vId];

          if (value instanceof Array)
          {
            for (var i=0; i<value.length; i++)
            {
              vParametersList.push(encodeURIComponent(vId) +
                                   "=" +
                                   encodeURIComponent(value[i]));
            }
          }
          else
          {
            vParametersList.push(encodeURIComponent(vId) +
                                 "=" +
                                 encodeURIComponent(value));
          }
        }

        if (vParametersList.length > 0)
        {
          this.setData(vParametersList.join("&"));
        }
      }

      var encode64 = function(input)
      {
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        do
        {
          chr1 = input.charCodeAt(i++);
          chr2 = input.charCodeAt(i++);
          chr3 = input.charCodeAt(i++);

          enc1 = chr1 >> 2;
          enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
          enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
          enc4 = chr3 & 63;

          if (isNaN(chr2)) {
            enc3 = enc4 = 64;
          } else if (isNaN(chr3)) {
            enc4 = 64;
          }

          output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
        }
        while (i < input.length);

        return output;
      };

      // --------------------------------------
      //   Opening connection
      // --------------------------------------
      try
      {
        if (this.getUsername())
        {
          if (this.getUseBasicHttpAuth())
          {
            vRequest.open(vMethod, vUrl, vAsynchronous);
            vRequest.setRequestHeader('Authorization', 'Basic ' + encode64(this.getUsername() + ':' + this.getPassword()));
          }
          else
          {
            vRequest.open(vMethod, vUrl, vAsynchronous, this.getUsername(), this.getPassword());
          }
        }
        else
        {
          vRequest.open(vMethod, vUrl, vAsynchronous);
        }
      }
      catch(ex)
      {
        this.error("Failed with exception: " + ex);
        this.failed();
        return;
      }

      // --------------------------------------
      //   Applying request header
      // --------------------------------------
      // Add a Referer header

      // The Java backend uses the referer header, and Firefox doesn't send one by
      // default (see here:
      // http://www.mercurytide.co.uk/whitepapers/issues-working-with-ajax/ ). Even when
      // not using a backend that evaluates the referrer, it's still useful to have it
      // set correctly, e.g. when looking at server log files.
      if (!(qx.core.Environment.get("engine.name") == "webkit"))
      {
        // avoid "Refused to set unsafe header Referer" in Safari and other Webkit-based browsers
        vRequest.setRequestHeader('Referer', window.location.href);
      }

      var vRequestHeaders = this.getRequestHeaders();

      for (var vId in vRequestHeaders) {
        vRequest.setRequestHeader(vId, vRequestHeaders[vId]);
      }

      // --------------------------------------
      //   Sending data
      // --------------------------------------
      try {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote.data"))
          {
            this.debug("Request: " + this.getData());
          }
        }

        // IE9 executes the call synchronous when the call is to file protocol
        // See [BUG #4762] for details
        if (
          vLocalRequest && vAsynchronous &&
          qx.core.Environment.get("engine.name") == "mshtml" &&
          (qx.core.Environment.get("engine.version") == 9 &&
           qx.core.Environment.get("browser.documentmode") == 9)
        ) {
          qx.event.Timer.once(function() {
            vRequest.send(this.getData());
          }, this, 0);
        } else {
          vRequest.send(this.getData());
        }
      }
      catch(ex)
      {
        if (vLocalRequest) {
          this.failedLocally();
        }
        else
        {
          this.error("Failed to send data to URL '" + vUrl + "': " + ex, "send");
          this.failed();
        }

        return;
      }

      // --------------------------------------
      //   Readystate for sync reqeusts
      // --------------------------------------
      if (!vAsynchronous) {
        this._onreadystatechange();
      }
    },


    /**
     * Force the transport into the failed state ("failed").
     *
     * This method should be used only if the requests URI was local
     * access. I.e. it started with "file://".
     *
     */
    failedLocally : function()
    {
      if (this.getState() === "failed") {
        return;
      }

      // should only occur on "file://" access
      this.warn("Could not load from file: " + this.getUrl());

      this.failed();
    },




    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Listener method for change of the "readystate".
     * Sets the internal state and informs the transport layer.
     *
     * @signature function(e)
     * @param e {Event} native event
     */
    _onreadystatechange : qx.event.GlobalError.observeMethod(function(e)
    {
      // Ignoring already stopped requests
      switch(this.getState())
      {
        case "completed":
        case "aborted":
        case "failed":
        case "timeout":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote")) {
              this.warn("Ignore Ready State Change");
            }
          }

          return;
      }

      // Checking status code
      var vReadyState = this.getReadyState();

      if (vReadyState == 4)
      {
        // The status code is only meaningful when we reach ready state 4.
        // (Important for Opera since it goes through other states before
        // reaching 4, and the status code is not valid before 4 is reached.)
        if (!qx.io.remote.Exchange.wasSuccessful(this.getStatusCode(), vReadyState, this.__localRequest)) {
          // Fix for bug #2272
          // The IE doesn't set the state to 'sending' even though the send method
          // is called. This only occurs if the server (which is called) goes
          // down or a network failure occurs.
          if (this.getState() === "configured") {
            this.setState("sending");
          }

          this.failed();
          return;
        }
      }

      // Sometimes the xhr call skips the send state
      if (vReadyState == 3 && this.__lastReadyState == 1) {
        this.setState(qx.io.remote.Exchange._nativeMap[++this.__lastReadyState]);
      }

      // Updating internal state
      while (this.__lastReadyState < vReadyState) {
        this.setState(qx.io.remote.Exchange._nativeMap[++this.__lastReadyState]);
      }
    }),




    /*
    ---------------------------------------------------------------------------
      READY STATE
    ---------------------------------------------------------------------------
    */

    /**
     * Get the ready state of this transports request.
     *
     * For qx.io.remote.transport.XmlHttp, ready state is a number between 1 to 4.
     *
     * @return {Integer} ready state number
     */
    getReadyState : function()
    {
      var vReadyState = null;

      try {
        vReadyState = this.getRequest().readyState;
      } catch(ex) {}

      return vReadyState;
    },




    /*
    ---------------------------------------------------------------------------
      REQUEST HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Set a request header to this transports request.
     *
     * @param vLabel {String} Request header name
     * @param vValue {var} Request header value
     */
    setRequestHeader : function(vLabel, vValue) {
      this.getRequestHeaders()[vLabel] = vValue;
    },




    /*
    ---------------------------------------------------------------------------
      RESPONSE HEADER SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns a specific header provided by the server upon sending a request,
     * with header name determined by the argument headerName.
     *
     * Only available at readyState 3 and 4 universally and in readyState 2
     * in Gecko.
     *
     * Please note: Some servers/proxies (such as Selenium RC) will capitalize
     * response header names. This is in accordance with RFC 2616[1], which
     * states that HTTP 1.1 header names are case-insensitive, so your
     * application should be case-agnostic when dealing with response headers.
     *
     * [1]<a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2">RFC 2616: HTTP Message Headers</a>
     *
     * @param vLabel {String} Response header name
     * @return {String|null} Response header value
     */
    getResponseHeader : function(vLabel)
    {
      var vResponseHeader = null;

      try {
        vResponseHeader = this.getRequest().getResponseHeader(vLabel) || null;
      } catch(ex) {}

      return vResponseHeader;
    },


    /**
     * Returns all response headers of the request.
     *
     * @return {var} response headers
     */
    getStringResponseHeaders : function()
    {
      var vSourceHeader = null;

      try
      {
        var vLoadHeader = this.getRequest().getAllResponseHeaders();

        if (vLoadHeader) {
          vSourceHeader = vLoadHeader;
        }
      }
      catch(ex) {}

      return vSourceHeader;
    },


    /**
     * Provides a hash of all response headers.
     *
     * @return {var} hash of all response headers
     */
    getResponseHeaders : function()
    {
      var vSourceHeader = this.getStringResponseHeaders();
      var vHeader = {};

      if (vSourceHeader)
      {
        var vValues = vSourceHeader.split(/[\r\n]+/g);

        for (var i=0, l=vValues.length; i<l; i++)
        {
          var vPair = vValues[i].match(/^([^:]+)\s*:\s*(.+)$/i);

          if (vPair) {
            vHeader[vPair[1]] = vPair[2];
          }
        }
      }

      return vHeader;
    },




    /*
    ---------------------------------------------------------------------------
      STATUS SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the current status code of the request if available or -1 if not.
     *
     * @return {Integer} current status code
     */
    getStatusCode : function()
    {
      var vStatusCode = -1;

      try {
        vStatusCode = this.getRequest().status;

        // [BUG #4476]
        // IE sometimes tells 1223 when it should be 204
        if (vStatusCode === 1223) {
          vStatusCode = 204;
        }

      } catch(ex) {}

      return vStatusCode;
    },


    /**
     * Provides the status text for the current request if available and null
     * otherwise.
     *
     * @return {String} current status code text
     */
    getStatusText : function()
    {
      var vStatusText = "";

      try {
        vStatusText = this.getRequest().statusText;
      } catch(ex) {}

      return vStatusText;
    },




    /*
    ---------------------------------------------------------------------------
      RESPONSE DATA SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Provides the response text from the request when available and null
     * otherwise.  By passing true as the "partial" parameter of this method,
     * incomplete data will be made available to the caller.
     *
     * @return {String} Content of the response as string
     */
    getResponseText : function()
    {
      var vResponseText = null;

      try
      {
        vResponseText = this.getRequest().responseText;
      }
      catch(ex)
      {
        vResponseText = null;
      }

      return vResponseText;
    },


    /**
     * Provides the XML provided by the response if any and null otherwise.  By
     * passing true as the "partial" parameter of this method, incomplete data will
     * be made available to the caller.
     *
     * @return {String} Content of the response as XML
     * @throws {Error} If an error within the response occurs.
     */
    getResponseXml : function()
    {
      var vResponseXML = null;

      var vStatus = this.getStatusCode();
      var vReadyState = this.getReadyState();

      if (qx.io.remote.Exchange.wasSuccessful(vStatus, vReadyState, this.__localRequest))
      {
        try {
          vResponseXML = this.getRequest().responseXML;
        } catch(ex) {}
      }

      // Typical behaviour on file:// on mshtml
      // Could we check this with something like: /^file\:/.test(path); ?
      // No browser check here, because it doesn't seem to break other browsers
      //    * test for this.req.responseXML's objecthood added by *
      //    * FRM, 20050816                                       *
      if (typeof vResponseXML == "object" && vResponseXML != null)
      {
        if (!vResponseXML.documentElement)
        {
          // Clear xml file declaration, this breaks non unicode files (like ones with Umlauts)
          var s = String(this.getRequest().responseText).replace(/<\?xml[^\?]*\?>/, "");
          vResponseXML.loadXML(s);
        }

        // Re-check if fixed...
        if (!vResponseXML.documentElement) {
          throw new Error("Missing Document Element!");
        }

        if (vResponseXML.documentElement.tagName == "parseerror") {
          throw new Error("XML-File is not well-formed!");
        }
      }
      else
      {
        throw new Error("Response was not a valid xml document [" + this.getRequest().responseText + "]");
      }

      return vResponseXML;
    },


    /**
     * Returns the length of the content as fetched thus far
     *
     * @return {Integer} Length of the response text.
     */
    getFetchedLength : function()
    {
      var vText = this.getResponseText();
      return typeof vText == "string" ? vText.length : 0;
    },


    /**
     * Returns the content of the response
     *
     * @return {null | String} Response content if available
     */
    getResponseContent : function()
    {
      var state = this.getState();
      if (state !== "completed" && state != "failed")
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          if (qx.core.Environment.get("qx.debug.io.remote")) {
            this.warn("Transfer not complete or failed, ignoring content!");
          }
        }

        return null;
      }

      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("Returning content for responseType: " + this.getResponseType());
        }
      }

      var vText = this.getResponseText();

      if (state == "failed")
      {
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Failed: " + vText);
            }
          }

          return vText;
      }

      switch(this.getResponseType())
      {
        case "text/plain":
        case "text/html":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + vText);
            }
          }

          return vText;

        case "application/json":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + vText);
            }
          }

          try {
            if (vText && vText.length > 0)
            {
              var ret;
              if (this.getParseJson()){
                ret = qx.lang.Json.parse(vText);
                ret = (ret === 0 ? 0 : (ret || null));
              } else {
                ret = vText;
              }
              return ret;
            }
            else
            {
              return null;
            }
          }
          catch(ex)
          {
            this.error("Could not execute json: [" + vText + "]", ex);
            return "<pre>Could not execute json: \n" + vText + "\n</pre>";
          }

        case "text/javascript":
          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + vText);
            }
          }

          try {
            if(vText && vText.length > 0)
            {
              var ret = window.eval(vText);
              return (ret === 0 ? 0 : (ret || null));
            }
            else
            {
              return null;
            }
          } catch(ex) {
            this.error("Could not execute javascript: [" + vText + "]", ex);
            return null;
          }

        case "application/xml":
          vText = this.getResponseXml();

          if (qx.core.Environment.get("qx.debug"))
          {
            if (qx.core.Environment.get("qx.debug.io.remote.data"))
            {
              this.debug("Response: " + vText);
            }
          }

          return (vText === 0 ? 0 : (vText || null));

        default:
          this.warn("No valid responseType specified (" + this.getResponseType() + ")!");
          return null;
      }
    },




    /*
    ---------------------------------------------------------------------------
      APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    /**
     * Apply method for the "state" property.
     * Fires an event for each state value to inform the listeners.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyState : function(value, old)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        if (qx.core.Environment.get("qx.debug.io.remote")) {
          this.debug("State: " + value);
        }
      }

      switch(value)
      {
        case "created":
          this.fireEvent("created");
          break;

        case "configured":
          this.fireEvent("configured");
          break;

        case "sending":
          this.fireEvent("sending");
          break;

        case "receiving":
          this.fireEvent("receiving");
          break;

        case "completed":
          this.fireEvent("completed");
          break;

        case "failed":
          this.fireEvent("failed");
          break;

        case "aborted":
          this.getRequest().abort();
          this.fireEvent("aborted");
          break;

        case "timeout":
          this.getRequest().abort();
          this.fireEvent("timeout");
          break;
      }
    }
  },



  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function()
  {
    // basic registration to qx.io.remote.Exchange
    // the real availability check (activeX stuff and so on) follows at the first real request
    qx.io.remote.Exchange.registerType(qx.io.remote.transport.XmlHttp, "qx.io.remote.transport.XmlHttp");
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    var vRequest = this.getRequest();

    if (vRequest)
    {
      // Clean up state change handler
      // Note that for IE the proper way to do this is to set it to a
      // dummy function, not null (Google on "onreadystatechange dummy IE unhook")
      // http://groups.google.com/group/Google-Web-Toolkit-Contributors/browse_thread/thread/7e7ee67c191a6324
      vRequest.onreadystatechange = (function() {});
      // Aborting
      switch(vRequest.readyState)
      {
        case 1:
        case 2:
        case 3:
          vRequest.abort();
      }
    }

    this.__request = null;
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
 * This class is used to work with the result of a HTTP request.
 */
qx.Class.define("qx.io.remote.Response",
{
  extend : qx.event.type.Event,




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /*
    ---------------------------------------------------------------------------
      PROPERTIES
    ---------------------------------------------------------------------------
    */

    /** State of the response. */
    state :
    {
      check    : "Integer",
      nullable : true
    },

    /** Status code of the response. */
    statusCode :
    {
      check    : "Integer",
      nullable : true
    },

    /** Content of the response. */
    content :
    {
      nullable : true
    },

    /** The headers of the response. */
    responseHeaders :
    {
      check    : "Object",
      nullable : true,
      apply : "_applyResponseHeaders"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __lowerHeaders: null,

    /*
    ---------------------------------------------------------------------------
      USER METHODS
    ---------------------------------------------------------------------------
    */

    // overridden
    clone : function(embryo)
    {
      var clone = this.base(arguments, embryo);
      clone.setType(this.getType());
      clone.setState(this.getState());
      clone.setStatusCode(this.getStatusCode());
      clone.setContent(this.getContent());
      clone.setResponseHeaders(this.getResponseHeaders());
      return clone;
    },


    /**
     * Returns a specific response header
     * @param vHeader {String} Response header name
     * @return {Object | null} The header value or null;
     */
    getResponseHeader : function(vHeader)
    {
      if (this.__lowerHeaders) {
        return this.__lowerHeaders[vHeader.toLowerCase()] || null;
      }

      return null;
    },

    /**
     * Keep lower-cased shadow of response headers for later
     * case-insensitive matching.
     *
     * @param value {var} Current value
     * @param old {var} Previous value
     */
    _applyResponseHeaders : function(value, old) {
      var lowerHeaders = {};

      if (value !== null) {
        Object.keys(value).forEach(function(key) {
          lowerHeaders[key.toLowerCase()] = value[key];
        });
        this.__lowerHeaders = lowerHeaders;
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
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)

************************************************************************ */

/**
 * A wrapper for Cookie handling.
 */
qx.Bootstrap.define("qx.bom.Cookie",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /*
    ---------------------------------------------------------------------------
      USER APPLICATION METHODS
    ---------------------------------------------------------------------------
    */

    /**
     * Returns the string value of a cookie.
     *
     * @param key {String} The key for the saved string value.
     * @return {null | String} Returns the saved string value, if the cookie
     *    contains a value for the key, <code>null</code> otherwise.
     */
    get : function(key)
    {
      var start = document.cookie.indexOf(key + "=");
      var len = start + key.length + 1;

      if ((!start) && (key != document.cookie.substring(0, key.length))) {
        return null;
      }

      if (start == -1) {
        return null;
      }

      var end = document.cookie.indexOf(";", len);

      if (end == -1) {
        end = document.cookie.length;
      }

      return unescape(document.cookie.substring(len, end));
    },


    /**
     * Sets the string value of a cookie.
     *
     * @param key {String} The key for the string value.
     * @param value {String} The string value.
     * @param expires {Number?null} The expires in days starting from now,
     *    or <code>null</code> if the cookie should deleted after browser close.
     * @param path {String?null} Path value.
     * @param domain {String?null} Domain value.
     * @param secure {Boolean?null} Secure flag.
     */
    set : function(key, value, expires, path, domain, secure)
    {
      // Generate cookie
      var cookie = [ key, "=", escape(value) ];

      if (expires)
      {
        var today = new Date();
        today.setTime(today.getTime());

        cookie.push(";expires=", new Date(today.getTime() + (expires * 1000 * 60 * 60 * 24)).toGMTString());
      }

      if (path) {
        cookie.push(";path=", path);
      }

      if (domain) {
        cookie.push(";domain=", domain);
      }

      if (secure) {
        cookie.push(";secure");
      }

      // Store cookie
      document.cookie = cookie.join("");
    },


    /**
     * Deletes the string value of a cookie.
     *
     * @param key {String} The key for the string value.
     * @param path {String?null} Path value.
     * @param domain {String?null} Domain value.
     */
    del : function(key, path, domain)
    {
      if (!qx.bom.Cookie.get(key)) {
        return;
      }

      // Generate cookie
      var cookie = [ key, "=" ];

      if (path) {
        cookie.push(";path=", path);
      }

      if (domain) {
        cookie.push(";domain=", domain);
      }

      cookie.push(";expires=Thu, 01-Jan-1970 00:00:01 GMT");

      // Store cookie
      document.cookie = cookie.join("");
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2012 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Daniel Wagner (danielwagner)

************************************************************************ */

/**
 * Cookie handling module
 */
qx.Bootstrap.define("qx.module.Cookie", {
  statics :
  {
    /**
     * Returns the string value of a cookie.
     *
     * @attachStatic {qxWeb, cookie.get}
     * @param key {String} The key for the saved string value.
     * @return {String|null} Returns the saved string value if the cookie
     *    contains a value for the key, otherwise <code>null</code>
     * @signature function(key)
     */
    get : qx.bom.Cookie.get,


    /**
     * Sets the string value of a cookie.
     *
     * @attachStatic {qxWeb, cookie.set}
     * @param key {String} The key for the string value.
     * @param value {String} The string value.
     * @param expires {Number?null} Expires directive value in days starting from now,
     *    or <code>null</code> if the cookie should be deleted when the browser
     *    is closed.
     * @param path {String?null} Path value.
     * @param domain {String?null} Domain value.
     * @param secure {Boolean?null} Secure flag.
     * @signature function(key, value, expires, path, domain, secure)
     */
    set : qx.bom.Cookie.set,


    /**
     * Deletes the string value of a cookie.
     *
     * @attachStatic {qxWeb, cookie.del}
     * @param key {String} The key for the string value.
     * @param path {String?null} Path value.
     * @param domain {String?null} Domain value.
     * @signature function(key, path, domain)
     */
    del : qx.bom.Cookie.del
  },


  defer : function(statics) {
    qxWeb.$attachAll(this, "cookie")
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
 * This mixin redirects all children handling methods to a child widget of the
 * including class. This is e.g. used in {@link qx.ui.window.Window} to add
 * child widgets directly to the window pane.
 *
 * The including class must implement the method <code>getChildrenContainer</code>,
 * which has to return the widget, to which the child widgets should be added.
 */
qx.Mixin.define("qx.ui.core.MRemoteChildrenHandling",
{
  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Forward the call with the given function name to the children container
     *
     * @param functionName {String} name of the method to forward
     * @param a1 {var} first argument of the method to call
     * @param a2 {var} second argument of the method to call
     * @param a3 {var} third argument of the method to call
     * @return {var} The return value of the forward method
     */
    __forward : function(functionName, a1, a2, a3)
    {
      var container = this.getChildrenContainer();
      if (container === this) {
        functionName = "_" + functionName;
      }
      return (container[functionName])(a1, a2, a3);
    },


    /**
     * Returns the children list
     *
     * @return {LayoutItem[]} The children array (Arrays are
     *   reference types, please do not modify them in-place)
     */
    getChildren : function() {
      return this.__forward("getChildren");
    },


    /**
     * Whether the widget contains children.
     *
     * @return {Boolean} Returns <code>true</code> when the widget has children.
     */
    hasChildren : function() {
      return this.__forward("hasChildren");
    },


    /**
     * Adds a new child widget.
     *
     * The supported keys of the layout options map depend on the layout manager
     * used to position the widget. The options are documented in the class
     * documentation of each layout manager {@link qx.ui.layout}.
     *
     * @param child {LayoutItem} the item to add.
     * @param options {Map?null} Optional layout data for item.
     * @return {Widget} This object (for chaining support)
     */
    add : function(child, options) {
      return this.__forward("add", child, options);
    },


    /**
     * Remove the given child item.
     *
     * @param child {LayoutItem} the item to remove
     * @return {Widget} This object (for chaining support)
     */
    remove : function(child) {
      return this.__forward("remove", child);
    },


    /**
     * Remove all children.
     * @return {Array} An array containing the removed children.
     */
    removeAll : function() {
      return this.__forward("removeAll");
    },


    /**
     * Returns the index position of the given item if it is
     * a child item. Otherwise it returns <code>-1</code>.
     *
     * This method works on the widget's children list. Some layout managers
     * (e.g. {@link qx.ui.layout.HBox}) use the children order as additional
     * layout information. Other layout manager (e.g. {@link qx.ui.layout.Grid})
     * ignore the children order for the layout process.
     *
     * @param child {LayoutItem} the item to query for
     * @return {Integer} The index position or <code>-1</code> when
     *   the given item is no child of this layout.
     */
    indexOf : function(child) {
      return this.__forward("indexOf", child);
    },


    /**
     * Add a child at the specified index
     *
     * This method works on the widget's children list. Some layout managers
     * (e.g. {@link qx.ui.layout.HBox}) use the children order as additional
     * layout information. Other layout manager (e.g. {@link qx.ui.layout.Grid})
     * ignore the children order for the layout process.
     *
     * @param child {LayoutItem} item to add
     * @param index {Integer} Index, at which the item will be inserted
     * @param options {Map?null} Optional layout data for item.
     */
    addAt : function(child, index, options) {
      this.__forward("addAt", child, index, options);
    },


    /**
     * Add an item before another already inserted item
     *
     * This method works on the widget's children list. Some layout managers
     * (e.g. {@link qx.ui.layout.HBox}) use the children order as additional
     * layout information. Other layout manager (e.g. {@link qx.ui.layout.Grid})
     * ignore the children order for the layout process.
     *
     * @param child {LayoutItem} item to add
     * @param before {LayoutItem} item before the new item will be inserted.
     * @param options {Map?null} Optional layout data for item.
     */
    addBefore : function(child, before, options) {
      this.__forward("addBefore", child, before, options);
    },


    /**
     * Add an item after another already inserted item
     *
     * This method works on the widget's children list. Some layout managers
     * (e.g. {@link qx.ui.layout.HBox}) use the children order as additional
     * layout information. Other layout manager (e.g. {@link qx.ui.layout.Grid})
     * ignore the children order for the layout process.
     *
     * @param child {LayoutItem} item to add
     * @param after {LayoutItem} item, after which the new item will be inserted
     * @param options {Map?null} Optional layout data for item.
     */
    addAfter : function(child, after, options) {
      this.__forward("addAfter", child, after, options);
    },


    /**
     * Remove the item at the specified index.
     *
     * This method works on the widget's children list. Some layout managers
     * (e.g. {@link qx.ui.layout.HBox}) use the children order as additional
     * layout information. Other layout manager (e.g. {@link qx.ui.layout.Grid})
     * ignore the children order for the layout process.
     *
     * @param index {Integer} Index of the item to remove.
     * @return {qx.ui.core.LayoutItem} The removed item
     */
    removeAt : function(index) {
      return this.__forward("removeAt", index);
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
 * This mixin redirects the layout manager to a child widget of the
 * including class. This is e.g. used in {@link qx.ui.window.Window} to configure
 * the layout manager of the window pane instead of the window directly.
 *
 * The including class must implement the method <code>getChildrenContainer</code>,
 * which has to return the widget, to which the layout should be set.
 */

qx.Mixin.define("qx.ui.core.MRemoteLayoutHandling",
{
  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Set a layout manager for the widget. A a layout manager can only be connected
     * with one widget. Reset the connection with a previous widget first, if you
     * like to use it in another widget instead.
     *
     * @param layout {qx.ui.layout.Abstract} The new layout or
     *     <code>null</code> to reset the layout.
     */
    setLayout : function(layout) {
      this.getChildrenContainer().setLayout(layout);
    },


    /**
     * Get the widget's layout manager.
     *
     * @return {qx.ui.layout.Abstract} The widget's layout manager
     */
    getLayout : function() {
      return this.getChildrenContainer().getLayout();
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Required interface for all window manager.
 *
 * Window manager handle the z-order and modality blocking of windows managed
 * by the connected desktop {@link IDesktop}.
 */
qx.Interface.define("qx.ui.window.IWindowManager",
{
  members :
  {
    /**
     * Connect the window manager to the window desktop
     *
     * @param desktop {IDesktop} The connected desktop
     */
    setDesktop : function(desktop) {
      this.assertInterface(desktop, qx.ui.window.IDesktop);
    },

    /**
     * Inform the window manager about a new active window
     *
     * @param active {Window} new active window
     * @param oldActive {Window} old active window
     */
    changeActiveWindow : function(active, oldActive) {},

    /**
     * Update the window order and modality blocker
     */
    updateStack : function() {},

    /**
     * Ask the manager to bring a window to the front.
     *
     * @param win {Window} window to bring to front
     */
    bringToFront : function(win) {
      this.assertInstance(win, qx.ui.window.Window);
    },

    /**
     * Ask the manager to send a window to the back.
     *
     * @param win {Window} window to sent to back
     */
    sendToBack : function(win) {
      this.assertInstance(win, qx.ui.window.Window);
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * All parent widgets of windows must implement this interface.
 */
qx.Interface.define("qx.ui.window.IDesktop",
{
  members :
  {
    /**
     * Sets the desktop's window manager
     *
     * @param manager {qx.ui.window.IWindowManager} The window manager
     */
    setWindowManager : function(manager) {
      this.assertInterface(manager, qx.ui.window.IWindowManager);
    },

    /**
     * Get a list of all windows added to the desktop (including hidden windows)
     *
     * @return {qx.ui.window.Window[]} Array of managed windows
     */
    getWindows : function() {},

    /**
     * Whether the configured layout supports a maximized window
     * e.g. is a Canvas.
     *
     * @return {Boolean} Whether the layout supports maximized windows
     */
    supportsMaximize : function() {},

    /**
     * Block direct child widgets with a zIndex below <code>zIndex</code>
     *
     * @param zIndex {Integer} All child widgets with a zIndex below this value
     *     will be blocked
     */
    blockContent : function(zIndex) {
      this.assertInteger(zIndex);
    },

    /**
     * Remove the blocker.
     */
    unblock : function() {},

    /**
     * Whether the widget is currently blocked
     *
     * @return {Boolean} whether the widget is blocked.
     */
    isBlocked : function() {}
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
 * The default window manager implementation
 */
qx.Class.define("qx.ui.window.Manager",
{
  extend : qx.core.Object,
  implement : qx.ui.window.IWindowManager,



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __desktop : null,


    // interface implementation
    setDesktop : function(desktop)
    {
      this.__desktop = desktop;
      this.updateStack();
    },


    /**
     * Returns the connected desktop
     *
     * @return {qx.ui.window.IDesktop} The desktop
     */
    getDesktop : function() {
      return this.__desktop;
    },


    // interface implementation
    changeActiveWindow : function(active, oldActive) {
      if (active) {
        this.bringToFront(active);
        active.setActive(true);
      }
      if (oldActive) {
        oldActive.resetActive();
      }
    },


    /** @type {Integer} Minimum zIndex to start with for windows */
    _minZIndex : 1e5,


    // interface implementation
    updateStack : function()
    {
      // we use the widget queue to do the sorting one before the queues are
      // flushed. The queue will call "syncWidget"
      qx.ui.core.queue.Widget.add(this);
    },


    /**
     * This method is called during the flush of the
     * {@link qx.ui.core.queue.Widget widget queue}.
     */
    syncWidget : function()
    {
      this.__desktop.forceUnblock();

      var windows = this.__desktop.getWindows();
      // z-index for all three window kinds
      var zIndex = this._minZIndex;
      var zIndexOnTop = zIndex + windows.length * 2;
      var zIndexModal = zIndex + windows.length * 4;
      // marker if there is an active window
      var active = null;

      for (var i = 0, l = windows.length; i < l; i++)
      {
        var win = windows[i];
        // ignore invisible windows
        if (!win.isVisible()) {
          continue;
        }
        // take the first window as active window
        active = active || win;

        // We use only every second z index to easily insert a blocker between
        // two windows
        // Modal Windows stays on top of AlwaysOnTop Windows, which stays on
        // top of Normal Windows.
        if (win.isModal()) {
          win.setZIndex(zIndexModal);
          this.__desktop.blockContent(zIndexModal - 1);
          zIndexModal +=2;
          //just activate it if it's modal
          active = win;

        } else if (win.isAlwaysOnTop()) {
          win.setZIndex(zIndexOnTop);
          zIndexOnTop +=2;

        } else {
          win.setZIndex(zIndex);
          zIndex +=2;
        }

        // store the active window
        if (!active.isModal() &&
            win.isActive() ||
            win.getZIndex() > active.getZIndex()) {
          active = win;
        }
      }

      //set active window or null otherwise
      this.__desktop.setActiveWindow(active);
    },


    // interface implementation
    bringToFront : function(win)
    {
      var windows = this.__desktop.getWindows();

      var removed = qx.lang.Array.remove(windows, win);
      if (removed)
      {
        windows.push(win);
        this.updateStack();
      }
    },


    // interface implementation
    sendToBack : function(win)
    {
      var windows = this.__desktop.getWindows();

      var removed = qx.lang.Array.remove(windows, win);
      if (removed)
      {
        windows.unshift(win);
        this.updateStack();
      }
    }
  },





  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this._disposeObjects("__desktop");
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
 * Provides move behavior to any widget.
 *
 * The widget using the mixin must register a widget as move handle so that
 * the pointer events needed for moving it are attached to this widget).
 * <pre class='javascript'>this._activateMoveHandle(widget);</pre>
 */
qx.Mixin.define("qx.ui.core.MMovable",
{
  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Whether the widget is movable */
    movable :
    {
      check : "Boolean",
      init : true
    },

    /** Whether to use a frame instead of the original widget during move sequences */
    useMoveFrame :
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
    __moveHandle : null,
    __moveFrame : null,
    __dragRange : null,
    __dragLeft : null,
    __dragTop : null,
    __parentLeft : null,
    __parentTop : null,

    __blockerAdded : false,
    __oldBlockerColor : null,
    __oldBlockerOpacity : 0,

    /*
    ---------------------------------------------------------------------------
      CORE FEATURES
    ---------------------------------------------------------------------------
    */

    /**
     * Configures the given widget as a move handle
     *
     * @param widget {qx.ui.core.Widget} Widget to activate as move handle
     */
    _activateMoveHandle : function(widget)
    {
      if (this.__moveHandle) {
        throw new Error("The move handle could not be redefined!");
      }

      this.__moveHandle = widget;
      widget.addListener("pointerdown", this._onMovePointerDown, this);
      widget.addListener("pointerup", this._onMovePointerUp, this);
      widget.addListener("pointermove", this._onMovePointerMove, this);
      widget.addListener("losecapture", this.__onMoveLoseCapture, this);
    },


    /**
     * Get the widget, which draws the resize/move frame.
     *
     * @return {qx.ui.core.Widget} The resize frame
     */
    __getMoveFrame : function()
    {
      var frame = this.__moveFrame;
      if (!frame)
      {
        frame = this.__moveFrame = new qx.ui.core.Widget();
        frame.setAppearance("move-frame");
        frame.exclude();

        qx.core.Init.getApplication().getRoot().add(frame);
      }

      return frame;
    },


    /**
     * Creates, shows and syncs the frame with the widget.
     */
    __showMoveFrame : function()
    {
      var location = this.getContentLocation();
      var bounds = this.getBounds();
      var frame = this.__getMoveFrame();
      frame.setUserBounds(location.left, location.top, bounds.width, bounds.height);
      frame.show();
      frame.setZIndex(this.getZIndex()+1);
    },




    /*
    ---------------------------------------------------------------------------
      MOVE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Computes the new drag coordinates
     *
     * @param e {qx.event.type.Pointer} Pointer event
     * @return {Map} A map with the computed drag coordinates
     */
    __computeMoveCoordinates : function(e)
    {
      var range = this.__dragRange;
      var pointerLeft = Math.max(range.left, Math.min(range.right, e.getDocumentLeft()));
      var pointerTop = Math.max(range.top, Math.min(range.bottom, e.getDocumentTop()));

      var viewportLeft = this.__dragLeft + pointerLeft;
      var viewportTop = this.__dragTop + pointerTop;

      return {
        viewportLeft : parseInt(viewportLeft, 10),
        viewportTop : parseInt(viewportTop, 10),

        parentLeft : parseInt(viewportLeft - this.__parentLeft, 10),
        parentTop : parseInt(viewportTop - this.__parentTop, 10)
      };
    },




    /*
    ---------------------------------------------------------------------------
      MOVE EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Roll handler which prevents the scrolling via tap & move on parent widgets
     * during the move of the widget.
     * @param e {qx.event.type.Roll} The roll event
     */
    _onMoveRoll : function(e) {
      e.stop();
    },


    /**
     * Enables the capturing of the caption bar and prepares the drag session and the
     * appearance (translucent, frame or opaque) for the moving of the window.
     *
     * @param e {qx.event.type.Pointer} pointer down event
     */
    _onMovePointerDown : function(e)
    {
      if (!this.getMovable() || this.hasState("maximized")) {
        return;
      }

      this.addListener("roll", this._onMoveRoll, this);

      // Compute drag range
      var parent = this.getLayoutParent();
      var parentLocation = parent.getContentLocation();
      var parentBounds = parent.getBounds();

      // Added a blocker, this solves the issue described in [BUG #1462]
      if (qx.Class.implementsInterface(parent, qx.ui.window.IDesktop)) {
        if (!parent.isBlocked()) {
          this.__oldBlockerColor = parent.getBlockerColor();
          this.__oldBlockerOpacity = parent.getBlockerOpacity();
          parent.setBlockerColor(null);
          parent.setBlockerOpacity(1);

          parent.blockContent(this.getZIndex() - 1);

          this.__blockerAdded = true;
        }
      }

      this.__dragRange =
      {
        left : parentLocation.left,
        top : parentLocation.top,
        right : parentLocation.left + parentBounds.width,
        bottom : parentLocation.top + parentBounds.height
      };

      // Compute drag positions
      var widgetLocation = this.getContentLocation();
      this.__parentLeft = parentLocation.left;
      this.__parentTop = parentLocation.top;

      this.__dragLeft = widgetLocation.left - e.getDocumentLeft();
      this.__dragTop = widgetLocation.top - e.getDocumentTop();

      // Add state
      this.addState("move");

      // Enable capturing
      this.__moveHandle.capture();

      // Enable drag frame
      if (this.getUseMoveFrame()) {
        this.__showMoveFrame();
      }

      // Stop event
      e.stop();
    },


    /**
     * Does the moving of the window by rendering the position
     * of the window (or frame) at runtime using direct dom methods.
     *
     * @param e {qx.event.type.Pointer} pointer move event
     */
    _onMovePointerMove : function(e)
    {
      // Only react when dragging is active
      if (!this.hasState("move")) {
        return;
      }

      // Apply new coordinates using DOM
      var coords = this.__computeMoveCoordinates(e);
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().setDomPosition(coords.viewportLeft, coords.viewportTop);
      } else {
        var insets = this.getLayoutParent().getInsets();
        this.setDomPosition(coords.parentLeft - (insets.left || 0),
          coords.parentTop - (insets.top || 0));
      }

      e.stopPropagation();
    },


    /**
     * Disables the capturing of the caption bar and moves the window
     * to the last position of the drag session. Also restores the appearance
     * of the window.
     *
     * @param e {qx.event.type.Pointer} pointer up event
     */
    _onMovePointerUp : function(e)
    {
      if (this.hasListener("roll", this._onMoveRoll, this)) {
        this.removeListener("roll", this._onMoveRoll, this);
      }

      // Only react when dragging is active
      if (!this.hasState("move")) {
        return;
      }

      // Remove drag state
      this.removeState("move");

      // Removed blocker, this solves the issue described in [BUG #1462]
      var parent = this.getLayoutParent();
      if (qx.Class.implementsInterface(parent, qx.ui.window.IDesktop)) {
        if (this.__blockerAdded) {
          parent.unblock();

          parent.setBlockerColor(this.__oldBlockerColor);
          parent.setBlockerOpacity(this.__oldBlockerOpacity);
          this.__oldBlockerColor = null;
          this.__oldBlockerOpacity = 0;

          this.__blockerAdded = false;
        }
      }

      // Disable capturing
      this.__moveHandle.releaseCapture();

      // Apply them to the layout
      var coords = this.__computeMoveCoordinates(e);
      var insets = this.getLayoutParent().getInsets();
      this.setLayoutProperties({
        left: coords.parentLeft - (insets.left || 0),
        top: coords.parentTop - (insets.top || 0)
      });

      // Hide frame afterwards
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().exclude();
      }

      e.stopPropagation();
    },


    /**
     * Event listener for <code>losecapture</code> event.
     *
     * @param e {qx.event.type.Event} Lose capture event
     */
    __onMoveLoseCapture : function(e)
    {
      // Check for active move
      if (!this.hasState("move")) {
        return;
      }

      // Remove drag state
      this.removeState("move");

      // Hide frame afterwards
      if (this.getUseMoveFrame()) {
        this.__getMoveFrame().exclude();
      }
    }
  },





  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this._disposeObjects("__moveFrame", "__moveHandle");
    this.__dragRange = null;
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
 * This mixin defines the <code>contentPadding</code> property, which is used
 * by widgets like the window or group box, which must have a property, which
 * defines the padding of an inner pane.
 *
 * The including class must implement the method
 * <code>_getContentPaddingTarget</code>, which must return the widget on which
 * the padding should be applied.
 */
qx.Mixin.define("qx.ui.core.MContentPadding",
{
  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Top padding of the content pane */
    contentPaddingTop :
    {
      check : "Integer",
      init : 0,
      apply : "_applyContentPadding",
      themeable : true
    },

    /** Right padding of the content pane */
    contentPaddingRight :
    {
      check : "Integer",
      init : 0,
      apply : "_applyContentPadding",
      themeable : true
    },

    /** Bottom padding of the content pane */
    contentPaddingBottom :
    {
      check : "Integer",
      init : 0,
      apply : "_applyContentPadding",
      themeable : true
    },

    /** Left padding of the content pane */
    contentPaddingLeft :
    {
      check : "Integer",
      init : 0,
      apply : "_applyContentPadding",
      themeable : true
    },

    /**
     * The 'contentPadding' property is a shorthand property for setting 'contentPaddingTop',
     * 'contentPaddingRight', 'contentPaddingBottom' and 'contentPaddingLeft'
     * at the same time.
     *
     * If four values are specified they apply to top, right, bottom and left respectively.
     * If there is only one value, it applies to all sides, if there are two or three,
     * the missing values are taken from the opposite side.
     */
    contentPadding :
    {
      group : [
        "contentPaddingTop", "contentPaddingRight",
        "contentPaddingBottom", "contentPaddingLeft"
      ],
      mode  : "shorthand",
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
    /**
     * @type {Map} Maps property names of content padding to the setter of the padding
     *
     * @lint ignoreReferenceField(__contentPaddingSetter)
     */
    __contentPaddingSetter :
    {
      contentPaddingTop : "setPaddingTop",
      contentPaddingRight : "setPaddingRight",
      contentPaddingBottom : "setPaddingBottom",
      contentPaddingLeft : "setPaddingLeft"
    },


    /**
     * @type {Map} Maps property names of content padding to the themed setter of the padding
     *
     * @lint ignoreReferenceField(__contentPaddingThemedSetter)
     */
    __contentPaddingThemedSetter :
    {
      contentPaddingTop : "setThemedPaddingTop",
      contentPaddingRight : "setThemedPaddingRight",
      contentPaddingBottom : "setThemedPaddingBottom",
      contentPaddingLeft : "setThemedPaddingLeft"
    },


    /**
     * @type {Map} Maps property names of content padding to the resetter of the padding
     *
     * @lint ignoreReferenceField(__contentPaddingResetter)
     */
    __contentPaddingResetter :
    {
      contentPaddingTop : "resetPaddingTop",
      contentPaddingRight : "resetPaddingRight",
      contentPaddingBottom : "resetPaddingBottom",
      contentPaddingLeft : "resetPaddingLeft"
    },


    // property apply
    _applyContentPadding : function(value, old, name, variant)
    {
      var target = this._getContentPaddingTarget();

      if (value == null)
      {
        var resetter = this.__contentPaddingResetter[name];
        target[resetter]();
      }
      else
      {
        // forward the themed sates if case the apply was invoked by a theme
        if (variant == "setThemed" || variant == "resetThemed") {
          var setter = this.__contentPaddingThemedSetter[name];
          target[setter](value);
        } else {
          var setter = this.__contentPaddingSetter[name];
          target[setter](value);
        }
      }
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2007 David Pérez Carmona
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * David Perez Carmona (david-perez)
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Provides resizing behavior to any widget.
 */
qx.Mixin.define("qx.ui.core.MResizable",
{
  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    // Register listeners to the content
    var content = this.getContentElement();
    content.addListener("pointerdown", this.__onResizePointerDown, this, true);
    content.addListener("pointerup", this.__onResizePointerUp, this);
    content.addListener("pointermove", this.__onResizePointerMove, this);
    content.addListener("pointerout", this.__onResizePointerOut, this);
    content.addListener("losecapture", this.__onResizeLoseCapture, this);

    // Get a reference of the drag and drop handler
    var domElement = content.getDomElement();
    if (domElement == null) {
      domElement = window;
    }

    this.__dragDropHandler = qx.event.Registration.getManager(domElement).getHandler(qx.event.handler.DragDrop);
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** Whether the top edge is resizable */
    resizableTop :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the right edge is resizable */
    resizableRight :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the bottom edge is resizable */
    resizableBottom :
    {
      check : "Boolean",
      init : true
    },

    /** Whether the left edge is resizable */
    resizableLeft :
    {
      check : "Boolean",
      init : true
    },

    /**
     * Property group to configure the resize behaviour for all edges at once
     */
    resizable :
    {
      group : [ "resizableTop", "resizableRight", "resizableBottom", "resizableLeft" ],
      mode  : "shorthand"
    },

    /** The tolerance to activate resizing */
    resizeSensitivity :
    {
      check : "Integer",
      init : 5
    },

    /** Whether a frame replacement should be used during the resize sequence */
    useResizeFrame :
    {
      check : "Boolean",
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
    __dragDropHandler : null,
    __resizeFrame : null,
    __resizeActive : null,
    __resizeLeft : null,
    __resizeTop : null,
    __resizeStart : null,
    __resizeRange : null,


    RESIZE_TOP : 1,
    RESIZE_BOTTOM : 2,
    RESIZE_LEFT : 4,
    RESIZE_RIGHT : 8,


    /*
    ---------------------------------------------------------------------------
      CORE FEATURES
    ---------------------------------------------------------------------------
    */

    /**
     * Get the widget, which draws the resize/move frame. The resize frame is
     * shared by all widgets and is added to the root widget.
     *
     * @return {qx.ui.core.Widget} The resize frame
     */
    _getResizeFrame : function()
    {
      var frame = this.__resizeFrame;
      if (!frame)
      {
        frame = this.__resizeFrame = new qx.ui.core.Widget();
        frame.setAppearance("resize-frame");
        frame.exclude();

        qx.core.Init.getApplication().getRoot().add(frame);
      }

      return frame;
    },


    /**
     * Creates, shows and syncs the frame with the widget.
     */
    __showResizeFrame : function()
    {
      var location = this.getContentLocation();
      var frame = this._getResizeFrame();
      frame.setUserBounds(
        location.left,
        location.top,
        location.right - location.left,
        location.bottom - location.top
      );
      frame.show();
      frame.setZIndex(this.getZIndex()+1);
    },




    /*
    ---------------------------------------------------------------------------
      RESIZE SUPPORT
    ---------------------------------------------------------------------------
    */

    /**
     * Computes the new boundaries at each interval
     * of the resize sequence.
     *
     * @param e {qx.event.type.Pointer} Last pointer event
     * @return {Map} A map with the computed boundaries
     */
    __computeResizeResult : function(e)
    {
      // Detect mode
      var resizeActive = this.__resizeActive;

      // Read size hint
      var hint = this.getSizeHint();
      var range = this.__resizeRange;

      // Read original values
      var start = this.__resizeStart;
      var width = start.width;
      var height = start.height;
      var left = start.left;
      var top = start.top;
      var diff;

      if (
        (resizeActive & this.RESIZE_TOP) ||
        (resizeActive & this.RESIZE_BOTTOM)
      )
      {
        diff = Math.max(range.top, Math.min(range.bottom, e.getDocumentTop())) - this.__resizeTop;

        if (resizeActive & this.RESIZE_TOP) {
          height -= diff;
        } else {
          height += diff;
        }

        if (height < hint.minHeight) {
          height = hint.minHeight;
        } else if (height > hint.maxHeight) {
          height = hint.maxHeight;
        }

        if (resizeActive & this.RESIZE_TOP) {
          top += start.height - height;
        }
      }

      if (
        (resizeActive & this.RESIZE_LEFT) ||
        (resizeActive & this.RESIZE_RIGHT)
      )
      {
        diff = Math.max(range.left, Math.min(range.right, e.getDocumentLeft())) - this.__resizeLeft;

        if (resizeActive & this.RESIZE_LEFT) {
          width -= diff;
        } else {
          width += diff;
        }

        if (width < hint.minWidth) {
          width = hint.minWidth;
        } else if (width > hint.maxWidth) {
          width = hint.maxWidth;
        }

        if (resizeActive & this.RESIZE_LEFT) {
          left += start.width - width;
        }
      }

      return {
        // left and top of the visible widget
        viewportLeft : left,
        viewportTop : top,

        parentLeft : start.bounds.left + left - start.left,
        parentTop : start.bounds.top + top - start.top,

        // dimensions of the visible widget
        width : width,
        height : height
      };
    },


    /**
     * @type {Map} Maps internal states to cursor symbols to use
     *
     * @lint ignoreReferenceField(__resizeCursors)
     */
    __resizeCursors :
    {
      1  : "n-resize",
      2  : "s-resize",
      4  : "w-resize",
      8  : "e-resize",

      5  : "nw-resize",
      6  : "sw-resize",
      9  : "ne-resize",
      10 : "se-resize"
    },


    /**
     * Updates the internally stored resize mode
     *
     * @param e {qx.event.type.Pointer} Last pointer event
     */
    __computeResizeMode : function(e)
    {
      var location = this.getContentLocation();
      var pointerTolerance = this.getResizeSensitivity();

      var pointerLeft = e.getDocumentLeft();
      var pointerTop = e.getDocumentTop();

      var resizeActive = this.__computeResizeActive(
        location, pointerLeft, pointerTop, pointerTolerance
      );

      // check again in case we have a corner [BUG #1200]
      if (resizeActive > 0) {
        // this is really a | (or)!
        resizeActive = resizeActive | this.__computeResizeActive(
          location, pointerLeft, pointerTop, pointerTolerance * 2
        );
      }

      this.__resizeActive = resizeActive;
    },


    /**
     * Internal helper for computing the proper resize action based on the
     * given parameters.
     *
     * @param location {Map} The current location of the widget.
     * @param pointerLeft {Integer} The left position of the pointer.
     * @param pointerTop {Integer} The top position of the pointer.
     * @param pointerTolerance {Integer} The desired distance to the edge.
     * @return {Integer} The resize active number.
     */
    __computeResizeActive : function(location, pointerLeft, pointerTop, pointerTolerance) {
      var resizeActive = 0;

      // TOP
      if (
        this.getResizableTop() &&
        Math.abs(location.top - pointerTop) < pointerTolerance &&
        pointerLeft > location.left - pointerTolerance &&
        pointerLeft < location.right + pointerTolerance
      ) {
        resizeActive += this.RESIZE_TOP;

      // BOTTOM
      } else if (
        this.getResizableBottom() &&
        Math.abs(location.bottom - pointerTop) < pointerTolerance &&
        pointerLeft > location.left - pointerTolerance &&
        pointerLeft < location.right + pointerTolerance
      ) {
        resizeActive += this.RESIZE_BOTTOM;
      }

      // LEFT
      if (
        this.getResizableLeft() &&
        Math.abs(location.left - pointerLeft) < pointerTolerance &&
        pointerTop > location.top - pointerTolerance &&
        pointerTop < location.bottom + pointerTolerance
      ) {
        resizeActive += this.RESIZE_LEFT;

      // RIGHT
      } else if (
        this.getResizableRight() &&
        Math.abs(location.right - pointerLeft) < pointerTolerance &&
        pointerTop > location.top - pointerTolerance &&
        pointerTop < location.bottom + pointerTolerance
      ) {
        resizeActive += this.RESIZE_RIGHT;
      }
      return resizeActive;
    },


    /*
    ---------------------------------------------------------------------------
      RESIZE EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Event handler for the pointer down event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerDown : function(e)
    {
      // Check for active resize
      if (!this.__resizeActive || !this.getEnabled() || e.getPointerType() == "touch") {
        return;
      }

      // Add resize state
      this.addState("resize");

      // Store pointer coordinates
      this.__resizeLeft = e.getDocumentLeft();
      this.__resizeTop = e.getDocumentTop();

      // Cache bounds
      var location = this.getContentLocation();
      var bounds   = this.getBounds();

      this.__resizeStart = {
        top : location.top,
        left : location.left,
        width : location.right - location.left,
        height : location.bottom - location.top,
        bounds : qx.lang.Object.clone(bounds)
      };

      // Compute range
      var parent = this.getLayoutParent();
      var parentLocation = parent.getContentLocation();
      var parentBounds = parent.getBounds();

      this.__resizeRange = {
        left : parentLocation.left,
        top : parentLocation.top,
        right : parentLocation.left + parentBounds.width,
        bottom : parentLocation.top + parentBounds.height
      };

      // Show frame if configured this way
      if (this.getUseResizeFrame()) {
        this.__showResizeFrame();
      }

      // Enable capturing
      this.capture();

      // Stop event
      e.stop();
    },


    /**
     * Event handler for the pointer up event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerUp : function(e)
    {
      // Check for active resize
      if (!this.hasState("resize") || !this.getEnabled() || e.getPointerType() == "touch") {
        return;
      }

      // Hide frame afterwards
      if (this.getUseResizeFrame()) {
        this._getResizeFrame().exclude();
      }

      // Compute bounds
      var bounds = this.__computeResizeResult(e);

      // Sync with widget
      this.setWidth(bounds.width);
      this.setHeight(bounds.height);

      // Update coordinate in canvas
      if (this.getResizableLeft() || this.getResizableTop())
      {
        this.setLayoutProperties({
          left : bounds.parentLeft,
          top : bounds.parentTop
        });
      }

      // Clear mode
      this.__resizeActive = 0;

      // Remove resize state
      this.removeState("resize");

      // Reset cursor
      this.resetCursor();
      this.getApplicationRoot().resetGlobalCursor();

      // Disable capturing
      this.releaseCapture();

      e.stopPropagation();
    },


    /**
     * Event listener for <code>losecapture</code> event.
     *
     * @param e {qx.event.type.Event} Lose capture event
     */
    __onResizeLoseCapture : function(e)
    {
      // Check for active resize
      if (!this.__resizeActive) {
        return;
      }

      // Reset cursor
      this.resetCursor();
      this.getApplicationRoot().resetGlobalCursor();

      // Remove drag state
      this.removeState("move");

      // Hide frame afterwards
      if (this.getUseResizeFrame()) {
        this._getResizeFrame().exclude();
      }
    },


    /**
     * Event handler for the pointer move event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerMove : function(e)
    {
      if (!this.getEnabled() || e.getPointerType() == "touch") {
        return;
      }

      if (this.hasState("resize"))
      {
        var bounds = this.__computeResizeResult(e);

        // Update widget
        if (this.getUseResizeFrame())
        {
          // Sync new bounds to frame
          var frame = this._getResizeFrame();
          frame.setUserBounds(bounds.viewportLeft, bounds.viewportTop, bounds.width, bounds.height);
        }
        else
        {
          // Update size
          this.setWidth(bounds.width);
          this.setHeight(bounds.height);

          // Update coordinate in canvas
          if (this.getResizableLeft() || this.getResizableTop())
          {
            this.setLayoutProperties({
              left : bounds.parentLeft,
              top : bounds.parentTop
            });
          }
        }

        // Full stop for event
        e.stopPropagation();
      }
      else if (!this.hasState("maximized") && !this.__dragDropHandler.isSessionActive())
      {
        this.__computeResizeMode(e);

        var resizeActive = this.__resizeActive;
        var root = this.getApplicationRoot();

        if (resizeActive)
        {
          var cursor = this.__resizeCursors[resizeActive];
          this.setCursor(cursor);
          root.setGlobalCursor(cursor);
        }
        else if (this.getCursor())
        {
          this.resetCursor();
          root.resetGlobalCursor();
        }
      }
    },


    /**
     * Event handler for the pointer out event
     *
     * @param e {qx.event.type.Pointer} The pointer event instance
     */
    __onResizePointerOut : function(e)
    {
      if (e.getPointerType() == "touch") {
        return;
      }
      // When the pointer left the window and resizing is not yet
      // active we must be sure to (especially) reset the global
      // cursor.
      if (this.getCursor() && !this.hasState("resize"))
      {
        this.resetCursor();
        this.getApplicationRoot().resetGlobalCursor();
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
    if (this.__resizeFrame != null && !qx.core.ObjectRegistry.inShutDown)
    {
      this.__resizeFrame.destroy();
      this.__resizeFrame = null;
    }

    this.__dragDropHandler = null;
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
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * A window widget
 *
 * More information can be found in the package description {@link qx.ui.window}.
 *
 * @childControl statusbar {qx.ui.container.Composite} statusbar container which shows the statusbar text
 * @childControl statusbar-text {qx.ui.basic.Label} text of the statusbar
 * @childControl pane {qx.ui.container.Composite} window pane which holds the content
 * @childControl captionbar {qx.ui.container.Composite} Container for all widgets inside the captionbar
 * @childControl icon {qx.ui.basic.Image} icon at the left of the captionbar
 * @childControl title {qx.ui.basic.Label} caption of the window
 * @childControl minimize-button {qx.ui.form.Button} button to minimize the window
 * @childControl restore-button {qx.ui.form.Button} button to restore the window
 * @childControl maximize-button {qx.ui.form.Button} button to maximize the window
 * @childControl close-button {qx.ui.form.Button} button to close the window
 */
qx.Class.define("qx.ui.window.Window",
{
  extend : qx.ui.core.Widget,

  include :
  [
    qx.ui.core.MRemoteChildrenHandling,
    qx.ui.core.MRemoteLayoutHandling,
    qx.ui.core.MResizable,
    qx.ui.core.MMovable,
    qx.ui.core.MContentPadding
  ],





  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param caption {String} The caption text
   * @param icon {String} The URL of the caption bar icon
   */
  construct : function(caption, icon)
  {
    this.base(arguments);

    // configure internal layout
    this._setLayout(new qx.ui.layout.VBox());

    // force creation of captionbar
    this._createChildControl("captionbar");
    this._createChildControl("pane");

    // apply constructor parameters
    if (icon != null) {
      this.setIcon(icon);
    }

    if (caption != null) {
      this.setCaption(caption);
    }

    // Update captionbar
    this._updateCaptionBar();

    // Activation listener
    this.addListener("pointerdown", this._onWindowPointerDown, this, true);

    // Focusout listener
    this.addListener("focusout", this._onWindowFocusOut, this);

    // Automatically add to application root.
    qx.core.Init.getApplication().getRoot().add(this);

    // Initialize visibiltiy
    this.initVisibility();

    // Register as root for the focus handler
    qx.ui.core.FocusHandler.getInstance().addRoot(this);

    // change the reszie frames appearance
    this._getResizeFrame().setAppearance("window-resize-frame");
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** @type {Class} The default window manager class. */
    DEFAULT_MANAGER_CLASS : qx.ui.window.Manager
  },





  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired before the window is closed.
     *
     * The close action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeClose" : "qx.event.type.Event",

    /** Fired if the window is closed */
    "close" : "qx.event.type.Event",

    /**
     * Fired before the window is minimize.
     *
     * The minimize action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeMinimize" : "qx.event.type.Event",

    /** Fired if the window is minimized */
    "minimize" : "qx.event.type.Event",

    /**
     * Fired before the window is maximize.
     *
     * The maximize action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeMaximize" : "qx.event.type.Event",

    /** Fired if the window is maximized */
    "maximize" : "qx.event.type.Event",

    /**
     * Fired before the window is restored from a minimized or maximized state.
     *
     * The restored action can be prevented by calling
     * {@link qx.event.type.Event#preventDefault} on the event object
     */
    "beforeRestore" : "qx.event.type.Event",

    /** Fired if the window is restored from a minimized or maximized state */
    "restore" : "qx.event.type.Event"
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /*
    ---------------------------------------------------------------------------
      INTERNAL OPTIONS
    ---------------------------------------------------------------------------
    */

    // overridden
    appearance :
    {
      refine : true,
      init : "window"
    },


    // overridden
    visibility :
    {
      refine : true,
      init : "excluded"
    },


    // overridden
    focusable :
    {
      refine : true,
      init : true
    },


    /**
     * If the window is active, only one window in a single qx.ui.window.Manager could
     *  have set this to true at the same time.
     */
    active :
    {
      check : "Boolean",
      init : false,
      apply : "_applyActive",
      event : "changeActive"
    },



    /*
    ---------------------------------------------------------------------------
      BASIC OPTIONS
    ---------------------------------------------------------------------------
    */

    /** Should the window be always on top */
    alwaysOnTop :
    {
      check : "Boolean",
      init : false,
      event : "changeAlwaysOnTop"
    },

    /** Should the window be modal (this disables minimize and maximize buttons) */
    modal :
    {
      check : "Boolean",
      init : false,
      event : "changeModal",
      apply : "_applyModal"
    },


    /** The text of the caption */
    caption :
    {
      apply : "_applyCaptionBarChange",
      event : "changeCaption",
      nullable : true
    },


    /** The icon of the caption */
    icon :
    {
      check : "String",
      nullable : true,
      apply : "_applyCaptionBarChange",
      event : "changeIcon",
      themeable : true
    },


    /** The text of the statusbar */
    status :
    {
      check : "String",
      nullable : true,
      apply : "_applyStatus",
      event :"changeStatus"
    },




    /*
    ---------------------------------------------------------------------------
      HIDE CAPTIONBAR FEATURES
    ---------------------------------------------------------------------------
    */

    /** Should the close button be shown */
    showClose :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },


    /** Should the maximize button be shown */
    showMaximize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },


    /** Should the minimize button be shown */
    showMinimize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange",
      themeable : true
    },




    /*
    ---------------------------------------------------------------------------
      DISABLE CAPTIONBAR FEATURES
    ---------------------------------------------------------------------------
    */

    /** Should the user have the ability to close the window */
    allowClose :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },


    /** Should the user have the ability to maximize the window */
    allowMaximize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },


    /** Should the user have the ability to minimize the window */
    allowMinimize :
    {
      check : "Boolean",
      init : true,
      apply : "_applyCaptionBarChange"
    },




    /*
    ---------------------------------------------------------------------------
      STATUSBAR CONFIG
    ---------------------------------------------------------------------------
    */

    /** Should the statusbar be shown */
    showStatusbar :
    {
      check : "Boolean",
      init : false,
      apply : "_applyShowStatusbar"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /** @type {Integer} Original top value before maximation had occoured */
    __restoredTop : null,

    /** @type {Integer} Original left value before maximation had occoured */
    __restoredLeft : null,



    /*
    ---------------------------------------------------------------------------
      WIDGET API
    ---------------------------------------------------------------------------
    */

    /**
     * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
     * mixin
     *
     * @return {qx.ui.container.Composite} pane sub widget
     */
    getChildrenContainer : function() {
      return this.getChildControl("pane");
    },


    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      active : true,
      maximized : true,
      showStatusbar : true,
      modal : true
    },


    // overridden
    setLayoutParent : function(parent)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        parent && this.assertInterface(
          parent, qx.ui.window.IDesktop,
          "Windows can only be added to widgets, which implement the interface "+
          "qx.ui.window.IDesktop. All root widgets implement this interface."
        );
      }
      this.base(arguments, parent);
    },


    // overridden
    _createChildControlImpl : function(id, hash)
    {
      var control;

      switch(id)
      {
        case "statusbar":
          control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
          this._add(control);
          control.add(this.getChildControl("statusbar-text"));
          break;

        case "statusbar-text":
          control = new qx.ui.basic.Label();
          control.setValue(this.getStatus());
          break;

        case "pane":
          control = new qx.ui.container.Composite();
          this._add(control, {flex: 1});
          break;

        case "captionbar":
          // captionbar
          var layout = new qx.ui.layout.Grid();
          layout.setRowFlex(0, 1);
          layout.setColumnFlex(1, 1);
          control = new qx.ui.container.Composite(layout);
          this._add(control);

          // captionbar events
          control.addListener("dbltap", this._onCaptionPointerDblTap, this);

          // register as move handle
          this._activateMoveHandle(control);
          break;

        case "icon":
          control = new qx.ui.basic.Image(this.getIcon());
          this.getChildControl("captionbar").add(control, {row: 0, column:0});
          break;

        case "title":
          control = new qx.ui.basic.Label(this.getCaption());
          control.setWidth(0);
          control.setAllowGrowX(true);

          var captionBar = this.getChildControl("captionbar");
          captionBar.add(control, {row: 0, column:1});
          break;

        case "minimize-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onMinimizeButtonTap, this);

          this.getChildControl("captionbar").add(control, {row: 0, column:2});
          break;

        case "restore-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onRestoreButtonTap, this);

          this.getChildControl("captionbar").add(control, {row: 0, column:3});
          break;

        case "maximize-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onMaximizeButtonTap, this);

          this.getChildControl("captionbar").add(control, {row: 0, column:4});
          break;

        case "close-button":
          control = new qx.ui.form.Button();
          control.setFocusable(false);
          control.addListener("execute", this._onCloseButtonTap, this);

          this.getChildControl("captionbar").add(control, {row: 0, column:6});
          break;
      }

      return control || this.base(arguments, id);
    },





    /*
    ---------------------------------------------------------------------------
      CAPTIONBAR INTERNALS
    ---------------------------------------------------------------------------
    */

    /**
     * Updates the status and the visibility of each element of the captionbar.
     */
    _updateCaptionBar : function()
    {
      var btn;

      var icon = this.getIcon();
      if (icon) {
        this.getChildControl("icon").setSource(icon);
        this._showChildControl("icon");
      } else {
        this._excludeChildControl("icon");
      }

      var caption = this.getCaption()
      if (caption) {
        this.getChildControl("title").setValue(caption);
        this._showChildControl("title");
      } else {
        this._excludeChildControl("title");
      }

      if (this.getShowMinimize())
      {
        this._showChildControl("minimize-button");

        btn = this.getChildControl("minimize-button");
        this.getAllowMinimize() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("minimize-button");
      }

      if (this.getShowMaximize())
      {
        if (this.isMaximized())
        {
          this._showChildControl("restore-button");
          this._excludeChildControl("maximize-button");
        }
        else
        {
          this._showChildControl("maximize-button");
          this._excludeChildControl("restore-button");
        }

        btn = this.getChildControl("maximize-button");
        this.getAllowMaximize() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("maximize-button");
        this._excludeChildControl("restore-button");
      }

      if (this.getShowClose())
      {
        this._showChildControl("close-button");

        btn = this.getChildControl("close-button");
        this.getAllowClose() ? btn.resetEnabled() : btn.setEnabled(false);
      }
      else
      {
        this._excludeChildControl("close-button");
      }
    },





    /*
    ---------------------------------------------------------------------------
      USER API
    ---------------------------------------------------------------------------
    */

    /**
     * Closes the current window instance.
     * Technically calls the {@link qx.ui.core.Widget#hide} method.
     */
    close : function()
    {
      if (!this.isVisible()) {
        return;
      }

      if (this.fireNonBubblingEvent("beforeClose", qx.event.type.Event, [false, true]))
      {
        this.hide();
        this.fireEvent("close");
      }
    },


    /**
     * Opens the window.
     */
    open : function()
    {
      this.show();
      this.setActive(true);
      this.focus();
    },


    /**
     * Centers the window to the parent.
     *
     * This call works with the size of the parent widget and the size of
     * the window as calculated in the last layout flush. It is best to call
     * this method just after rendering the window in the "resize" event:
     * <pre class='javascript'>
     *   win.addListenerOnce("resize", this.center, this);
     * </pre>
     */
    center : function()
    {
      var parent = this.getLayoutParent();
      if (parent)
      {
        var bounds = parent.getBounds();
        if (bounds)
        {
          var hint = this.getSizeHint();

          var left = Math.round((bounds.width - hint.width) / 2);
          var top = Math.round((bounds.height - hint.height) / 2);

          if (top < 0) {
            top = 0;
          }

          this.moveTo(left, top);

          return;
        }
      }

      if (qx.core.Environment.get("qx.debug"))
      {
        this.warn("Centering depends on parent bounds!");
      }
    },


    /**
     * Maximize the window.
     */
    maximize : function()
    {
      // If the window is already maximized -> return
      if (this.isMaximized()) {
        return;
      }

      // First check if the parent uses a canvas layout
      // Otherwise maximize() is not possible
      var parent = this.getLayoutParent();
      if (parent != null && parent.supportsMaximize())
      {
        if (this.fireNonBubblingEvent("beforeMaximize", qx.event.type.Event, [false, true]))
        {
          if (!this.isVisible()) {
            this.open();
          }

          // store current dimension and location
          var props = this.getLayoutProperties();
          this.__restoredLeft = props.left === undefined ? 0 : props.left;
          this.__restoredTop = props.top === undefined ? 0 : props.top;

          // Update layout properties
          this.setLayoutProperties({
            left: null,
            top: null,
            edge: 0
          });

          // Add state
          this.addState("maximized");

          // Update captionbar
          this._updateCaptionBar();

          // Fire user event
          this.fireEvent("maximize");
        }
      }
    },


    /**
     * Minimized the window.
     */
    minimize : function()
    {
      if (!this.isVisible()) {
        return;
      }

      if (this.fireNonBubblingEvent("beforeMinimize", qx.event.type.Event, [false, true]))
      {
        // store current dimension and location
        var props = this.getLayoutProperties();
        this.__restoredLeft = props.left === undefined ? 0 : props.left;
        this.__restoredTop = props.top === undefined ? 0 : props.top;

        this.removeState("maximized");
        this.hide();
        this.fireEvent("minimize");
      }
    },


    /**
     * Restore the window to <code>"normal"</code>, if it is
     * <code>"maximized"</code> or <code>"minimized"</code>.
     */
    restore : function()
    {
      if (this.getMode() === "normal") {
        return;
      }

      if (this.fireNonBubblingEvent("beforeRestore", qx.event.type.Event, [false, true]))
      {
        if (!this.isVisible()) {
          this.open();
        }

        // Restore old properties
        var left = this.__restoredLeft;
        var top = this.__restoredTop;

        this.setLayoutProperties({
          edge : null,
          left : left,
          top : top
        });

        // Remove maximized state
        this.removeState("maximized");

        // Update captionbar
        this._updateCaptionBar();

        // Fire user event
        this.fireEvent("restore");
      }
    },


    /**
     * Set the window's position relative to its parent
     *
     * @param left {Integer} The left position
     * @param top {Integer} The top position
     */
    moveTo : function(left, top)
    {
      if (this.isMaximized()) {
        return;
      }

      this.setLayoutProperties({
        left : left,
        top : top
      });
    },

    /**
     * Return <code>true</code> if the window is in maximized state,
     * but note that the window in maximized state could also be invisible, this
     * is equivalent to minimized. So use the {@link qx.ui.window.Window#getMode}
     * to get the window mode.
     *
     * @return {Boolean} <code>true</code> if the window is maximized,
     *   <code>false</code> otherwise.
     */
    isMaximized : function()
    {
      return this.hasState("maximized");
    },

    /**
     * Return the window mode as <code>String</code>:
     * <code>"maximized"</code>, <code>"normal"</code> or <code>"minimized"</code>.
     *
     * @return {String} The window mode as <code>String</code> value.
     */
    getMode : function()
    {
      if(!this.isVisible()) {
        return "minimized";
      } else {
        if(this.isMaximized()) {
          return "maximized";
        } else {
          return "normal";
        }
      }
    },

    /*
    ---------------------------------------------------------------------------
      PROPERTY APPLY ROUTINES
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyActive : function(value, old)
    {
      if (old) {
        this.removeState("active");
      } else {
        this.addState("active");
      }
    },


    // property apply
    _applyModal : function(value, old)
    {
      if (old) {
        this.removeState("modal");
      } else {
        this.addState("modal");
      }
    },


    /**
     * Returns the element, to which the content padding should be applied.
     *
     * @return {qx.ui.core.Widget} The content padding target.
     */
    _getContentPaddingTarget : function() {
      return this.getChildControl("pane");
    },


    // property apply
    _applyShowStatusbar : function(value, old)
    {
      // store the state if the status bar is shown
      var resizeFrame = this._getResizeFrame();
      if (value) {
        this.addState("showStatusbar");
        resizeFrame.addState("showStatusbar");
      } else {
        this.removeState("showStatusbar");
        resizeFrame.removeState("showStatusbar");
      }

      if (value) {
        this._showChildControl("statusbar");
      } else {
        this._excludeChildControl("statusbar");
      }
    },


    // property apply
    _applyCaptionBarChange : function(value, old) {
      this._updateCaptionBar();
    },


    // property apply
    _applyStatus : function(value, old)
    {
      var label = this.getChildControl("statusbar-text", true);
      if (label) {
        label.setValue(value);
      }
    },


    // overridden
    _applyFocusable : function(value, old)
    {
      // Workaround for bug #7581: Don't set the tabIndex
      // to prevent native scrolling on focus in IE
      if (qx.core.Environment.get("engine.name") !== "mshtml") {
        this.base(arguments, value, old);
      }
    },


    /*
    ---------------------------------------------------------------------------
      BASIC EVENT HANDLERS
    ---------------------------------------------------------------------------
    */

    /**
     * Stops every event
     *
     * @param e {qx.event.type.Event} any event
     */
    _onWindowEventStop : function(e) {
      e.stopPropagation();
    },


    /**
     * Focuses the window instance.
     *
     * @param e {qx.event.type.Pointer} pointer down event
     */
    _onWindowPointerDown : function(e) {
      this.setActive(true);
    },


    /**
     * Listens to the "focusout" event to deactivate the window (if the
     * currently focused widget is not a child of the window)
     *
     * @param e {qx.event.type.Focus} focus event
     */
    _onWindowFocusOut : function(e) {
      // only needed for non-modal windows
      if (this.getModal())
      {
        return;
      }

      // get the current focused widget and check if it is a child
      var current = e.getRelatedTarget();
      if (current != null && !qx.ui.core.Widget.contains(this, current))
      {
        this.setActive(false);
      }
    },


    /**
     * Maximizes the window or restores it if it is already
     * maximized.
     *
     * @param e {qx.event.type.Pointer} double tap event
     */
    _onCaptionPointerDblTap : function(e)
    {
      if (this.getAllowMaximize()) {
        this.isMaximized() ? this.restore() : this.maximize();
      }
    },




    /*
    ---------------------------------------------------------------------------
      EVENTS FOR CAPTIONBAR BUTTONS
    ---------------------------------------------------------------------------
    */

    /**
     * Minimizes the window, removes all states from the minimize button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.Pointer} pointer tap event
     */
    _onMinimizeButtonTap : function(e)
    {
      this.minimize();
      this.getChildControl("minimize-button").reset();
    },


    /**
     * Restores the window, removes all states from the restore button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.Pointer} pointer pointer event
     */
    _onRestoreButtonTap : function(e)
    {
      this.restore();
      this.getChildControl("restore-button").reset();
    },


    /**
     * Maximizes the window, removes all states from the maximize button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.Pointer} pointer pointer event
     */
    _onMaximizeButtonTap : function(e)
    {
      this.maximize();
      this.getChildControl("maximize-button").reset();
    },


    /**
     * Closes the window, removes all states from the close button and
     * stops the further propagation of the event (calling {@link qx.event.type.Event#stopPropagation}).
     *
     * @param e {qx.event.type.Pointer} pointer pointer event
     */
    _onCloseButtonTap : function(e)
    {
      this.close();
      this.getChildControl("close-button").reset();
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
 * A vertical box layout.
 *
 * The vertical box layout lays out widgets in a vertical column, from top
 * to bottom.
 *
 * *Features*
 *
 * * Minimum and maximum dimensions
 * * Prioritized growing/shrinking (flex)
 * * Margins (with vertical collapsing)
 * * Auto sizing (ignoring percent values)
 * * Percent heights (not relevant for size hint)
 * * Alignment (child property {@link qx.ui.core.LayoutItem#alignY} is ignored)
 * * Vertical spacing (collapsed with margins)
 * * Reversed children layout (from last to first)
 * * Horizontal children stretching (respecting size hints)
 *
 * *Item Properties*
 *
 * <ul>
 * <li><strong>flex</strong> <em>(Integer)</em>: The flexibility of a layout item determines how the container
 *   distributes remaining empty space among its children. If items are made
 *   flexible, they can grow or shrink accordingly. Their relative flex values
 *   determine how the items are being resized, i.e. the larger the flex ratio
 *   of two items, the larger the resizing of the first item compared to the
 *   second.
 *
 *   If there is only one flex item in a layout container, its actual flex
 *   value is not relevant. To disallow items to become flexible, set the
 *   flex value to zero.
 * </li>
 * <li><strong>height</strong> <em>(String)</em>: Allows to define a percent
 *   height for the item. The height in percent, if specified, is used instead
 *   of the height defined by the size hint. The minimum and maximum height still
 *   takes care of the element's limits. It has no influence on the layout's
 *   size hint. Percent values are mostly useful for widgets which are sized by
 *   the outer hierarchy.
 * </li>
 * </ul>
 *
 * *Example*
 *
 * Here is a little example of how to use the vertical box layout.
 *
 * <pre class="javascript">
 * var layout = new qx.ui.layout.VBox();
 * layout.setSpacing(4); // apply spacing
 *
 * var container = new qx.ui.container.Composite(layout);
 *
 * container.add(new qx.ui.core.Widget());
 * container.add(new qx.ui.core.Widget());
 * container.add(new qx.ui.core.Widget());
 * </pre>
 *
 * *External Documentation*
 *
 * See <a href='http://manual.qooxdoo.org/${qxversion}/pages/layout/box.html'>extended documentation</a>
 * and links to demos for this layout.
 *
 */
qx.Class.define("qx.ui.layout.VBox",
{
  extend : qx.ui.layout.Abstract,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param spacing {Integer?0} The spacing between child widgets {@link #spacing}.
   * @param alignY {String?"top"} Vertical alignment of the whole children
   *     block {@link #alignY}.
   * @param separator {String|qx.ui.decoration.IDecorator} A separator to render between the items
   */
  construct : function(spacing, alignY, separator)
  {
    this.base(arguments);

    if (spacing) {
      this.setSpacing(spacing);
    }

    if (alignY) {
      this.setAlignY(alignY);
    }

    if (separator) {
      this.setSeparator(separator);
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
     * Vertical alignment of the whole children block. The vertical
     * alignment of the child is completely ignored in VBoxes (
     * {@link qx.ui.core.LayoutItem#alignY}).
     */
    alignY :
    {
      check : [ "top", "middle", "bottom" ],
      init : "top",
      apply : "_applyLayoutChange"
    },


    /**
     * Horizontal alignment of each child. Can be overridden through
     * {@link qx.ui.core.LayoutItem#alignX}.
     */
    alignX :
    {
      check : [ "left", "center", "right" ],
      init : "left",
      apply : "_applyLayoutChange"
    },


    /** Vertical spacing between two children */
    spacing :
    {
      check : "Integer",
      init : 0,
      apply : "_applyLayoutChange"
    },


    /** Separator lines to use between the objects */
    separator :
    {
      check : "Decorator",
      nullable : true,
      apply : "_applyLayoutChange"
    },


    /** Whether the actual children list should be laid out in reversed order. */
    reversed :
    {
      check : "Boolean",
      init : false,
      apply : "_applyReversed"
    }
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __heights : null,
    __flexs : null,
    __enableFlex : null,
    __children : null,


    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyReversed : function()
    {
      // easiest way is to invalidate the cache
      this._invalidChildrenCache = true;

      // call normal layout change
      this._applyLayoutChange();
    },


    /**
     * Rebuilds caches for flex and percent layout properties
     */
    __rebuildCache : function()
    {
      var children = this._getLayoutChildren();
      var length = children.length;
      var enableFlex = false;
      var reuse = this.__heights && this.__heights.length != length && this.__flexs && this.__heights;
      var props;

      // Sparse array (keep old one if lengths has not been modified)
      var heights = reuse ? this.__heights : new Array(length);
      var flexs = reuse ? this.__flexs : new Array(length);

      // Reverse support
      if (this.getReversed()) {
        children = children.concat().reverse();
      }

      // Loop through children to preparse values
      for (var i=0; i<length; i++)
      {
        props = children[i].getLayoutProperties();

        if (props.height != null) {
          heights[i] = parseFloat(props.height) / 100;
        }

        if (props.flex != null)
        {
          flexs[i] = props.flex;
          enableFlex = true;
        } else {
          // reset (in case the index of the children changed: BUG #3131)
          flexs[i] = 0;
        }
      }

      // Store data
      if (!reuse)
      {
        this.__heights = heights;
        this.__flexs = flexs;
      }

      this.__enableFlex = enableFlex
      this.__children = children;

      // Clear invalidation marker
      delete this._invalidChildrenCache;
    },





    /*
    ---------------------------------------------------------------------------
      LAYOUT INTERFACE
    ---------------------------------------------------------------------------
    */

    // overridden
    verifyLayoutProperty : qx.core.Environment.select("qx.debug",
    {
      "true" : function(item, name, value)
      {
        this.assert(name === "flex" || name === "height", "The property '"+name+"' is not supported by the VBox layout!");

        if (name =="height")
        {
          this.assertMatch(value, qx.ui.layout.Util.PERCENT_VALUE);
        }
        else
        {
          // flex
          this.assertNumber(value);
          this.assert(value >= 0);
        }
      },

      "false" : null
    }),


    // overridden
    renderLayout : function(availWidth, availHeight, padding)
    {
      // Rebuild flex/height caches
      if (this._invalidChildrenCache) {
        this.__rebuildCache();
      }

      // Cache children
      var children = this.__children;
      var length = children.length;
      var util = qx.ui.layout.Util;


      // Compute gaps
      var spacing = this.getSpacing();
      var separator = this.getSeparator();
      if (separator) {
        var gaps = util.computeVerticalSeparatorGaps(children, spacing, separator);
      } else {
        var gaps = util.computeVerticalGaps(children, spacing, true);
      }


      // First run to cache children data and compute allocated height
      var i, child, height, percent;
      var heights = [];
      var allocatedHeight = gaps;

      for (i=0; i<length; i+=1)
      {
        percent = this.__heights[i];

        height = percent != null ?
          Math.floor((availHeight - gaps) * percent) :
          children[i].getSizeHint().height;

        heights.push(height);
        allocatedHeight += height;
      }


      // Flex support (growing/shrinking)
      if (this.__enableFlex && allocatedHeight != availHeight)
      {
        var flexibles = {};
        var flex, offset;

        for (i=0; i<length; i+=1)
        {
          flex = this.__flexs[i];

          if (flex > 0)
          {
            hint = children[i].getSizeHint();

            flexibles[i]=
            {
              min : hint.minHeight,
              value : heights[i],
              max : hint.maxHeight,
              flex : flex
            };
          }
        }

        var result = util.computeFlexOffsets(flexibles, availHeight, allocatedHeight);

        for (i in result)
        {
          offset = result[i].offset;

          heights[i] += offset;
          allocatedHeight += offset;
        }
      }


      // Start with top coordinate
      var top = children[0].getMarginTop();

      // Alignment support
      if (allocatedHeight < availHeight && this.getAlignY() != "top")
      {
        top = availHeight - allocatedHeight;

        if (this.getAlignY() === "middle") {
          top = Math.round(top / 2);
        }
      }


      // Layouting children
      var hint, left, width, height, marginBottom, marginLeft, marginRight;

      // Pre configure separators
      this._clearSeparators();

      // Compute separator height
      if (separator)
      {
        var separatorInsets = qx.theme.manager.Decoration.getInstance().resolve(separator).getInsets();
        var separatorHeight = separatorInsets.top + separatorInsets.bottom;
      }

      // Render children and separators
      for (i=0; i<length; i+=1)
      {
        child = children[i];
        height = heights[i];
        hint = child.getSizeHint();

        marginLeft = child.getMarginLeft();
        marginRight = child.getMarginRight();

        // Find usable width
        width = Math.max(hint.minWidth, Math.min(availWidth-marginLeft-marginRight, hint.maxWidth));

        // Respect horizontal alignment
        left = util.computeHorizontalAlignOffset(child.getAlignX()||this.getAlignX(), width, availWidth, marginLeft, marginRight);

        // Add collapsed margin
        if (i > 0)
        {
          // Whether a separator has been configured
          if (separator)
          {
            // add margin of last child and spacing
            top += marginBottom + spacing;

            // then render the separator at this position
            this._renderSeparator(separator, {
              top : top + padding.top,
              left : padding.left,
              height : separatorHeight,
              width : availWidth
            });

            // and finally add the size of the separator, the spacing (again) and the top margin
            top += separatorHeight + spacing + child.getMarginTop();
          }
          else
          {
            // Support margin collapsing when no separator is defined
            top += util.collapseMargins(spacing, marginBottom, child.getMarginTop());
          }
        }

        // Layout child
        child.renderLayout(left + padding.left, top + padding.top, width, height);

        // Add height
        top += height;

        // Remember bottom margin (for collapsing)
        marginBottom = child.getMarginBottom();
      }
    },


    // overridden
    _computeSizeHint : function()
    {
      // Rebuild flex/height caches
      if (this._invalidChildrenCache) {
        this.__rebuildCache();
      }

      var util = qx.ui.layout.Util;
      var children = this.__children;

      // Initialize
      var minHeight=0, height=0, percentMinHeight=0;
      var minWidth=0, width=0;
      var child, hint, margin;

      // Iterate over children
      for (var i=0, l=children.length; i<l; i+=1)
      {
        child = children[i];
        hint = child.getSizeHint();

        // Sum up heights
        height += hint.height;

        // Detect if child is shrinkable or has percent height and update minHeight
        var flex = this.__flexs[i];
        var percent = this.__heights[i];
        if (flex) {
          minHeight += hint.minHeight;
        } else if (percent) {
          percentMinHeight = Math.max(percentMinHeight, Math.round(hint.minHeight/percent));
        } else {
          minHeight += hint.height;
        }

        // Build horizontal margin sum
        margin = child.getMarginLeft() + child.getMarginRight();

        // Find biggest width
        if ((hint.width+margin) > width) {
          width = hint.width + margin;
        }

        // Find biggest minWidth
        if ((hint.minWidth+margin) > minWidth) {
          minWidth = hint.minWidth + margin;
        }
      }

      minHeight += percentMinHeight;

      // Respect gaps
      var spacing = this.getSpacing();
      var separator = this.getSeparator();
      if (separator) {
        var gaps = util.computeVerticalSeparatorGaps(children, spacing, separator);
      } else {
        var gaps = util.computeVerticalGaps(children, spacing, true);
      }

      // Return hint
      return {
        minHeight : minHeight + gaps,
        height : height + gaps,
        minWidth : minWidth,
        width : width
      };
    }
  },



  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this.__heights = this.__flexs = this.__children = null;
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
 * The grid layout manager arranges the items in a two dimensional
 * grid. Widgets can be placed into the grid's cells and may span multiple rows
 * and columns.
 *
 * *Features*
 *
 * * Flex values for rows and columns
 * * Minimal and maximal column and row sizes
 * * Manually setting of column and row sizes
 * * Horizontal and vertical alignment
 * * Horizontal and vertical spacing
 * * Column and row spans
 * * Auto-sizing
 *
 * *Item Properties*
 *
 * <ul>
 * <li><strong>row</strong> <em>(Integer)</em>: The row of the cell the
 *   widget should occupy. Each cell can only contain one widget. This layout
 *   property is mandatory.
 * </li>
 * <li><strong>column</strong> <em>(Integer)</em>: The column of the cell the
 *   widget should occupy. Each cell can only contain one widget. This layout
 *   property is mandatory.
 * </li>
 * <li><strong>rowSpan</strong> <em>(Integer)</em>: The number of rows, the
 *   widget should span, starting from the row specified in the <code>row</code>
 *   property. The cells in the spanned rows must be empty as well.
 * </li>
 * <li><strong>colSpan</strong> <em>(Integer)</em>: The number of columns, the
 *   widget should span, starting from the column specified in the <code>column</code>
 *   property. The cells in the spanned columns must be empty as well.
 * </li>
 * </ul>
 *
 * *Example*
 *
 * Here is a little example of how to use the grid layout.
 *
 * <pre class="javascript">
 * var layout = new qx.ui.layout.Grid();
 * layout.setRowFlex(0, 1); // make row 0 flexible
 * layout.setColumnWidth(1, 200); // set with of column 1 to 200 pixel
 *
 * var container = new qx.ui.container.Composite(layout);
 * container.add(new qx.ui.core.Widget(), {row: 0, column: 0});
 * container.add(new qx.ui.core.Widget(), {row: 0, column: 1});
 * container.add(new qx.ui.core.Widget(), {row: 1, column: 0, rowSpan: 2});
 * </pre>
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/layout/grid.html'>
 * Extended documentation</a> and links to demos of this layout in the qooxdoo manual.
 */
qx.Class.define("qx.ui.layout.Grid",
{
  extend : qx.ui.layout.Abstract,






  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param spacingX {Integer?0} The horizontal spacing between grid cells.
   *     Sets {@link #spacingX}.
   * @param spacingY {Integer?0} The vertical spacing between grid cells.
   *     Sets {@link #spacingY}.
   */
  construct : function(spacingX, spacingY)
  {
    this.base(arguments);

    this.__rowData = [];
    this.__colData = [];

    if (spacingX) {
      this.setSpacingX(spacingX);
    }

    if (spacingY) {
      this.setSpacingY(spacingY);
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
     * The horizontal spacing between grid cells.
     */
    spacingX :
    {
      check : "Integer",
      init : 0,
      apply : "_applyLayoutChange"
    },


    /**
     * The vertical spacing between grid cells.
     */
    spacingY :
    {
      check : "Integer",
      init : 0,
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
    /** @type {Array} 2D array of grid cell data */
    __grid : null,
    __rowData : null,
    __colData : null,

    __colSpans : null,
    __rowSpans : null,
    __maxRowIndex : null,
    __maxColIndex : null,

    /** @type {Array} cached row heights */
    __rowHeights : null,

    /** @type {Array} cached column widths */
    __colWidths : null,



    // overridden
    verifyLayoutProperty : qx.core.Environment.select("qx.debug",
    {
      "true" : function(item, name, value)
      {
        var layoutProperties = {
          "row" : 1,
          "column" : 1,
          "rowSpan" : 1,
          "colSpan" : 1
        }
        this.assert(layoutProperties[name] == 1, "The property '"+name+"' is not supported by the Grid layout!");
        this.assertInteger(value);
        this.assert(value >= 0, "Value must be positive");
      },

      "false" : null
    }),


    /**
     * Rebuild the internal representation of the grid
     */
    __buildGrid : function()
    {
      var grid = [];
      var colSpans = [];
      var rowSpans = [];

      var maxRowIndex = -1;
      var maxColIndex = -1;

      var children = this._getLayoutChildren();

      for (var i=0,l=children.length; i<l; i++)
      {
        var child = children[i];
        var props = child.getLayoutProperties();

        var row = props.row;
        var column = props.column;

        props.colSpan = props.colSpan || 1;
        props.rowSpan = props.rowSpan || 1;

        // validate arguments
        if (row == null || column == null) {
          throw new Error(
            "The layout properties 'row' and 'column' of the child widget '" +
            child + "' must be defined!"
          );
        }

        if (grid[row] && grid[row][column]) {
          throw new Error(
            "Cannot add widget '" + child + "'!. " +
            "There is already a widget '" + grid[row][column] +
            "' in this cell (" + row + ", " + column + ") for '" + this + "'"
          );
        }

        for (var x=column; x<column+props.colSpan; x++)
        {
          for (var y=row; y<row+props.rowSpan; y++)
          {
            if (grid[y] == undefined) {
               grid[y] = [];
            }

            grid[y][x] = child;

            maxColIndex = Math.max(maxColIndex, x);
            maxRowIndex = Math.max(maxRowIndex, y);
          }
        }

        if (props.rowSpan > 1) {
          rowSpans.push(child);
        }

        if (props.colSpan > 1) {
          colSpans.push(child);
        }
      }

      // make sure all columns are defined so that accessing the grid using
      // this.__grid[column][row] will never raise an exception
      for (var y=0; y<=maxRowIndex; y++) {
        if (grid[y] == undefined) {
           grid[y] = [];
        }
      }

      this.__grid = grid;

      this.__colSpans = colSpans;
      this.__rowSpans = rowSpans;

      this.__maxRowIndex = maxRowIndex;
      this.__maxColIndex = maxColIndex;

      this.__rowHeights = null;
      this.__colWidths = null;

      // Clear invalidation marker
      delete this._invalidChildrenCache;
    },


    /**
     * Stores data for a grid row
     *
     * @param row {Integer} The row index
     * @param key {String} The key under which the data should be stored
     * @param value {var} data to store
     */
    _setRowData : function(row, key, value)
    {
      var rowData = this.__rowData[row];

      if (!rowData)
      {
        this.__rowData[row] = {};
        this.__rowData[row][key] = value;
      }
      else
      {
        rowData[key] = value;
      }
    },


    /**
     * Stores data for a grid column
     *
     * @param column {Integer} The column index
     * @param key {String} The key under which the data should be stored
     * @param value {var} data to store
     */
    _setColumnData : function(column, key, value)
    {
      var colData = this.__colData[column];

      if (!colData)
      {
        this.__colData[column] = {};
        this.__colData[column][key] = value;
      }
      else
      {
        colData[key] = value;
      }
    },


    /**
     * Shortcut to set both horizontal and vertical spacing between grid cells
     * to the same value.
     *
     * @param spacing {Integer} new horizontal and vertical spacing
     * @return {qx.ui.layout.Grid} This object (for chaining support).
     */
    setSpacing : function(spacing)
    {
      this.setSpacingY(spacing);
      this.setSpacingX(spacing);
      return this;
    },


    /**
     * Set the default cell alignment for a column. This alignment can be
     * overridden on a per cell basis by setting the cell's content widget's
     * <code>alignX</code> and <code>alignY</code> properties.
     *
     * If on a grid cell both row and a column alignment is set, the horizontal
     * alignment is taken from the column and the vertical alignment is taken
     * from the row.
     *
     * @param column {Integer} Column index
     * @param hAlign {String} The horizontal alignment. Valid values are
     *    "left", "center" and "right".
     * @param vAlign {String} The vertical alignment. Valid values are
     *    "top", "middle", "bottom"
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setColumnAlign : function(column, hAlign, vAlign)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertInteger(column, "Invalid parameter 'column'");
        this.assertInArray(hAlign, ["left", "center", "right"]);
        this.assertInArray(vAlign, ["top", "middle", "bottom"]);
      }

      this._setColumnData(column, "hAlign", hAlign);
      this._setColumnData(column, "vAlign", vAlign);

      this._applyLayoutChange();

      return this;
    },


    /**
     * Get a map of the column's alignment.
     *
     * @param column {Integer} The column index
     * @return {Map} A map with the keys <code>vAlign</code> and <code>hAlign</code>
     *     containing the vertical and horizontal column alignment.
     */
    getColumnAlign : function(column)
    {
      var colData = this.__colData[column] || {};

      return {
        vAlign : colData.vAlign || "top",
        hAlign : colData.hAlign || "left"
      };
    },


    /**
     * Set the default cell alignment for a row. This alignment can be
     * overridden on a per cell basis by setting the cell's content widget's
     * <code>alignX</code> and <code>alignY</code> properties.
     *
     * If on a grid cell both row and a column alignment is set, the horizontal
     * alignment is taken from the column and the vertical alignment is taken
     * from the row.
     *
     * @param row {Integer} Row index
     * @param hAlign {String} The horizontal alignment. Valid values are
     *    "left", "center" and "right".
     * @param vAlign {String} The vertical alignment. Valid values are
     *    "top", "middle", "bottom"
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setRowAlign : function(row, hAlign, vAlign)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertInteger(row, "Invalid parameter 'row'");
        this.assertInArray(hAlign, ["left", "center", "right"]);
        this.assertInArray(vAlign, ["top", "middle", "bottom"]);
      }

      this._setRowData(row, "hAlign", hAlign);
      this._setRowData(row, "vAlign", vAlign);

      this._applyLayoutChange();

      return this;
    },


    /**
     * Get a map of the row's alignment.
     *
     * @param row {Integer} The Row index
     * @return {Map} A map with the keys <code>vAlign</code> and <code>hAlign</code>
     *     containing the vertical and horizontal row alignment.
     */
    getRowAlign : function(row)
    {
      var rowData = this.__rowData[row] || {};

      return {
        vAlign : rowData.vAlign || "top",
        hAlign : rowData.hAlign || "left"
      };
    },


    /**
     * Get the widget located in the cell. If a the cell is empty or the widget
     * has a {@link qx.ui.core.Widget#visibility} value of <code>exclude</code>,
     * <code>null</code> is returned.
     *
     * @param row {Integer} The cell's row index
     * @param column {Integer} The cell's column index
     * @return {qx.ui.core.Widget|null}The cell's widget. The value may be null.
     */
    getCellWidget : function(row, column)
    {
      if (this._invalidChildrenCache) {
        this.__buildGrid();
      }

      var row = this.__grid[row] || {};
      return row[column] ||  null;
    },


    /**
     * Get the number of rows in the grid layout.
     *
     * @return {Integer} The number of rows in the layout
     */
    getRowCount : function()
    {
      if (this._invalidChildrenCache) {
        this.__buildGrid();
      }

      return this.__maxRowIndex + 1;
    },


    /**
     * Get the number of columns in the grid layout.
     *
     * @return {Integer} The number of columns in the layout
     */
    getColumnCount : function()
    {
      if (this._invalidChildrenCache) {
        this.__buildGrid();
      }

      return this.__maxColIndex + 1;
    },


    /**
     * Get a map of the cell's alignment. For vertical alignment the row alignment
     * takes precedence over the column alignment. For horizontal alignment it is
     * the over way round. If an alignment is set on the cell widget using
     * {@link qx.ui.core.LayoutItem#setLayoutProperties}, this alignment takes
     * always precedence over row or column alignment.
     *
     * @param row {Integer} The cell's row index
     * @param column {Integer} The cell's column index
     * @return {Map} A map with the keys <code>vAlign</code> and <code>hAlign</code>
     *     containing the vertical and horizontal cell alignment.
     */
    getCellAlign : function(row, column)
    {
      var vAlign = "top";
      var hAlign = "left";

      var rowData = this.__rowData[row];
      var colData = this.__colData[column];

      var widget = this.__grid[row][column];
      if (widget)
      {
        var widgetProps = {
          vAlign : widget.getAlignY(),
          hAlign : widget.getAlignX()
        }
      }
      else
      {
        widgetProps = {};
      }

      // compute vAlign
      // precedence : widget -> row -> column
      if (widgetProps.vAlign) {
        vAlign = widgetProps.vAlign;
      } else if (rowData && rowData.vAlign) {
        vAlign = rowData.vAlign;
      } else if (colData && colData.vAlign) {
        vAlign = colData.vAlign;
      }

      // compute hAlign
      // precedence : widget -> column -> row
      if (widgetProps.hAlign) {
        hAlign = widgetProps.hAlign;
      } else if (colData && colData.hAlign) {
        hAlign = colData.hAlign;
      } else if (rowData && rowData.hAlign) {
        hAlign = rowData.hAlign;
      }

      return {
        vAlign : vAlign,
        hAlign : hAlign
      }
    },


    /**
     * Set the flex value for a grid column.
     * By default the column flex value is <code>0</code>.
     *
     * @param column {Integer} The column index
     * @param flex {Integer} The column's flex value
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setColumnFlex : function(column, flex)
    {
      this._setColumnData(column, "flex", flex);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the flex value of a grid column.
     *
     * @param column {Integer} The column index
     * @return {Integer} The column's flex value
     */
    getColumnFlex : function(column)
    {
      var colData = this.__colData[column] || {};
      return colData.flex !== undefined ? colData.flex : 0;
    },


    /**
     * Set the flex value for a grid row.
     * By default the row flex value is <code>0</code>.
     *
     * @param row {Integer} The row index
     * @param flex {Integer} The row's flex value
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setRowFlex : function(row, flex)
    {
      this._setRowData(row, "flex", flex);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the flex value of a grid row.
     *
     * @param row {Integer} The row index
     * @return {Integer} The row's flex value
     */
    getRowFlex : function(row)
    {
      var rowData = this.__rowData[row] || {};
      var rowFlex = rowData.flex !== undefined ? rowData.flex : 0
      return rowFlex;
    },


    /**
     * Set the maximum width of a grid column.
     * The default value is <code>Infinity</code>.
     *
     * @param column {Integer} The column index
     * @param maxWidth {Integer} The column's maximum width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setColumnMaxWidth : function(column, maxWidth)
    {
      this._setColumnData(column, "maxWidth", maxWidth);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the maximum width of a grid column.
     *
     * @param column {Integer} The column index
     * @return {Integer} The column's maximum width
     */
    getColumnMaxWidth : function(column)
    {
      var colData = this.__colData[column] || {};
      return colData.maxWidth !== undefined ? colData.maxWidth : Infinity;
    },


    /**
     * Set the preferred width of a grid column.
     * The default value is <code>Infinity</code>.
     *
     * @param column {Integer} The column index
     * @param width {Integer} The column's width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setColumnWidth : function(column, width)
    {
      this._setColumnData(column, "width", width);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the preferred width of a grid column.
     *
     * @param column {Integer} The column index
     * @return {Integer} The column's width
     */
    getColumnWidth : function(column)
    {
      var colData = this.__colData[column] || {};
      return colData.width !== undefined ? colData.width : null;
    },


    /**
     * Set the minimum width of a grid column.
     * The default value is <code>0</code>.
     *
     * @param column {Integer} The column index
     * @param minWidth {Integer} The column's minimum width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setColumnMinWidth : function(column, minWidth)
    {
      this._setColumnData(column, "minWidth", minWidth);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the minimum width of a grid column.
     *
     * @param column {Integer} The column index
     * @return {Integer} The column's minimum width
     */
    getColumnMinWidth : function(column)
    {
      var colData = this.__colData[column] || {};
      return colData.minWidth || 0;
    },


    /**
     * Set the maximum height of a grid row.
     * The default value is <code>Infinity</code>.
     *
     * @param row {Integer} The row index
     * @param maxHeight {Integer} The row's maximum width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setRowMaxHeight : function(row, maxHeight)
    {
      this._setRowData(row, "maxHeight", maxHeight);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the maximum height of a grid row.
     *
     * @param row {Integer} The row index
     * @return {Integer} The row's maximum width
     */
    getRowMaxHeight : function(row)
    {
      var rowData = this.__rowData[row] || {};
      return rowData.maxHeight || Infinity;
    },


    /**
     * Set the preferred height of a grid row.
     * The default value is <code>Infinity</code>.
     *
     * @param row {Integer} The row index
     * @param height {Integer} The row's width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setRowHeight : function(row, height)
    {
      this._setRowData(row, "height", height);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the preferred height of a grid row.
     *
     * @param row {Integer} The row index
     * @return {Integer} The row's width
     */
    getRowHeight : function(row)
    {
      var rowData = this.__rowData[row] || {};
      return rowData.height !== undefined ? rowData.height : null;
    },


    /**
     * Set the minimum height of a grid row.
     * The default value is <code>0</code>.
     *
     * @param row {Integer} The row index
     * @param minHeight {Integer} The row's minimum width
     * @return {qx.ui.layout.Grid} This object (for chaining support)
     */
    setRowMinHeight : function(row, minHeight)
    {
      this._setRowData(row, "minHeight", minHeight);
      this._applyLayoutChange();
      return this;
    },


    /**
     * Get the minimum height of a grid row.
     *
     * @param row {Integer} The row index
     * @return {Integer} The row's minimum width
     */
    getRowMinHeight : function(row)
    {
      var rowData = this.__rowData[row] || {};
      return rowData.minHeight || 0;
    },


    /**
     * Computes the widget's size hint including the widget's margins
     *
     * @param widget {qx.ui.core.LayoutItem} The widget to get the size for
     * @return {Map} a size hint map
     */
    __getOuterSize : function(widget)
    {
      var hint = widget.getSizeHint();
      var hMargins = widget.getMarginLeft() + widget.getMarginRight();
      var vMargins = widget.getMarginTop() + widget.getMarginBottom();

      var outerSize = {
        height: hint.height + vMargins,
        width: hint.width + hMargins,
        minHeight: hint.minHeight + vMargins,
        minWidth: hint.minWidth + hMargins,
        maxHeight: hint.maxHeight + vMargins,
        maxWidth: hint.maxWidth + hMargins
      }

      return outerSize;
    },


    /**
     * Check whether all row spans fit with their preferred height into the
     * preferred row heights. If there is not enough space, the preferred
     * row sizes are increased. The distribution respects the flex and max
     * values of the rows.
     *
     *  The same is true for the min sizes.
     *
     *  The height array is modified in place.
     *
     * @param rowHeights {Map[]} The current row height array as computed by
     *     {@link #_getRowHeights}.
     */
    _fixHeightsRowSpan : function(rowHeights)
    {
      var vSpacing = this.getSpacingY();

      for (var i=0, l=this.__rowSpans.length; i<l; i++)
      {
        var widget = this.__rowSpans[i];

        var hint = this.__getOuterSize(widget);

        var widgetProps = widget.getLayoutProperties();
        var widgetRow = widgetProps.row;

        var prefSpanHeight = vSpacing * (widgetProps.rowSpan - 1);
        var minSpanHeight = prefSpanHeight;

        var rowFlexes = {};

        for (var j=0; j<widgetProps.rowSpan; j++)
        {
          var row = widgetProps.row+j;
          var rowHeight = rowHeights[row];
          var rowFlex = this.getRowFlex(row);

          if (rowFlex > 0)
          {
            // compute flex array for the preferred height
            rowFlexes[row] =
            {
              min : rowHeight.minHeight,
              value : rowHeight.height,
              max : rowHeight.maxHeight,
              flex: rowFlex
            };
          }

          prefSpanHeight += rowHeight.height;
          minSpanHeight += rowHeight.minHeight;
        }

        // If there is not enough space for the preferred size
        // increment the preferred row sizes.
        if (prefSpanHeight < hint.height)
        {
          if (!qx.lang.Object.isEmpty(rowFlexes)) {
            var rowIncrements = qx.ui.layout.Util.computeFlexOffsets(
              rowFlexes, hint.height, prefSpanHeight
            );

            for (var k=0; k<widgetProps.rowSpan; k++)
            {
              var offset = rowIncrements[widgetRow+k] ? rowIncrements[widgetRow+k].offset : 0;
              rowHeights[widgetRow+k].height += offset;
            }
          // row is too small and we have no flex value set
          } else {
            var totalSpacing = vSpacing * (widgetProps.rowSpan - 1);
            var availableHeight = hint.height - totalSpacing;

            // get the row height which every child would need to share the
            // available hight equally
            var avgRowHeight =
              Math.floor(availableHeight / widgetProps.rowSpan);

            // get the hight already used and the number of children which do
            // not have at least that avg row height
            var usedHeight = 0;
            var rowsNeedAddition = 0;
            for (var k = 0; k < widgetProps.rowSpan; k++) {
              var currentHeight = rowHeights[widgetRow + k].height;
              usedHeight += currentHeight;
              if (currentHeight < avgRowHeight) {
                rowsNeedAddition++;
              }
            }

            // the difference of available and used needs to be shared among
            // those not having the min size
            var additionalRowHeight =
              Math.floor((availableHeight - usedHeight) / rowsNeedAddition);

            // add the extra height to the too small children
            for (var k = 0; k < widgetProps.rowSpan; k++) {
              if (rowHeights[widgetRow + k].height < avgRowHeight) {
                rowHeights[widgetRow + k].height += additionalRowHeight;
              }
            }
          }
        }

        // If there is not enough space for the min size
        // increment the min row sizes.
        if (minSpanHeight < hint.minHeight)
        {
          var rowIncrements = qx.ui.layout.Util.computeFlexOffsets(
            rowFlexes, hint.minHeight, minSpanHeight
          );

          for (var j=0; j<widgetProps.rowSpan; j++)
          {
            var offset = rowIncrements[widgetRow+j] ? rowIncrements[widgetRow+j].offset : 0;
            rowHeights[widgetRow+j].minHeight += offset;
          }
        }
      }
    },


    /**
     * Check whether all col spans fit with their preferred width into the
     * preferred column widths. If there is not enough space the preferred
     * column sizes are increased. The distribution respects the flex and max
     * values of the columns.
     *
     *  The same is true for the min sizes.
     *
     *  The width array is modified in place.
     *
     * @param colWidths {Map[]} The current column width array as computed by
     *     {@link #_getColWidths}.
     */
    _fixWidthsColSpan : function(colWidths)
    {
      var hSpacing = this.getSpacingX();

      for (var i=0, l=this.__colSpans.length; i<l; i++)
      {
        var widget = this.__colSpans[i];

        var hint = this.__getOuterSize(widget);

        var widgetProps = widget.getLayoutProperties();
        var widgetColumn = widgetProps.column;

        var prefSpanWidth = hSpacing * (widgetProps.colSpan - 1);
        var minSpanWidth = prefSpanWidth;

        var colFlexes = {};

        var offset;

        for (var j=0; j<widgetProps.colSpan; j++)
        {
          var col = widgetProps.column+j;
          var colWidth = colWidths[col];
          var colFlex = this.getColumnFlex(col);

          // compute flex array for the preferred width
          if (colFlex > 0)
          {
            colFlexes[col] =
            {
              min : colWidth.minWidth,
              value : colWidth.width,
              max : colWidth.maxWidth,
              flex: colFlex
            };
          }

          prefSpanWidth += colWidth.width;
          minSpanWidth += colWidth.minWidth;
        }

        // If there is not enought space for the preferred size
        // increment the preferred column sizes.
        if (prefSpanWidth < hint.width)
        {
          var colIncrements = qx.ui.layout.Util.computeFlexOffsets(
            colFlexes, hint.width, prefSpanWidth
          );

          for (var j=0; j<widgetProps.colSpan; j++)
          {
            offset = colIncrements[widgetColumn+j] ? colIncrements[widgetColumn+j].offset : 0;
            colWidths[widgetColumn+j].width += offset;
          }
        }

        // If there is not enought space for the min size
        // increment the min column sizes.
        if (minSpanWidth < hint.minWidth)
        {
          var colIncrements = qx.ui.layout.Util.computeFlexOffsets(
            colFlexes, hint.minWidth, minSpanWidth
          );

          for (var j=0; j<widgetProps.colSpan; j++)
          {
            offset = colIncrements[widgetColumn+j] ? colIncrements[widgetColumn+j].offset : 0;
            colWidths[widgetColumn+j].minWidth += offset;
          }
        }
      }
    },


    /**
     * Compute the min/pref/max row heights.
     *
     * @return {Map[]} An array containg height information for each row. The
     *     entries have the keys <code>minHeight</code>, <code>maxHeight</code> and
     *     <code>height</code>.
     */
    _getRowHeights : function()
    {
      if (this.__rowHeights != null) {
        return this.__rowHeights;
      }

      var rowHeights = [];

      var maxRowIndex = this.__maxRowIndex;
      var maxColIndex = this.__maxColIndex;

      for (var row=0; row<=maxRowIndex; row++)
      {
        var minHeight = 0;
        var height = 0;
        var maxHeight = 0;

        for (var col=0; col<=maxColIndex; col++)
        {
          var widget = this.__grid[row][col];
          if (!widget) {
            continue;
          }

          // ignore rows with row spans at this place
          // these rows will be taken into account later
          var widgetRowSpan = widget.getLayoutProperties().rowSpan || 0;
          if (widgetRowSpan > 1) {
            continue;
          }

          var cellSize = this.__getOuterSize(widget);

          if (this.getRowFlex(row) > 0) {
            minHeight = Math.max(minHeight, cellSize.minHeight);
          } else {
            minHeight = Math.max(minHeight, cellSize.height);
          }

          height = Math.max(height, cellSize.height);
        }

        var minHeight = Math.max(minHeight, this.getRowMinHeight(row));
        var maxHeight = this.getRowMaxHeight(row);

        if (this.getRowHeight(row) !== null) {
          var height = this.getRowHeight(row);
        } else {
          var height = Math.max(minHeight, Math.min(height, maxHeight));
        }

        rowHeights[row] = {
          minHeight : minHeight,
          height : height,
          maxHeight : maxHeight
        };
      }

      if (this.__rowSpans.length > 0) {
        this._fixHeightsRowSpan(rowHeights);
      }

      this.__rowHeights = rowHeights;
      return rowHeights;
    },


    /**
     * Compute the min/pref/max column widths.
     *
     * @return {Map[]} An array containg width information for each column. The
     *     entries have the keys <code>minWidth</code>, <code>maxWidth</code> and
     *     <code>width</code>.
     */
    _getColWidths : function()
    {
      if (this.__colWidths != null) {
        return this.__colWidths;
      }

      var colWidths = [];

      var maxColIndex = this.__maxColIndex;
      var maxRowIndex = this.__maxRowIndex;

      for (var col=0; col<=maxColIndex; col++)
      {
        var width = 0;
        var minWidth = 0;
        var maxWidth = Infinity;

        for (var row=0; row<=maxRowIndex; row++)
        {
          var widget = this.__grid[row][col];
          if (!widget) {
            continue;
          }

          // ignore columns with col spans at this place
          // these columns will be taken into account later
          var widgetColSpan = widget.getLayoutProperties().colSpan || 0;
          if (widgetColSpan > 1) {
            continue;
          }

          var cellSize = this.__getOuterSize(widget);

          if (this.getColumnFlex(col) > 0) {
            minWidth = Math.max(minWidth, cellSize.minWidth);
          } else {
            minWidth = Math.max(minWidth, cellSize.width);
          }

          width = Math.max(width, cellSize.width);
        }

        minWidth = Math.max(minWidth, this.getColumnMinWidth(col));
        maxWidth = this.getColumnMaxWidth(col);

        if (this.getColumnWidth(col) !== null) {
          var width = this.getColumnWidth(col);
        } else {
          var width = Math.max(minWidth, Math.min(width, maxWidth));
        }

        colWidths[col] = {
          minWidth: minWidth,
          width : width,
          maxWidth : maxWidth
        };
      }

      if (this.__colSpans.length > 0) {
        this._fixWidthsColSpan(colWidths);
      }

      this.__colWidths = colWidths;
      return colWidths;
    },


    /**
     * Computes for each column by how many pixels it must grow or shrink, taking
     * the column flex values and min/max widths into account.
     *
     * @param width {Integer} The grid width
     * @return {Integer[]} Sparse array of offsets to add to each column width. If
     *     an array entry is empty nothing should be added to the column.
     */
    _getColumnFlexOffsets : function(width)
    {
      var hint = this.getSizeHint();
      var diff = width - hint.width;

      if (diff == 0) {
        return {};
      }

      // collect all flexible children
      var colWidths = this._getColWidths();
      var flexibles = {};

      for (var i=0, l=colWidths.length; i<l; i++)
      {
        var col = colWidths[i];
        var colFlex = this.getColumnFlex(i);

        if (
          (colFlex <= 0) ||
          (col.width == col.maxWidth && diff > 0) ||
          (col.width == col.minWidth && diff < 0)
        ) {
          continue;
        }

        flexibles[i] ={
          min : col.minWidth,
          value : col.width,
          max : col.maxWidth,
          flex : colFlex
        };
      }

      return qx.ui.layout.Util.computeFlexOffsets(flexibles, width, hint.width);
    },


    /**
     * Computes for each row by how many pixels it must grow or shrink, taking
     * the row flex values and min/max heights into account.
     *
     * @param height {Integer} The grid height
     * @return {Integer[]} Sparse array of offsets to add to each row height. If
     *     an array entry is empty nothing should be added to the row.
     */
    _getRowFlexOffsets : function(height)
    {
      var hint = this.getSizeHint();
      var diff = height - hint.height;

      if (diff == 0) {
        return {};
      }

      // collect all flexible children
      var rowHeights = this._getRowHeights();
      var flexibles = {};

      for (var i=0, l=rowHeights.length; i<l; i++)
      {
        var row = rowHeights[i];
        var rowFlex = this.getRowFlex(i);

        if (
          (rowFlex <= 0) ||
          (row.height == row.maxHeight && diff > 0) ||
          (row.height == row.minHeight && diff < 0)
        ) {
          continue;
        }

        flexibles[i] = {
          min : row.minHeight,
          value : row.height,
          max : row.maxHeight,
          flex : rowFlex
        };
      }

      return qx.ui.layout.Util.computeFlexOffsets(flexibles, height, hint.height);
    },


    // overridden
    renderLayout : function(availWidth, availHeight, padding)
    {
      if (this._invalidChildrenCache) {
        this.__buildGrid();
      }

      var Util = qx.ui.layout.Util;
      var hSpacing = this.getSpacingX();
      var vSpacing = this.getSpacingY();

      // calculate column widths
      var prefWidths = this._getColWidths();
      var colStretchOffsets = this._getColumnFlexOffsets(availWidth);

      var colWidths = [];

      var maxColIndex = this.__maxColIndex;
      var maxRowIndex = this.__maxRowIndex;

      var offset;

      for (var col=0; col<=maxColIndex; col++)
      {
        offset = colStretchOffsets[col] ? colStretchOffsets[col].offset : 0;
        colWidths[col] = prefWidths[col].width + offset;
      }

      // calculate row heights
      var prefHeights = this._getRowHeights();
      var rowStretchOffsets = this._getRowFlexOffsets(availHeight);

      var rowHeights = [];

      for (var row=0; row<=maxRowIndex; row++)
      {
        offset = rowStretchOffsets[row] ? rowStretchOffsets[row].offset : 0;
        rowHeights[row] = prefHeights[row].height + offset;
      }

      // do the layout
      var left = 0;
      for (var col=0; col<=maxColIndex; col++)
      {
        var top = 0;

        for (var row=0; row<=maxRowIndex; row++)
        {
          var widget = this.__grid[row][col];

          // ignore empty cells
          if (!widget)
          {
            top += rowHeights[row] + vSpacing;
            continue;
          }

          var widgetProps = widget.getLayoutProperties();

          // ignore cells, which have cell spanning but are not the origin
          // of the widget
          if(widgetProps.row !== row || widgetProps.column !== col)
          {
            top += rowHeights[row] + vSpacing;
            continue;
          }

          // compute sizes width including cell spanning
          var spanWidth = hSpacing * (widgetProps.colSpan - 1);
          for (var i=0; i<widgetProps.colSpan; i++) {
            spanWidth += colWidths[col+i];
          }

          var spanHeight = vSpacing * (widgetProps.rowSpan - 1);
          for (var i=0; i<widgetProps.rowSpan; i++) {
            spanHeight += rowHeights[row+i];
          }

          var cellHint = widget.getSizeHint();
          var marginTop = widget.getMarginTop();
          var marginLeft = widget.getMarginLeft();
          var marginBottom = widget.getMarginBottom();
          var marginRight = widget.getMarginRight();

          var cellWidth = Math.max(cellHint.minWidth, Math.min(spanWidth-marginLeft-marginRight, cellHint.maxWidth));
          var cellHeight = Math.max(cellHint.minHeight, Math.min(spanHeight-marginTop-marginBottom, cellHint.maxHeight));

          var cellAlign = this.getCellAlign(row, col);
          var cellLeft = left + Util.computeHorizontalAlignOffset(cellAlign.hAlign, cellWidth, spanWidth, marginLeft, marginRight);
          var cellTop = top + Util.computeVerticalAlignOffset(cellAlign.vAlign, cellHeight, spanHeight, marginTop, marginBottom);

          widget.renderLayout(
            cellLeft + padding.left,
            cellTop + padding.top,
            cellWidth,
            cellHeight
          );

          top += rowHeights[row] + vSpacing;
        }

        left += colWidths[col] + hSpacing;
      }
    },


    // overridden
    invalidateLayoutCache : function()
    {
      this.base(arguments);

      this.__colWidths = null;
      this.__rowHeights = null;
    },


    // overridden
    _computeSizeHint : function()
    {
      if (this._invalidChildrenCache) {
        this.__buildGrid();
      }

      // calculate col widths
      var colWidths = this._getColWidths();

      var minWidth=0, width=0;

      for (var i=0, l=colWidths.length; i<l; i++)
      {
        var col = colWidths[i];
        if (this.getColumnFlex(i) > 0) {
          minWidth += col.minWidth;
        } else {
          minWidth += col.width;
        }

        width += col.width;
      }

      // calculate row heights
      var rowHeights = this._getRowHeights();

      var minHeight=0, height=0;
      for (var i=0, l=rowHeights.length; i<l; i++)
      {
        var row = rowHeights[i];

        if (this.getRowFlex(i) > 0) {
          minHeight += row.minHeight;
        } else {
          minHeight += row.height;
        }

        height += row.height;
      }

      var spacingX = this.getSpacingX() * (colWidths.length - 1);
      var spacingY = this.getSpacingY() * (rowHeights.length - 1);

      var hint = {
        minWidth : minWidth + spacingX,
        width : width + spacingX,
        minHeight : minHeight + spacingY,
        height : height + spacingY
      };

      return hint;
    }
  },




  /*
  *****************************************************************************
     DESTRUCT
  *****************************************************************************
  */

  destruct : function()
  {
    this.__grid = this.__rowData = this.__colData = this.__colSpans =
      this.__rowSpans = this.__colWidths = this.__rowHeights = null;
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * This mixin is included by all widgets, which support an 'execute' like
 * buttons or menu entries.
 */
qx.Mixin.define("qx.ui.core.MExecutable",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired if the {@link #execute} method is invoked.*/
    "execute" : "qx.event.type.Event"
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * A command called if the {@link #execute} method is called, e.g. on a
     * button tap.
     */
    command :
    {
      check : "qx.ui.command.Command",
      apply : "_applyCommand",
      event : "changeCommand",
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
    __executableBindingIds : null,
    __semaphore : false,
    __executeListenerId : null,


    /**
     * @type {Map} Set of properties, which will by synced from the command to the
     *    including widget
     *
     * @lint ignoreReferenceField(_bindableProperties)
     */
    _bindableProperties :
    [
      "enabled",
      "label",
      "icon",
      "toolTipText",
      "value",
      "menu"
    ],


    /**
     * Initiate the execute action.
     */
    execute : function()
    {
      var cmd = this.getCommand();

      if (cmd) {
        if (this.__semaphore) {
          this.__semaphore = false;
        } else {
          this.__semaphore = true;
          cmd.execute(this);
        }
      }

      this.fireEvent("execute");
    },


    /**
     * Handler for the execute event of the command.
     *
     * @param e {qx.event.type.Event} The execute event of the command.
     */
    __onCommandExecute : function(e) {
      if (this.__semaphore) {
        this.__semaphore = false;
        return;
      }
      if (this.isEnabled()) {
        this.__semaphore = true;
        this.execute();
      }
    },


    // property apply
    _applyCommand : function(value, old)
    {
      // execute forwarding
      if (old != null) {
        old.removeListenerById(this.__executeListenerId);
      }
      if (value != null) {
        this.__executeListenerId = value.addListener(
          "execute", this.__onCommandExecute, this
        );
      }

      // binding stuff
      var ids = this.__executableBindingIds;
      if (ids == null) {
        this.__executableBindingIds = ids = {};
      }

      var selfPropertyValue;
      for (var i = 0; i < this._bindableProperties.length; i++) {
        var property = this._bindableProperties[i];

        // remove the old binding
        if (old != null && !old.isDisposed() && ids[property] != null)
        {
          old.removeBinding(ids[property]);
          ids[property] = null;
        }

        // add the new binding
        if (value != null && qx.Class.hasProperty(this.constructor, property)) {
          // handle the init value (dont sync the initial null)
          var cmdPropertyValue = value.get(property);
          if (cmdPropertyValue == null) {
            selfPropertyValue = this.get(property);
            // check also for themed values [BUG #5906]
            if (selfPropertyValue == null) {
              // update the appearance to make sure every themed property is up to date
              this.syncAppearance();
              selfPropertyValue = qx.util.PropertyUtil.getThemeValue(
                this, property
              );
            }
          } else {
            // Reset the self property value [BUG #4534]
            selfPropertyValue = null;
          }
          // set up the binding
          ids[property] = value.bind(property, this, property);
          // reapply the former value
          if (selfPropertyValue) {
            this.set(property, selfPropertyValue);
          }
        }
      }
    }
  },


  destruct : function() {
    this._applyCommand(null, this.getCommand());
    this.__executableBindingIds = null;
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
 * Form interface for all form widgets which are executable in some way. This
 * could be a button for example.
 */
qx.Interface.define("qx.ui.form.IExecutable",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * Fired when the widget is executed. Sets the "data" property of the
     * event to the object that issued the command.
     */
    "execute" : "qx.event.type.Data"
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
      COMMAND PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Set the command of this executable.
     *
     * @param command {qx.ui.command.Command} The command.
     */
    setCommand : function(command) {
      return arguments.length == 1;
    },


    /**
     * Return the current set command of this executable.
     *
     * @return {qx.ui.command.Command} The current set command.
     */
    getCommand : function() {},


    /**
     * Fire the "execute" event on the command.
     */
    execute: function() {}
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
 * A Button widget which supports various states and allows it to be used
 * via the mouse, touch, pen and the keyboard.
 *
 * If the user presses the button by clicking on it, or the <code>Enter</code> or
 * <code>Space</code> keys, the button fires an {@link qx.ui.core.MExecutable#execute} event.
 *
 * If the {@link qx.ui.core.MExecutable#command} property is set, the
 * command is executed as well.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var button = new qx.ui.form.Button("Hello World");
 *
 *   button.addListener("execute", function(e) {
 *     alert("Button was clicked");
 *   }, this);
 *
 *   this.getRoot().add(button);
 * </pre>
 *
 * This example creates a button with the label "Hello World" and attaches an
 * event listener to the {@link #execute} event.
 *
 * *External Documentation*
 *
 * <a href='http://manual.qooxdoo.org/${qxversion}/pages/widget/button.html' target='_blank'>
 * Documentation of this widget in the qooxdoo manual.</a>
 */
qx.Class.define("qx.ui.form.Button",
{
  extend : qx.ui.basic.Atom,
  include : [qx.ui.core.MExecutable],
  implement : [qx.ui.form.IExecutable],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} label of the atom
   * @param icon {String?null} Icon URL of the atom
   * @param command {qx.ui.command.Command?null} Command instance to connect with
   */
  construct : function(label, icon, command)
  {
    this.base(arguments, label, icon);

    if (command != null) {
      this.setCommand(command);
    }

    // Add listeners
    this.addListener("pointerover", this._onPointerOver);
    this.addListener("pointerout", this._onPointerOut);
    this.addListener("pointerdown", this._onPointerDown);
    this.addListener("pointerup", this._onPointerUp);
    this.addListener("tap", this._onTap);

    this.addListener("keydown", this._onKeyDown);
    this.addListener("keyup", this._onKeyUp);

    // Stop events
    this.addListener("dblclick", function(e) {
      e.stopPropagation();
    });
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
      init : "button"
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
    // overridden
    /**
     * @lint ignoreReferenceField(_forwardStates)
     */
    _forwardStates :
    {
      focused : true,
      hovered : true,
      pressed : true,
      disabled : true
    },


    /*
    ---------------------------------------------------------------------------
      USER API
    ---------------------------------------------------------------------------
    */

    /**
     * Manually press the button
     */
    press : function()
    {
      if (this.hasState("abandoned")) {
        return;
      }

      this.addState("pressed");
    },


    /**
     * Manually release the button
     */
    release : function()
    {
      if (this.hasState("pressed")) {
        this.removeState("pressed");
      }
    },


    /**
     * Completely reset the button (remove all states)
     */
    reset : function()
    {
      this.removeState("pressed");
      this.removeState("abandoned");
      this.removeState("hovered");
    },



    /*
    ---------------------------------------------------------------------------
      EVENT LISTENERS
    ---------------------------------------------------------------------------
    */

    /**
     * Listener method for "pointerover" event
     * <ul>
     * <li>Adds state "hovered"</li>
     * <li>Removes "abandoned" and adds "pressed" state (if "abandoned" state is set)</li>
     * </ul>
     *
     * @param e {Event} Mouse event
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
     * @param e {Event} Mouse event
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
      }
    },


    /**
     * Listener method for "pointerdown" event
     * <ul>
     * <li>Removes "abandoned" state</li>
     * <li>Adds "pressed" state</li>
     * </ul>
     *
     * @param e {Event} Mouse event
     */
    _onPointerDown : function(e)
    {
      if (!e.isLeftPressed()) {
        return;
      }

      e.stopPropagation();

      // Activate capturing if the button get a pointerout while
      // the button is pressed.
      this.capture();

      this.removeState("abandoned");
      this.addState("pressed");
    },


    /**
     * Listener method for "pointerup" event
     * <ul>
     * <li>Removes "pressed" state (if set)</li>
     * <li>Removes "abandoned" state (if set)</li>
     * <li>Adds "hovered" state (if "abandoned" state is not set)</li>
     *</ul>
     *
     * @param e {Event} Mouse event
     */
    _onPointerUp : function(e)
    {
      this.releaseCapture();

      // We must remove the states before executing the command
      // because in cases were the window lost the focus while
      // executing we get the capture phase back (mouseout).
      var hasPressed = this.hasState("pressed");
      var hasAbandoned = this.hasState("abandoned");

      if (hasPressed) {
        this.removeState("pressed");
      }

      if (hasAbandoned) {
        this.removeState("abandoned");
      }

      e.stopPropagation();
    },


    /**
     * Listener method for "tap" event which stops the propagation.
     *
     * @param e {qx.event.type.Pointer} Pointer event
     */
    _onTap : function(e) {
      // "execute" is fired here so that the button can be dragged
      // without executing it (e.g. in a TabBar with overflow)
      this.execute();
      e.stopPropagation();
    },


    /**
     * Listener method for "keydown" event.<br/>
     * Removes "abandoned" and adds "pressed" state
     * for the keys "Enter" or "Space"
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
      }
    },


    /**
     * Listener method for "keyup" event.<br/>
     * Removes "abandoned" and "pressed" state (if "pressed" state is set)
     * for the keys "Enter" or "Space"
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
            this.removeState("abandoned");
            this.removeState("pressed");
            this.execute();
            e.stopPropagation();
          }
      }
    }
  }
});

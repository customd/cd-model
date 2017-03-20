/**
 * Implements useful methods applicable to DF_Model objects passed to the front end.
 *
 * @version 1.4.0
 *
 * @author Josh Smith <josh@customd.com>
 * @author Sam Sehnert <sam@customd.com>
 * @author Craig Smith <craig.smith@customd.com>
 *
 * @since 1.4.0 Allows the option to make a model abort simultaneous requests.
 * @since 1.3.2 Fixes another issue with multiple initialisations.
 * @since 1.3.1 Fixes an issue with multiple initialisations of multiple model collection instances.
 * @since 1.3.0 Added methods to support API pagination and sorting.
 * @since 1.2.0 Removed unecessary _init defined on the model. Couldn't be used and was causing issues.
 * @since 1.1.0 Improvements to setup and init process..
 * @since 1.0.0 Introduced.
 */
/* global jQuery:true */
/* global array:true */

var CD_Model, CD_Result;

// This closure allows us to "use strict" in a safe way.
// We define globals CD_Model and CD_Result above, and set
// them from within the closure.
(function($){

	"use strict";

	// Setup default settings.
	var Model_Collection_defaults = {
		endpoint 	: '',
		params 		: {},
		attribute	: 'data',
		init		: false,
		remote 		: false,
	};

	/**
	 * Custom D Model Object
	 *
	 * @author Josh Smith <josh@customd.com>
	 *
	 * @since  1.0.0 Introduced.
	 *
	 * @param {Object} properties 		Properties of this Object
	 * @param {string} Result_Object 	Name of Result Object Class to instantiate
	 */
	CD_Model = function(properties)
	{
		// Determine Object
		var Result_Object = (typeof this.Result_Model === 'undefined' ? 'CD_Result' : this.Result_Model);

		if( typeof properties === 'object' )
		{
			for(var prop in properties)
			{
				this.push(new window[Result_Object](properties[prop]));
			}
		}
	};


	/**
	 * Extends CD_Model, and therefore array.js and returns a function
	 *
	 * @author Josh Smith <josh@customd.com>
	 * @author Sam Sehnert <josh@customd.com>
	 *
	 * @since  1.2.0 Removed _init Deferred that was impossible to actaully get to.
	 * @since  1.1.0 Added ability to extend individual settings instead of overwriting the whole object.
	 * @since  1.0.0 Introduced
	 *
	 * @param  {Object} 	methods Additonal methods to go onto the prototype
	 * @return {Function}
	 */
	CD_Model.extend = function(methods){

		// Assign methods, and settings
		methods				= (typeof methods === 'undefined' ? {} : methods);
		methods.settings	= ('settings' in methods) ? methods.settings : {} ;

		/**
		 * Model Collection Constructor
		 *
		 * @author  Josh Smith <josh@customd.com>
		 * @since   1.0.0 Introduced.
		 *
		 * @param {Object} properties Unique properties of this Object
		 */
		function Model_Collection(properties)
		{
			var mc = this;

			// Encapsulate the initialisation promise.
			this._init_ajax = false;
			this._init = $.Deferred();

			// Make an ajax request to retrieve data, if set.
			if( !properties && mc.settings.init && mc.settings.endpoint )
			{
				// Fire off a request to get collection data, then call the parent object
				this.init();
			}

			// Just set the properties on this object using the parent objects method.
			else if(typeof properties !== 'undefined')
			{
				// Call the parent Object
				CD_Model.call(this, properties);
			}

			return this.__construct();
		}

		// Set the prototype and constructor properties
		Model_Collection.prototype = Object.create(this.prototype);
		Model_Collection.prototype.constructor = Model_Collection;
		CD_Model.prototype._last_request = false;

		/**
		 * Model Collection Sugary Construct Function
		 * @return void
		 */
		Model_Collection.prototype.__construct = function(){};


		/**
		 * Model Collection init/loader function.
		 *
		 * Allows deferred loading after some setup has taken place.
		 *
		 * @author Sam Sehnert <sam@teamdf.com>
		 *
		 * @since  1.1.0 Introduced
		 */
		Model_Collection.prototype.init = function(params)
		{
			var mc = this;

			// If the promise hasn't already been resolved...
			if( ! mc._init_ajax)
			{
				if( $.isPlainObject(params) )
				{
					mc.settings.params = $.extend({}, mc.settings.params, params);
				}

				// Fire off a request to get collection data, then call the parent object
				// and save this AJAX request as the promise.
				mc._init = this.api().get(mc.settings.params)
					.done(function(response){
						CD_Model.call(mc, response[mc.settings.attribute]);
					});

				mc._init_ajax = true;
			}

			// Return the promise.
			return mc._init.promise();
		};


		/**
		 * Model Collection Prototype Settings
		 * First thing we do is copy the existing Model_Collection_defaults onto this object.
		 * @type {Object}
		 */
		Model_Collection.prototype.settings = $.extend({},Model_Collection_defaults);

		/**
		 * Assign custom values to the prototype.
		 * This typically contains methods (e.g., init, __constructor, etc),
		 * properties (e.g., Result_Model) or the settings object.
		 */
		for(var key in methods)
		{
			// If the methods key we're tyring to set already exists on the prototype AND that prototype
			// is a plain object, then we want to extend that object, not replace it.
			// E.g., in the case of 'Model_Collection.prototype.settings', that is already an object on the
			// prototype, so any methods.settings values should extend the Model_Collection.prototype.settings.
			//
			// All other prototype variables will be replaced by the associated value passed in methods.

			if( $.isPlainObject(Model_Collection.prototype[key]))
			{
				Model_Collection.prototype[key] = $.extend(Model_Collection.prototype[key], methods[key]);
			}
			else
			{
				// Set the method onto the property.
				Model_Collection.prototype[key] = methods[key];
			}
		}

		return Model_Collection;
	};



	/**
	* Prototype of the Model Object
	* @type {Object}
	*/
	CD_Model.prototype = Object.create(array.prototype);
	CD_Model.prototype.constructor = CD_Model;



	/**
	 * Provide an API toolset on the CD_Model prototype
	 *
	 * @author Josh Smith <josh@customd.com>
	 * @since  1.0.0 Introduced.
	 *
	 * TODO: Allow setting of request headers for AJAX request.
	 *
	 * @return {Function}
	 */
	CD_Model.prototype.api = function(){

		//
		// Define properties on the API object
		//
		var self = this;

		/**
		 * Private API request method
		 *
		 * @author Josh Smith <josh@customd.com>
		 * @since  1.4.0 Added ability to discard simultaneous requests.
		 * @since  1.0.0 Introduced.
		 *
		 * @param  {String} method GET|PUT|POST|DELETE
		 * @param  {Object} data   Data to Put/Post
		 * @return {Object}        Ajax Promise
		 */
		 var _make_request = function(method, endpoint, data){

             // Make sure an API Endpoint has been defined
             if( ! this.settings.endpoint )
             {
                 throw 'Error: The API Toolset has not been setup correctly.';
             }

             // Build a request object
             var request = {
                 'method'     : method,
                 'url'        : this.settings.endpoint.replace(/\/+$/, '') + '/' + endpoint,
                 'dataType'   : 'json',
                 'timeout'    : 5000,
                 'headers'    : {},
             };

             if( method !== 'get' && data )
             {
                 request.data = data;
             }

             if (this._last_request !== false)
			 {
                 var lq = this._last_request;
                 request.beforeSend = function (){
	                 if (lq !== null && lq !== true)
					 {
	                     lq.abort();
	                 }
                 };
                 this._last_request = $.ajax(request);
                 return this._last_request;
             }
             return $.ajax(request);
         };

		/**
		 * Return a function set used to communicate with the back end server.
		 */
		return {

			/**
			 * Perform a GET request, to the given endpoint.
			 * @param  {[type]} params [description]
			 * @param  {[type]} endpoint [description]
			 * @return {[type]}        [description]
			 *
			 * @since 1.0.1 Added clause to filter null params from query.
			 * @since 1.0.0 Introduced
			 */
			get : function(params, endpoint){

				var query_string = '';

				if( $.isPlainObject(params) )
				{
					for(var resource in params)
					{
						if( params.hasOwnProperty(resource) && params[resource] !== null )
						{
							if( query_string === '' )
							{
								query_string = '?' + encodeURIComponent(resource) + '=' + encodeURIComponent(params[resource]);
							}
							else
							{
								query_string += '&' + encodeURIComponent(resource) + '=' + encodeURIComponent(params[resource]);
							}
						}
					}
				}
				else if( params )
				{
					query_string = params;
				}

				if( endpoint )
				{
					query_string = endpoint + '/' + query_string;
				}

				return _make_request.apply(self, ['get', query_string]);
			},

			/**
			 * [put description]
			 * @param  {[type]} data   [description]
			 * @param  {[type]} endpoint [description]
			 * @return {[type]}        [description]
			 */
			put : function(data, endpoint){
				return _make_request.apply(self, ['put', endpoint, data]);
			},

			/**
			 * [post description]
			 * @param  {[type]} data   [description]
			 * @param  {[type]} endpoint [description]
			 * @return {[type]}        [description]
			 */
			post : function(data, endpoint){
				return _make_request.apply(self, ['post', endpoint, data]);
			},

			/**
			 * [delete description]
			 * @param  {[type]} data   [description]
			 * @param  {[type]} endpoint [description]
			 * @return {[type]}        [description]
			 */
			delete : function(data, params){
				return _make_request.apply(self, ['delete', params]);
			},

		};

	};


	/**
	 * Retrieves a record from internal properties, by ID.
	 *
	 * @author Josh Smith <josh@customd.com>
	 *
	 * @since 1.0.0 Introduced
	 *
	 * @param  {Integer} id
	 * @return {Object}    	Located Object, or null
	 */
	CD_Model.prototype.get = function(id) {

		for(var prop in this)
		{
			if( this.hasOwnProperty(prop) )
			{
				if( typeof this[prop].id !== 'undefined' && parseInt(this[prop].id) === parseInt(id) )
				{
					return this[prop];
				}
			}
		}

		return null;
	};

	/**
	 * Allow the ability to change parameters without actually
	 * triggering a new request to go off.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.4.0 Introduced
	 *
	 * @param  string  param      The filed to add the filter for.
	 * @param  string  value     The value to filter on. If empty, we'll remove filters for this field.
	 *
	 * @return void
	 */
	CD_Model.prototype.param = function(param, value)
	{
		var mc = this;

		if( typeof param !== 'undefined' && value )
		{
			mc.settings.params[param] = value;
		}
		else if( typeof param !== 'undefined')
		{
			delete mc.settings.params[param];
		}
	};

	/**
	 * Adds a field and value to filter on
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  string  field      The filed to add the filter for.
	 * @param  string  filter     The value to filter on. If empty, we'll remove filters for this field.
	 *
	 * @return {Array} An array of the sorted set of objects for this collection.
	 */
	CD_Model.prototype.filter = function(field, filter)
	{
		var mc = this;

		if( typeof field !== 'undefined' && filter )
		{
			mc.settings.params[field] = filter;
			mc.settings.params.offset = 0;
		}
		else if( typeof field !== 'undefined')
		{
			delete mc.settings.params[field];
			mc.settings.params.offset = 0;
		}

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Add sorting to the current query set.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @return {Array} An array of the sorted set of objects for this collection.
	 */
	CD_Model.prototype.sort = function(sort) {

		var mc = this;

		if( typeof sort !== 'undefined' )
		{
			mc.settings.params.sort = sort;
			mc.settings.params.offset = 0;
		}
		else
		{
			delete mc.settings.params.sort;
		}

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Retrieves a matching set of records for the search.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  string  search     The search value to send through.
	 *
	 * @return {Array} An array of the sorted set of objects for this collection.
	 */
	CD_Model.prototype.search = function(search){

		var mc = this;

		if( typeof search !== 'undefined' )
		{
			mc.settings.params.q = search;
			mc.settings.params.offset = 0;
		}
		else
		{
			delete mc.settings.params.q;
		}

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Retrieves the 'next' set of records.
	 *
	 * @author Sam Sehnert <sam@teamdf.com>
	 *
	 * @since  1.0.0  Introduced
	 *
	 * @param  int   count       The number of items to get
	 *
	 * @return {Array} An array of the next set of objects for this collection.
	 */
	CD_Model.prototype.next = function( count ){

		var mc = this;

		if( ! ('limit' in mc.settings.params))
		{
			return ($.Deferred()).reject('No limit defined in parameters');
		}

		if( typeof count !== 'undefined' )
		{
			mc.settings.params.limit = +count;
		}

		if( ! ('offset' in mc.settings.params))
		{
			mc.settings.params.offset = 0;
		}

		// Add the limit to the offset.
		mc.settings.params.offset += mc.settings.params.limit;

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	CD_Model.prototype.page = function( page, count ){

		var mc = this;

		if( ! ('limit' in mc.settings.params))
		{
			return ($.Deferred()).reject('No limit defined in parameters');
		}

		if( typeof count !== 'undefined' )
		{
			mc.settings.params.limit = +count;
		}

		if( ! ('offset' in mc.settings.params))
		{
			mc.settings.params.offset = 0;
		}

		// Add the limit to the offset.
		mc.settings.params.offset = mc.settings.params.limit * (page-1);

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Retrieves the 'previous' set of records.
	 *
	 * @author Sam Sehnert <sam@teamdf.com>
	 *
	 * @since  1.3.0  Introduced
	 *
	 * @param  int   count       The number of items to get.
	 *
	 * @return {Array} An array of the previous set of objects for this collection.
	 */
	CD_Model.prototype.prev = function( count ){

		var mc = this;

		if( ! ('limit' in mc.settings.params))
		{
			return ($.Deferred()).reject('No limit defined in parameters');
		}

		if( typeof count !== 'undefined' )
		{
			mc.settings.params.limit = +count;
		}

		if( ! ('offset' in mc.settings.params))
		{
			mc.settings.params.offset = 0;
		}

		// Remove the limit from the offset.
		mc.settings.params.offset -= mc.settings.params.limit;

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Parses the URL that this model will use.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  object  params     A set of parameters to add to the request.
	 * @param  string  segments   A URL segment/prefix we'd add to the path.
	 *
	 * @return string The full URL that we'd make a request to for this model.
	 */
	CD_Model.prototype.url = function( params, segments )
	{
		var mc           = this,
			query_string = '';

		if( typeof params === 'undefined' )
		{
			params = $.extend({},mc.settings.params);
		}

		if( $.isPlainObject(params) )
		{
			for(var resource in params)
			{
				if( params.hasOwnProperty(resource) && params[resource] !== null )
				{
					if( query_string === '' )
					{
						query_string = '?' + encodeURIComponent(resource) + '=' + encodeURIComponent(params[resource]);
					}
					else
					{
						query_string += '&' + encodeURIComponent(resource) + '=' + encodeURIComponent(params[resource]);
					}
				}
			}
		}
		else if( params )
		{
			query_string = params;
		}

		if( segments )
		{
			query_string = segments + '/' + query_string;
		}

		return this.settings.endpoint.replace(/\/+$/, '') + '/' + query_string;
	};

	/**
	 * Get the URL to the 'next' set in the API.
	 * Generates the url by incrementing the offset parameter.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  int  count      Use the given limit to get the correct URL. Optional.
	 *
	 * @return string The URL we'd use to get the 'next' data set.
	 */
	CD_Model.prototype.url_next = function(count)
	{
		var mc 		= this,
			params 	= $.extend({},mc.settings.params),
			limit   = count || mc.settings.params.limit;

		if( ! limit)
		{
			return mc.url();
		}

		// Add the limit to the offset.
		params.offset = +params.offset + limit;

		return mc.url(params);
	};


	/**
	 * Get the URL to the 'prev' set in the API.
	 * Generates the url by incrementing the offset parameter.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  int  count      Use the given limit to get the correct URL. Optional.
	 *
	 * @return string The URL we'd use to get the 'prev' data set.
	 */
	CD_Model.prototype.url_prev = function(count)
	{
		var mc 		= this,
			params 	= $.extend({},mc.settings.params),
			limit   = count || mc.settings.params.limit;

		if( ! limit)
		{
			return mc.url();
		}

		// Remove the limit from the offset.
		params.offset = +params.offset - limit;

		return mc.url(params);
	};

	/**
	 * Get the URL to the given page set in the API.
	 * Generates the url by setting the offset parameter.
	 *
	 * @author Sam Sehnert <sam@customd.com>
	 *
	 * @since  1.3.0 Introduced
	 *
	 * @param  int  page      The page we want to be on.
	 * @param  int  count     Use the given limit to get the correct URL. Optional.
	 *
	 * @return string The URL we'd use to get the 'next' data set.
	 */
	CD_Model.prototype.url_page = function(page, count)
	{
		var mc 		= this,
			params 	= $.extend({},mc.settings.params),
			limit   = count || mc.settings.params.limit;

		if( ! limit)
		{
			return mc.url();
		}

		// Remove the limit from the offset.
		params.offset = mc.settings.params.limit * (page-1);

		return mc.url(params);
	};

	/**
	 * Replaces the current set of Result objects, with a new set via an API call
	 *
	 * @author 	Josh Smith <josh@customd.com>
	 * @since 	1.0.0 Introduced
	 *
	 * @return {Object} API Request Promise
	 */
	CD_Model.prototype.replace = function( params ){

		var mc = this;

		// Set new parameters
		if( params )
		{
			mc.settings.params = params;
		}

		// Empty the array
		this.empty();

		// Fire off a request to get collection data, then call the parent object
		// and save this AJAX request as the promise.
		return this.api().get(mc.settings.params)
			.done(function(response){
				CD_Model.call(mc, response[mc.settings.attribute]);
			});
	};

	/**
	 * Safetly empties the Model Collection array
	 *
	 * @author Josh Smith <josh@customd.com>
	 * @since  1.0.0 Introduced
	 *
	 * @return this
	 */
	CD_Model.prototype.empty = function(){

		for (var result in this)
		{
			if( this.hasOwnProperty(result) )
			{
				delete this[result];
			}
		}

		return this;
	};

	/**
	 * Retrieves a record from internal properties, matched on where clause.
	 *
	 * @author Josh Smith <josh@customd.com>
	 *
	 * @since 1.0.0 Introduced.
	 *
	 * @param  {Object}  where 	An object of filters to search by
	 * @param  {Integer} limit 	A result set limit
	 * @return {Array}     		An arary of matched objects, or empty array.
	 */
	CD_Model.prototype.get_where = function(where, limit){

		// No where clause? Return an empty array
		if( typeof where !== 'object' )
		{
			return [];
		}

		// Define filter arrays and objects
		var self 		= this,
			matched 	= [],
			truth_table = {},
			clause;

		// Loop through all properties of this object
		obj_props:
		for(var prop in this)
		{
			if( this.hasOwnProperty(prop) )
			{
				// Loop through filters in where object
				for( clause in where)
				{
					if( where.hasOwnProperty(clause) )
					{
						// If the property exists on the object, and matches our where clause
						// Note, we do a non–type comparison. As we can't guarantee the user knows what format
						// the ID of an object might be in, due to JS being a loosly typed language (could be string, int etc.).
						if( typeof self[prop][clause] !== 'undefined' && self[prop][clause] == where[clause] )
						{
							truth_table[clause] = true;
						}
						else
						{
							truth_table[clause] = false;
						}
					}
				}

				//
				// Now loop through all clauses, and check matches
				//
				var include = true;
				for( clause in truth_table )
				{
					if( truth_table.hasOwnProperty(clause) )
					{
						if( !truth_table[clause] )
						{
							include = false;
						}
					}
				}

				//
				// If conditions were met... Include the match
				//
				if( include )
				{
					matched.push(this[prop]);
				}

				//
				// Break main loop if limit has been reached
				//
				if( matched.length === limit )
				{
					break obj_props;
				}

			}
		}

		return limit === 1 ? matched[0] : matched;
	};



	/**
	 * Match Objects based on like filters
	 *
	 * @author Josh Smith <josh@customd.com>
	 *
	 * @since 1.0.0 Introduced.
	 *
	 * @param  {Object} like	Object of like filters
	 * @return {Array}   	    Array of Matched Objects
	 */
	CD_Model.prototype.like = function(like){

		if( typeof like !== 'object' )
		{
			return [];
		}

		var self 	= this,
			matched = [];

		// Loop through Objects
		for(var prop in this)
		{
			if( this.hasOwnProperty(prop) )
			{
				var match = 0;

				// Loop through filters in like object
				for(var clause in like)
				{
					if( like.hasOwnProperty(clause) )
					{
						// Create a new regular expression from the match we're after
						var re = new RegExp(like[clause], 'gi');

						// If the property exists on the object, and matches our like clause
						if( typeof self[prop][clause] !== 'undefined' && self[prop][clause] !== null && self[prop][clause].toString().match(re) )
						{
							match ++;
						}
					}
				}

				if( match === Object.keys(like).length )
				{
					matched.push(this[prop]);
				}
			}
		}

		return matched;

	};


	/**
	 * Custom D Result Object
	 *
	 * @author Josh Smith <josh@customd.com>
	 *
	 * @since 1.0.0 Introduced
	 *
	 * @param {Object} properties Properties of this Object
	 */
	CD_Result = function(properties)
	{
		if( typeof properties === 'object' )
		{
			for(var prop in properties)
			{
				this[prop] = properties[prop];
			}
		}

		// Define length property
		Object.defineProperty(CD_Result.prototype, 'length', {get: function() {
			return Object.keys(this).length;
		}});
	};


	/**
	 * Extends CD_Result, by returning a Pseudo Function that inherits properties.
	 *
	 * @author Josh Smith <josh@customd.com>
	 * @since  1.0.0 Introduced
	 *
	 * @return {Function}
	 */
	CD_Result.extend = function(methods){

		methods = (typeof methods === 'undefined' ? {} : methods);

		/**
		 * [Result description]
		 * @param {[type]} properties [description]
		 */
		function Result_Model(properties)
		{
			// Call the parent Object
			CD_Result.call(this, properties);

			return this.__construct();
		}

		// Set the prototype and constructor properties
		Result_Model.prototype = Object.create(this.prototype);
		Result_Model.prototype.constructor = Result_Model;
		Result_Model.prototype.__construct = function(){};

		// Assign methods to the prototype
		for(var key in methods)
		{
			Result_Model.prototype[key] = methods[key];
		}

		return Result_Model;
	};



	/**
	 * CD_Result Prototype
	 * @type {Object}
	 */
	CD_Result.prototype = {

		/**
		 * Prototype Constructor
		 * @type {Object}
		 */
		constructor : CD_Result,

		/**
		 * Define length property of this prototype
		 */
		length : function(){},

		/**
		 * Outputs Object in String format
		 *
		 * @author Josh Smith <josh@customd.com>
		 *
		 * @since 1.0.0 Introduced.
		 *
		 * @return {String} String representation of this Object
		 */
		toString : function(){

			var obj = {};

			for(var prop in this)
			{
				if( this.hasOwnProperty(prop) )
				{
					obj[prop] = this[prop];
				}
			}

			return JSON.stringify(obj);
		},

	};
})(jQuery);

CD_Model.js
===========
### By Sam Sehnert, [Custom D](https://www.customd.com/) 2016

Provides methods to build and manipulate a data collection from an API, including handling pagination, sorting, filtering, and searching.

Documentation
-------------

### Getting Started

Define a data model for your API endpoint.

```js
/* global $:true */
/* global Site:true */
/* global CD_Model:true */
/* global CD_Result:true */

/* jshint unused:false */

var Users_Model_params = {};

/**
 * Users Model
 *
 * @author Sam Sehnert <sam@teamdf.com>
 *
 * @since  1.0.0 Introduced
 */
var Users_Model = CD_Model.extend({

	// Result Model for this Collection
	Result_Model : 'Users_Result',

	// Setup for this particular model collection.
	settings : {
		endpoint 	: Site.api_url+'accounts/users',
		params		: Users_Model_params
	}
});

/**
 * Users Result Model
 *
 * @author Sam Sehnert <sam@teamdf.com>
 *
 * @since  1.0.0 Introduced
 */
var Users_Result = CD_Result.extend({

});
```


Contributing
------------

If you find a bug, error or feature that you wish to fix/implement and contribute back to the project, you can do so by committing your work to a new branch, and issuing a merge request.

Branches should be named as follows:

* Small, backwards compatible bug-fixes should be called `hotfix/my_awesome_fix`
* Feature additions should be called `feature/my_awesome_feature`

Once you've created your branch, push it, and then issue a merge request into the `master` branch, even if that's not where it should go.

Select your `hotfix` branch as the source, and `master` as the destination, and assign the merge request.

Make sure you leave a note about why this fix is important, how you found the solution, and any implications this solution might have, and identify untested potential use cases. __Please do NOT__ increment any version numbers.

An email will automatically be sent to the assigned user — that person will then be able to review, test and document the change.

The person assigned to the merge will:

* Determine which `versions/` branch this should be merged to
* Ensure unit tests have been written and committed to test your modification
* Test the merge request against the target branch
* Document the modifications
* Increment the version number if required, or add to the latest version
* Communicate with the developer who raised the request, and work out if the change needs to be implemented as a hotfix update for earlier major or minor versions
* Release new versions if required

In some cases, merge requests will come back to you for modifications. If this is the case, commit back to the same branch, and update the existing merge request.


License
-------

Copyright 2016, [Custom D](https://www.customd.com),
Released under the [MIT license](https://opensource.customd.com/license).

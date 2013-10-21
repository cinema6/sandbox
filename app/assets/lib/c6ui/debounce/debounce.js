(function(angular) {
	'use strict';

	angular.module('c6.ui')
		.factory('c6Debounce', ['$timeout', function($timeout) {
			return function(func, debounceTime) {
				var debounceInProgress = false;

				return function() {
					var args = arguments;

					if (!debounceInProgress) {
						debounceInProgress = true;
						$timeout(function() {
							debounceInProgress = false;
							func.call(this, args);
						}, debounceTime);
					}
				};
			};
		}]);
})(angular);

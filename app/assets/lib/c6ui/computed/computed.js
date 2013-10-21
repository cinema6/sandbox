(function() {
	'use strict';

	angular.module('c6.ui')
		.factory('c6Computed', [function() {
			function c6Computed(scope, computingFunction, dependencies, equality) {
				var actualDependencies = [],
					dirty = true,
					cachedValue,
					setDirty = function() {
						dirty = true;
					};

				dependencies.forEach(function(dependency) {
					scope.$watch(dependency, setDirty, (equality || false));
				});

				var c6ComputedResult = function() {
					if (dirty) {
						dirty = false;

						actualDependencies.length = 0;

						dependencies.forEach(function(dependency) {
							actualDependencies.push(scope.$eval(dependency));
						});

						cachedValue = computingFunction.apply(scope, actualDependencies);
					}

					return cachedValue;
				};
				c6ComputedResult.invalidate = function() {
					dirty = true;

					return c6ComputedResult();
				};

				return c6ComputedResult;
			}
			c6Computed.invalidate = function() {

			};

			return c6Computed;
		}]);
})();

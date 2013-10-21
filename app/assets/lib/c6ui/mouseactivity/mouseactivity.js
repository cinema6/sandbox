(function(angular) {
	'use strict';

	angular.module('c6.ui')
		.directive('c6MouseActivity', ['$timeout', function($timeout) {
			return function(scope, element, attrs) {
				var timeout,
					moving = false,
					stopMoving = function() {
						moving = false;
						scope.$emit('c6MouseActivityStop',element);
					},
					time;

				attrs.$observe('c6MouseActivity', function(value) {
					time = value || 250;
				});

				element.bind('mousemove', function() {
					if (!moving) {
						scope.$apply(scope.$emit('c6MouseActivityStart',element));
						moving = true;
					}
					if (timeout) { $timeout.cancel(timeout); }
					timeout = $timeout(stopMoving, time);
				});
			};
		}]);
})(angular);

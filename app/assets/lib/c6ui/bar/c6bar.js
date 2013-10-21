(function(appBaseUrl){
    'use strict';

    angular.module('c6.ui')
    .directive('c6Bar', [ function() {
        return {
            restrict: 'E',
            templateUrl: appBaseUrl + '/lib/c6ui/bar/c6bar.html',
            replace: true,
            scope: {
                logoUrl: '@',
                experienceName: '@',
                close: '='
            }
        };
    }]);

}(window.__C6_APP_BASE_URL__));

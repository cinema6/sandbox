(function(){

    'use strict';
    angular.module('c6.ui')
    .directive('c6Visible', ['$animator', function($animator) {
        return {
            scope: true,
            link: function(scope, element, attrs) {
                var animate = $animator(scope, attrs),
                    ngAnimate = attrs.ngAnimate;

                scope.visible = function() {
                    return scope.$eval(attrs.c6Visible);
                };

                scope.$watch('visible()', function(visible) {
                    if (visible) {
                        if (ngAnimate) {
                            animate.animate('visible', element);
                        } else {
                            element.css('visibility', 'visible');
                        }
                    } else {
                        if (ngAnimate) {
                            animate.animate('hidden', element);
                        } else {
                            element.css('visibility', 'hidden');
                        }
                    }
                });
            }
        };
    }]);
}());

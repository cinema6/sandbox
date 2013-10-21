(function(){
    'use strict';
    angular.module('c6.ui')
    .service('C6ResizeService', ['$window', '$log', function($window, $log) {
        var resizeFunctions = [];

        this.registerDirective = function(code) {
            if (resizeFunctions.indexOf(code) === -1) {
                resizeFunctions.push(code);
                $log.log('Registered new resizer. Current total is ' + resizeFunctions.length);
                code($window.innerWidth, $window.innerHeight);
            }
        };

        this.unregisterDirective = function(code) {
            var codesIndex = resizeFunctions.indexOf(code);

            resizeFunctions.splice(codesIndex, 1);
            $log.log('Unregistered new resizer. Current total is ' + resizeFunctions.length);
        };

        angular.element($window).bind('resize', function() {
            resizeFunctions.forEach(function(code) {
                code($window.innerWidth, $window.innerHeight);
            });
        });
    }])

    .directive('c6Resize', ['C6ResizeService', function(service) {
        return function(scope, element, attrs) {
            var configObject = scope.$eval(attrs.c6Resize) || {width: null, height: null, offsetH: null, offsetW: null},
                excludeArray = scope.$eval(attrs.c6Exclude) || [];

            var excludingAttribute = function(attribute) {
                return excludeArray.indexOf(attribute) !== -1;
            };

            var myFunction = function(winWidth, winHeight) {
                // set variable dimensions for element
                var baseWidth   = configObject.width || 1280,
                    baseHeight  = configObject.height || 720,
                    offsetW     = configObject.offsetW || 0,
                    offsetH     = configObject.offsetH || 0,
                    viewWidth   = Math.min(winWidth - offsetW),
                    viewHeight  = Math.min(winHeight - offsetH),
                    //fontSize = configObject.font || 28,

                    //find scale factor
                    scaleHeight = viewHeight / baseHeight,
                    scaleWidth = viewWidth / baseWidth,
                    scaleFactor = Math.min(scaleHeight, scaleWidth);

                element.css({
                    height: excludingAttribute('height')? element.css('height') : Math.min(baseHeight * scaleFactor),
                    width: excludingAttribute('width')? element.css('width') : Math.min(baseWidth * scaleFactor),
                    //'font-size': excludingAttribute('font-size')? element.css('font-size') : fontSize * scaleFactor,
                    'margin-top': excludingAttribute('margin-top')? element.css('margin-top') : Math.min( ((baseHeight * scaleFactor) / -2) + (offsetH / 2) ),
                    'margin-left': excludingAttribute('margin-left')? element.css('margin-left') : Math.min( ((baseWidth * scaleFactor) / -2) + (offsetW / 2) )
                });
            };

            service.registerDirective(myFunction);

            scope.$on('$destroy', function() {
                service.unregisterDirective(myFunction);
            });
        };
    }]);

}());

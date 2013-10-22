/* jshint -W117 */
(function(){

    'use strict';

    angular.module('c6.ui')
    .directive('c6Panels', ['$log', 'c6AniCache', function($log, c6AniCache){
        var template =
            '<div class="panel__top" ng-show="panels.showUpper" ng-animate="\'upperPanel\'">' +
            '&nbsp;</div>' +
            '<div class="panel__bottom" ng-show="panels.showLower" ng-animate="\'lower-panel\'">' +
            '&nbsp;</div>' ;

        function fnLink($scope/*,$element,$attrs*/){
            $log.info('In c6Panels');

            $scope.panels = {
                showUpper : false,
                showLower : false,
                show      : function() { this.showUpper = this.showLower = true; },
                hide      : function() { this.showUpper = this.showLower = false; }
            };

            c6AniCache.data('c6Panels',{ duration : 0.6 });

            $scope.$watch('duration',function(newVal){
                $log.info('duration changed to: ' + newVal);
                var val = Number(newVal);
                if ((newVal === undefined) || (val === undefined) || (val === 0)){
                    c6AniCache.data('c6Panels',{ duration : 0.6 });
                    return;
                }

                if (isNaN(val)){
                    throw new TypeError('Invalid duration: ' + newVal +
                        '. c6Panels duration must be a number.');
                }

                c6AniCache.data('c6Panels',{ duration : val });
            });

            $scope.$watch('show',function(newVal){
                if (newVal){
                    $log.info('Show panels now');
                    $scope.panels.show();
                } else {
                    $log.info('Hide panels now');
                    $scope.panels.hide();
                }
            });

            c6AniCache.on('complete',function(id){
                if (id === 'lower-panel-show'){
                    $scope.$emit('panelsDown');
                }
                else
                if (id === 'lower-panel-hide'){
                    $scope.$emit('panelsUp');
                }
            });
        }

        return {
            link: fnLink,
            template : template,
            restrict: 'E,A',
            scope : {
                duration : '=',
                show : '='
            }
        };

    }])
    .animation('upperPanel-show', ['$log', 'c6AniCache', function($log, aniCache) {
        return aniCache({
            id : 'upper-panel-show',
            setup: function(element) {
                $log.info('upper-panel-show setup');
                var timeline = new TimelineLite({paused:true}),
                    duration = aniCache.data('c6Panels').duration;
                element.css({ bottom : '100%', display : 'block', 'z-index' : 99999 });
                timeline.to( element[0], duration, { bottom: '50%', ease:Power2.easeInOut} );
                return timeline;
            },
            start: function(element, done, timeline) {
                $log.info('upper-panel-show start');
                timeline.eventCallback('onComplete',function(){
                    $log.info('upper-panel-show end');
                    done();
                });
                timeline.play();
            }
        });
    }])
    .animation('upperPanel-hide', ['$log', 'c6AniCache', function($log, aniCache) {
        return aniCache({
            id : 'upper-panel-hide',
            setup: function(element) {
                $log.info('upper-panel-hide setup');
                var timeline = new TimelineLite({paused:true}),
                    duration = aniCache.data('c6Panels').duration;
                element.css({ bottom : '50%', display : 'block', 'z-index' : 99999 });
                timeline.to( element[0], duration, { bottom: '100%', ease:Power2.easeInOut} );
                return timeline;
            },
            start: function(element, done, timeline) {
                $log.info('upper-panel-hide start');
                timeline.eventCallback('onComplete',function(){
                    $log.info('upper-panel-hide end');
                    done();
                });
                timeline.play();
            }
        });
    }])
    .animation('lowerPanel-show', ['$log', 'c6AniCache', function($log, aniCache) {
        return aniCache({
            id : 'lower-panel-show',
            setup: function(element) {
                $log.info('lower-panel-show setup');
                var timeline = new TimelineLite({paused:true}),
                    duration = aniCache.data('c6Panels').duration;
                element.css({ top : '100%', display : 'block', 'z-index' : 99999 });
                timeline.to( element[0], duration, { top: '50%', ease:Power2.easeInOut} );
                return timeline;
            },
            start: function(element, done, timeline) {
                $log.info('lower-panel-show start');
                timeline.eventCallback('onComplete',function(){
                    $log.info('lower-panel-show end');
                    done();
                });
                timeline.play();
            }
        });
    }])
    .animation('lowerPanel-hide', ['$log', 'c6AniCache', function($log, aniCache) {
        return aniCache({
            id : 'lower-panel-hide',
            setup: function(element) {
                $log.info('lower-panel-hide setup');
                var timeline = new TimelineLite({paused:true}),
                    duration = aniCache.data('c6Panels').duration;
                element.css({ top : '50%', display : 'block', 'z-index' : 99999 });
                timeline.to( element[0], duration, { top: '100%', ease:Power2.easeInOut} );
                return timeline;
            },
            start: function(element, done, timeline) {
                $log.info('lower-panel-hide start');
                timeline.eventCallback('onComplete',function(){
                    $log.info('lower-panel-hide end');
                    done();
                });
                timeline.play();
            }
        });
    }]);
}());

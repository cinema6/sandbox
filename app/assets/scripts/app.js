(function() {
    'use strict';

    angular.module('c6.sandbox', ['c6.ui'])
        .controller('AppController', ['$scope', 'C6Sandbox', 'C6ExperienceService', 'c6AniCache', 'c6Computed', '$window', '$location', '$log',
                            function(  $scope ,  C6Sandbox ,  C6ExperienceService ,  c6AniCache ,  c          ,  $window ,  $location ,  $log) {
            var self = this;

            this.experience = C6Sandbox.getCurrentExperience();

            C6ExperienceService.getSession(self.experience.id).then(function(session) {
                session.on('shareUrl', function(data) {
                    $log.log('C6SANDBOX: (shareUrl) SUCCESS! Got share request with data: ', data);
                });
            });

            $scope.AppCtrl = this;
        }])

        .service('C6Sandbox', ['$document', '$window', function($document, $window) {
            var self = this,
                location = $window.location,
                config = $document[0].getElementById('c6_config').innerHTML,
                configObject = JSON.parse(config),
                settings = JSON.parse($window.localStorage.getItem('__c6_sandbox__')),
                transformedExperiences = {};

            function writeSettings() {
                $window.localStorage.setItem('__c6_sandbox__', JSON.stringify(settings));
            }

            function transformExperience(experience, index) {
                var img = experience.img,
                    copy;

                if (transformedExperiences[index]) {
                    return transformedExperiences[index];
                }

                copy = angular.copy(experience);

                angular.forEach(img, function(src, name) {
                    copy.img[name] = location.origin + '/' + self.c6CollateralDir + '/' + src;
                });

                transformedExperiences[index] = copy;

                return copy;
            }

            if (!settings) {
                settings = {
                    experienceIndex: 0,
                    speed: 'fast'
                };

                writeSettings();
            }

            this.__config__ = configObject;

            this.c6CollateralDir = '__dirname/' + (configObject.c6CollateralDir || 'c6Content');

            this.getExperiences = function() {
                return configObject.experiences;
            };

            this.getCurrentExperience = function() {
                var experiences = configObject.experiences,
                    index = settings.experienceIndex,
                    experience = experiences[index];

                if (!experience) { throw new RangeError('Could not find experience at index: ' + index + '.'); }

                return transformExperience(experience, index);
            };

            this.setCurrentExperience = function(index) {
                settings.experienceIndex = index;
                writeSettings();
                $window.location.reload();

                return this.getCurrentExperience();
            };

            this.clear = function() {
                settings = null;
                writeSettings();
                $window.location.reload();
            };

            this.getSpeed = function() {
                return settings.speed;
            };

            this.setSpeed = function(speed) {
                settings.speed = speed;
                writeSettings();
                $window.location.reload();

                return settings.speed;
            };

            $window.c6Sandbox = this;
        }])

        .directive('c6Embed', ['C6ExperienceService', 'C6Sandbox', 'c6BrowserInfo',
        function              ( C6ExperienceService ,  C6Sandbox ,  c6BrowserInfo ) {
            return {
                restrict: 'A',
                scope: {
                    content: '=',
                },
                link: function(scope, element) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch('content', function(experience) {
                        if (experience) {
                            scope.url = (function() {
                                var prefix = experience.appUriPrefix,
                                    postfix = (function() {
                                        var uriArray = experience.appUri.split('/');

                                        uriArray.shift();

                                        return uriArray.join('/');
                                    })();

                                return prefix + postfix;
                            })();

                            c6BrowserInfo.profile.speed = C6Sandbox.getSpeed();

                            C6ExperienceService._registerExperience(experience, iframeWindow);
                        }
                    });

                    scope.$on('$destroy', function() {
                        if (scope.content) {
                            C6ExperienceService._deregisterExperience(scope.content.id);
                        }
                    });
                }
            };
        }])


        .directive('c6Experience', ['C6ExperienceService', 'C6Sandbox', 'c6BrowserInfo',
        function                   ( C6ExperienceService ,  C6Sandbox ,  c6BrowserInfo ) {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    content: '=',
                    active: '='
                },
                template:  '<iframe name="experience" class="c6-exp__frame"'+
                            '   ng-class="{\'c6-exp__frame--fullscreen\': active}"'+
                            '   scrolling="no" ng-src="{{url}}">'+
                            '</iframe>',
                link: function(scope, element) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch('content', function(experience) {
                        if (experience) {
                            scope.url = (function() {
                                var prefix = experience.appUriPrefix,
                                    postfix = (function() {
                                        var uriArray = experience.appUri.split('/');

                                        uriArray.shift();

                                        return uriArray.join('/');
                                    })();

                                return prefix + postfix;
                            })();

                            c6BrowserInfo.profile.speed = C6Sandbox.getSpeed();

                            C6ExperienceService._registerExperience(experience, iframeWindow);
                        }
                    });

                    scope.$on('$destroy', function() {
                        if (scope.content) {
                            C6ExperienceService._deregisterExperience(scope.content.id);
                        }
                    });
                }
            };
        }]);
})();

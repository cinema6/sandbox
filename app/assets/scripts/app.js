(function() {
    'use strict';

    angular.module('c6.sandbox', ['c6.ui'])
        .config(['$provide', '$windowProvider', function($provide, $windowProvider) {
            var config = {
                modernizr: 'Modernizr'
            },
            $window = $windowProvider.$get();

            angular.forEach(config, function(value, key) {
                if (angular.isString(value)) {
                    $provide.value(key, $window[value]);
                } else if (angular.isArray(value)) {
                    $provide.factory(key, function() {
                        var service = {};

                        angular.forEach(value, function(global) {
                            service[global] = $window[global];
                        });

                        return service;
                    });
                }
            });
        }])

        .config(['c6BrowserInfoProvider',
        function( c6BrowserInfoProvider ) {
            c6BrowserInfoProvider
                .augmentProfile(['modernizr', '$window', 'c6UserAgent', 'C6Sandbox',
                function        ( modernizr ,  $window ,  c6UserAgent ,  C6Sandbox ) {
                    var screen = $window.screen,
                        width = screen.width,
                        height = screen.height,
                        pixels = width * height;

                    this.resolution = width + 'x' + height;

                    this.flash = (function() {
                        try {
                            var flashObject = new $window.ActiveXObject('ShockwaveFlash.ShockwaveFlash');

                            return !!flashObject;
                        } catch(e) {
                            return !!$window.navigator.mimeTypes['application/x-shockwave-flash'];
                        }
                    })();

                    this.webp = modernizr.webp;

                    this.device = (function() {
                        var touch = this.touch;

                        if (pixels <= 518400) {
                            return 'phone';
                        } else if (pixels <= 786432) {
                            if (touch) {
                                return 'tablet';
                            } else {
                                return 'netbook';
                            }
                        } else {
                            return 'desktop';
                        }
                    }).call(this);

                    this.cors = modernizr.cors;

                    this.autoplay = !c6UserAgent.device.isMobile();

                    this.speed = C6Sandbox.getSpeed();
                }]);
        }])

        .controller('AppController', ['$scope', 'C6Sandbox', 'C6ExperienceService',
                '$log', '$window',
        function ( $scope ,  C6Sandbox ,  C6ExperienceService ,  $log, $window ) {
            this.embedMode = C6Sandbox.getEmbedMode();
            this.experience = C6Sandbox.getCurrentExperience();
            this.user       = C6Sandbox.getCurrentUser();
            this.fullscreen = false;
            this.embedSize = C6Sandbox.getEmbedSize();

            if (C6Sandbox.useGA){
                $log.log('Create GA tracker using accountid: ',C6Sandbox.gaAccountId);
                $window.c6SbGa('create', C6Sandbox.gaAccountId, {
                    'name'       : 'c6sb',
                    'cookieName' : '_c6_sandbox_ga_'
                });
                $window.c6SbGa('c6sb.send', 'pageview', {
                    'page'  : '/sandbox/' + this.experience.id,
                    'title' : 'Sandbox: ' + this.experience.title || this.experience.id
                });
            }

            C6ExperienceService.getSession(this.experience.id).then(function(session) {
                session.on('shareUrl', function(data) {
                    $log.log('C6SANDBOX: (shareUrl) SUCCESS! Got share request with data: ', data);
                });

                session.on('fullscreenMode', function(bool) {
                    this.fullscreen = bool;
                }.bind(this));
            }.bind(this));

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
                    userIndex: 0,
                    speed: 'fast',
                    dubUrl: 'http://dv-api1.cinema6.com/dub',
                    embedMode: false,
                    embedSize: {
                        width: '100%',
                        height: '600'
                    }
                };

                writeSettings();
            }

            this.__config__ = configObject;

            this.c6CollateralDir = '__dirname/' + (configObject.c6CollateralDir || 'c6Content');

            this.gaAccountId = configObject.gaAccountId || 'UA-44457821-1';
            this.useGA = (this.gaAccountId === 'none') ? false : !!(this.gaAccountId);

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

            this.getUsers = function(){
                return configObject.users;
            };

            this.getCurrentUser = function(){
                var users = configObject.users,
                    index = settings.userIndex,
                    user = users[index];

                if (!user) { throw new RangeError('Could not find user at index: ' + index + '.'); }
                return user;
            };

            this.setCurrentUser = function(index) {
                settings.userIndex = index;
                writeSettings();
                $window.location.reload();

                return this.getCurrentUser();
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

                return settings.speed;
            };

            this.getDubUrl = function() {
                return settings.dubUrl;
            };

            this.setDubUrl = function(dubUrl) {
                settings.dubUrl = dubUrl;
                writeSettings();

                return settings.dubUrl;
            };

            this.setEmbedMode = function(bool) {
                settings.embedMode = !!bool;
                writeSettings();
                $window.location.reload();

                return settings.embedMode;
            };

            this.getEmbedMode = function() {
                return settings.embedMode;
            };

            this.setEmbedSize = function(dimensions) {
                var dimensionsArray,
                    embedSize = settings.embedSize;

                if (!dimensions.match(/^\d+%?x\d+%?$/)) {
                    throw new Error('Invalid dimensions! Try something like this: 100%x600');
                }

                dimensionsArray = dimensions.split('x');

                embedSize.width = dimensionsArray[0];
                embedSize.height = dimensionsArray[1];

                writeSettings();
                $window.location.reload();

                return embedSize;
            };

            this.getEmbedSize = function() {
                return settings.embedSize;
            };

            $window.c6Sandbox = this;
        }])

        .factory('c6Defines', ['C6Sandbox',
        function              ( C6Sandbox ) {
            var c6 = {
                kEnv: 'dev',
                kDubUrls: {}
            };

            Object.defineProperty(c6.kDubUrls, 'dev', {
                get: function() {
                    return C6Sandbox.getDubUrl();
                }
            });

            return c6;
        }])

        .directive('c6Embed', ['C6ExperienceService', 'C6Sandbox', '$window',
        function              ( C6ExperienceService, C6Sandbox, $window ) {
            return {
                restrict: 'A',
                link: function(scope, element, attrs) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch(attrs.c6Embed, function(embedData) {
                        var session,experience,user;
                        if (!embedData){
                            return;
                        }
                        experience = embedData.experience;
                        user       = embedData.user;
                        if (experience) {
                            element.prop('src', (function() {
                                var prefix = experience.appUriPrefix,
                                    postfix = (function() {
                                        var uriArray = experience.appUri.split('/');

                                        uriArray.shift();

                                        return uriArray.join('/');
                                    })();

                                return prefix + postfix + '?kDebug=1';
                            })());

                            session = C6ExperienceService
                                        ._registerExperience(experience, user, iframeWindow);
                            session.once('ready', function(){
                                $window.c6SbGa(function(){
                                    var tracker = $window.c6SbGa.getByName('c6sb'), clientId;
                                    try {
                                        clientId = tracker.get('clientId');
                                    }catch(e){

                                    }

                                    if (clientId){
                                        session.ping('initAnalytics',{
                                            accountId: C6Sandbox.gaAccountId,
                                            clientId:   clientId
                                        });
                                    }
                                });

                            });
                        }
                    });

                    scope.$on('$destroy', function() {
                        var experience = scope.$eval(attrs.c6Embed);

                        if (experience) {
                            C6ExperienceService._deregisterExperience(experience.id);
                        }
                    });
                }
            };
        }])


        .directive('c6Experience', ['C6ExperienceService', 'C6Sandbox', 'c6BrowserInfo',
                '$window',
        function ( C6ExperienceService ,  C6Sandbox ,  c6BrowserInfo, $window ) {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    content: '=',
                    active: '='
                },
                template:  '<iframe name="experience" class="c6-exp__frame"'+
                            '   scrolling="no" ng-src="{{url}}">'+
                            '</iframe>',
                link: function(scope, element) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch('content', function(embedData) {
                        var session,experience,user;
                        if (!embedData){
                            return;
                        }
                        experience = embedData.experience;
                        user       = embedData.user;
                        if (experience) {
                            scope.url = (function() {
                                var prefix = experience.appUriPrefix,
                                    postfix = (function() {
                                        var uriArray = experience.appUri.split('/');

                                        uriArray.shift();

                                        return uriArray.join('/');
                                    })();

                                return prefix + postfix + '?kDebug=1';
                            })();

                            c6BrowserInfo.profile.speed = C6Sandbox.getSpeed();

                            session = C6ExperienceService
                                ._registerExperience(experience, user, iframeWindow);

                            session.once('ready', function(){
                                $window.c6SbGa(function(){
                                    var tracker = $window.c6SbGa.getByName('c6sb'), clientId;
                                    try {
                                        clientId = tracker.get('clientId');
                                    }catch(e){

                                    }

                                    if (clientId){
                                        session.ping('initAnalytics',{
                                            accountId: C6Sandbox.gaAccountId,
                                            clientId:   clientId
                                        });
                                    }
                                });

                            });
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

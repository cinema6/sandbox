(function() {
    'use strict';

    angular.module('c6.sandbox', ['c6.ui'])
        .controller('AppController', ['$scope', 'C6Sandbox', 'C6ExperienceService', 'c6AniCache', 'c6Computed', '$window', '$location', '$log',
                            function(  $scope ,  C6Sandbox ,  C6ExperienceService ,  c6AniCache ,  c          ,  $window ,  $location ,  $log) {
            var self = this,
                getLandingContent = function(section) {
                    var landingPageContent = this.experience.landingPageContent,
                        asset = landingPageContent && landingPageContent[section];

                    return asset && (C6Sandbox.landingContentDir + '/' + asset);
                }.bind(this);

            this.activeExperience = false;

            this.experience = C6Sandbox.getCurrentExperience();

            this.html = {
                middle: getLandingContent('middle'),
                right: getLandingContent('right')
            };

            this.stylesheet = getLandingContent('stylesheet');

            this.panels = {
                show: false,
                duration: 0.6
            };

            this.experienceWantsBar = false;
            this.c6BarInUse = false;
            this.showC6Bar = c($scope, function(barInUse, experienceWantsBar, activeExperience) {
                if (!activeExperience) {
                    return false;
                }

                if (barInUse) {
                    return true;
                }

                return experienceWantsBar;
            }, ['AppCtrl.c6BarInUse', 'AppCtrl.experienceWantsBar', 'AppCtrl.activeExperience']);

            this.gotoStart = function() {
                C6ExperienceService.getSession(self.experience.id).then(function(session) {
                    session.gotoState('start');
                });
            };

            C6ExperienceService.getSession(self.experience.id).then(function(session) {
                session.on('currentUrl', function(data, respond) {
                    respond(C6Sandbox.getSiteUrl());
                });

                session.on('pendingPathComplete', function(done) {
                    if (done) {
                        self.activeExperience = true;
                    }
                });

                session.on('pathChange', function(path) {
                    $location.path(path).replace();
                });

                session.on('transitionState', function(wantState, respond) {
                    var unregister,
                        active = self.activeExperience,
                        config = angular.isObject(wantState) ? wantState : { enter: wantState, duration: 0.6 },
                        panelsEvent = config.enter ? 'panelsDown' : 'panelsUp';

                    c6AniCache.enabled(true);

                    self.panels.duration = config.duration;
                    self.panels.show = config.enter;

                    unregister = $scope.$on(panelsEvent, function() {
                        if (config.enter && !active) {
                            self.activeExperience = true;
                        } else if (config.enter && active) {
                            self.activeExperience = false;
                        }
                        c6AniCache.enabled(false);

                        unregister();
                        respond();
                    });
                });

                session.on('shareUrl', function(data) {
                    $log.log('C6SANDBOX: (shareUrl) SUCCESS! Got share request with data: ', data);
                });

                session.on('openExternalLink', function(config) {
                    var win = $window.open(config.url, config.target);

                    if (!win) {
                        if ($window.confirm('You are about to leave Cinema6. Continue?')) {
                            $window.open(config.url, config.target);
                        }
                    }
                });

                session.on('requestBar', function(showBar) {
                    self.experienceWantsBar = showBar;
                });
            });

            if ($location.path()) {
                C6ExperienceService.pendingPath(C6Sandbox.getCurrentExperience().id, $location.path());
            }

            $scope.AppCtrl = this;
            $scope.assetUrl = function(url) {
                return url && (C6Sandbox.landingContentDir + '/' + url);
            };
        }])

        .service('C6Sandbox', ['$document', '$window', function($document, $window) {
            var self = this,
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
                    copy.img[name] = self.landingContentDir + '/' + src;
                });

                transformedExperiences[index] = copy;

                return copy;
            }

            if (!settings) {
                settings = {
                    experienceIndex: 0,
                    siteUrl: 'http://www.cinema6.com/experiences/' + (configObject.experiences[0].uri || 'nouri'),
                    speed: 'fast'
                };

                writeSettings();
            }

            this.__config__ = configObject;

            this.landingContentDir = '_landing/' + (configObject.landingContentDir || 'siteContent');

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

            this.setSiteUrl = function(url) {
                settings.siteUrl = url;
                writeSettings();
                return settings.siteUrl;
            };

            this.getSiteUrl = function() {
                return settings.siteUrl;
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

        .directive('c6Experience', ['C6ExperienceService', 'C6Sandbox', 'c6BrowserInfo',
        function                   ( C6ExperienceService ,  C6Sandbox ,  c6BrowserInfo ) {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    content: '=',
                    active: '='
                },
                template:  '<iframe class="c6-exp__frame"'+
                            '   ng-class="{\'c6-exp__frame--fullscreen\': active}"'+
                            '   scrolling="no" ng-src="{{url}}">'+
                            '</iframe>',
                link: function(scope, element) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch('content', function(experience, oldExperience) {
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

        .service('C6ExperienceService', ['$q', 'postMessage', 'c6BrowserInfo',
                                function( $q ,  postMessage ,  c6BrowserInfo) {
            var self = this,
                _private = {
                    sessions: {},
                    pendingGets: {},
                    pendingPaths: {},

                    decorateSession: function(session, experience) {
                        session.experience = experience;
                        session.ready = false;

                        session.getLandingContent = function(section) {
                            return session.request('landingContent', section);
                        };

                        session.getLandingStylesheet = function() {
                            return session.request('landingStylesheet');
                        };

                        session.gotoState = function(state) {
                            session.ping('gotoState', state);
                        };
                    }
                };

            /* @public */

            this.getSession = function(expId) {
                var deferred = $q.defer();

                if (_private.sessions[expId]) {
                    deferred.resolve(_private.sessions[expId]);
                } else {
                    _private.pendingGets[expId] = deferred;
                }

                return deferred.promise;
            };

            this.pendingPath = function(expId, path) {
                var value;

                if (path) {
                    _private.pendingPaths[expId] = path;
                } else {
                    value = _private.pendingPaths[expId];

                    delete _private.pendingPaths[expId];

                    return value;
                }
            };

            /* @private */

            this._registerExperience = function(experience, expWindow) {
                var session = postMessage.createSession(expWindow),
                    expId = experience.id;

                _private.decorateSession(session, experience);

                _private.sessions[expId] = session;

                session.once('handshake', function(data, respond) {
                    var pendingPath = self.pendingPath(expId);

                    if (pendingPath) {
                        session.request('pendingPath', pendingPath).then(function(result) {
                            session.emit('pendingPathComplete', result);
                        });
                    }

                    session.ready = true;

                    session.emit('ready', true);

                    respond({
                        success: true,
                        appData: {
                            experience: experience,
                            profile: c6BrowserInfo.profile
                        }
                    });
                });

                if (_private.pendingGets[expId]) {
                    _private.pendingGets[expId].resolve(session);

                    delete _private.pendingGets[expId];
                }

                return session;
            };

            this._deregisterExperience = function(expId) {
                var session = _private.sessions[expId];

                postMessage.destroySession(session.id);

                delete _private.sessions[expId];
            };

            /* WARNING!: This method is here solely so automated tests can make assetions on internal methods and state.
             * If you need to use this method for any reason in production code, either you're not using this correctly,
             * or I'm not giving you everything you need. Either way, talk to me! jminzner@cinema6.com.*/
            this._private = function() {
                return _private;
            };
        }]);
})();

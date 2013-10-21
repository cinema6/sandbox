(function() {
    'use strict';

    angular.module('c6.sandbox', ['c6.ui'])
        .controller('AppController', ['$scope', 'SandboxConfig', 'C6ExperienceService', 'c6AniCache', 'c6Computed',
                            function(  $scope,   SandboxConfig,   C6ExperienceService,   c6AniCache,   c) {
            var self = this;

            function getExperience(config) {
                var experience = (config.experiences && config.experiences[0]) || {};

                experience.appUrl = config.appUrl;
                experience.id = 'sandbox';

                return experience;
            }

            this.activeExperience = false;

            this.experience = getExperience(SandboxConfig);

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
                C6ExperienceService.getSession('sandbox').then(function(session) {
                    session.gotoState('start');
                });
            };

            C6ExperienceService.getSession('sandbox').then(function(session) {
                session.on('currentUrl', function(data, respond) {
                    respond('http://www.cinema6.com/#/experiences/sandbox');
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

                session.on('requestBar', function(showBar) {
                    self.experienceWantsBar = showBar;
                });
            });

            $scope.AppCtrl = this;
        }])

        .factory('SandboxConfig', ['$document', function($document) {
            var config = $document[0].getElementById('c6_config').innerHTML;

            return JSON.parse(config);
        }])

        .directive('c6Experience', ['C6ExperienceService', function(C6ExperienceService) {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    content: '=',
                    active: '='
                },
                template:   '<iframe class="experience-frame"' +
                                'ng-class="{\'experience-frame--active\': active}"' +
                                'scrolling="no" ng-src="{{content.appUrl}}"' +
                                'sandbox="allow-scripts allow-same-origin">' +
                            '</iframe>',
                link: function(scope, element) {
                    var iframeWindow = element.prop('contentWindow');

                    scope.$watch('content', function(experience, oldExperience) {
                        if (experience) {
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

        .service('C6ExperienceService', ['$q', 'postMessage', function($q, postMessage) {
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
                            experience: experience
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

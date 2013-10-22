(function() {
    'use strict';

    angular.module('c6.ui')
        .service('site', ['$window', '$q', 'c6EventEmitter', 'postMessage', '$http', '$compile', '$timeout', '$injector',
                 function($window, $q, c6EventEmitter, postMessage, $http, $compile, $timeout, $injector) {
            var self = this,
                $rootScope,
                $location,
                _private = {
                    session: null,
                    pendingGetSession: undefined,
                    options: undefined,
                    oldPath: null,

                    listenForEvents: function(session) {
                        session.on('landingContent', this.getLandingHTML);

                        session.on('landingStylesheet', this.getLandingStylesheet);
                    },

                    handlePathChange: function() {
                        var path;

                        if (!$location) { $location = $injector.get('$location'); }

                        path = $location.path();

                        if (path !== _private.oldPath) {
                            _private.session.ping('pathChange', $location.path());
                        }

                        _private.oldPath = path;
                    },

                    pingPathChanges: function() {
                        if (!$rootScope) { $rootScope = $injector.get('$rootScope'); }

                        $rootScope.$on('$locationChangeSuccess', this.handlePathChange);
                    },

                    getLandingHTML: function(section, respond) {
                        var options = _private.options,
                            landingOptions = options.landingContent,
                            sectionUrl = landingOptions && landingOptions[section],
                            landingScope = landingOptions && landingOptions.scope;

                        if (sectionUrl) {
                            $http.get(sectionUrl).then(function(response) {
                                var linker = $compile(response.data),
                                    templateNode = linker(landingScope);

                                $timeout(function() { respond(angular.element('<div>').append(templateNode).html()); });
                            });
                        } else {
                            respond(null);
                        }
                    },

                    getLandingStylesheet: function(data, respond) {
                        var options = _private.options,
                            landingOptions = options.landingContent,
                            stylesheetUrl = landingOptions && landingOptions.stylesheetUrl;

                        respond(stylesheetUrl || null);
                    }
                };

            /* @init */

            c6EventEmitter(this);

            /* @public */

            this.ready = false;

            this.init = function(config) {
                var session = postMessage.createSession($window.parent);

                config = config || {};

                _private.session = session;

                session.request('handshake').then(function(handshakeData) {
                    self.ready = true;
                    self.emit('ready', true);

                    _private.appData = handshakeData.appData;

                    if (_private.pendingGetSession) {
                        _private.pendingGetSession.resolve(session);
                    }

                    if (_private.pendingGetAppData) {
                        _private.pendingGetAppData.resolve(handshakeData.appData);
                    }
                });

                _private.options = config;

                _private.listenForEvents(session);

                if (config.pingPathChanges) {
                    _private.pingPathChanges();
                }

                return session;
            };

            this.getSession = function() {
                var deferred = $q.defer();

                if (this.ready) {
                    deferred.resolve(_private.session);
                } else {
                    _private.pendingGetSession = deferred;
                }

                return deferred.promise;
            };

            this.getAppData = function() {
                var deferred = $q.defer();

                if (_private.appData) {
                    deferred.resolve(_private.appData);
                } else {
                    _private.pendingGetAppData = deferred;
                }

                return deferred.promise;
            };

            this.getSiteUrl = function() {
                return _private.session.request('currentUrl');
            };

            this.requestBar = function(show) {
                _private.session.ping('requestBar', show);
            };

            this.requestTransitionState = function(state) {
                return _private.session.request('transitionState', state);
            };

            /* @private */

            this._private = function() {
                return _private;
            };
        }]);
})();

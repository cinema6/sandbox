(function() {
    /*jshint -W106 */
    'use strict';

    angular.module('c6.ui')
        .service('postMessage', ['$window', '$rootScope', '$q', 'c6EventEmitter', '$timeout', function($window, $rootScope, $q, c6EventEmitter, $timeout) {
            var _private = {
                ping: function(win, event, type, data) {
                    $timeout(function() {
                        var message = { __c6__: { event: event, type: type, data: data } };

                        win.postMessage(JSON.stringify(message), '*');
                    });
                },
                sessionCount: 0,
                sessions: {},
                getSessionByWindow: function(win) {
                    var sessions = this.sessions,
                        foundSession;

                    angular.forEach(sessions, function(session) {
                        if (session.window === win) {
                            foundSession = session;
                        }
                    });

                    return foundSession;
                },
                handleMessage: function(event) {
                    var eventData = event.data,
                        c6,
                        eventName,
                        type,
                        typeName,
                        typeId,
                        data,
                        session,
                        done;

                    try {
                        c6 = JSON.parse(eventData).__c6__;
                    } catch (err) {
                        c6 = undefined;
                    }

                    if (!c6) { return; }

                    eventName = c6.event;
                    type = c6.type.split(':');
                    typeName = type[0];
                    typeId = type[1];
                    data = c6.data;
                    session = _private.getSessionByWindow(event.source);

                    if (typeName === 'request') {
                        done = function(response) {
                            _private.ping(event.source, eventName, ('response:' + typeId), response);
                        };

                        session.emit(eventName, data, done);
                    } else if (typeName === 'response') {
                        session._pending[typeId].resolve(data);
                    } else if (typeName === 'ping') {
                        session.emit(eventName, data, angular.noop);
                    }

                    $rootScope.$digest();
                },
                newRequestId: function(session) {
                    var id = 0;

                    while (session._pending[id]) {
                        id++;
                    }

                    return id;
                }
            };

            /* @init */

            $window.addEventListener('message', _private.handleMessage, false);

            /* @public */

            this.createSession = function(win) {
                var session = {
                    id: _private.sessionCount,
                    window: win,
                    _pending: {},

                    ping: function(event, data) {
                        _private.ping(this.window, event, 'ping', data);
                    },

                    request: function(event, data) {
                        var deferred = $q.defer(),
                            id = _private.newRequestId(this);

                        this._pending[id] = deferred;

                        _private.ping(this.window, event, ('request:' + id), data);

                        return deferred.promise;
                    }
                };

                c6EventEmitter(session);

                _private.sessions[session.id] = session;

                _private.sessionCount++;

                return session;
            };

            this.destroySession = function(id) {
                var session = _private.sessions[id];

                session.removeAllListeners();

                angular.forEach(session, function(value, prop) {
                    if (angular.isFunction(value)) {
                        session[prop] = angular.noop;
                    } else {
                        session[prop] = undefined;
                    }
                });

                delete _private.sessions[id];
            };

            this.getSession = function(id) {
                return _private.sessions[id];
            };

            /* @private */

            this._private = function() {
                return _private;
            };
        }]);
})();

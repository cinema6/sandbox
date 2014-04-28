(function() {
    'use strict';

    angular.module('c6.sandbox')
        .service('C6ExperienceService', ['$q', 'postMessage', 'c6BrowserInfo', 'c6Defines',
                                function( $q ,  postMessage ,  c6BrowserInfo ,  c6Defines ) {
            var _private = {
                sessions: {},

                decorateSession: function(session, experience) {
                    session.experience = experience;
                    session.ready = false;
                }
            };

            /* @public */

            this.getSession = function(expId) {
                return (_private.sessions[expId] = _private.sessions[expId] || $q.defer()).promise;
            };

            /* @private */

            this._registerExperience = function(experience, user, expWindow) {
                var session = postMessage.createSession(expWindow),
                    expId = experience.id;

                _private.decorateSession(session, experience);

                session.once('handshake', function(data, respond) {
                    respond({
                        success: true,
                        appData: {
                            dubServiceUrl : c6Defines.kDubUrls[c6Defines.kEnv],
                            experience    : experience,
                            user          : user,
                            profile       : c6BrowserInfo.profile
                        }
                    });
                });

                session.once('ready', function() {
                    session.ready = true;
                    (_private.sessions[expId] = _private.sessions[expId] || $q.defer()).resolve(session);
                });

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

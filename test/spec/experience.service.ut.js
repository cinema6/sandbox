(function() {
    /*jshint camelcase:false */
    'use strict';

    define(['experience_service'], function() {
        var C6ExperienceService,
            c6BrowserInfo,
            postMessage,
            $rootScope,
            $q,
            _private,
            session,
            sessionOnceSpy,
            sessionOnceHandshakeHandler,
            sessionOnceReadyHandler,
            experience,
            user,
            expWindow,
            promise,
            promiseThenSpy,
            promiseThenHandler;

        describe('C6ExperienceService', function() {
            sessionOnceSpy = jasmine.createSpy('session once');

            promiseThenSpy = jasmine.createSpy('promise then');

            beforeEach(function() {
                promise = {
                    then: function(handler) {
                        promiseThenSpy(handler);
                        promiseThenHandler = handler;
                    }
                };

                experience = {
                    id: 'e1'
                };

                user = {
                    id: 'u1'
                };

                expWindow = {};

                session = {
                    id: 0,
                    once: function(event, handler) {
                        sessionOnceSpy(event, handler);

                        if (event === 'handshake') {
                            sessionOnceHandshakeHandler = handler;
                        } else if (event === 'ready') {
                            sessionOnceReadyHandler = handler;
                        }
                    },
                    emit: jasmine.createSpy('session emit'),
                    request: jasmine.createSpy('session request').andReturn(promise),
                    ping: jasmine.createSpy('session ping')
                };

                postMessage = {
                    createSession: jasmine.createSpy('createSession spy').andReturn(session),
                    destroySession: jasmine.createSpy('destroySession spy')
                };

                c6BrowserInfo = {
                    profile: {}
                };

                module('c6.ui', function($provide) {
                    $provide.value('postMessage', postMessage);
                    $provide.provider('c6BrowserInfo', function(){
                        this.augmentProfile = 
                            jasmine.createSpy('c6BrowserInfoProvider.augmentProfile'); 
                        this.$get = function() { return c6BrowserInfo; };
                    });
                });

                module('c6.sandbox', function($provide) {
                    $provide.value('c6Defines', {
                        kDubUrls: {
                            dev: 'http://dev.cinema6.com/dub'
                        },
                        kEnv: 'dev'
                    });
                });

                inject(function(_C6ExperienceService_, _$rootScope_, _$q_) {
                    C6ExperienceService = _C6ExperienceService_;
                    _private = C6ExperienceService._private();
                    $rootScope = _$rootScope_;
                    $q = _$q_;
                });
            });

            it('should exist', function() {
                expect(C6ExperienceService).toBeDefined();
            });

            describe('@public methods', function() {
                describe('getSession(expId)', function() {
                    var resolveHandlerSpy;

                    beforeEach(function() {
                        resolveHandlerSpy = jasmine.createSpy('resolve handler');
                    });

                    it('should return a promise', function() {
                        expect(typeof C6ExperienceService.getSession('e1').then).toBe('function');
                    });

                    describe('if the session is not available', function() {
                        var result;

                        beforeEach(function() {
                            result = C6ExperienceService.getSession('e1');
                        });

                        it('should add a deferred to the sessions hash', function() {
                            expect(_private.sessions.e1.promise).toBeDefined();
                        });

                        it('should return the promise of the deferred it created', function() {
                            expect(result).toBe(_private.sessions.e1.promise);
                        });
                    });

                    describe('if the session is already available', function() {
                        var result,
                            deferred;

                        beforeEach(function() {
                            deferred = _private.sessions.e1 = $q.defer();

                            result = C6ExperienceService.getSession('e1');
                        });

                        it('should return the existing promise', function() {
                            expect(result).toBe(deferred.promise);
                        });
                    });
                });
            });

            describe('_private methods', function() {
                describe('decorateSession(session, experience)', function() {
                    beforeEach(function() {
                        _private.decorateSession(session, experience);
                    });

                    it('should decorate the session with a reference to the experience', function() {
                        expect(session.experience).toBe(experience);
                    });

                    it('should decorate the session with a false ready property', function() {
                        expect(session.ready).toBe(false);
                    });
                });
            });

            describe('@private methods', function() {
                describe('_private()', function() {
                    it('should allow you to access the private methods and properties', function() {
                        expect(_private).toBeDefined();
                    });
                });

                describe('_registerExperience(experience, user, expWindow)', function() {
                    var returnedSession;

                    beforeEach(function() {
                        spyOn(_private, 'decorateSession');

                        returnedSession = C6ExperienceService._registerExperience(experience,user, expWindow);
                    });

                    it('should create a postMessage session with the window', function() {
                        expect(postMessage.createSession).toHaveBeenCalledWith(expWindow);
                    });

                    it('should decorate the session', function() {
                        expect(_private.decorateSession).toHaveBeenCalledWith(session, experience);
                    });

                    it('should return the session', function() {
                        expect(returnedSession).toBe(session);
                    });

                    it('should listen for a handshake from the experience', function() {
                        expect(sessionOnceSpy).toHaveBeenCalledWith('handshake', sessionOnceHandshakeHandler);
                    });

                    it('should listen for the ready event from the session', function() {
                        expect(sessionOnceSpy).toHaveBeenCalledWith('ready', sessionOnceReadyHandler);
                    });

                    it('should not resolve any promises right away', function() {
                        var spy = jasmine.createSpy('promise spy'),
                            deferred = _private.sessions.e1 = $q.defer();

                        $rootScope.$apply(function() {
                            C6ExperienceService._registerExperience(experience, expWindow);
                        });

                        $rootScope.$apply(function() {
                            deferred.promise.then(spy);
                        });

                        expect(spy).not.toHaveBeenCalled();
                    });

                    describe('when the session is ready', function() {
                        beforeEach(function() {
                            $rootScope.$apply(sessionOnceReadyHandler);
                        });

                        it('should set the session\'s ready property to true', function() {
                            expect(session.ready).toBe(true);
                        });

                        describe('if the session has not yet been requested', function() {
                            var sessionHandler;

                            beforeEach(function() {
                                sessionHandler = jasmine.createSpy('session promise handler');

                                _private.sessions = {};

                                $rootScope.$apply(function() {
                                    returnedSession = C6ExperienceService._registerExperience(experience, expWindow);
                                    sessionOnceReadyHandler();
                                });

                                $rootScope.$apply(function() {
                                    _private.sessions.e1.promise.then(sessionHandler);
                                });
                            });

                            it('should add a deferred that resolves to the session to the sessions hash', function() {
                                expect(sessionHandler).toHaveBeenCalledWith(session);
                                expect(_private.sessions.e1).toBeDefined();
                            });
                        });

                        describe('if the session has already been requested', function() {
                            var sessionHandler;

                            beforeEach(function() {
                                sessionHandler = jasmine.createSpy('session promise handler');

                                _private.sessions = {
                                    e1: $q.defer()
                                };

                                _private.sessions.e1.promise.then(sessionHandler);

                                $rootScope.$apply(function() {
                                    returnedSession = C6ExperienceService._registerExperience(experience, expWindow);
                                    sessionOnceReadyHandler();
                                });
                            });

                            it('should resolve the existing promise with the session', function() {
                                expect(sessionHandler).toHaveBeenCalledWith(session);
                            });
                        });
                    });

                    describe('when the handshake is requested', function() {
                        var respondSpy;

                        beforeEach(function() {
                            respondSpy = jasmine.createSpy('respond spy');

                            sessionOnceHandshakeHandler({}, respondSpy);
                        });

                        it('should respond with handshake data', function() {
                            var handshakeData = respondSpy.mostRecentCall.args[0];

                            expect(handshakeData.success).toBe(true);
                            expect(handshakeData.appData.experience).toBe(experience);
                            expect(handshakeData.appData.profile).toBe(c6BrowserInfo.profile);
                            expect(handshakeData.appData.dubServiceUrl).toBe('http://dev.cinema6.com/dub');
                        });
                    });
                });

                describe('_deregisterExperience(expId)', function() {
                    beforeEach(function() {
                        _private.sessions.e1 = session;

                        C6ExperienceService._deregisterExperience('e1');
                    });

                    it('should destroy the session', function() {
                        expect(postMessage.destroySession).toHaveBeenCalledWith(0);
                    });

                    it('should remove the session from the hash', function() {
                        expect(_private.sessions.hasOwnProperty('e1')).toBe(false);
                    });
                });
            });
        });
    });
})();

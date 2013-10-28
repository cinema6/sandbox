(function() {
    'use strict';

    angular.module('c6.ui')
        .provider('c6BrowserInfo', [function() {
            var providerPrivate = {
                    Modernizr: undefined
                };

            this.setModernizr = function(modernizr) {
                providerPrivate.Modernizr = modernizr;
            };

            this._private = function() {
                return providerPrivate;
            };

            this.$get = ['c6UserAgent', '$window', '$log',
                function( c6UserAgent ,  $window ,  $log) {
                function C6BrowserInfo() {
                    var _private = {
                            modernizr: function() {
                                return providerPrivate.Modernizr || $window.Modernizr;
                            }
                        },
                        Modernizr = _private.modernizr();

                    if (!Modernizr) {
                        $log.error('Modernizr could not be found. Please make sure it is included or register it with c6BrowserInfoProvider.setModernizr()');
                    }

                    this.generateProfile = function() {
                        var profile = {};

                        profile.inlineVideo = (function() {
                            return !(c6UserAgent.device.isIPhone() || c6UserAgent.device.isIPod() || c6UserAgent.app.name === 'silk');
                        })();

                        profile.multiPlayer = (function() {
                            return !(c6UserAgent.device.isIOS() || c6UserAgent.app.name === 'silk');
                        })();

                        profile.canvasVideo = (function() {
                            var macOSXVersion = (function() {
                                var version = (c6UserAgent.os.name === 'mac' &&
                                                (c6UserAgent.os.version) &&
                                                (c6UserAgent.os.version.match(/(\d+\.\d+)/)));

                                return (version || null) && parseFloat(version);
                            })();

                            return !(c6UserAgent.device.isIOS() ||
                                    c6UserAgent.app.name === 'silk' ||
                                    c6UserAgent.app.name === 'safari' && (macOSXVersion >= 10.7 && macOSXVersion <= 10.8));
                        })();

                        profile.touch = Modernizr && Modernizr.touch;

                        profile.canvas = Modernizr && Modernizr.canvas;

                        profile.localstorage = Modernizr && Modernizr.localstorage;

                        profile.raf = (function() {
                            var majorIOSVersion;

                            if (c6UserAgent.device.isIOS()) {
                                majorIOSVersion = c6UserAgent.os.version.split('.')[0];

                                if (majorIOSVersion < 7) {
                                    return false;
                                }
                            }

                            return Modernizr && !!Modernizr.prefixed('requestAnimationFrame', $window);
                        })();

                        return profile;
                    };

                    this.profile = this.generateProfile();

                    this._private = function() {
                        return _private;
                    };
                }

                return new C6BrowserInfo();
            }];
        }]);
})();

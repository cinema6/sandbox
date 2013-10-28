(function(angular) {
    'use strict';

    angular.module('c6.ui')
        .factory('c6AudioContext', ['$window', function($window) {
            return $window.AudioContext || $window.webkitAudioContext || $window.msAudioContext || $window.mozAudioContext;
        }])

        .service('c6Sfx', ['c6AudioContext', '$http', '$q', '$rootScope', '$window', '$log', '$timeout', function(AudioContext, $http, $q, $rootScope, $window, $log, $timeout) {
            var context = AudioContext ? new AudioContext() : undefined,
                sounds = [],
                safeApply = function(func) {
                    return $rootScope.$$phase ? func() : $rootScope.$apply(func);
                },
                c6SfxSvc = this, C6Sfx;

            if (context) {
                if (context.createGain === undefined){
                    context.createGain = context.createGainNode;
                }
            }

            C6Sfx = function(config, context) {
                var self = this,
                    buffer,
                    volume = 1,
                    players = [],
                    activeSfx = [],
                    createPlayerInstance = function() {
                        $log.log('creating instance');
                        var instance = new $window.Audio(self.src);
                        players.push(instance);
                        return instance;
                    };

                this.name = config.name;
                this.src = (function(src) {
                    var srcArray = src.split('.'),
                        potentialExtension = srcArray[srcArray.length - 1],
                        hasValidExtension = (c6SfxSvc.validFormats.indexOf(c6SfxSvc.formatForExtension(potentialExtension)) !== -1);

                    return hasValidExtension ? src : src + '.' + c6SfxSvc.extensionForFormat(c6SfxSvc.bestFormat());
                })(config.src);
                this.isLoaded = false;

                this.load = function () {
                    var deferred = $q.defer(),
                        me = this;

                    function resolvePromise(event) {
                        $rootScope.$apply(function() {
                            deferred.resolve(me);
                            me.isLoaded = true;
                        });

                        event.target.removeEventListener('canplaythrough', resolvePromise, false);
                    }

                    if (context) {
                        $http({
                            method: 'GET',
                            url: this.src,
                            responseType: 'arraybuffer'
                        }).then(function(response) {
                            context.decodeAudioData(response.data, function(buff) {
                                buffer = buff;
                                safeApply(function() {
                                    deferred.resolve(me);
                                    me.isLoaded = true;
                                });
                            });
                        });
                    } else {
                        players.length = 0;

                        for (var i = 0; i < 3; i++) {
                            createPlayerInstance();
                        }

                        players[0].addEventListener('canplaythrough', resolvePromise, false);
                    }

                    return deferred.promise;
                };

                this.play = function(config) {
                    if (context) {
                        this.play = function(config) {
                            var source = context.createBufferSource(),
                                gainNode = context.createGain(),
                                sfx = {
                                    source: source,
                                    gainNode: gainNode
                                };

                            gainNode.gain.value = volume;

                            source.buffer = buffer;
                            source.loop = (config && config.loop) || false;
                            source.onended = function() {
                                activeSfx.splice(activeSfx.indexOf(sfx), 1);
                            };

                            source.connect(gainNode);
                            gainNode.connect(context.destination);

                            if (source.start) {
                                source.start(0);
                            } else if (source.noteOn) {
                                source.noteOn(0);
                            }

                            activeSfx.push(sfx);
                        };
                        this.play(config);
                    } else {
                        this.play = function(config) {
                            var goodPlayer;

                            players.some(function(player, index) {
                                if (player.paused || player.ended) {
                                    player.currentTime = 0;
                                    goodPlayer = player;
                                    return true;
                                } else if (index === players.length - 1) {
                                    goodPlayer = createPlayerInstance();
                                }
                            });

                            goodPlayer.volume = volume;
                            goodPlayer.loop = (config && config.loop) || false;
                            goodPlayer.play();
                        };
                        this.play(config);
                    }
                };

                this.stop = function() {
                    if (context) {
                        this.stop = function() {
                            activeSfx.forEach(function(sfx) {
                                if (sfx.source.stop) {
                                    sfx.source.stop(0);
                                } else if (sfx.source.noteOff) {
                                    sfx.source.noteOff(0);
                                }
                            });
                            activeSfx.length = 0;
                        };
                        this.stop();
                    } else {
                        this.stop = function() {
                            players.forEach(function(player) {
                                if (!player.paused && !player.ended) {
                                    player.pause();
                                }
                            });
                        };
                        this.stop();
                    }
                };

                this.setVolumeToValueOverTime = function(volume, time) {
                    var self = this,
                        deferred = $q.defer(),
                        startTime,
                        endTime,
                        startVolume = this.volume;

                    function setVolume() {
                        var currentTime = new $window.Date().getTime(),
                            percentThrough;

                        if (!startTime) {
                            startTime = currentTime;
                            endTime = startTime + time;
                        }

                        percentThrough = (currentTime - startTime) / time;

                        if (currentTime <= endTime) {
                            self.volume = startVolume - (percentThrough * (startVolume - volume));
                            $timeout(setVolume, 1, false);
                        } else {
                            self.volume = volume;
                            $rootScope.$apply(function() {
                                deferred.resolve(self);
                            });
                        }
                    }

                    setVolume();

                    return deferred.promise;
                };

                Object.defineProperty(this, 'volume', {
                    set: function(newVolume) {
                        if (context) {
                            this.set = function(newVolume) {
                                activeSfx.forEach(function(sfx) {
                                    sfx.gainNode.gain.value = newVolume;
                                });
                                volume = newVolume;
                                return volume;
                            };
                        } else {
                            this.set = function(newVolume) {
                                players.forEach(function(player) {
                                    player.volume = newVolume;
                                });
                                volume = newVolume;
                            };
                        }
                        return this.set(newVolume);
                    },
                    get: function() {
                        return volume;
                    }
                });

                // Disable if we don't have the required browser support
                if ((!context && c6SfxSvc.isMobileSafari) || !$window.Audio) {
                    var noop = angular.noop,
                        isFunction = angular.isFunction;

                    for (var key in this) {
                        if (this.hasOwnProperty(key)) {
                            if (isFunction(this[key])) {
                                this[key] = noop;
                            }
                        }
                    }
                }
            };

            this.loadSounds = function(configs) {
                var promises = [];

                configs.forEach(function(config) {
                    var sfx = new C6Sfx(config, context);
                    sounds.push(sfx);
                    promises.push(sfx.load());
                });

                return $q.all(promises);
            };

            this.getSoundByName = function(name) {
                var toReturn;
                sounds.some(function(sound) {
                    if (sound.name === name) {
                        toReturn = sound;
                        return true;
                    }
                });
                return toReturn;
            };

            this.getSounds = function() {
                return sounds.slice(0);
            };

            this.playSound = function(name, config) {
                this.getSoundByName(name).play(config);
            };

            this.fadeInSound = function(name, time) {
                var sfx = this.getSoundByName(name);

                sfx.volume = 0;
                sfx.play();
                return sfx.setVolumeToValueOverTime(1, time);
            };

            this.stopSound = function(name) {
                this.getSoundByName(name).stop();
            };

            this.fadeOutSound = function(name, time) {
                var sfx = this.getSoundByName(name);

                return sfx.setVolumeToValueOverTime(0, time).then(function() {
                    sfx.stop();
                    return sfx;
                });
            };

            this.bestFormat = function(formats) {
                var goodFormats = [],
                greatFormats = [],
                audio = new $window.Audio();

                if (!formats) {
                    formats = this.validFormats;
                }

                if (!angular.isArray(formats)) {
                    throw new TypeError('You must pass in an array of format strings.');
                }

                formats.forEach(function(format) {
                    var decision = audio.canPlayType(format);

                    if (decision === 'probably') {
                        greatFormats.push(format);
                    } else if (decision === 'maybe') {
                        goodFormats.push(format);
                    }
                });

                audio = null;

                return greatFormats[0] || goodFormats[0];
            };

            this.validFormats = ['audio/mp3', 'audio/ogg'];

            this.extensionForFormat = function(format) {
                return format.split('/').pop();
            };

            this.formatForExtension = function(extension) {
                return 'audio/' + extension;
            };

            this.isMobileSafari = $window.navigator.userAgent.match(/(iPod|iPhone|iPad)/);
        }]);
})(angular);

(function() {
    'use strict';
    angular.module('c6.ui')
    .service('c6VideoService', ['$document', '$window', function($document, $window) {
        // Class method to figure out the best format to use given an array of formats
        // Optionally, provide no formats and use the default formats
        this.bestFormat = function(formats) {
            var goodFormats = [],
            greatFormats = [],
            video = $document[0].createElement('VIDEO');
            formats = formats? formats : this.validFormats;

            if (Object.prototype.toString.call(formats) !== '[object Array]') {
                throw new TypeError('You must pass in an array of format strings.');
            }

            formats.forEach(function(format) {
                var decision = video.canPlayType(format);

                if (decision === 'probably') {
                    greatFormats.push(format);
                } else if (decision === 'maybe') {
                    goodFormats.push(format);
                }
            });

            if (greatFormats.length) {
                return greatFormats[0];
            } else {
                return goodFormats[0];
            }

            video = null;
        };
        // Formats available. Adjust this if you want to support another format, or remove support for one
        this.validFormats = ['video/mp4', 'video/webm', 'video/ogg'];
        // Get the extension given a format.
        this.extensionForFormat = function(format) {
            return format.split('/').pop();
        };
        // Get the format given an extension
        this.formatForExtension = function(extension) {
            return 'video/' + extension;
        };
        // Figure out if we're running chrome.
        this.isChrome = $window.chrome? true : false;
        // Figure out if we're running Mobile Safari
        this.isIPhone = $window.navigator.userAgent.match(/iPhone/)? true : false;
        // Figure out if we're running Safari
        this.isSafari = ($window.navigator.userAgent.indexOf('Safari') !== -1 && $window.navigator.userAgent.indexOf('Chrome') === -1);

        this.totalTimeInRanges = function(tr) {
            var result = 0;
            for (var i =0; i < tr.length; i++) {
                result += (tr.end(i) - tr.start(i));
            }
            return result;
        };
    }])

    .controller('C6VideoController', ['$scope', '$element', '$attrs', '$document', '$timeout', 'c6VideoService', '$log', function($scope, $element, $attrs, $document, $timeout, c6videoService, $log) {
        var subscribedEvents = {},
            handleEvent = function(event) {
                var eventName = event.type,
                subscription = subscribedEvents[eventName];

                if (subscription) {
                    subscription.handlers.forEach(function(handler) {
                        $scope.$apply(handler(event, c6video));
                    });
                    if (subscription.emit) { $scope.$emit('c6video-' + event.type, c6video); }
                }
            },
            videoHasPlayed = false;

        var c6video = {
            // The ID of the player, typically defined by setting the id of the video tag in HTML
            id: $attrs.id,
            // The actual HTML5 video player
            player: $element[0],
            // Set to true the first time the video is played.
            hasPlayed: function() {
                return videoHasPlayed;
            },
            // Method to set up a way to respond to video events
            // (either by passing in a handler function, or emiting to the scope.
            on: function(events, handler, emit) {
                events = Object.prototype.toString.call(events) === '[object Array]'? events : [events];
                emit = typeof emit !== 'undefined'? emit : false;
                if (!handler) { emit = true ; }
                var video = this.player;

                events.forEach(function(event) {
                    if (subscribedEvents[event]) {
                        if (handler) { subscribedEvents[event].handlers.push(handler); }
                        if (emit) { subscribedEvents[event].emit = true; }
                    } else {
                        subscribedEvents[event] = { handlers: handler? [handler] : [], emit: emit };
                        video.addEventListener(event, handleEvent, false);
                    }
                });

                return this;
            },
            // Method to remove all event handlers (and Angular broadcasting.)
            off: function(events, handler) {
                events = Object.prototype.toString.call(events) === '[object Array]'? events : [events];
                var video = this.player;

                events.forEach(function(event) {
                    if (!handler) {
                        delete subscribedEvents[event];
                    } else {
                        var handlerIndex = subscribedEvents[event].handlers.indexOf(handler);

                        subscribedEvents[event].handlers.splice(handlerIndex, 1);
                    }

                    if (!subscribedEvents[event] || (!subscribedEvents[event].handlers.length && !subscribedEvents[event].emit)) {
                        if (subscribedEvents[event]) { delete subscribedEvents[event]; }

                        video.removeEventListener(event, handleEvent, false);
                    }
                });

                return this;
            },
            // Method of setting the src. Accepts normal filename, filename without extension and JSON array of srcs and types.
            src: function(src) {
                var video = this.player,
                bestFormat = c6videoService.bestFormat();

                if (!src) {
                    //if (video.src) { this.regenerate(); }
                    $log.warn(this.id + ': Cannot set a video src to null');
                    return false;
                }

                if (c6videoService.isIPhone && video.src) {
                    this.regenerate();
                    video = this.player;
                }

                if (typeof src === 'string') {
                    var extension = src.split('.').pop(),
                    validFormats = c6videoService.validFormats;
                    if (validFormats.indexOf(c6videoService.formatForExtension(extension)) === -1) {
                        if (!bestFormat) { throw new Error('This player can\'t player any availabe valid formats.'); }
                        video.src = src + '.' + c6videoService.extensionForFormat(bestFormat);
                    } else {
                        video.src = src;
                    }
                } else if (typeof src === 'object') {
                    var formats = [];

                    src.forEach(function(file) {
                        formats.push(file.type);
                    });

                    src.forEach(function(file) {
                        if (file.type === bestFormat) { video.src = file.src; }
                    });
                }
                video.load();
            },
            // Method to create a new, identical (except for currentTime) player and replace the old one
            regenerate: function() {
                $log.log('c6video: regenerating player.');
                var newVideo = $document[0].createElement('VIDEO'),
                video = this.player;

                for (var i = 0, attrs = video.attributes.length, attribute; i < attrs; i++) {
                    attribute = video.attributes[i];

                    if (attribute.name !== 'currentTime' && attribute.name !== 'src') {
                        newVideo.setAttribute(attribute.name, attribute.value);
                    }
                }

                for (var event in subscribedEvents) {
                    if (subscribedEvents.hasOwnProperty(event)) {
                        newVideo.addEventListener(event, handleEvent, false);
                    }
                }

                video.parentNode.replaceChild(newVideo, video);
                this.player = newVideo;
                videoHasPlayed = false;
                $scope.$emit('c6video-regenerated', this);
            },
            // Method to determine what percent of the video is buffered
            bufferedPercent: function() {
                var video = this.player;
                if (video.duration) {
                    var buffsecs = Math.ceil(c6videoService.totalTimeInRanges(video.buffered));
                    var res = (Math.round(100 * (buffsecs / Math.ceil(video.duration))) / 100);
                    return res;
                }
                return 0;
            },
            // Method to set the height and width of the video all at once
            size: function(width, height) {
                var video = this.player;

                video.width = width;
                video.height = height;
            },
            // Method to make the video fullscreen, or return from fullscreen (if possible.)
            fullscreen: function(bool) {
                var video = this.player;

                if (bool) {
                    if (video.requestFullscreen) {
                        video.requestFullscreen();
                        return true;
                    } else if (video.mozRequestFullScreen) {
                        video.mozRequestFullScreen();
                        return true;
                    } else if (video.webkitRequestFullscreen) {
                        video.webkitRequestFullscreen();
                        return true;
                    } else if (video.msRequestFullscreen) {
                        video.msRequestFullscreen();
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    if ($document[0].cancelFullScreen) {
                        $document[0].cancelFullScreen();
                        return true;
                    } else if ($document[0].webkitCancelFullScreen) {
                        $document[0].webkitCancelFullScreen();
                        return true;
                    } else if ($document[0].mozCancelFullScreen) {
                        $document[0].mozCancelFullScreen();
                        return true;
                    } else if ($document[0].msCancelFullScreen) {
                        $document[0].msCancelFullScreen();
                        return true;
                    } else if (video.webkitExitFullscreen) {
                        video.webkitExitFullscreen();
                        return true;
                    }
                    return false;
                }
            }
        };

        // Watch the c6-src attribute and set the src if it changes.
        $scope.$watch('c6Src()', function(src) {
            c6video.src(src);
        });

        // Watch the c6-controls attribute and toggle the controls if it changes.
        $scope.$watch('c6Controls()', function(controls) {
            c6video.player.controls = controls;
        });

        // Respond to events specified from attributes
        $attrs.$observe('c6Events', function(config) {
            var event,
                options,
                vidEventHandler = function(event, video) {
                    var expression = config[event.type].exp,
                        workingScope = $scope.$parent.$new();

                    workingScope.c6 = {
                        event: event,
                        video: video
                    };

                    workingScope.$eval(expression);
                    workingScope.$destroy();
                    workingScope = null;
                },
                ngEventHandler = function(event) {
                    var expression = 'c6video.' + config[event.name].exp;

                    // Put the wrapper on the scope JUST so we can call an expression against it.
                    $scope.c6video = c6video;
                    $scope.$eval(expression);
                    // Delete the wrapper from the scope.
                    delete $scope.c6video;
                };

            config = $scope.$eval(config);

            for (event in config) {
                options = config[event] = (typeof config[event] === 'object') ? config[event] : { exp: config[event], source: 'vid' };

                if (options.source === 'ng') {
                    $scope.$on(event, ngEventHandler);
                } else {
                    c6video.on(event, vidEventHandler);
                }
            }
        });

        c6video.on('play', function() {
            videoHasPlayed = true;
        });

        if ($attrs.id) {
            $attrs.$observe('id', function(id) {
                if (id) {
                    // This event means an instance of C6Video has been created.
                    c6video.id = id;
                    $scope.$emit('c6video-ready', c6video);
                }
            });
        } else {
            $scope.$emit('c6video-ready', c6video);
        }

        // Emit an event if the player leaves the DOM
        $scope.$on('$destroy', function() {
            $scope.$emit('c6video-destroyed', $attrs.id);
        });

        // Use the chrome hack.
        if (c6videoService.isChrome) {
            var hackyHackyChromeySucky = function(event) {
                var video = event.target;
                $log.info(c6video.id + ': Applied Chrome Hack - ' + video.currentSrc);

                // SEE THE SPAGHETTI YOU MAKE ME WRITE, GOOGLE?!
                // Make sure I can play this video
                if (video.readyState > 0) {
                    video.muted = true;
                    video.play();
                    $timeout(function() {
                        // Make sure I can pause it after 50 ms. Awesome.
                        if (video.readyState > 0) {
                            video.pause();
                            video.currentTime = 0;
                            video.muted = false;
                        }
                    }, 50);
                }
                video.removeEventListener('canplay', hackyHackyChromeySucky, false);
            };

            c6video.player.addEventListener('canplay', hackyHackyChromeySucky, false);
        }
    }])

    .directive('c6Video', [function () {
        return {
            controller: 'C6VideoController',
            scope: {
                c6Src: '&',
                c6Controls: '&',
                id: '@'
            }
        };
    }]);
})();

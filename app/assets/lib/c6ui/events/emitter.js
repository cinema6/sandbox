(function(){

    'use strict';
    angular.module('c6.ui')
    .factory('c6EventEmitter',['$log',function($log){
        var eventEmitter = function(){
            var events       = {},
                maxListeners = 10,
                emitter      = {};

            emitter.on = function(eventName,listener, once){
                var evtBucket = events[eventName],
                    itm = {
                        eventName : eventName,
                        listener  : listener,
                        reuse     : (once === true) ? false : true
                    },
                    notNew = (this.listeners(eventName).indexOf(listener) > -1);

                if (!evtBucket) {
                    evtBucket = events[eventName] = [];
                }

                evtBucket.push(itm);

                if ((maxListeners > 0) && (maxListeners < evtBucket.length)) {
                    $log.error('Event [' + eventName + '] listeners (' + evtBucket.length +
                        ') exceeds max(' + maxListeners + ').');
                }

                if (!notNew){
                    this.emit('newListener',eventName,listener);
                }

                return this;
            };

            emitter.once = function(eventName,listener){
                return emitter.on(eventName,listener,true);
            };

            emitter.removeListener = function(eventName,listener){
                var evtBucket = events[eventName];
                if (evtBucket){
                    for (var i = 0; i < evtBucket.length; i++){
                        if (evtBucket[i].listener === listener){
                            evtBucket.splice(i--,1);
                        }
                    }
                }

                if (this.listeners(eventName).indexOf(listener) < 0){
                    this.emit('removeListener',eventName,listener);
                }

                return this;
            };

            emitter.removeAllListeners = function(eventName){
                if (eventName) {
                    var bucket = events[eventName], itm;
                    if (bucket){
                        itm = bucket[0];
                        while(itm !== undefined){
                            this.removeListener(itm.eventName,itm.listener);
                            itm = bucket[0];
                        }
                    }
                    events[eventName] = [];
                } else {
                    angular.forEach(events,function(val,key){
                        events[key] = [];
                    });
                }

                return this;
            };

            emitter.setMaxListenersWarning = function(max){
                maxListeners = max;
                return this;
            };

            emitter.listeners = function(eventName){
                var evtBucket = events[eventName],
                    result    = [];

                if (evtBucket){
                    for (var i = 0, ct = evtBucket.length; i < ct; i++){
                        result.push(evtBucket[i].listener);
                    }
                }

                return result;
            };

            emitter.emit = function(eventName){
                var evtBucket = events[eventName], result = false;
                if (evtBucket){
                    var copy = [].slice.call(arguments);
                    copy.shift();
                    for (var i = 0; i < evtBucket.length; i++){
                        evtBucket[i].listener.apply(evtBucket[i].listener,copy);
                        result = true;
                        if (evtBucket[i].reuse === false){
                            evtBucket.splice(i--,1);
                        }
                    }
                }

                return result;
            };

            return emitter;
        };

        return function(dst){
            return angular.extend(dst,eventEmitter());
        };

    }]);

}());

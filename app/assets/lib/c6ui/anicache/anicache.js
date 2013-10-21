(function(){
    'use strict';

    angular.module('c6.ui')
    .factory('c6AniCache',['$log','c6EventEmitter',function($log,c6EventEmitter){
        $log.log('Create c6AniCache service');
        var service,
            anis    = [],
            data    = {},
            enabled = false;

        service = function(ani){
            if ( !ani ){
                $log.error('c6AniCache received an undefined animtation');
                return undefined;
            }

            var wrapped = { },
                id = ani.id;

            if (!id) {
                id = 'animation';
            }

            wrapped.setup = function(element){
                if (!enabled){
                    return undefined;
                }
                service.emit('setup',id);

                return ani.setup(element);
            };

            wrapped.start = function(element,done,memo){
                if (!enabled){
                    $log.info('c6AniCache.enabled === false, supressing start: ' + id );
                    done();
                    return;
                }
                service.emit('start',id);
                var c, r;
                if (ani.cancel){
                    c = service.cache(function(){
                        ani.cancel(element,function(){
                            service.uncache(c);
                            done();
                            service.emit('cancel',id);
                        },memo);
                    },ani.id);
                }

                r = ani.start(element,function(){
                    if (c){
                        service.uncache(c);
                    }
                    done();
                    service.emit('complete',id);
                },memo);
                return r;
            };

            $log.info('aniCache returning ' + id);
            service.emit('create',id);
            return wrapped;
        };

        service.enabled = function(v){
            if (v !== undefined){
                enabled = (v) ? true : false;
                $log.log('Enable animations: ' + enabled);
            }
            return enabled;
        };

        service.cache = function(cancelFunc,token){
            $log.info('Caching animation ' + ( (token) ? token : '') +', count=' + anis.length);
            var ani = {
                cancel  : cancelFunc,
                token   : token
            };
            anis.push(ani);
            $log.info('Cached animation ' + ( (token) ? token : '') +', count=' + anis.length);
            return ani;
        };

        service.uncache = function(ani){
            $log.info('Attempt uncaching animation ' + ( (ani.token) ? ani.token : '') +
                ', count=' + anis.length);
            for (var i = 0; i < anis.length; i++){
                if (anis[i] === ani){
                    anis.splice(i--,1);
                    $log.info('Uncached animation ' + ( (ani.token) ? ani.token : '') +
                        ', count=' + anis.length);
                    break;
                }
            }
            return this;
        };

        service.cancelWithToken = function(token){
            $log.info('Attempt cancelWithToken token=' + token + ', count=' + anis.length);
            if (!token){
                $log.warn('Token should not be null');
                return this;
            }

            for (var i = 0; i < anis.length; i++){
                if (anis[i].token === token){
                    var ani = anis[i];
                    anis.splice(i--,1);
                    $log.log('Uncached animation ' + ( (ani.token) ? ani.token : '') +
                            ', count=' + anis.length);
                    if (ani.cancel){
                        ani.cancel(ani);
                    }
                }
            }
            return this;
        };

        service.cancelAll = function(){
            $log.info('Kill all animation, count=' + anis.length);
            var ani = anis.shift();
            while(ani){
                if (ani.cancel){
                    ani.cancel(ani);
                }
                ani = anis.shift();
            }

            return this;
        };

        service.data  = function(key,val){
            if (val === undefined){
                return data[key];
            }

            data[key] = val;
            return service;
        };

        return c6EventEmitter(service);
    }]);

}());

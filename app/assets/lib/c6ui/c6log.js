(function(window$){
    'use strict';


    angular.module('c6.log',['c6.ui'])
    .constant('c6Defines', (window$.c6 || {}))
    .config(['$provide', 'c6Defines','c6FormatterProvider',
        function($provide, c6Defines, fmtProv ) {
        if (c6Defines.kHasKarma){
            return;
        }

        if (c6Defines.kLogFormats){
            window$.console.warn('Using formatted logging, disable by setting c6.kLogFormats = false');
        }

        if ((c6Defines.kLogLevels === null) || (c6Defines.kLogLevels === undefined)){
            window$.console.warn('c6.kLogLevels is undefined, logging will be disabled.');
        }

        $provide.decorator('$log', ['$delegate', function($delegate) {
            var logLevels = (c6Defines.kLogLevels ? c6Defines.kLogLevels : []),
                formatter = fmtProv.$get(),
                fmt       = formatter();

            angular.forEach($delegate,function(value,key){
                if ((typeof value === 'function') && (logLevels.indexOf(key) === -1)) {
                    $delegate[key] = function(){};
                } else {
                    if (c6Defines.kLogFormats){
                        $delegate[key] = function() {
                            if ((arguments.length > 1 ) &&
                                (angular.isString(arguments[0])) &&
                                (arguments[0].search(/%\d/)  >= 0) ){
                                value(fmt('%1 [%2] %3',
                                    (new Date()).toISOString(), key, fmt.apply(null,arguments) ));

                            } else {
                                var args = Array.prototype.slice.call(arguments,0);
                                args.unshift(fmt('%1 [%2]', (new Date()).toISOString(), key ));
                                value.apply(null,args);
                            }
                        };

                        $delegate[key].wrapped = function(args){
                            args.unshift(fmt('%1 [%2]', (new Date()).toISOString(), key ));
                            value.apply(null,args);
                        };
                    }
                }
            });

            if (!c6Defines.kLogFormats){
                $delegate.context = function(){ return $delegate; };
                return $delegate;
            }

            function C6Log(ctx){
                var self = this,
                    logLevels = c6Defines.kLogLevels,
                    fmtCtx    = formatter(ctx);

                angular.forEach($delegate,function(method,key){
                    if ((typeof method === 'function') && (logLevels.indexOf(key) === -1)) {
                        self[key] = method;
                    } else {
                        self[key] = function(){
                            if ((arguments.length > 1 ) &&
                                (angular.isString(arguments[0])) &&
                                (arguments[0].search(/%\d/)  >= 0) ){
                                method(fmt('%1', fmtCtx.apply(null,arguments) ) );
                            } else {
                                var args = Array.prototype.slice.call(arguments,0);
                                args.unshift('{' + ctx + '}');
                                method.wrapped(args) ;
                            }
                        };
                    }
                });

                self.context  = function(ctx) {
                    return new C6Log(ctx);
                };
            }

            $delegate.context = function(ctx){
                return new C6Log(ctx);
            };
            return $delegate;
        }]);
    }]);

}(window));

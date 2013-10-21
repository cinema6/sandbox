(function(){
    'use strict';

    angular.module('c6.ui')
    .provider('c6Formatter',function(){
        var enabled         = true,
            enableInterpolation   = true,

            basicFormat  = function(context,line){
                if (context){
                    return '{' + context + '} ' + line;
                }
                return line;
            },

            extFormat   = function(context,line,args){
                if ((args === undefined) || (args === null) || (args.length < 1 )){
                    return basicFormat(context,line,args);
                }

                var strLen = line.length, i = 0, pSt = -1,
                    numStr = '', n=0, v='', c='',
                    interpolated = basicFormat(context,'');
                for (i = 0; i < strLen; i++){
                    c = line.charAt(i);
                    if ((pSt > -1) && (c >= '0' && c <= '9')){
                        numStr += c;
                        continue;
                    }
                    if (c === '%'){
                        if (pSt === -1){
                            pSt = i;
                            continue;
                        }

                        // %% will be treated as an escape char
                        if (pSt === (i - 1)){
                            pSt = i;
                            interpolated += '%';
                            continue;
                        }
                    }

                    // If we got here then the char is not a number
                    if (pSt > -1){
                        if (numStr.length > 0){
                            n = Number(numStr) - 1;
                            v = args[n];
                        } else {
                            v = '%';
                        }
                        interpolated += v;
                        pSt = -1;
                        numStr = '';
                    }
                    interpolated += c;
                }

                if (pSt > -1){
                    if (numStr.length > 0){
                        n = Number(numStr) - 1;
                        v = args[n];
                    } else {
                        v = '%';
                    }

                    interpolated += v;
                }

                return interpolated;
            };

        this.disable = function(){
            enabled = false;
            return this;
        };

        this.enable = function(){
            enabled = true;
            return this;
        };

        this.disableInterpolation = function(){
            enableInterpolation = false;
            return this;
        };

        this.enableInterpolation = function(){
            enableInterpolation = true;
            return this;
        };

        this.fnFormat = function(newFunc){
            if (newFunc === undefined){
                return basicFormat;
            }

            if (!angular.isFunction(newFunc)){
                throw new TypeError('fnFormat must be passed a function');
            }

            basicFormat = newFunc;
        };

        this.$get = function(){
            return function(ctxString){
                return function(logLine){
                    if (!enabled){
                        return logLine;
                    }

                    if (!enableInterpolation){
                        return basicFormat(ctxString,logLine);
                    }

                    return extFormat(ctxString,logLine,
                            Array.prototype.splice.call(arguments,1));
                };
            };
        };

    });
}());

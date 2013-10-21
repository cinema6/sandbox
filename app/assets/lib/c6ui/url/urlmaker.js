(function() {
    'use strict';
    angular.module('c6.ui')
    .provider('c6UrlMaker',function(){
        var locationMap = {
            'default' : ''
        }, self = this;

        this.location = function(loc,type){
            if (type === undefined){
                type = 'default';
            }
            locationMap[type] = loc;
            return self;
        };

        this.config = function(){
            return locationMap;
        };

        this.makeUrl = function(target, type){
            if ((type === undefined) || (type === null)){
                type = 'default';
            }
            if (locationMap[type] === undefined){
                throw new Error('unable to find location for type: ' + type);
            }
            return locationMap[type] + '/' + target;
        };

        this.$get = function(){
            var service = function(target, type){
                return self.makeUrl(target, type);
            };

            service.getConfig = function() {
                return self.config();
            };
            return service;
        };

    });
}());

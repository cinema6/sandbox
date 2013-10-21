(function(){
    'use strict';
    angular.module('c6.ui',[])
        .service('c6ui', [function() {
            this.array = {
                lastItem: function(array) {
                    return array[array.length - 1];
                }
            };
        }]);
}());

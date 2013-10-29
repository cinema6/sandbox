/*
 * Copyright © Cinema6 2013 All Rights Reserved. No part of this library
 * may be reproduced without Cinema6's express consent.
 *
 * Build Version: e0c18a9, Tue Oct 29 2013 12:33:08 GMT-0400 (EDT)
 * Build Date: Tue Oct 29 2013 12:36:51 GMT-0400 (EDT)
 */

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

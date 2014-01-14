(function($window){
    /* jshint camelcase:false */
    'use strict';

    var tests = Object.keys($window.__karma__.files).filter(function(file){
        return (/\.(ut|it)\.js$/).test(file);
    });

    function libUrl(url) {
        return 'http://s3.amazonaws.com/c6.dev/ext/' + url;
    }

    $window.requirejs({
        baseUrl: '/base/app/assets/scripts',

        paths: {
            angular: libUrl('angular/v1.2.8-0-g0f9a1c2/angular'),
            angularMocks: libUrl('angular/v1.2.8-0-g0f9a1c2/angular-mocks'),
            jquery: libUrl('jquery/2.0.3-0-gf576d00/jquery'),
            modernizr: libUrl('modernizr/modernizr.custom.71747'),
            c6ui: libUrl('c6ui/v2.0.0-0-ge31e70c/c6uilib'),
            templates: '/base/.tmp/templates'
        },

        shim: {
            angular: {
                deps: ['jquery']
            },
            angularMocks: {
                deps: ['angular']
            },
            c6ui: {
                deps: ['angular']
            },
            templates: {
                deps: ['app']
            },
            app: {
                deps: ['angular', 'angularMocks', 'modernizr', 'c6ui']
            },
            experience_service: {
                deps: ['app']
            }
        },

        priority: [
            'angular'
        ],

        deps: tests,

        callback: $window.__karma__.start
    });
}(window));

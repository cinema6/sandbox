(function(){
    /*jshint -W080 */
    'use strict';

    require.config({
        baseUrl: 'assets'
    });

    function libUrl(url) {
        return 'http://s3.amazonaws.com/c6.dev/ext/' + url;
    }

    var appScripts = [
            'scripts/app',
            'scripts/experience_service'
        ],
        libScripts = [
            libUrl('modernizr/modernizr.custom.71747.js'),
            libUrl('jquery/2.0.3-0-gf576d00/jquery.js'),
            libUrl('angular/v1.2.8-0-g0f9a1c2/angular.js'),
            libUrl('c6ui/v2.1.0-0-g235a9de/c6uilib.js')
        ];

    function loadScriptsInOrder(scriptsList, done) {
        var script;

        if (scriptsList) {
            script = scriptsList.shift();

            if (script) {
                require([script], function() {
                    loadScriptsInOrder(scriptsList, done);
                });
                return;
            }
        }
        done();
    }

    loadScriptsInOrder(libScripts, function() {
        var Modernizr = window.Modernizr;

        Modernizr.load({
            test: Modernizr.touch,
            nope: [
                libUrl('c6ui/v2.1.0-0-g235a9de/css/c6uilib--hover.min.css')
            ],
            complete: function() {
                loadScriptsInOrder(appScripts, function() {
                    angular.bootstrap(document.documentElement, ['c6.sandbox']);
                });
            }
        });
    });
}());

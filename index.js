module.exports = function(config) {
    var path = require('path'),
        fs = require('fs'),
        url = require('url');

    return function(req, res, next) {
        var filepath = url.parse(req.url).pathname;

        filepath = (filepath === '/') ? '/index.html' : filepath;

        fs.readFile(path.resolve(__dirname, ('app' + filepath)), 'utf8', function(err, file) {
            if (err) throw err;

            if (filepath === '/index.html') {
                file = file.replace('<!-- C6_SANDBOX_CONFIG -->', (function() {
                    return [
                        '<script id="c6_config" type="application/json">',
                            JSON.stringify(config),
                        '</script>'
                    ].join('\n');
                })());
            }

            res.end(file);
        });
    };
};

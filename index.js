module.exports = function(config) {
    var path = require('path'),
        fs = require('fs'),
        url = require('url'),
        send = require('send');

    return function(req, res, next) {
        var filepath = url.parse(req.url).pathname;

        filepath = (filepath === '/') ? '/index.html' : filepath;

        if (filepath === '/index.html') {
            fs.readFile(path.resolve(__dirname, ('app' + filepath)), function(err, file) {
                var fileString = (file instanceof Buffer) ? file.toString() : file;

                fileString = fileString.replace('<!-- C6_SANDBOX_CONFIG -->', (function() {
                    return [
                        '<script id="c6_config" type="application/json">',
                            JSON.stringify(config),
                        '</script>'
                    ].join('\n');
                })());

                res.writeHead(200, { 'content-type': 'text/html', 'content-length': Buffer.byteLength(fileString) });
                res.end(fileString);
            });
        } else {
            send(req, url.parse(req.url).pathname)
                .root(path.resolve(__dirname, 'app'))
                .pipe(res)
                .on('error', function(err) {
                    throw err;
                });
        }
    };
};

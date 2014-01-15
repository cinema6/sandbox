var sandbox = require('./index.js');

module.exports = function(grunt) {
    'use strict';

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        watch: {
            test: {
                files: [
                    'app/assets/scripts/**/*.js',
                    'test/spec/**/*.js'
                ],
                tasks: ['ngtemplates:test', 'karma:tdd:run']
            },
            server: {
                files: [
                    'app/index.html',
                    'app/assets/views/**/*.html',
                    'app/assets/scripts/**/*.js',
                    'app/assets/img/**/*.{jpg,jpeg,png,gif,svg,webp}',
                    'app/assets/styles/**/*.css'
                ],
                options: {
                    livereload: true
                }
            }
        },
        connect: {
            app: {
                options: {
                    port: '9000',
                    hostname: '*',
                    livereload: true,
                    open: true,
                    middleware: function() {
                        return [
                            sandbox({
                                experiences: [
                                    {
                                        id: 'e-8d29c9d3dad8d6',
                                        uri: 'sandbox',
                                        appUri: 'sandbox',
                                        appUriPrefix: '__dirname/demo/index.html'
                                    }
                                ]
                            })
                        ];
                    }
                }
            }
        },
        karma: {
            options: {
                configFile: 'test/karma.conf.js'
            },
            unit: {
                singleRun: true
            },
            tdd: {
                background: true
            }
        },
        ngtemplates: {
            test: {
                cwd: 'app',
                src: 'assets/views/**/*.html',
                dest: '.tmp/templates.js',
                options: {
                    module: 'c6.sandbox'
                }
            }
        }
    });

    grunt.registerTask('test', [
        'ngtemplates:test',
        'karma:unit'
    ]);

    grunt.registerTask('test:tdd', [
        'ngtemplates:test',
        'karma:tdd',
        'watch:test'
    ]);

    grunt.registerTask('server', [
        'connect:app',
        'watch:server'
    ]);
};

var path = require('path');

module.exports = function(grunt) {
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        smadd : {
            angular  : { git : 'git@github.com:cinema6/angular.js.git' },
            c6ui     : { git : 'git@github.com:cinema6/c6ui.git' }
        },
        smbuild : {
            angular : { options : { args : ['package'], buildDir : 'build'  } },
            c6ui    : { options : { args : ['build'],   buildDir : 'dist' } }
        }
    });

    grunt.registerMultiTask('smadd','Add submodules',function(){
        var target  = this.target,
            data    = this.data,
            opts    = this.options({
                rootDir : 'vendor',
                alias   : this.target
            }),
            done    = this.async();
        if (!opts.subDir){
            opts.subDir = path.join(opts.rootDir,opts.alias);
        }

        grunt.log.writelns('Add submodule for: ' + target);
        grunt.util.spawn({
            cmd : 'git',
            args : ['submodule','add',data.git,opts.subDir]
        },function(error/*,result,code*/){
            if (error) {
                grunt.log.errorlns('submodule add failed: ' + error);
                done(false);
                return;
            }

            grunt.util.spawn({ cmd : 'git', args : ['init'] },function(err/*,result,code*/){
                if (err) {
                    grunt.log.errorlns('submodule init failed: ' + err);
                    done(false);
                } else {
                    done(true);
                }
            });
        });
    });


    grunt.registerMultiTask('smbuild','Build submodules',function(){
        var opts = this.options({
                rootDir  : 'vendor',
                buildDir : 'dist',
                libDir  : 'app/assets/lib',
                alias   : this.target,
                npm     : true,
                grunt   : true,
                copy    : true
            }),
              done     = this.async(),
              subTasks = [],
              npmInstall = function(next){
                    var spawnOpts = { cmd : 'npm', args : ['install'],
                      opts : { cwd : opts.source, env : process.env }
                    };

                    grunt.util.spawn( spawnOpts, function(error, result, code) {
                        next(error,code);
                    });
                },
              gruntInstall = function(next){
                    var spawnOpts = { cmd : 'grunt', args : opts.args,
                      opts : { cwd : opts.source, env : process.env }
                    };
                    grunt.util.spawn( spawnOpts, function(error, result, code) {
                        next(error,code);
                    });
                },
              clean = function(next){
                    grunt.file.delete(opts.build);
                    next();
                },
              copy= function(next){
                    var files = grunt.file.expand({ cwd : opts.build},'**/*.*'),
                        cont = true,targetFile,abspath;
                    files.forEach(function(file){
                        //grunt.log.writelns('FILE: ' + file);
                        if (cont){
                            abspath     = path.join(opts.build,file);
                            targetFile  = path.join(opts.target,file);
                            grunt.file.copy(abspath,targetFile);
                            if (!grunt.file.exists(targetFile)) {
                                next( new Error('Failed to copy ' + abspath +
                                                    ' ==> ' + targetFile));
                                cont = false;
                                return;
                            }
                        }
                    });
                    next();
                    return ;
                },
              run = function(jobs,callback){
                    if (!jobs) {
                        callback();
                        return;
                    }

                    var job = jobs.shift();
                    if (!job){
                        callback();
                        return;
                    }

                    grunt.log.writelns('Attempt : ' + job.name);
                    job.func(function(error,code){
                        if (error){
                            callback(error,code,job.name);
                            return;
                        }

                        run(jobs,callback);
                    });
                };

        if (!opts.source){
            opts.source = path.join(opts.rootDir,opts.alias);
        }

        if (!opts.target){
            opts.target = path.join(opts.libDir,opts.alias);
        }

        if (!opts.build){
            opts.build = path.join(opts.rootDir,opts.alias,opts.buildDir);
        }

        if (opts.npm){
            subTasks.push({ name : 'npm install', func : npmInstall });
        }

        if (opts.grunt) {
            subTasks.push({ name : 'clean', func : clean });
            subTasks.push({ name : 'grunt', func : gruntInstall });
        }

        if (opts.copy) {
            subTasks.push({ name : 'copy', func : copy });
        }

        run(subTasks,function(error,code,subTask){
            if (error){
                grunt.log.errorlns('Failed on ' + subTask + ': ' + error);
                done(false);
                return;
            }
            done(true);
        });
    });
};

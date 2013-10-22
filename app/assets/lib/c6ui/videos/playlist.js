(function() {
    'use strict';

    angular.module('c6.ui')
        .directive('c6Playlist', ['$timeout', '$log',
            function($timeout, $log){
            function linker(scope,element,attrs,ctlr){
                var showPlayer = function(videoToShow) {
                    angular.forEach(scope.videos, function(video) {
                        video.showPlayer = (videoToShow === video);
                    });
                },
                myBuffers = scope.buffers,
                myUrl     = scope.url,
                activatePlayerTimeout;

                $log.info('c6PlayList is linked, scope.id=' + scope.$id +
                    ', playList.id=' + attrs.id +
                    ', url=' + myUrl +
                    ', buffers='  + myBuffers);

                if (!attrs.id){
                    throw new SyntaxError('c6PlayList requires an id attribute');
                }

                if (!myUrl) {
                    throw new SyntaxError('c6PlayList requires an x-url attribute');
                }

                if (!myBuffers) {
                    $log.warn('No x-buffers attribute found, default to 1');
                    myBuffers = 1;
                }

                if (isNaN(myBuffers)){
                    throw new TypeError('buffers property must be passed a number');
                }

                myBuffers = parseInt(myBuffers,10);

                scope.isPlaying = false;

                scope.playerBuffers = [];
                for (var i = 0; i < myBuffers; i++){
                    scope.playerBuffers.push('buffer' + i.toString());
                }

                scope.loadPlayList(
                    {
                        id                   : attrs.id,
                        rqsUrl               : myUrl,
                        videoSrcUrlFormatter : scope.urlFormatter
                    },
                    function(err){
                        if (err){
                            $log.error('loadPlayList Failed: ' + err.message);
                            return;
                        }

                        if (scope.model.clients.length === myBuffers){
                            scope.setReady();
                        }
                    }
                );

                scope.$on('c6video-ready',function(evt,video){
                    $log.info('New video: ' + video.id);
                    video.playListClient = scope.addNodeClient(video.id);

                    if (!scope.videos){
                        scope.videos = {};
                    }
                    scope.videos[video.id] = video;

                    video.on('loadedmetadata',function(){
                        $log.info('loadedmetadata: ' +
                            video.playListClient.node.name +
                            ' duration=' + video.player.duration);

                        video.playListClient.data.duration = video.player.duration;
                    });

                    video.on('ended', function(){
                        $log.info('Ended: ' + video.playListClient.node.name);
                        scope.isPlaying = false;
                        video.fullscreen(false);
                        if (scope.model.currentClient.isTerminal()){
                            $log.log('Done with choices, go back to landing');
                            ctlr.emit('endOfPlayList');
                            return;
                        }

                        ctlr.emit('endOfPlayListItem',
                            ctlr.getDataForNode(video.playListClient.node.id));
                    });

                    if (scope.model.clients.length === myBuffers){
                        if (scope.model.rootNode !== null){
                            scope.setReady();
                        }
                    }
                });

                scope.$on('stop', function(){
                    $log.log('received stop');
                    scope.isPlaying = false;
                    angular.forEach(scope.videos,function(video/*,videoId*/){
                        showPlayer(null);
                        if (video.hasPlayed() && video.player.readyState > 1){
                            video.player.pause();

                            if (video.player.currentTime !== 0) {
                                video.player.currentTime = 0;
                            }
                        }
                    });
                });

                scope.$on('loadStarted', function(evt, playListClient){
                    $log.log('loadStarted ' + playListClient +
                        ', startTime: ' + playListClient.startTime);
                    var video = scope.videos[playListClient.id],
                        failsafeTimeout,
                        readyEvent = 'loadeddata',
                        readyState = 1,
                        seekToRequestedTime = function(event, video) {
                            if (event) {
                                // If this function was called by an event handler.
                                video.off(event.type, seekToRequestedTime);
                            }

                            if (video.player.readyState >= readyState) { // Need to be EXTRA careful...
                                if (!video.player.seekable.length) {
                                    video.on('progress', seekToRequestedTime);
                                    return;
                                }

                                video.player.currentTime = playListClient.startTime;

                                // Setting the currentTime could've caused the video state to change.
                                // Wait for the frame to load before showing the player.
                                if (!video.player.seeking) {
                                    completeLoad();
                                } else {
                                    video.on('seeked', completeLoad);
                                    failsafeTimeout = $timeout(function() {
                                        if (!video.player.seeking) {
                                            completeLoad();
                                        }
                                    }, 4000);
                                }
                            }
                        },
                        completeLoad = function(event) {
                            if (event) {
                                // If this function was called by an event handler.
                                video.off('seeked', completeLoad);
                            }

                            if (failsafeTimeout) {
                                $timeout.cancel(failsafeTimeout);
                                failsafeTimeout = undefined;
                            }

                            if (!video.player.paused) {
                                video.player.pause();
                            }

                            activatePlayerTimeout = $timeout(function() {
                                showPlayer(video);
                                scope.$emit('playerBecameActive', video);
                            }, 250);
                        };

                    if (activatePlayerTimeout) {
                        $timeout.cancel(activatePlayerTimeout);
                        activatePlayerTimeout = undefined;
                    }

                    if (failsafeTimeout) {
                        $timeout.cancel(failsafeTimeout);
                        failsafeTimeout = undefined;
                    }

                    if (playListClient.startTime > 0) {
                        showPlayer(null);
                        $timeout(function() {
                            if (video.player.readyState >= readyState) {
                                seekToRequestedTime(null, video);
                            } else {
                                video.on(readyEvent, seekToRequestedTime);
                            }
                        });
                    } else {
                        completeLoad();
                    }
                });

                scope.$on('loadComplete', function(evt, playListClient){
                    $log.log('loadComplete ' + playListClient);
                });

                scope.$on('play', function(){
                    $log.log('Play the current video: ' + scope.model.currentClient.id);
                    var client = scope.model.currentClient,
                        video = scope.videos[client.id];
                    $log.info('Player [' + client.id + '], buffered: ' +
                        (video.bufferedPercent() * 100) + '%');
                    scope.isPlaying = true;
                    video.player.play();
                    //video.showPlayer = true;
                    $log.log('SHOW PLAYER [' + client.id + ']: ' +
                        scope.videos[ client.id].showPlayer);
                });

            }
            return {
                controller   : 'C6PlaylistController',
                restrict     : 'A',
                template     : (function() {
                                    return '<div class="bg-black">' +
                                                '<div class="c6-resize--50_50" c6-resize>' +
                                                    '<div class="border__group ">' +
                                                        '<div class="border__top">&nbsp;</div>' +
                                                        '<div class="border__right">&nbsp;</div>' +
                                                        '<div class="border__bottom">&nbsp;</div>' +
                                                        '<div class="border__left">&nbsp;</div>' +
                                                    '</div>' +
                                                    '<ul class="player__stack">' +
                                                        '<li ng-repeat="buffId in playerBuffers" class="player__item"' +
                                                            'ng-class="{\'player__item--active\': videos[buffId].showPlayer}"' +
                                                            'ng-show="videos[buffId].showPlayer">' +
                                                            '<video c6-video id="{{buffId}}" c6-src="model.cli[buffId].data.src"' +
                                                                'preload="auto" class="video__item"> </video>' +
                                                        '</li>' +
                                                    '</ul>' +
                                                '</div>' +
                                            '</div>';

                                })(),
                replace      : true,
                scope        : { buffers : '@', url : '@', urlFormatter : '=' },
                link         : linker
            };
        }])

        .controller('C6PlaylistController',['$scope','$log','$http','c6EventEmitter',
                                            function($scope,$log,$http,c6EventEmitter){
            $log.log('Create c6PlayListCtlr: scope.id=' + $scope.$id);

            // Turn me into an emitter
            var self = c6EventEmitter(this);

            // Our model
            var model = {
                id               : null,
                rootNode         : null,
                playListData     : null,
                playListDict     : null,
                currentNode      : null,
                currentClient    : null,
                clients          : [],
                cli              : {},
                inTrans          : false,
                ready            : false
            };

            /*****************************************************
             *
             * Scope Decoration
             *
             * Data and methods for the PlayList Directive
             * which creates a private scope when instantiating
             * the PlayList Controller.
             */

            $scope.model = model;

            $scope.setReady = function(){
                model.ready = true;
                $scope.$emit('c6PlayListReady',self);
            };

            $scope.loadPlayList = function(params, callback){
                var id      = params.id,
                    rqsUrl  = params.rqsUrl,
                    urlFunc = params.videoSrcUrlFormatter,
                    req;
                $log.log('Loading playlist: ' + id);
                model.id = id;
                req = $http({method: 'GET', url: (rqsUrl)});

                $log.info('Requesting: ' + rqsUrl);

                req.success(function(data/*,status,headers,config*/){
                    $log.info('PlayList request succeeded');
                    if (data.version === '2.0'){
                        self._compilePlayList2( data, model, urlFunc );
                    } else{
                        self._compilePlayList( data, model, urlFunc );
                    }
                    callback(null);
                    return;
                });

                req.error(function(data,status/*,headers,config*/){
                    $log.error('PlayList request fails: ' + status);
                    callback( {
                        message : 'Failed with: ' + status,
                        statusCode : status
                    });
                });
            };


            $scope.addNodeClient = function(clientId){
                var result = {
                    id  : clientId,
                    active : false,
                    startTime : 0,
                    node : {},
                    data : {},

                    clear : function(){
                        this.active = false;
                        this.startTime = 0;
                        this.node = {};
                        this.data = {};
                    },

                    isTerminal : function() {
                        if ((this.node.branches) && (this.node.branches.length > 0)){
                            return false;
                        }
                        return true;
                    },

                    toString : function(){
                        return 'NC [' + this.id + '][' +
                            ((this.node.name === undefined) ? 'null' : this.node.name) + ']';
                    }
                };
                $log.info('Add client: ' + result);
                model.clients.push(result);

                model.cli[clientId] = result;

                return result;
            };

            /*
             * Scope Decoration  -- End
             *****************************************************/


            /*****************************************************
             *
             * Public interace
             *
             */

            this.id            = function() { return model.id;            };

            this.currentNodeName = function() {
                if (model.currentNode){
                    return model.currentNode.name;
                }
                return null;
            };

            this.currentNodeId = function() {
                return model.currentNode && model.currentNode.id;
            };

            this.getCurrentBranches= function(){
                var currentBranches = model.currentNode.branches, result = [], nd;
                for (var i = 0; i < currentBranches.length; i++){
                    nd = model.playListDict[currentBranches[i]];
                    if (nd){
                        result.push({
                            id   : nd.id,
                            name : nd.name
                        });
                    }
                }
                return result;
            };

            this.getBranchesForNode = function(nodeId){
                var nd = model.playListDict[nodeId], branches, result, bnd;
                if (!nd) {
                    throw new Error('Invalid nodeId [' + nodeId + ']');
                }
                result = [];
                branches = nd.branches;
                for (var i = 0; i < branches.length; i++){
                    bnd = model.playListDict[branches[i]];
                    result.push({
                        id   : bnd.id,
                        name : bnd.name
                    });
                }
                return result;
            };

            this.getDataForNode = function(nodeId) {
                var node = model.playListDict[nodeId],
                    data = model.playListData[node.data],
                    record = angular.copy(data);

                record.id       = node.id;
                record.name     = node.name;

                return record;
            };

            // Transitioning from one video to the next is a complicated process
            // as some parts of the UI may update as soon as the next node is
            // selected, while others shouldn't be updated until after the
            // next node's video is starting to play.  This in part is driven by
            // the need to load videos into a video element before playing them.

            // Load is part 1 of a two part transaction.  Its job is basically to
            // link the selected node to the current client.  If there is already
            // a client that has been assigned that node, that client becomes
            // the current client.  Otherwise it will assign the node to the
            // current client.  See play for part 2.
            this.load = function(nextNodeId, startTime, andComplete){
                var nextClient = null,
                    nd = model.playListDict[nextNodeId];

                $log.log(   'nextNodeId: ' + nextNodeId +
                            ', startTime: ' + startTime +
                            ', andComplete: ' + andComplete );
                if (startTime === undefined) {
                    startTime = 0;
                }

                if (!nd){
                    $log.error('Unable to locate node with id: ' + nextNodeId);
                    return this;
                }

                if (model.clients.length === 0){
                    $log.error('Need at least one client to load node with id: ' + nextNodeId);
                    return this;
                }

                $log.info('Load node: ' + nd);
                model.inTrans = true;

                //Check if any of our clients already have the node
                angular.forEach(model.clients,function(client){
                    if (    (nextClient === null) &&
                            (client.node === nd) ){
                        nextClient = client;
                    }
                });

                if (nextClient !== null){
                    // We found a client with the node, assign to currentClient and return
                    $log.info('TRANS ' + model.currentClient + ' ==> ' + nextClient);
                    model.currentClient = nextClient;
                    model.currentClient.startTime = startTime;
                    $scope.$emit('loadStarted', model.currentClient);

                    if (andComplete){
                        this.completeLoad();
                    }

                    return;
                }
                //Check if any of our clients have no node
                angular.forEach(model.clients,function(client){
                    if (    (nextClient === null) &&
                            (client.node.name === undefined) ){
                        nextClient = client;
                    }
                });

                if (nextClient !== null){
                    $log.info('Set Client ' +
                            nextClient + ' node to ' + nd);

                    model.currentClient = nextClient;
                    this._setClientWithNode(model.currentClient,nd);

                    model.currentClient.startTime = startTime;
                    $scope.$emit('loadStarted', model.currentClient);

                    if (andComplete){
                        this.completeLoad();
                    }
                    return;

                }

                if (model.currentClient){
                    // None of our clients have that node so we will assign it
                    // to our current client (probably means we only have a single client)
                    $log.info('Set currentClient ' +
                            model.currentClient + ' node to ' + nd);

                    this._setClientWithNode(model.currentClient,nd);

                    model.currentClient.startTime = startTime;
                    $scope.$emit('loadStarted', model.currentClient);
                }

                if (andComplete){
                    this.completeLoad();
                }
            };

            // completeLoad is the second part of the transaction initiated by load.  It will
            // update the current node and if there is more than one client, will map
            // the new current node's branches to the other clients.
            this.completeLoad = function() {
                if (model.inTrans) {
                    model.inTrans = false;
                    model.currentNode = model.currentClient.node;
                    this._mapNodesToClients(model.currentClient);
                    model.currentClient.active = true;
                    $scope.$emit('loadComplete', model.currentClient);
                }
            };

            this.play = function(){
                this.completeLoad();
                $scope.$emit('play');
            };

            this.start = function(){
                if (model.rootNode === null){
                    $log.error('Must load a playList before starting');
                    return this;
                }
                if (model.clients.length === 0){
                    $log.error('Must load at least one client before starting');
                    return this;
                }

                model.currentNode   = model.rootNode;
                model.currentClient = model.clients[0];
                this.load(model.rootNode.id, 0, true);
            };

            this.stop = function() {
                $scope.$emit('stop');
            };

            /*
             * Public Interface -- End
             *****************************************************/

            this._mapNodesToClients = function(){
                var self         = this,
                    clients      = [],
                    nodes        = model.currentClient.node.branches.concat(),
                    node, client;

                angular.forEach(model.clients,function(v){
                    if (v !== model.currentClient) {
                        clients.push(v);
                    }
                });

                $log.info(  'mapFrom (' + model.currentClient +
                            '): clients to map: ' + clients.length +
                            ', nodes: ' + nodes.length);

                // Iterate through each client
                for (var i = 0; i < clients.length; i++) {
                    $log.info('eval vn: ' + clients[i] + ',i=' + i);
                    if (!clients[i].node) {
                        $log.info('vn has no node: ' + clients[i]);
                        continue;
                    }
                    // Compare the client's node to each of the child nodes
                    // so if a client is already pointing to a particular
                    // node (and ie loaded its video) we can keep it there
                    var matched = false;
                    for (var j = 0; j < nodes.length; j++) {
                        node = model.playListDict[nodes[j]];
                        $log.info('eval node:' + node.name);
                        if ((matched === false) && (clients[i].node.name === node.name)) {
                            $log.info('Refresh: ' + clients[i] + ', with' + node);
                            clients[i].active = false;
                            clients[i].node = node;
                            clients.splice(i--,1);
                            nodes.splice(j--,1);
                            matched = true;
                        }
                    }
                }

                if (clients.length === 0) {
                    $log.log('We mapped all the clients to nodes that we could!');
                    return;
                }

                angular.forEach(nodes, function(nodeId){
                    node = model.playListDict[nodeId];
                    client = clients.shift();
                    if (!client) {
                        $log.info('no more clients to map!');
                        return;
                    }

                    $log.info('Setting client ' + client + ' with ' + node.name);
                    self._setClientWithNode(client,node);
                });

                $log.info('finished with nodes, now set any leftover clients to null');
                while ((client = clients.shift())) {
                    $log.info('set to null: ' + client);
                    self._setClientWithNode(client,null);
                }
            };

            this._setClientWithNode = function(client,node){
                client.clear();
                if ((node === null) || (node === undefined)){
                    node = {};
                }
                client.node = node;
                client.data = (node.data) ? model.playListData[node.data] : {};
            };

            this._compilePlayList2 = function(playList, output, urlFunc){
                if (!output){
                    output = {};
                }
                output.maxBranches  = 0;
                output.playListDict = {};
                output.playListData = {};

                var i = 0, j = 0, dataLength = playList.data.length,
                    nodesLength = playList.nodes.length, copy;

                for (i = 0; i < dataLength; i++){
                    copy = angular.copy(playList.data[i]);
                    if ((urlFunc) && (playList.data[i].src)){
                        if (angular.isArray(playList.data[i].src)){
                            copy.src = [];
                            for (j = 0; j < playList.data[i].src.length; j++){
                                var source = playList.data[i].src[j], src = {};
                                if (source.type){
                                    src.type = source.type;
                                }
                                src.src = urlFunc(source.src);
                                copy.src.push(src);
                            }
                        } else {
                            copy.src = urlFunc(playList.data[i].src);
                        }
                    }
                    output.playListData[copy.id]=copy;
                }

                for (i = 0; i < nodesLength; i++){
                    copy = angular.copy(playList.nodes[i]);
                    if (copy.parents.length === 0){
                        output.rootNode = copy;
                    }

                    copy.branches = copy.children;

                    if (copy.branches.length > output.maxBranches){
                        output.maxBranches = copy.branches.length;
                    }
                    output.playListDict[copy.id] = copy;
                    delete copy.children;
                    delete copy.parents;
                }

                return output;
            };

            this._compilePlayList = function(playList, output, urlFunc){
                if (!output){
                    output = {};
                }
                output.maxBranches     = 0;
                output.playListDict    = {};
                var id = 0, tmpData  = {}, compiled ;

                output.playListData = {};
                angular.forEach(playList.data,function(data,key){
                    var copy = {};
                    angular.forEach(data,function(val,name){
                        if ((name === 'src') && (urlFunc !== undefined)){
                            if (angular.isArray(val)){
                                copy.src = [];
                                angular.forEach(val,function(source){
                                    var src = {};
                                    if (source.type){
                                        src.type = source.type;
                                    }
                                    src.src = urlFunc(source.src);
                                    copy.src.push(src);
                                });
                            } else {
                                copy.src = urlFunc(val);
                            }
                        } else {
                            copy[name] = val;
                        }
                    });
                    copy.id   = 'd' + id++;
                    copy.name = key;
                    tmpData[key] = copy;
                    output.playListData[copy.id]=copy;
                });

                id = 0;
                compiled = (function parseTree(currentNode,parentNode) {
                    var newNode = {
                            'id'        :   'n' + id++,
                            'name'      :   currentNode.name,
                            'data'      :   tmpData[currentNode.name].id,
                            'branches'  :   [],
                            'toString'  : function() { return this.id + ':' + this.name ; }
                        },
                        kids = currentNode.branches.length;

                    output.playListDict[newNode.id] = newNode;

                    if (parentNode !== null) {
                        parentNode.branches.push(newNode);
                    }

                    currentNode.branches.forEach(function(child){
                        parseTree(child,newNode);
                    });

                    if (kids > output.maxBranches) {
                        output.maxBranches = kids;
                    }
                    return newNode;
                }(playList.tree,null));

                // Convert storage of branches from objects to ids
                angular.forEach(output.playListDict,function(node/*,nodeId*/){
                    node.branchIds = [];
                    for (var i = 0; i < node.branches.length; i++){
                        node.branchIds.push(node.branches[i].id);
                    }
                    node.branches = node.branchIds;
                    delete node.branchIds;
                });

                output.rootNode = compiled;

                tmpData = undefined;

                return output;
            };

        }]);
})();

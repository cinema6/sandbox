(function() {
    'use strict';

    angular.module('c6.ui')
        .service('c6PlaylistHistoryService', ['c6Journal', 'c6EventEmitter', '$timeout','$log',
            function(c6Journal, c6EventEmitter, $timeout, $log) {
            var self = this,
                history = c6Journal.createJournal(),
                playListCtrl,
                cache = {
                    branches: null
                },
                set = function(path, value) {
                    // Resolve path
                    var resolvedValue = self,
                        pathArray = path.split('.'),
                        currentPath = '';

                    pathArray.every(function(pathSegment, index) {
                        if (index === pathArray.length - 1) { // Final segment of path, we made it!
                            resolvedValue[pathSegment] = value;
                            // Here, we send out a notification that the value of the property has changed.
                            // This is useful so the application can respond to changes in the branching video state.
                            // While this could be achieved with $watchers, that would require putting this service on the $scope.
                            // With this method, the $scope is kept clean, and there is no dependence on dirty-checking!
                            resolvedValue = self;
                            angular.forEach(pathArray, function(segment) {
                                currentPath += segment;
                                resolvedValue = resolvedValue[segment];

                                self.emit(currentPath, resolvedValue);

                                currentPath += '.';
                            });
                        } else {
                            resolvedValue = resolvedValue[pathSegment];

                            return resolvedValue;
                        }
                    });
                }, recordToHistory = function(name, data) {
                    history.recordEvent(name, data);
                    self.emit('historyModified', history.createSubscriber());
                };

            // Turn this service into an event emitter
            c6EventEmitter(this);

            this.ready = false;
            this.playing = false;
            this.index = -1;
            this.currentNode = {
                id: null,
                name: null
            };
            this.currentBranches = [];

            // The currentBranches is dependent on the index. Whenever the index chages, we'll update the currentBranches
            this.on('index', function() {
                $timeout(function() { set('currentBranches', self.getBranches()); });
            });

            this.play = function() {
                if (this.ready) {
                    playListCtrl.play();
                    set('playing', true);
                }
            };
            this.stop = function() {
                if (this.ready) {
                    playListCtrl.stop();
                    set('playing', false);
                }
            };
            this.push = function(nodeId ) {
                var index = this.index,
                    historyLength = history.size(),
                    isMostRecent = (index === historyLength - 1),
                    data = playListCtrl.getDataForNode(nodeId);

                set('currentNode.id', data.id);
                set('currentNode.name', data.name);

                if (isMostRecent) {
                    recordToHistory(data.id, data);
                    this.moveTo(nodeId);
                } else if (nodeId === history.getAt(index + 1).name) {
                    this.moveTo(nodeId);
                } else {
                    history.removeAt(index + 1, historyLength - (index + 1));
                    this.push(nodeId);
                }

            };
            this.moveTo = function(nodeId, time) {
                var index = history.findFirstIndex(nodeId),
                    data;

                if (index === -1) {
                    $log.error('You tried to move to node ' + nodeId + ', but that node is not in the history.');
                    return;
                }

                data = history.getAt(index).data;

                playListCtrl.load(data.id, (time || 0), true);

                set('index', index);
                set('currentNode.id', data.id);
                set('currentNode.name', data.name);
            };
            this.init = function(playlist,startNode,startTime) {
                var data;
                playListCtrl = playlist;

                if (startNode === undefined){
                    playlist.start();
                } else {
                    playlist.load(startNode,startTime,true);
                }

                data = playlist.getDataForNode(playlist.currentNodeId());
                if (!data){
                    $log.error('Invalid startNode');
                    return;
                }

                set('currentNode.id', data.id);
                set('currentNode.name', data.name);
                recordToHistory(data.id, data);
                set('index', history.index());

                if (!this.ready) {
                    // We're going to re-emit some events from the playListCtrl
                    playlist.on('endOfPlayListItem', function() {
                        self.emit('reachedDecisionPoint');
                    });
                    playlist.on('endOfPlayList', function() {
                        self.emit('reachedEnd');
                    });

                    set('ready', true);
                }
            };
            this.reset = function(playlist,startNode,startTime) {
                // Stop!
                this.stop();
                // Reset the index
                set('index', -1);
                // Erase the history
                history.clear();
                // Re-initialize
                this.init(playlist || playListCtrl,startNode,startTime);
            };
            this.getHistory = function() {
                return history.createSubscriber();
            };
            this.getBranches = function(nodeId) {
                var id = nodeId || this.currentNode.id,
                branches = playListCtrl.getBranchesForNode(id);

                if (!angular.equals(branches, cache.branches)) {
                    cache.branches = branches;
                }

                return cache.branches;
            };
        }]);
})();

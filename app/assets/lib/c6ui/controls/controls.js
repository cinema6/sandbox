(function(appBaseUrl) {
	'use strict';

	angular.module('c6.ui')
		.directive('c6ControlsNode', ['c6Computed', '$timeout', '$window', function(c, $timeout, $window) {
			return {
				restrict: 'E',
				scope: {
					model: '&',
					handlers: '&'
				},
				require: '^c6Controls',
				templateUrl: appBaseUrl + '/lib/c6ui/controls/node.html',
				replace: true,
				link: function(scope, element, attrs, C6ControlsController) {
					var setRectPosition = function() {
						if (!scope.model()) {
							return false; // Not ready yet...
						} else if (!scope.model().__c6ControlsNode) {
							scope.model().__c6ControlsNode = {
								position: {},
								top: false
							};
						}

						var positionObject = scope.model().__c6ControlsNode.position,
							rect = element[0].getBoundingClientRect();

						positionObject.left = rect.left;
						positionObject.right = rect.right;
					};
					$timeout(setRectPosition, 0); // Initialize

					scope.leftMargin = c(scope, function() {
						var width = element.prop('offsetWidth');

						return ((width / 2) * -1);
					}, ['model().text']);

					scope.$on('c6ControlsNodesShouldReposition', function() {
						$timeout(function() { scope.leftMargin.invalidate(); });
					});

					angular.element($window).bind('resize', function() { scope.$apply(setRectPosition()); });
					scope.$watch('leftMargin()', function(newValue, oldValue) {
						if (newValue !== oldValue) {
							setRectPosition();
						}
					});

					scope.$watch('model().__c6ControlsNode.position', function(position) {
						if (position) {
							C6ControlsController.shuffleNodes(scope.model());
						}
					}, true);
				}
			};
		}])

		.directive('c6Controls', [function() {
			return {
				restrict: 'E',
				scope: {
					delegate: '&',
					controller: '&',
					segments: '&',
					nodes: '&',
					buttons: '&',
					playPause: '&',
					volume: '&'
				},
				templateUrl: appBaseUrl + '/lib/c6ui/controls/controls.html',
				replace: true,
				controller: 'C6ControlsController'
			};
		}])

		.controller('C6ControlsController', ['$scope', '$element', '$document', '$timeout', 'c6Computed', function($scope, $element, $document, $timeout, c) {
			var noop = angular.noop,
				delegate = function(method, args) {
					var actualDelegate = ($scope.delegate || function() { return {}; })();

					(actualDelegate[method] || noop).apply(undefined, args);
				},
				getCombinedLengthOfPreviousSegments = function(segments, index) {
					var length = 0;

					while (index--) {
						length += segments[index].portion;
					}

					return length;
				},
				getSoundwaveOpacity = function(offset, muted, playheadPosition) {
					return (muted ? 0 : 1) && (Math.max(0, Math.min(1, ((playheadPosition - offset)  * 33) / 1000)));
				},
				volumeTierDependencies = ['state.volume.playheadPosition', 'state.volume.muted'],
				leftButtons = ['return'],
				rightButtons = ['fullscreen'],
				sortedButtons = function(buttons) {
					var sorted = {
						left: [],
						right: []
					};

					buttons.forEach(function(button) {
						if (leftButtons.indexOf(button) !== -1) {
							sorted.left.push(button);
						} else if (rightButtons.indexOf(button) !== -1) {
							sorted.right.push(button);
						} else {
							throw new Error(button + ' is not a valid button... :-(');
						}
					});

					return sorted;
				},
				state = {
					playing: false,
					playheadPosition: 0,
					bufferedPercent: 0,
					hasButton: function(button) {
						return ($scope.buttons() || []).indexOf(button) !== -1;
					},
					seekbarStyles: c($scope, function(hasPlayPause, hasVolume) {
						var leftMargin = 22,
							rightMargin = 22;

						if (hasPlayPause) {
							leftMargin += 68;
						}

						if (hasVolume) {
							rightMargin += 68;
						}

						return {
							marginLeft: leftMargin + 'px',
							marginRight: rightMargin + 'px'
						};
					}, ['state.showPlayPause()', 'state.showVolume()']),
					buttonsConfig: c($scope, function(buttons) {
						var config = [];

						if (angular.isArray(buttons)) {
							angular.forEach(buttons, function(button) {
								config.push({
									class: button.charAt(0).toUpperCase() + button.slice(1),
									disabled: false
								});
							});

							return config;
						} else {
							return config;
						}
					}, ['buttons()'], true),
					leftMargin: c($scope, function() {
						var myButtons = sortedButtons(this.buttons() || []).left;

						return myButtons.length ? (myButtons.length * 58) : 22;
					}, ['buttons().length']),
					rightMargin: c($scope, function() {
						var myButtons = sortedButtons(this.buttons() || []).right;

						return myButtons.length ? (myButtons.length * 58) : 22;
					}, ['buttons().length']),
					volume: {
						show: false,
						seeking: false,
						playheadPosition: 100,
						muted: false,
						tiers: {
							mute: c($scope, function(playheadPosition, muted) {
								if (playheadPosition === 0 || muted) {
									return 1;
								} else {
									return 0;
								}
							}, volumeTierDependencies),
							low: c($scope, function(playheadPosition, muted) {
								return getSoundwaveOpacity(0, muted, playheadPosition);
							}, volumeTierDependencies),
							med: c($scope, function(playheadPosition, muted) {
								return getSoundwaveOpacity(33, muted, playheadPosition);
							}, volumeTierDependencies),
							high: c($scope, function(playheadPosition, muted) {
								return getSoundwaveOpacity(67, muted, playheadPosition);
							}, volumeTierDependencies)
						}
					},
					seeking: false,
					seekPercent: undefined,
					segments: $scope.segments,
					nodes: $scope.nodes,
					pastSegmentsLength: c($scope, function(playheadPosition, segments) {
						var length = 0;

						segments.some(function(segment) {
							if (!(segment.__c6Controls && segment.__c6Controls.active())) {
								length += segment.portion;
							} else {
								return true;
							}
						});

						return length;
					}, ['state.playheadPosition', 'state.segments()']),
					showPlayPause: c($scope, function(playPause) {
						if (angular.isUndefined(playPause)) {
							return true;
						} else {
							return playPause;
						}
					}, ['playPause()']),
					showVolume: c($scope, function(volume) {
						if (angular.isUndefined(volume)) {
							return true;
						} else {
							return volume;
						}
					}, ['volume()'])
				},
				getMousePositionAsSeekbarPercent = function(seeker$, mousePosition) {
					var position = mousePosition - seeker$[0].getBoundingClientRect().left,
						positionPercent = ((position / seeker$[0].offsetWidth) * 100),
						marginsAsPercent = (((state.leftMargin() + state.rightMargin() + 16) / seeker$.prop('offsetWidth')) * 100),
						leftPercent = Math.max(0, positionPercent - (((state.leftMargin() + 8) / seeker$.prop('offsetWidth')) * 100));

					return Math.min(((leftPercent * 100) / (100 - marginsAsPercent)), 100);
				},
				getMousePositionAsVolumeSeekbarPercent = function(seeker$, mousePosition) {
					var position = mousePosition - seeker$[0].getBoundingClientRect().top - $document.find('body').prop('scrollTop'),
						positionPercent = ((position / seeker$.prop('offsetHeight')) * 100),
						topPercent = Math.max(0, positionPercent - 14);

					return Math.abs((Math.min(((topPercent * 100) / 72), 100)) - 100);
				},
				getSegmentAtSeekbarPercent = function(percent) {
					var leftPosition,
						foundSegment;

					state.segments().some(function(segment) {
						leftPosition = segment.__c6Controls && segment.__c6Controls.position.left();

						if ((percent >= leftPosition) && (percent <= (leftPosition + segment.portion))) {
							foundSegment = segment;
							return true;
						}
					});

					return foundSegment;
				},
				getSeekbarPercentAsPercentOfSegment = function(percent, segment) {
					var percentAfterSegmentStart = percent - segment.__c6Controls.position.left();

					return ((percentAfterSegmentStart * 100) / segment.portion);
				},
				handlePlayheadDrag = function(event) {
					var seeker$ = angular.element(event.currentTarget),
						seekbarPercent = getMousePositionAsSeekbarPercent(seeker$, event.pageX),
						segmentMouseIsOver = getSegmentAtSeekbarPercent(seekbarPercent),
						percentOfSegment = getSeekbarPercentAsPercentOfSegment(seekbarPercent, segmentMouseIsOver);

					state.seekPercent = seekbarPercent;
					delegate('seek', [{ type: 'seek', percent: seekbarPercent, segment: segmentMouseIsOver, percentOfSegment: percentOfSegment, isClick: false }]);
				},
				handleVolumePlayheadDrag = function(event) {
					var seeker$ = angular.element(event.currentTarget);

					delegate('volumeSeek', [getMousePositionAsVolumeSeekbarPercent(seeker$, event.pageY)]);
				},
				setSeek = function(seekState, percent, segment, percentOfSegment, isClick) {
					var seekEvent = {
						percent: percent,
						segment: segment,
						percentOfSegment: percentOfSegment,
						isClick: isClick
					};

					state.seeking = seekState;

					if (seekState === true) {
						seekEvent.type = 'seekStart';

						delegate('seekStart', [seekEvent]);
						state.seekPercent = percent;
					} else {
						seekEvent.type = 'seekStop';

						delegate('seekStop', [seekEvent]);
						state.seekPercent = undefined;
					}
				},
				slider$ = angular.element($element[0].querySelector('.controls__seek')),
				volumeSlider$ = angular.element($element[0].querySelector('.volume__box')),
				waitingForSeekClickToEnd = false,
				hideVolumeSliderBoxTimeout,
				handle = {
					playPause: function() {
						if (!state.playing) {
							delegate('play');
						} else {
							delegate('pause');
						}
					},
					startSeeking: function() {
						var percent = state.playheadPosition,
							segment = getSegmentAtSeekbarPercent(percent),
							percentOfSegment = getSeekbarPercentAsPercentOfSegment(percent, segment);

						setSeek(true, percent, segment, percentOfSegment, false);
						slider$.bind('mousemove', handlePlayheadDrag);
					},
					seekbarClick: function(event) {
						var seeker$ = angular.element(event.currentTarget).parent(),
							seekbarPercent = getMousePositionAsSeekbarPercent(seeker$, event.pageX),
							segmentMouseIsOver = getSegmentAtSeekbarPercent(seekbarPercent),
							percentOfSegment = getSeekbarPercentAsPercentOfSegment(seekbarPercent, segmentMouseIsOver);

						if (!state.seeking && !angular.element(event.target).hasClass('controls__playhead')) {
							var initialPercent = state.playheadPosition,
								initialSegment = getSegmentAtSeekbarPercent(initialPercent),
								percentOfInitialSegment = getSeekbarPercentAsPercentOfSegment(initialPercent, initialSegment);

							setSeek(true, initialPercent, initialSegment, percentOfInitialSegment, true);

							waitingForSeekClickToEnd = true;
							state.seekPercent = seekbarPercent;
							delegate('seek', [{ type: 'seek', percent: seekbarPercent, segment: segmentMouseIsOver, percentOfSegment: percentOfSegment, isClick: true }]);
							// The next time our controller's progress method is called, we'll leave the "seeking" state.
						}
					},
					stopSeeking: function() {
						if (state.seeking) {
							var segment = getSegmentAtSeekbarPercent(state.seekPercent),
								percentOfSegment = getSeekbarPercentAsPercentOfSegment(state.seekPercent, segment);

							slider$.unbind('mousemove', handlePlayheadDrag);
							setSeek(false, state.seekPercent, segment, percentOfSegment, false);
						}
					},
					volume: {
						startSeeking: function() {
							volumeSlider$.bind('mousemove', handleVolumePlayheadDrag);
							state.volume.seeking = true;
						},
						stopSeeking: function() {
							if (state.volume.seeking) {
								volumeSlider$.unbind('mousemove', handleVolumePlayheadDrag);
								state.volume.seeking = false;
							}
						},
						seekbarClick: function(event) {
							var seeker$ = angular.element(event.target).parent();

							delegate('volumeSeek', [getMousePositionAsVolumeSeekbarPercent(seeker$, event.pageY)]);
						},
						muteUnmute: function() {
							if (!state.volume.muted) {
								delegate('mute');
							} else {
								delegate('unmute');
							}
						},
						show: function() {
							if (hideVolumeSliderBoxTimeout) {
								$timeout.cancel(hideVolumeSliderBoxTimeout);
								hideVolumeSliderBoxTimeout = null;
							}

							state.volume.show = true;
						},
						hide: function() {
							hideVolumeSliderBoxTimeout = $timeout(function() {
								state.volume.show = false;
							}, 1000);
						}
					},
					node: {
						click: function(event, model) {
							event.stopPropagation();

							delegate('nodeClicked', [model]);
						}
					}
				},
				nodesSeekbarExpectsToHit = [],
				nodeDetectionSessionInitialized = false,
				controller = $scope.controller;

			controller().play = function() {
				state.playing = true;
			};
			controller().pause = function() {
				state.playing = false;
			};
			controller().progress = function(percent, segment) {
				state.playheadPosition = (function(_percent) {
					if (!segment) {
						return _percent;
					} else {
						return (((segment.portion / 100) * _percent) + segment.__c6Controls.position.left());
					}
				})(percent);

				if (state.seeking) {
					nodesSeekbarExpectsToHit.length = 0;
					nodeDetectionSessionInitialized = false;

					if (waitingForSeekClickToEnd) {
						(function() {
							var seekSegment = getSegmentAtSeekbarPercent(state.seekPercent),
								percentOfSegment = getSeekbarPercentAsPercentOfSegment(state.seekPercent, seekSegment);

							waitingForSeekClickToEnd = false;
							setSeek(false, state.seekPercent, seekSegment, percentOfSegment, true);
						})();
					}
				} else {
					var nodesToTrash = [];

					if (!nodeDetectionSessionInitialized) {
						(state.nodes() || []).forEach(function(node) {
							if (node.position > state.playheadPosition) {
								nodesSeekbarExpectsToHit.push(node);
							}
						});
						nodeDetectionSessionInitialized = true;
					}

					nodesSeekbarExpectsToHit.forEach(function(node) {
						if (node.position <= state.playheadPosition) {
							nodesToTrash.push(node);
							delegate('nodeReached', [node]);
						}
					});

					nodesToTrash.forEach(function(node) {
						nodesSeekbarExpectsToHit.splice(nodesSeekbarExpectsToHit.indexOf(node), 1);
					});
				}
			};
			controller().volumeChange = function(percent) {
				state.volume.playheadPosition = percent;
			};
			controller().muteChange = function(mute) {
				state.volume.muted = mute;
			};
			controller().buffer = function(percent, segment) {
				(segment || state.segments()[0]).bufferedPercent = percent;
			};
			controller().repositionNodes = function() {
				$scope.$broadcast('c6ControlsNodesShouldReposition');
			};
			controller().setButtonDisabled = function(buttonName, disable) {
				var index = $scope.buttons().indexOf(buttonName);

				state.buttonsConfig()[index].disabled = disable;
			};
			controller().ready = true;

			$scope.$watch('segments()', function(segments) {
				if (segments && segments.length) {
					state.segments = $scope.segments;

					segments.forEach(function(segment, index) {
						if (!segment.__c6Controls) {
							segment.__c6Controls = {
								position: {
									left: function() { return getCombinedLengthOfPreviousSegments(segments, index); },
									width: function() {
										return ((segment.bufferedPercent * segment.portion) / 100);
									}
								},
								active: function() {
									return ((state.playheadPosition >= this.position.left()) && (state.playheadPosition <= (this.position.left() + segment.portion)));
								}
							};
						}
					});
				} else {
					var segment = {
						portion: 100,
						bufferedPercent: 0,
						__c6Controls: {
							position: {
								left: function() { return 0; },
								width: function() { return segment.bufferedPercent; }
							},
							active: function() {
								return true;
							}
						}
					},
					wrappedSegment = [segment];

					state.segments = function() {
						return wrappedSegment;
					};
				}
			});

			this.shuffleNodes = function() {
				var nodes = state.nodes();

				nodes.forEach(function(node, index) {
					if (index) {
						var previousNode = nodes[index - 1],
							nodesAreReady = !!(previousNode.__c6ControlsNode && node.__c6ControlsNode);

						if (nodesAreReady) {
							var myPosition = node.__c6ControlsNode.position,
								previousNodePosition = previousNode.__c6ControlsNode.position;

							if ((myPosition.left > previousNodePosition.right) || previousNode.__c6ControlsNode.top) {
								node.__c6ControlsNode.top = false;
							} else if (myPosition.left <= previousNodePosition.right) {
								node.__c6ControlsNode.top = true;
							}
						}
					}
				});
			};

			$scope.handle = handle;

			$scope.state = state;
		}]);
})(window.__C6_APP_BASE_URL__);

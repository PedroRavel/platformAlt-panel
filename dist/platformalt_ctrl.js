'use strict';

System.register(['moment', 'jquery', 'lodash', 'app/core/utils/kbn', 'app/core/config', 'app/core/time_series2', 'app/plugins/sdk'], function (_export, _context) {
  "use strict";

  var moment, $, _, kbn, config, TimeSeries, MetricsPanelCtrl, _createClass, PlatformAltCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_moment) {
      moment = _moment.default;
    }, function (_jquery) {
      $ = _jquery.default;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreUtilsKbn) {
      kbn = _appCoreUtilsKbn.default;
    }, function (_appCoreConfig) {
      config = _appCoreConfig.default;
    }, function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('PlatformAltCtrl', PlatformAltCtrl = function (_MetricsPanelCtrl) {
        _inherits(PlatformAltCtrl, _MetricsPanelCtrl);

        function PlatformAltCtrl($scope, $injector) {
          _classCallCheck(this, PlatformAltCtrl);

          var _this = _possibleConstructorReturn(this, (PlatformAltCtrl.__proto__ || Object.getPrototypeOf(PlatformAltCtrl)).call(this, $scope, $injector));

          var panelDefaults = {
            legend: {
              show: true, // disable/enable legend
              values: true
            },
            width: 100,
            height: 100,
            fontSize: 25,
            fontWeight: '10px',
            font: { family: 'Myriad Set Pro, Helvetica Neue, Helvetica, Arial, sans-serif' },
            platformName: "",
            childChoice: "",
            platformChildren: {},
            aliases: [],
            message: "",
            labelMessage: [],
            image: "nodata.png",
            text: {
              title: '',
              name: '',
              subText: ''
            }
          };
          _.defaults(_this.panel, panelDefaults);
          _.defaults(_this.panel.legend, panelDefaults.legend);
          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('panel-initialized', _this.render.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));

          return _this;
        }

        _createClass(PlatformAltCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/grafana-platformalt-panel/editor.html', 2);
            this.addEditorTab('All Transactions', 'public/plugins/grafana-platformalt-panel/transedit.html', 2);
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {

            this.series = dataList.map(this.seriesHandler.bind(this));
            this.handleData();
            //this.removeGarbage();
            this.checkGarbage();
            this.calculateTransaction();
          }
        }, {
          key: 'seriesHandler',
          value: function seriesHandler(seriesData) {
            var series = new TimeSeries({
              datapoints: seriesData.datapoints,
              alias: seriesData.target
            });
            series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);

            return series;
          }
        }, {
          key: 'setAllLabels',
          value: function setAllLabels(label) {
            this.panel.labelMessage.length = 0;
            for (var key in this.panel.platformChildren) {
              this.panel.platformChildren[key].defect.name = label;
              if (this.panel.platformChildren[key].defect.value) {
                this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" + this.panel.platformChildren[key].defect.name);
              }
            }
            ctrl.render();
          }
        }, {
          key: 'removeTransaction',
          value: function removeTransaction(key) {
            delete this.panel.platformChildren[key];
          }
        }, {
          key: 'handleData',
          value: function handleData() {
            //resets list of aliases names
            this.panel.aliases = [];
            var self = this;
            self.series.forEach(function (data) {
              //checks if alias name has period. if it does not continue logic. if it does ignore
              //alias must be manually set to avoid duplicate entries
              if (data.alias.indexOf('.') < 0) {
                var lastPoint = _.last(data.datapoints);
                var lastValue = _.isArray(lastPoint) ? parseInt(lastPoint[0]) : null;
                self.panel.aliases.push(data.alias);
                //check if metric exists by checking alias.
                //if it does just update the value
                if (self.panel.platformChildren[data.alias]) {
                  self.panel.platformChildren[data.alias].value = lastValue;
                } else {
                  //if it doesnt add a new entry
                  self.panel.platformChildren[data.alias] = {
                    name: data.alias,
                    value: lastValue,
                    warningThreshhold: 100,
                    criticalThreshold: 100,
                    found: true,
                    defect: {
                      name: "OpenDefect",
                      value: false
                    }
                  };
                }
              }
            });
          }
        }, {
          key: 'removeGarbage',
          value: function removeGarbage() {
            var self = this;
            for (var key in self.panel.platformChildren) {
              var found = false;
              self.panel.aliases.forEach(function (alias) {
                if (alias === key) {
                  found = true;
                  return;
                }
              });
              if (!found) {
                delete self.panel.platformChildren[key];
              }
            }
          }
        }, {
          key: 'checkGarbage',
          value: function checkGarbage() {
            var self = this;
            for (var key in self.panel.platformChildren) {
              var found = false;
              self.panel.aliases.forEach(function (alias) {
                if (alias === key) {
                  found = true;
                  return;
                }
              });
              self.panel.platformChildren[key].found = found;
            }
          }
        }, {
          key: 'replaceNames',
          value: function replaceNames() {
            this.panel.labelMessage.length = 0;
            for (var key in this.panel.platformChildren) {
              if (this.panel.platformChildren[key].defect.value) {
                this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" + this.panel.platformChildren[key].defect.name);
              }
            }
          }
        }, {
          key: 'updateTransaction',
          value: function updateTransaction(key) {

            if (!this.panel.platformChildren[key].defect.value) {
              var critical = false;
              var warning = false;
              var allOk = true;
              var indexOfCritical = this.panel.labelMessage.indexOf(this.panel.platformChildren[key].name + " - Critical");
              var indexOfWarning = this.panel.labelMessage.indexOf(this.panel.platformChildren[key].name + " - Warning");
              if (this.panel.platformChildren[key].found === true) {
                if (this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].criticalThreshold)) {
                  this.panel.image = "error.png";
                  if (indexOfWarning !== -1) {
                    this.panel.labelMessage.splice(indexOfWarning, 1);
                  }
                  if (indexOfCritical <= -1) {
                    this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Critical");
                  }
                  critical = true;
                } else if (this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].warningThreshhold) && !critical) {
                  this.panel.image = "warning.png";
                  if (indexOfCritical !== -1) {
                    this.panel.labelMessage.splice(indexOfCritical, 1);
                  }
                  if (indexOfWarning <= -1) {
                    this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Warning");
                  }
                  warning = true;
                }
              }
              if (!critical && !warning) {
                if (indexOfWarning > -1) {
                  this.panel.labelMessage.splice(indexOfWarning, 1);
                }
                if (indexOfCritical > -1) {
                  this.panel.labelMessage.splice(indexOfCritical, 1);
                }

                this.panel.labelMessage.forEach(function (messages) {
                  if (messages.indexOf("Warning") > -1 || messages.indexOf("Critical") > -1) {
                    allOk = false;
                    return;
                  }
                });
                if (allOk) {
                  if (this.panel.aliases.length !== 0) {
                    this.panel.image = "check.png";
                  } else {
                    this.panel.image = "nodata.png";
                  }
                }
              }
            }
            this.render();
          }
        }, {
          key: 'calculateTransaction',
          value: function calculateTransaction() {
            var critical = false;
            var warning = false;
            this.panel.labelMessage.length = 0;
            for (var key in this.panel.platformChildren) {
              if (this.panel.platformChildren[key].defect.value) {
                this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" + this.panel.platformChildren[key].defect.name);
              } else {
                if (this.panel.platformChildren[key].found === true) {
                  if (this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].criticalThreshold)) {
                    this.panel.image = "error.png";
                    this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Critical");
                    critical = true;
                  } else if (this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].warningThreshhold) && !critical) {
                    this.panel.image = "warning.png";
                    this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Warning");
                    warning = true;
                  }
                }
              }
            }
            if (!critical && !warning) {
              if (this.panel.aliases.length !== 0) {
                this.panel.image = "check.png";
              } else {
                this.panel.image = "nodata.png";
              }
            }
            this.render();
          }
        }, {
          key: 'link',
          value: function link(scope, elem) {
            var _this2 = this;

            this.events.on('render', function () {
              var $panelContainer = elem.find('.panel-container');
              if (_this2.panel.bgColor) {
                $panelContainer.css('background-color', _this2.panel.bgColor);
              } else {
                $panelContainer.css('background-color', '');
              }
            });
          }
        }]);

        return PlatformAltCtrl;
      }(MetricsPanelCtrl));

      _export('PlatformAltCtrl', PlatformAltCtrl);

      PlatformAltCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=platformalt_ctrl.js.map

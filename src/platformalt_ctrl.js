
import moment from 'moment';


import $ from 'jquery';
import _ from 'lodash';

import kbn from 'app/core/utils/kbn';
import config from 'app/core/config';
import TimeSeries from 'app/core/time_series2';
import {MetricsPanelCtrl} from 'app/plugins/sdk';

export class PlatformAltCtrl extends MetricsPanelCtrl {
  constructor($scope,$injector){
    super($scope,$injector);
    const panelDefaults = {
      legend: {
        show: true, // disable/enable legend
        values: true
      },
      width:100,
      height:100,
      fontSize: 25,
      fontWeight: '10px',
      font: { family: 'Myriad Set Pro, Helvetica Neue, Helvetica, Arial, sans-serif' },
      platformName:"",
      childChoice:"",
      platformChildren:{},
      aliases:[],
      message:"",
      labelMessage:[],
      image:"nodata.png",
      text:{
        title:'',
        name:'',
        subText:''
      }
    }
    _.defaults(this.panel, panelDefaults);
    _.defaults(this.panel.legend, panelDefaults.legend);
    this.events.on('init-edit-mode',this.onInitEditMode.bind(this));
    this.events.on('panel-initialized', this.render.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));

  }
  onInitEditMode() {
    this.addEditorTab('Options','public/plugins/grafana-platformalt-panel/editor.html',2);
    this.addEditorTab('All Transactions','public/plugins/grafana-platformalt-panel/transedit.html',2);
  }

  onDataReceived(dataList) {


    this.series = dataList.map(this.seriesHandler.bind(this));
    this.handleData();
    //this.removeGarbage();
    this.checkGarbage();
    this.calculateTransaction();
  }

  seriesHandler(seriesData) {
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });
    series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);

    return series;
  }

  //sets all labels for each platform
  setAllLabels(label){
    this.panel.labelMessage.length = 0;
    for(var key in this.panel.platformChildren){
      this.panel.platformChildren[key].defect.name = label;
      if(this.panel.platformChildren[key].defect.value){
        this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" +
        this.panel.platformChildren[key].defect.name);
      }
    }
    ctrl.render();
  }

  //manually delete a transaction that will not be queried anymore
  removeTransaction(key){
    delete this.panel.platformChildren[key];
  }

  //handles incoming data
  handleData(){
    //resets list of aliases names
    this.panel.aliases = [];
    var self = this;
    self.series.forEach(function(data){
      //checks if alias name has period. if it does not continue logic. if it does ignore
      //alias must be manually set to avoid duplicate entries
      if(data.alias.indexOf('.') < 0){
        var lastPoint = _.last(data.datapoints);
        var lastValue = _.isArray(lastPoint) ? parseInt(lastPoint[0]) : null;
        self.panel.aliases.push(data.alias);
        //check if metric exists by checking alias.
        //if it does just update the value
        if(self.panel.platformChildren[data.alias]){
          self.panel.platformChildren[data.alias].value = lastValue;
        } else {
          //if it doesnt add a new entry
          self.panel.platformChildren[data.alias] = {
            name: data.alias,
            value: lastValue,
            warningThreshhold:100,
            criticalThreshold:100,
            found:true,
            defect: {
              name:"OpenDefect",
              value:false
            }
          }
        }
      }
    });
  }
  //removes entries that are not in the list of aliases.
  //not consistent because some queries will randomly fail which
  //will delete the entry even if not intended. REVISE
  removeGarbage(){
    var self = this;
    for(var key in self.panel.platformChildren){
      var found = false;
      self.panel.aliases.forEach(function(alias){
      if(alias === key){
          found = true;
          return;
        }
      })
      if(!found){
        delete self.panel.platformChildren[key];
      }
    }
  }

  //quick solution to removeGarbage. checks entries that are not
  //part of alias list and will ignore them when computing calculations
  checkGarbage(){
    var self = this;
    for(var key in self.panel.platformChildren){
      var found = false;
      self.panel.aliases.forEach(function(alias){
        if(alias === key){
          found = true;
          return;
        }
      })
      self.panel.platformChildren[key].found = found;
    }
  }

  //if label is set to true, displays name of platform with label and ignore calculation
  replaceNames(){
    this.panel.labelMessage.length = 0;
    for(var key in this.panel.platformChildren){
      if(this.panel.platformChildren[key].defect.value){
        this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" +
        this.panel.platformChildren[key].defect.name);
      }
    }
  }
  //updates single transaction. meant to not have to run calculation on every transaction.
  //however still need to check other transactions to update health so may not be any more efficient
  //revise 
  updateTransaction(key){

    if(!this.panel.platformChildren[key].defect.value){
        var critical = false;
        var warning = false;
        var allOk = true;
        var indexOfCritical = this.panel.labelMessage.indexOf(this.panel.platformChildren[key].name  + " - Critical")
        var indexOfWarning = this.panel.labelMessage.indexOf(this.panel.platformChildren[key].name  + " - Warning")
        if(this.panel.platformChildren[key].found === true){
          if(this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].criticalThreshold)){
            this.panel.image = "error.png";
            if(indexOfWarning !== -1){
              this.panel.labelMessage.splice(indexOfWarning, 1);
            }
            if(indexOfCritical <= -1){
              this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Critical");
            }
            critical = true;
          } else if(this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].warningThreshhold) && !critical){
            this.panel.image = "warning.png";
            if(indexOfCritical !== -1){
              this.panel.labelMessage.splice(indexOfCritical, 1);
            }
            if(indexOfWarning <= -1){
              this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Warning");
            }
            warning = true;
          }
        }
        if(!critical && !warning){
          if(indexOfWarning > -1){
            this.panel.labelMessage.splice(indexOfWarning,1);
          }
          if(indexOfCritical > -1){
            this.panel.labelMessage.splice(indexOfCritical,1);
          }

          this.panel.labelMessage.forEach(function(messages){
            if(messages.indexOf("Warning") > -1 || messages.indexOf("Critical") > -1){
              allOk = false;
              return;
            }
          })
          if(allOk){
            if(this.panel.aliases.length !== 0){
              this.panel.image = "check.png";
            } else {
              this.panel.image = "nodata.png";
            }
          }
        }
      }
    this.render();
  }

  //calculates transaction based on logic given (thresholds and label values)
  //ignores failed queries
  calculateTransaction(){
    var critical = false;
    var warning = false;
    this.panel.labelMessage.length = 0;
    for(var key in this.panel.platformChildren){
      if(this.panel.platformChildren[key].defect.value){
        this.panel.labelMessage.push(this.panel.platformChildren[key].name + "-" +
        this.panel.platformChildren[key].defect.name);
      } else{
          if(this.panel.platformChildren[key].found === true){
            if(this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].criticalThreshold)){
              this.panel.image = "error.png";
              this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Critical");
              critical = true;
            } else if(this.panel.platformChildren[key].value >= parseInt(this.panel.platformChildren[key].warningThreshhold) && !critical){
              this.panel.image = "warning.png";
              this.panel.labelMessage.unshift(this.panel.platformChildren[key].name + " - Warning");
              warning = true;
            }
          }
        }
    }
    if(!critical && !warning){
      if(this.panel.aliases.length !== 0){
        this.panel.image = "check.png";
      } else {
        this.panel.image = "nodata.png";
      }
    }
    this.render();
  }

  link(scope, elem) {
    this.events.on('render', () => {
      const $panelContainer = elem.find('.panel-container');
      if (this.panel.bgColor) {
        $panelContainer.css('background-color', this.panel.bgColor);
      } else {
        $panelContainer.css('background-color', '');
      }

    });

  }
}

PlatformAltCtrl.templateUrl = 'module.html';

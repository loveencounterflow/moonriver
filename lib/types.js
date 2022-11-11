(function() {
  'use strict';
  var GUY, alert, debug, echo, get_types, help, info, inspect, log, plain, praise, rpr, stf_prefix, types, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/NG'));

  ({rpr, inspect, echo, log} = GUY.trm);

  stf_prefix = '_source_transform_from_';

  types = null;

  //===========================================================================================================
  get_types = function() {
    var async_source_fitting_types, main, sync_source_fitting_types;
    if (types != null) {
      return types;
    }
    types = new (require('intertype')).Intertype();
    main = require('./main');
    //---------------------------------------------------------------------------------------------------------
    sync_source_fitting_types = new Set((() => {
      var i, len, name, ref, results;
      ref = GUY.props.keys(main.Segment.prototype, {
        hidden: true
      });
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        name = ref[i];
        if (name.startsWith(stf_prefix)) {
          results.push(name.replace(stf_prefix, ''));
        }
      }
      return results;
    })());
    //---------------------------------------------------------------------------------------------------------
    async_source_fitting_types = new Set((() => {
      var i, len, name, ref, results;
      ref = GUY.props.keys(main.Async_segment.prototype, {
        hidden: true
      });
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        name = ref[i];
        if (name.startsWith(stf_prefix)) {
          results.push(name.replace(stf_prefix, ''));
        }
      }
      return results;
    })());
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_sync_source_fitting(function(x) {
      return sync_source_fitting_types.has(this.type_of(x));
    });
    types.declare.mr_async_source_fitting(function(x) {
      return async_source_fitting_types.has(this.type_of(x));
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_sync_nonsource_fitting(function(x) {
      var ref;
      if (!this.isa.function(x)) {
        return false;
      }
      if (!((1 <= (ref = x.length) && ref <= 2))) {
        return false;
      }
      return true;
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_async_nonsource_fitting(function(x) {
      var ref;
      if (!this.isa.function.or.asyncfunction(x)) {
        return false;
      }
      if (!((1 <= (ref = x.length) && ref <= 2))) {
        return false;
      }
      return true;
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_reporting_collector(function(x) {
      return x instanceof main.Reporting_collector;
    });
    types.declare.mr_collector('list.or.mr_reporting_collector');
    types.declare.mr_sync_fitting('mr_sync_nonsource_fitting.or.mr_sync_source_fitting');
    types.declare.mr_async_fitting('mr_async_nonsource_fitting.or.mr_async_source_fitting');
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_sync_segment_cfg({
      fields: {
        input: 'mr_collector',
        output: 'mr_collector',
        fitting: 'mr_sync_fitting'
      },
      default: {
        input: null,
        output: null,
        fitting: null
      }
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_async_segment_cfg({
      fields: {
        input: 'mr_collector',
        output: 'mr_collector',
        fitting: 'mr_async_fitting'
      },
      default: {
        input: null,
        output: null,
        fitting: null
      }
    });
    //---------------------------------------------------------------------------------------------------------
    return types;
  };

  //###########################################################################################################
  module.exports = {stf_prefix, get_types};

}).call(this);

//# sourceMappingURL=types.js.map
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
    // #---------------------------------------------------------------------------------------------------------
    // types.declare.mr_segment        ( x ) -> x? and ( x instanceof main.Segment ) or ( x instanceof main.Async_segment )
    // types.declare.mr_sync_segment   ( x ) -> x? and ( x instanceof main.Segment )
    // types.declare.mr_async_segment  ( x ) -> x? and ( x instanceof main.Async_segment )

    //---------------------------------------------------------------------------------------------------------
    types.declare.function0({
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 0);
      },
      default: function() {},
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.function1({
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 1);
      },
      default: function(x) {},
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.function2({
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 2);
      },
      default: function(x, y) {},
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.asyncfunction0({
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 0);
      },
      default: function(x) {},
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.asyncfunction1({
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 1);
      },
      default: function(x) {},
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.asyncfunction2({
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 2);
      },
      default: function(x, y) {},
      override: true
    });
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
    types.declare.mr_sync_repeatable_source_fitting('function0');
    types.declare.mr_sync_observer_fitting('function1');
    types.declare.mr_sync_transducer_fitting('function2');
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_async_source_fitting(function(x) {
      return async_source_fitting_types.has(this.type_of(x));
    });
    types.declare.mr_async_repeatable_source_fitting('function0.or.asyncfunction0');
    types.declare.mr_async_observer_fitting('function1.or.asyncfunction1');
    types.declare.mr_async_transducer_fitting('function2.or.asyncfunction2');
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_async_duct_fitting({
      isa: 'mr_sync_duct_fitting.or.asyncfunction1.or.asyncfunction2',
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_sync_duct_fitting({
      isa: 'function1.or.function2',
      override: true
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_reporting_collector(function(x) {
      return x instanceof main.Reporting_collector;
    });
    types.declare.mr_collector('list.or.mr_reporting_collector');
    types.declare.mr_sync_fitting('mr_sync_duct_fitting.or.mr_sync_source_fitting');
    types.declare.mr_async_fitting('mr_async_duct_fitting.or.mr_async_source_fitting');
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
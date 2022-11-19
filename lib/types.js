(function() {
  'use strict';
  var GUY, Intertype, alert, asnyc_types, debug, echo, get_async_source_fitting_types, get_async_types, get_sync_source_fitting_types, get_sync_types, help, info, inspect, log, plain, praise, rpr, snyc_types, stf_prefix, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/NG'));

  ({rpr, inspect, echo, log} = GUY.trm);

  stf_prefix = '_source_transform_from_';

  ({Intertype} = require('intertype'));

  snyc_types = null;

  asnyc_types = null;

  //-----------------------------------------------------------------------------------------------------------
  get_sync_source_fitting_types = function() {
    var R, main;
    main = require('./main');
    R = new Set((() => {
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
    R.add('repeatable_source_fitting');
    R.add('function0');
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_async_source_fitting_types = function() {
    var R, main;
    main = require('./main');
    R = new Set((() => {
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
    R.add('repeatable_source_fitting');
    R.add('asyncfunction0');
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_sync_types = function() {
    var declare, main, sync_source_fitting_types, sync_types;
    if (typeof sync_types !== "undefined" && sync_types !== null) {
      return sync_types;
    }
    //.........................................................................................................
    sync_types = new Intertype();
    main = require('./main');
    ({declare} = sync_types);
    sync_source_fitting_types = get_sync_source_fitting_types();
    //.........................................................................................................
    declare.function0({
      override: true,
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 0);
      }
    });
    declare.function1({
      override: true,
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 1);
      }
    });
    declare.function2({
      override: true,
      isa: function(x) {
        return (this.isa.function(x)) && (x.length === 2);
      }
    });
    //.........................................................................................................
    declare.reporting_collector({
      override: true,
      isa: function(x) {
        return x instanceof main.Reporting_collector;
      }
    });
    declare.collector({
      isa: 'list.or.reporting_collector'
    });
    //.........................................................................................................
    declare.source_fitting({
      isa: function(x) {
        return source_fitting_types.has(this.type_of(x));
      }
    });
    declare.repeatable_source_fitting({
      override: true,
      isa: 'function0'
    });
    declare.observer_fitting({
      override: true,
      isa: 'function1'
    });
    declare.transducer_fitting({
      override: true,
      isa: 'function2'
    });
    declare.duct_fitting({
      override: true,
      isa: 'observer_fitting.or.transducer_fitting'
    });
    declare.fitting({
      isa: 'duct_fitting.or.source_fitting'
    });
    //.........................................................................................................
    declare.segment_cfg({
      fields: {
        input: 'collector',
        output: 'collector',
        fitting: 'fitting'
      },
      default: {
        input: null,
        output: null,
        fitting: null
      }
    });
    //.........................................................................................................
    return sync_types;
  };

  //=========================================================================================================
  get_async_types = function() {
    var async_source_fitting_types, async_types, declare, main;
    if (asnyc_types != null) {
      return asnyc_types;
    }
    //.........................................................................................................
    async_types = new Intertype(get_sync_types());
    main = require('./main');
    ({declare} = async_types);
    async_source_fitting_types = get_async_source_fitting_types();
    //.........................................................................................................
    declare.asyncfunction0({
      override: true,
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 0);
      }
    });
    declare.asyncfunction1({
      override: true,
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 1);
      }
    });
    declare.asyncfunction2({
      override: true,
      isa: function(x) {
        return (this.isa.asyncfunction(x)) && (x.length === 2);
      }
    });
    //.........................................................................................................
    declare.source_fitting(function(x) {
      return source_fitting_types.has(this.type_of(x));
    });
    declare.repeatable_source_fitting({
      override: true,
      isa: 'function0.or.asyncfunction0'
    });
    declare.observer_fitting({
      override: true,
      isa: 'function1.or.asyncfunction1'
    });
    declare.transducer_fitting({
      override: true,
      isa: 'function2.or.asyncfunction2'
    });
    declare.duct_fitting({
      override: true,
      isa: 'sync_duct_fitting.or.asyncfunction1.or.asyncfunction2'
    });
    declare.fitting({
      isa: 'duct_fitting.or.source_fitting'
    });
    //.........................................................................................................
    declare.segment_cfg({
      fields: {
        input: 'collector',
        output: 'collector',
        fitting: 'fitting'
      },
      default: {
        input: null,
        output: null,
        fitting: null
      }
    });
    //.........................................................................................................
    return types;
  };

  //###########################################################################################################
  module.exports = {stf_prefix, get_sync_types, get_async_types};

}).call(this);

//# sourceMappingURL=types.js.map
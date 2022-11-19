(function() {
  'use strict';
  var GUY, Intertype, alert, async_types, base_types, debug, echo, get_async_source_fitting_types, get_async_types, get_base_types, get_sync_source_fitting_types, get_sync_types, help, info, inspect, log, plain, praise, rpr, snyc_types, stf_prefix, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/NG'));

  ({rpr, inspect, echo, log} = GUY.trm);

  stf_prefix = '_source_transform_from_';

  ({Intertype} = require('intertype'));

  base_types = null;

  snyc_types = null;

  async_types = null;

  //-----------------------------------------------------------------------------------------------------------
  get_sync_source_fitting_types = function() {
    var R, main, name, ref;
    main = require('./main');
    R = new Set();
    ref = GUY.props.walk_keys(main.Segment.prototype, {
      hidden: true
    });
    for (name of ref) {
      if (!name.startsWith(stf_prefix)) {
        continue;
      }
      R.add(name.replace(stf_prefix, ''));
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_async_source_fitting_types = function() {
    var R, main, name, ref;
    main = require('./main');
    R = new Set();
    ref = GUY.props.walk_keys(main.Async_segment.prototype, {
      hidden: true
    });
    for (name of ref) {
      if (!name.startsWith(stf_prefix)) {
        continue;
      }
      R.add(name.replace(stf_prefix, ''));
    }
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_base_types = function() {
    var declare, main, source_fitting_types;
    if (base_types != null) {
      return base_types;
    }
    //.........................................................................................................
    base_types = new Intertype();
    main = require('./main');
    ({declare} = base_types);
    source_fitting_types = get_sync_source_fitting_types();
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
    return base_types;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_sync_types = function() {
    var declare, source_fitting_types, sync_types;
    if (typeof sync_types !== "undefined" && sync_types !== null) {
      return sync_types;
    }
    //.........................................................................................................
    sync_types = new Intertype(get_base_types());
    ({declare} = sync_types);
    source_fitting_types = get_sync_source_fitting_types();
    //.........................................................................................................
    declare.producer_fitting({
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
    declare.source_fitting({
      isa: function(x) {
        return source_fitting_types.has(this.type_of(x));
      }
    });
    declare.activator_fitting({
      isa: 'producer_fitting.or.source_fitting'
    });
    declare.duct_fitting({
      isa: 'observer_fitting.or.transducer_fitting'
    });
    declare.fitting({
      isa: 'duct_fitting.or.activator_fitting'
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
    var declare, main, source_fitting_types;
    if (async_types != null) {
      return async_types;
    }
    //.........................................................................................................
    async_types = new Intertype(get_base_types());
    main = require('./main');
    ({declare} = async_types);
    source_fitting_types = get_async_source_fitting_types();
    //.........................................................................................................
    declare.producer_fitting({
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
    declare.source_fitting({
      isa: function(x) {
        return source_fitting_types.has(this.type_of(x));
      }
    });
    declare.activator_fitting({
      isa: 'producer_fitting.or.source_fitting'
    });
    declare.duct_fitting({
      isa: 'observer_fitting.or.transducer_fitting'
    });
    declare.fitting({
      isa: 'duct_fitting.or.activator_fitting'
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
    return async_types;
  };

  //###########################################################################################################
  module.exports = {stf_prefix, get_sync_types, get_async_types};

}).call(this);

//# sourceMappingURL=types.js.map
(function() {
  'use strict';
  var GUY, Intertype, STREAM, alert, async_types, base_types, debug, echo, get_async_source_fitting_types, get_async_types, get_base_types, get_sync_source_fitting_types, get_sync_types, get_transform_types, help, info, inspect, log, misfit, plain, praise, rpr, snyc_types, stf_prefix, transform_types, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/NG'));

  ({rpr, inspect, echo, log} = GUY.trm);

  stf_prefix = '_transform_from_';

  ({Intertype} = require('intertype'));

  base_types = null;

  snyc_types = null;

  async_types = null;

  transform_types = null;

  misfit = Symbol('misfit');

  STREAM = require('node:stream');

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
    declare.pipeline({
      isa: function(x) {
        return x instanceof main.Pipeline;
      }
    });
    declare.sync_pipeline({
      override: true,
      isa: function(x) {
        return (x instanceof main.Pipeline) && !(x instanceof main.Async_pipeline);
      }
    });
    declare.async_pipeline({
      override: true,
      isa: function(x) {
        return x instanceof main.Async_pipeline;
      }
    });
    //.........................................................................................................
    declare.nodejs_writestream({
      override: true,
      isa: function(x) {
        return x instanceof STREAM.Writable;
      }
    });
    declare.nodejs_readstream({
      override: true,
      isa: function(x) {
        return x instanceof STREAM.Readable;
      }
    });
    //.........................................................................................................
    declare.reporting_collector({
      override: true,
      isa: function(x) {
        return x instanceof main.Reporting_collector;
      }
    });
    declare.proto_segment({
      override: true,
      isa: function(x) {
        return x instanceof main.Proto_segment;
      }
    });
    declare.collector({
      isa: 'list.or.reporting_collector'
    });
    declare.misfit({
      override: true,
      default: misfit,
      isa: function(x) {
        return x === misfit;
      }
    });
    //.........................................................................................................
    declare.modifiers({
      extras: false,
      fields: {
        first: 'anything',
        last: 'anything',
        start: 'anything',
        stop: 'anything'
      },
      default: {
        first: misfit,
        last: misfit,
        start: misfit,
        stop: misfit
      },
      create: function(x) {
        if (x == null) {
          return {...this.registry.modifiers.default};
        }
        if (!this.isa.object(x)) {
          return x;
        }
        return {...this.registry.modifiers.default, ...x};
      }
    });
    //.........................................................................................................
    return base_types;
  };

  //-----------------------------------------------------------------------------------------------------------
  get_sync_types = function() {
    var declare, main, source_fitting_types, sync_types;
    if (typeof sync_types !== "undefined" && sync_types !== null) {
      return sync_types;
    }
    //.........................................................................................................
    sync_types = new Intertype(get_base_types());
    main = require('./main');
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
    declare.segment({
      isa: function(x) {
        return (x != null) && x instanceof main.Segment;
      }
    });
    //.........................................................................................................
    declare.segment_cfg({
      fields: {
        idx: 'cardinal',
        protocol: 'function',
        input: 'collector',
        output: 'collector',
        fitting: 'fitting',
        modifiers: 'modifiers'
      },
      default: {
        protocol: null,
        input: null,
        output: null,
        fitting: null,
        modifiers: null
      }
    });
    //.........................................................................................................
    declare.pipeline_cfg({
      fields: {
        protocol: 'boolean'
      },
      default: {
        protocol: false
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
    declare.segment({
      isa: function(x) {
        return (x != null) && (x instanceof main.Async_segment) || (x instanceof main.Segment);
      }
    });
    //.........................................................................................................
    declare.segment_cfg({
      fields: {
        idx: 'cardinal',
        protocol: 'function',
        input: 'collector',
        output: 'collector',
        fitting: 'fitting',
        modifiers: 'modifiers'
      },
      default: {
        protocol: null,
        input: null,
        output: null,
        fitting: null,
        modifiers: null
      }
    });
    //.........................................................................................................
    declare.pipeline_cfg({
      fields: {
        /* TAINT could also be asyncfunction */
        protocol: 'boolean'
      },
      default: {
        protocol: false
      }
    });
    //.........................................................................................................
    return async_types;
  };

  //=========================================================================================================
  get_transform_types = function() {
    var declare;
    if (transform_types != null) {
      return transform_types;
    }
    transform_types = new Intertype(get_base_types());
    ({declare} = transform_types);
    //.........................................................................................................
    declare.transform_window_cfg({
      fields: {
        min: 'integer',
        max: 'integer',
        empty: 'anything'
      },
      default: {
        min: -1,
        max: 1,
        empty: misfit
      },
      isa: function(x) {
        if (!this.isa.object(x)) {
          return false;
        }
        if (!(x.min < x.max)) {
          return false;
        }
        return true;
      }
    });
    //.........................................................................................................
    declare.transform_named_window_cfg({
      fields: {
        names: 'list.of.nonempty.text',
        empty: 'anything'
      },
      default: {
        names: ['left', 'mid', 'right'],
        empty: misfit
      },
      isa: function(x) {
        if (!this.isa.object(x)) {
          return false;
        }
        if (!this.isa.odd.integer(x.names.length)) {
          return false;
        }
        if ((new Set(x.names)).size !== x.names.length) {
          return false;
        }
        return true;
      }
    });
    //.........................................................................................................
    return transform_types;
  };

  //###########################################################################################################
  module.exports = {stf_prefix, get_base_types, get_sync_types, get_async_types, get_transform_types, misfit};

}).call(this);

//# sourceMappingURL=types.js.map
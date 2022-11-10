(function() {
  'use strict';
  var GUY, Pipeline, Reporting_collector, Segment, UTIL, alert, debug, def, echo, get_types, help, hide, info, inspect, log, nameit, plain, praise, rpr, stf_prefix, types, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/NG'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  types = null;

  UTIL = require('node:util');

  ({hide, def} = GUY.props);

  nameit = function(name, f) {
    return def(f, 'name', {
      value: name
    });
  };

  stf_prefix = '_source_transform_from_';

  //===========================================================================================================
  get_types = function() {
    var source_fitting_types;
    if (types != null) {
      return types;
    }
    types = new (require('intertype')).Intertype();
    //---------------------------------------------------------------------------------------------------------
    source_fitting_types = new Set((() => {
      var i, len, name, ref, results;
      ref = Object.getOwnPropertyNames(Segment.prototype);
      /* thx to https://stackoverflow.com/a/31055009/7568091 */
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
    types.declare.mr_source_fitting(function(x) {
      return source_fitting_types.has(this.type_of(x));
    });
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_nonsource_fitting(function(x) {
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
    types.declare.mr_reporting_collector(function(x) {
      return x instanceof Reporting_collector;
    });
    types.declare.mr_collector('list.or.mr_reporting_collector');
    types.declare.mr_fitting('mr_nonsource_fitting.or.mr_source_fitting');
    //---------------------------------------------------------------------------------------------------------
    types.declare.mr_segment_cfg({
      fields: {
        input: 'mr_collector',
        output: 'mr_collector',
        fitting: 'mr_fitting'
      },
      default: {
        input: null,
        output: null,
        fitting: null
      }
    });
    // create: ( x ) ->
    //   return x unless @isa.optional.object x
    //   R         = x
    //   return R

    //---------------------------------------------------------------------------------------------------------
    return types;
  };

  //===========================================================================================================
  Segment = class Segment {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var send;
      hide(this, 'types', get_types());
      this.types.create.mr_segment_cfg(cfg);
      this.input = cfg.input;
      this.output = cfg.output;
      this.has_finished = null;
      this.transform_type = null;
      hide(this, 'transform', this._as_transform(cfg.fitting));
      hide(this, '_send', send = (d) => {
        this.output.push(d);
        return d/* 'inner' send method */;
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _as_transform(fitting) {
      var R, arity, ref;
      /*

      * `fitting`: a value that may be used as (the central part of) a transform in a pipeline. This may be a
        function of arity 2 (a transducer), a list (a source) &c.
      * `transform`: one of the serial elements that constitute a pipeline. While a `fitting` may be of
        various types, a `transform` is always a function. `transform`s have a `type` attribute which takes
        one of the following values:
        * `source`: a `transform` that does not take any arguments and will yield one value per call
        * `observer`: a `transform` that takes one argument (the current value) and does not send any values
          into the pipeline; the value an observer gets called with will be the same value that the next
          transformer will be called with. Note that if an observer receives a mutable value it can modify it
          and thereby affect one data item at a time.
        * `transducer`: a `transform` that takes two arguments, the current data item and a `send()` function
          that can be used any number of times to send values to the ensuing transform.

       */
      if (this.types.isa.mr_source_fitting(fitting)) {
        R = this._get_source_transform(fitting);
        this.transform_type = 'source';
      } else {
        //.......................................................................................................
        R = fitting;
        switch (arity = (ref = R.length) != null ? ref : 0) {
          case 1:
            this.transform_type = 'observer';
            break;
          case 2:
            this.transform_type = 'transducer';
            break;
          default:
            throw new Error(`fittings with arity ${arity} not implemented`);
        }
      }
      if (R.name === '') {
        //.......................................................................................................
        nameit('ƒ', R);
      }
      return R;
    }

    //=========================================================================================================
    // SOURCE TRANSFORMS
    //---------------------------------------------------------------------------------------------------------
    _get_source_transform(source) {
      var method, type;
      type = this.types.type_of(source);
      if ((method = this[stf_prefix + type]) == null) {
        throw new Error(`unable to convert a ${type} to a transform`);
      }
      this.has_finished = false;
      return nameit(type, method.call(this, source));
    }

    //---------------------------------------------------------------------------------------------------------
    [stf_prefix + 'generator'](source) {
      this.has_finished = false;
      return (send) => {
        var dsc;
        if (this.has_finished) {
          return null;
        }
        dsc = source.next();
        this.has_finished = dsc.done;
        if (!this.has_finished) {
          send(dsc.value);
        }
        return null;
      };
    }

    //---------------------------------------------------------------------------------------------------------
    [stf_prefix + 'text'](source) {
      var letter_re;
      letter_re = /./uy;
      this.has_finished = false;
      return (send) => {
        var match;
        if (this.has_finished) {
          return null;
        }
        if ((match = source.match(letter_re)) == null) {
          this.has_finished = true;
          return null;
        }
        send(match[0]);
        return null;
      };
    }

    //---------------------------------------------------------------------------------------------------------
    [stf_prefix + 'generatorfunction'](source) {
      return this._get_source_transform(source());
    }

    [stf_prefix + 'arrayiterator'](source) {
      return this[stf_prefix + 'generator'](source);
    }

    [stf_prefix + 'setiterator'](source) {
      return this[stf_prefix + 'generator'](source);
    }

    [stf_prefix + 'mapiterator'](source) {
      return this[stf_prefix + 'generator'](source);
    }

    [stf_prefix + 'list'](source) {
      return this._get_source_transform(source.values());
    }

    [stf_prefix + 'object'](source) {
      return this._get_source_transform(function*() {
        var k, results, v;
        results = [];
        for (k in source) {
          v = source[k];
          results.push((yield [k, v]));
        }
        return results;
      });
    }

    [stf_prefix + 'set'](source) {
      return this._get_source_transform(source.values());
    }

    [stf_prefix + 'map'](source) {
      return this._get_source_transform(source.entries());
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    /* 'outer' send method */
    send(d) {
      this.input.push(d);
      return d;
    }

    //---------------------------------------------------------------------------------------------------------
    process() {
      var d;
      if (this.transform_type === 'source') {
        while (this.input.length > 0/* TAINT could be done with `.splice()` */) {
          this._send(this.input.shift());
        }
        if (this.transform.has_finished) {
          return 0;
        }
        this.transform(this._send);
        return 1;
      }
      if (this.input.length > 0) {
        d = this.input.shift();
        switch (this.transform_type) {
          case 'observer':
            this.transform(d);
            this._send(d);
            break;
          case 'transducer':
            this.transform(d, this._send);
            break;
          default:
            throw new Error(`internal error: unknown transform type ${rpr(this.transform_type)}`);
        }
        return 1;
      }
      return 0;
    }

    //---------------------------------------------------------------------------------------------------------
    [UTIL.inspect.custom]() {
      return this.toString();
    }

    toString() {
      return `${rpr(this.input)} ▶ ${this.transform.name} ▶ ${rpr(this.output)}`;
    }

  };

  //===========================================================================================================
  Reporting_collector = class Reporting_collector {
    //---------------------------------------------------------------------------------------------------------
    constructor(callback) {
      hide(this, 'callback', callback);
      hide(this, 'd', []);
      GUY.props.def(this, 'length', {
        get: function() {
          return this.d.length;
        }
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    push(d) {
      this.callback(+1);
      return this.d.push(d);
    }

    unshift(d) {
      this.callback(+1);
      return this.d.unshift(d);
    }

    pop() {
      this.callback(-1);
      return this.d.pop();
    }

    shift() {
      this.callback(-1);
      return this.d.shift();
    }

    //---------------------------------------------------------------------------------------------------------
    [UTIL.inspect.custom]() {
      return this.toString();
    }

    toString() {
      return rpr(this.d);
    }

  };

  //===========================================================================================================
  Pipeline = class Pipeline {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      var ref, ref1, ref2, ref3;
      cfg = {...{}, ...cfg};
      // cfg                 = types.create.mr_pipeline_cfg cfg
      this.datacount = 0;
      this.input = this._new_collector();
      this.output = [];
      this./* pipeline output buffer does not participate in datacount */segments = [];
      this.on_before_step = (ref = cfg.on_before_step) != null ? ref : null;
      this.on_after_step = (ref1 = cfg.on_after_step) != null ? ref1 : null;
      this.on_before_process = (ref2 = cfg.on_before_process) != null ? ref2 : null;
      this.on_after_process = (ref3 = cfg.on_after_process) != null ? ref3 : null;
      hide(this, 'types', get_types());
      hide(this, 'sources', []);
      def(this, 'has_finished', {
        get: function() {
          return (this.datacount < 1) && this.sources.every(function(s) {
            return s.has_finished;
          });
        }
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_collector() {
      return new Reporting_collector((delta) => {
        return this.datacount += delta;
      });
    }

    send(d) {
      this.input.push(d);
      return d;
    }

    run() {
      var d, ref, results;
      ref = this.walk();
      results = [];
      for (d of ref) {
        results.push(d);
      }
      return results;
    }

    //---------------------------------------------------------------------------------------------------------
    push(fitting) {
      var R, count, error, input, prv_segment;
      if ((count = this.segments.length) === 0) {
        input = this.input;
      } else {
        prv_segment = this.segments[count - 1];
        prv_segment.output = this._new_collector();
        input = prv_segment.output;
      }
      try {
        R = new Segment({
          input,
          fitting,
          output: this.output
        });
      } catch (error1) {
        error = error1;
        throw new Error(`unable to convert a ${this.types.type_of(fitting)} into a segment\n` + error.message);
      }
      this.segments.push(R);
      if (R.transform_type === 'source') {
        this.sources.push(R);
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    process() {
      var i, len, ref, segment, segment_idx;
      if (this.on_before_process != null) {
        this.on_before_process();
      }
      ref = this.segments;
      for (segment_idx = i = 0, len = ref.length; i < len; segment_idx = ++i) {
        segment = ref[segment_idx];
        if (this.on_before_step != null) {
          this.on_before_step(segment_idx);
        }
        segment.process();
        if (this.on_after_step != null) {
          this.on_after_step(segment_idx);
        }
      }
      if (this.on_after_process != null) {
        this.on_after_process();
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk() {
      var d, i, len, ref;
      while (true) {
        this.process();
        ref = this.output;
        for (i = 0, len = ref.length; i < len; i++) {
          d = ref[i];
          yield d;
        }
        this.output.length = 0;
        if (this.has_finished) {
          // yield @output.shift() while @output.length > 0
          break;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    [UTIL.inspect.custom]() {
      return this.toString();
    }

    toString() {
      var R, i, len, ref, segment;
      R = [];
      ref = this.segments;
      for (i = 0, len = ref.length; i < len; i++) {
        segment = ref[i];
        R.push(rpr(segment.input));
        R.push('▶');
        R.push(segment.transform.name);
        R.push('▶');
      }
      R.push(rpr(this.output));
      return R.join(' ');
    }

  };

  //###########################################################################################################
  module.exports = {Segment, Reporting_collector, Pipeline};

}).call(this);

//# sourceMappingURL=main.js.map
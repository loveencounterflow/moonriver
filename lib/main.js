(function() {
  'use strict';
  var Async_pipeline, Async_segment, GUY, Pipeline, Reporting_collector, Segment, UTIL, alert, debug, def, echo, get_types, help, hide, info, inspect, log, nameit, noop, plain, praise, rpr, stf, stf_prefix, transforms, types, urge, warn, whisper;

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

  ({stf_prefix, get_types} = require('./types'));

  stf = function(name) {
    return stf_prefix + (Array.isArray(name) ? name[0] : name);
  };

  transforms = require('./transforms');

  noop = function() {};

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

  Segment = (function() {
    //###########################################################################################################
    // SYNC
    //===========================================================================================================
    class Segment {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var send;
        hide(this, 'types', get_types());
        this.types.create[this.constructor.my_type](cfg);
        this.input = cfg.input;
        this.output = cfg.output;
        this.has_finished = null;
        this.transform_type = null;
        this._on_before_walk = noop;
        hide(this, 'transform', this._as_transform(cfg.fitting));
        hide(this, '_send', send = (d) => {
          this.output.push(d);
          return d/* 'inner' send method */;
        });
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _as_transform(fitting) {
        var R, clasz, name, sigil;
        clasz = this.constructor;
        sigil = null;
        debug('^4345^', {
          name: fitting.name,
          type: this.types.type_of(fitting),
          isa_fitting: this.types.isa[clasz.fitting_type](fitting),
          isa_source: this.types.isa[clasz.source_fitting_type](fitting),
          isa_duct: this.types.isa[clasz.duct_fitting_type](fitting)
        });
        //.......................................................................................................
        if (this.types.isa[clasz.repeatable_source_fitting_type](fitting)) {
          this._on_before_walk = function() {
            return this.transform = this._get_source_transform(fitting());
          };
          this.transform_type = 'source';
          R = fitting;
          sigil = '?sr ';
        //.......................................................................................................
        } else if (this.types.isa[clasz.source_fitting_type](fitting)) {
          R = this._get_source_transform(fitting);
          this.transform_type = 'source';
          sigil = '?sn ';
        } else {
          //.......................................................................................................
          R = fitting;
          if (this.types.isa[clasz.observer_fitting_type](R)) {
            this.transform_type = 'observer';
            sigil = '?o';
          } else if (this.types.isa[clasz.transducer_fitting_type](R)) {
            this.transform_type = 'transducer';
            sigil = '?t';
          } else {
            throw new Error(`^mr.e#1^ fittings with arity ${arity} not implemented`);
          }
        }
        //.......................................................................................................
        name = R.name === '' ? 'ƒ' : R.name;
        name = sigil + name;
        nameit(name, R);
        return R;
      }

      //=========================================================================================================
      // SOURCE TRANSFORMS
      //---------------------------------------------------------------------------------------------------------
      _get_source_transform(source) {
        var R, method, type;
        type = this.types.type_of(source);
        if ((method = this[stf(type)]) == null) {
          throw new Error(`^mr.e#2^ unable to convert a ${type} to a transform`);
        }
        this.has_finished = false;
        R = method.call(this, source);
        if (R.name === '') {
          return nameit(type, R);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`generator`](source) {
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
      [stf`text`](source) {
        var letter_re;
        letter_re = /./uy;
        this.has_finished = false;
        return nameit('√txt', (send) => {
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
        });
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`generatorfunction`](source) {
        return this._get_source_transform(source());
      }

      [stf`arrayiterator`](source) {
        return this[stf`generator`](source);
      }

      [stf`setiterator`](source) {
        return this[stf`generator`](source);
      }

      [stf`mapiterator`](source) {
        return this[stf`generator`](source);
      }

      [stf`list`](source) {
        return nameit('√lst', this[stf`generator`](source.values()));
      }

      [stf`object`](source) {
        return nameit('√obj', this[stf`generator`]((function*() {
          var k, results, v;
          results = [];
          for (k in source) {
            v = source[k];
            results.push((yield [k, v]));
          }
          return results;
        })()));
      }

      [stf`set`](source) {
        return nameit('√set', this[stf`generator`](source.values()));
      }

      [stf`map`](source) {
        return nameit('√map', this[stf`generator`](source.entries()));
      }

      [stf`function0`](source) {
        return source;
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
              throw new Error(`^mr.e#3^ internal error: unknown transform type ${rpr(this.transform_type)}`);
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

    //---------------------------------------------------------------------------------------------------------
    Segment.my_type = 'mr_sync_segment_cfg';

    Segment.fitting_type = 'mr_sync_fitting';

    Segment.source_fitting_type = 'mr_sync_source_fitting';

    Segment.repeatable_source_fitting_type = 'mr_sync_repeatable_source_fitting';

    Segment.observer_fitting_type = 'mr_sync_observer_fitting';

    Segment.transducer_fitting_type = 'mr_sync_transducer_fitting';

    Segment.duct_fitting_type = 'mr_sync_duct_fitting';

    return Segment;

  }).call(this);

  Pipeline = (function() {
    //===========================================================================================================
    class Pipeline {
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
        // hide  @, '$',             nameit '$', @_remit.bind @
        hide(this, 'types', get_types());
        def(this, 'sources', {
          get: function() {
            var s;
            return Object.freeze((function() {
              var i, len, ref4, results;
              ref4 = this.segments;
              results = [];
              for (i = 0, len = ref4.length; i < len; i++) {
                s = ref4[i];
                if (s.transform_type === 'source') {
                  results.push(s);
                }
              }
              return results;
            }).call(this));
          }
        });
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

      //=========================================================================================================
      // BUILDING PIPELINE FROM SEGMENTS
      //---------------------------------------------------------------------------------------------------------
      // _remit: ( modifiers, fitting ) ->
      _remit(fitting) {
        var R, count, error, input, prv_segment;
        if ((count = this.segments.length) === 0) {
          input = this.input;
        } else {
          prv_segment = this.segments[count - 1];
          prv_segment.output = this._new_collector();
          input = prv_segment.output;
        }
        try {
          R = new this.constructor.segment_class({
            input,
            fitting,
            output: this.output
          });
        } catch (error1) {
          error = error1;
          error.message = error.message + `\n\n^mr.e#4^ unable to convert a ${this.types.type_of(fitting)} into a segment`;
          throw error;
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      push(...P) {
        var R;
        R = this._remit(...P);
        this.segments.push(R);
        // @sources.push   R if R.transform_type is 'source'
        return R;
      }

      //=========================================================================================================
      // SENDING DATA
      //---------------------------------------------------------------------------------------------------------
      send(d) {
        this.input.push(d);
        return d;
      }

      //=========================================================================================================
      // PROCESSING
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

      //=========================================================================================================
      // ITERATING OVER AND RETRIEVING RESULTS
      //---------------------------------------------------------------------------------------------------------
      run() {
        var d, ref, results;
        ref = this.walk();
        results = [];
        for (d of ref) {
          results.push(d);
        }
        return results;
      }

      * walk() {
        var d, i, j, len, len1, ref, ref1, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment._on_before_walk();
        }
        while (true) {
          this.process();
          ref1 = this.output;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            d = ref1[j];
            yield d;
          }
          this.output.length = 0;
          if (this.has_finished) {
            break;
          }
        }
        return null;
      }

      //=========================================================================================================
      // CLI REPRESENTATION
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

    //---------------------------------------------------------------------------------------------------------
    Pipeline.segment_class = Segment;

    return Pipeline;

  }).call(this);

  Async_segment = (function() {
    //###########################################################################################################
    // ASYNC
    //===========================================================================================================
    class Async_segment extends Segment {
      //---------------------------------------------------------------------------------------------------------
      async process() {
        var d;
        if (this.transform_type === 'source') {
          while (this.input.length > 0/* TAINT could be done with `.splice()` */) {
            this._send(this.input.shift());
          }
          if (this.transform.has_finished) {
            return 0;
          }
          await this.transform(this._send);
          return 1;
        }
        if (this.input.length > 0) {
          d = this.input.shift();
          if (d instanceof Promise) {
            d = (await d);
          }
          switch (this.transform_type) {
            case 'observer':
              await this.transform(d);
              this._send(d);
              break;
            case 'transducer':
              await this.transform(d, this._send);
              break;
            default:
              throw new Error(`^mr.e#5^ internal error: unknown transform type ${rpr(this.transform_type)}`);
          }
          return 1;
        }
        return 0;
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`asyncgeneratorfunction`](source) {
        return this[stf`asyncgenerator`](source());
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`asyncgenerator`](source) {
        return async(send) => {
          var dsc;
          if (this.has_finished) {
            return null;
          }
          dsc = (await source.next());
          this.has_finished = dsc.done;
          if (!this.has_finished) {
            send(dsc.value);
          }
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`readstream`](source) {
        var Receiver, rcv;
        ({Receiver} = require('jfee'));
        rcv = Receiver.from_readstream(source, {
          bare: true
        });
        return nameit('√readstream', this[stf`asyncgenerator`](rcv));
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Async_segment.my_type = 'mr_async_segment_cfg';

    Async_segment.fitting_type = 'mr_async_fitting';

    Async_segment.source_fitting_type = 'mr_async_source_fitting';

    Async_segment.repeatable_source_fitting_type = 'mr_async_repeatable_source_fitting';

    Async_segment.observer_fitting_type = 'mr_async_observer_fitting';

    Async_segment.transducer_fitting_type = 'mr_async_transducer_fitting';

    Async_segment.duct_fitting_type = 'mr_async_duct_fitting';

    return Async_segment;

  }).call(this);

  Async_pipeline = (function() {
    //===========================================================================================================
    class Async_pipeline extends Pipeline {
      //=========================================================================================================
      // PROCESSING
      //---------------------------------------------------------------------------------------------------------
      async process() {
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
          await segment.process();
          if (this.on_after_step != null) {
            this.on_after_step(segment_idx);
          }
        }
        if (this.on_after_process != null) {
          this.on_after_process();
        }
        return null;
      }

      //=========================================================================================================
      // CLI REPRESENTATION
      //---------------------------------------------------------------------------------------------------------
      async run() {
        var d, ref, results;
        ref = this.walk();
        results = [];
        for await (d of ref) {
          results.push(d);
        }
        return results;
      }

      async * walk() {
        var d, i, len, ref;
        while (true) {
          await this.process();
          ref = this.output;
          for (i = 0, len = ref.length; i < len; i++) {
            d = ref[i];
            yield (d instanceof Promise ? (await d) : d);
          }
          this.output.length = 0;
          if (this.has_finished) {
            break;
          }
        }
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Async_pipeline.segment_class = Async_segment;

    return Async_pipeline;

  }).call(this);

  //###########################################################################################################
  module.exports = {Pipeline, Segment, Async_pipeline, Async_segment, Reporting_collector, transforms};

}).call(this);

//# sourceMappingURL=main.js.map
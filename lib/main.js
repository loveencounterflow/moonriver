(function() {
  'use strict';
  var $, Async_pipeline, Async_segment, GUY, Pipeline, Proto_segment, Reporting_collector, Segment, UTIL, alert, debug, def, echo, entries, get_async_types, get_sync_types, help, hide, info, inspect, log, misfit, nameit, noop, plain, praise, rpr, stf, stf_prefix, transforms, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/MAIN'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  UTIL = require('node:util');

  ({hide, def} = GUY.props);

  nameit = function(name, f) {
    return def(f, 'name', {
      value: name
    });
  };

  ({misfit, stf_prefix, get_sync_types, get_async_types} = require('./types'));

  stf = function(name) {
    return stf_prefix + (Array.isArray(name) ? name[0] : name);
  };

  transforms = require('./transforms');

  noop = function() {};

  entries = function(φ) {
    return (function*() {
      var k, results, v;
      results = [];
      for (k in φ) {
        v = φ[k];
        results.push((yield [k, v]));
      }
      return results;
    })();
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

  Segment = (function() {
    //###########################################################################################################
    // SYNC
    //===========================================================================================================
    class Segment {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var clasz, send;
        clasz = this.constructor;
        hide(this, 'types', clasz.type_getter());
        this.types.create.segment_cfg(cfg);
        this.input = cfg.input;
        this.output = cfg.output;
        this.has_finished = null;
        this.role = null;
        this._on_before_walk = noop;
        this.first = cfg.modifiers.first;
        this.last = cfg.modifiers.last;
        this._set_transform(cfg.fitting);
        hide(this, '_send', send = (d) => {
          this.output.push(d);
          return d/* 'inner' send method */;
        });
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _set_transform(fitting) {
        var fitting_type, name, role, sigil, transform;
        sigil = null;
        //.......................................................................................................
        fitting_type = this.types.type_of(fitting);
        ({role, transform} = this._transform_from_fitting(fitting_type, fitting));
        //.......................................................................................................
        name = transform.name === '' ? 'ƒ' : transform.name;
        nameit(name, transform);
        if (role === 'source') {
          this.has_finished = false;
        }
        this.role = role;
        hide(this, 'transform', transform);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _transform_from_fitting(type, source) {
        var method;
        if ((method = this[stf(type)]) == null) {
          throw new Error(`^mr.e#2^ unable to convert a ${type} to a transform`);
        }
        return method.call(this, source);
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`producer_fitting`](φ) {
        this._on_before_walk = function() {
          var source;
          source = φ();
          this.transform = (this._transform_from_fitting(this.types.type_of(source), source)).transform;
          this.has_finished = false;
          return null;
        };
        return {
          role: 'source',
          transform: φ
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`generator`](φ) {
        var transform;
        transform = (send) => {
          var dsc;
          if (this.has_finished) {
            return null;
          }
          dsc = φ.next();
          this.has_finished = dsc.done;
          if (!this.has_finished) {
            send(dsc.value);
          }
          return null;
        };
        return {
          role: 'source',
          transform
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`text`](φ) {
        var letter_re, transform;
        letter_re = /./uy;
        transform = nameit('√txt', (send) => {
          var match;
          if (this.has_finished) {
            return null;
          }
          if ((match = φ.match(letter_re)) == null) {
            this.has_finished = true;
            return null;
          }
          send(match[0]);
          return null;
        });
        return {
          role: 'source',
          transform
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`generatorfunction`](φ) {
        return this[stf`generator`](φ());
      }

      [stf`arrayiterator`](φ) {
        return this[stf`generator`](φ);
      }

      [stf`setiterator`](φ) {
        return this[stf`generator`](φ);
      }

      [stf`mapiterator`](φ) {
        return this[stf`generator`](φ);
      }

      //.........................................................................................................
      [stf`transducer_fitting`](φ) {
        return {
          role: 'transducer',
          transform: φ
        };
      }

      [stf`observer_fitting`](φ) {
        return {
          role: 'observer',
          transform: φ
        };
      }

      //.........................................................................................................
      [stf`list`](φ) {
        var R;
        R = this[stf`generator`](φ.values());
        R.transform = nameit('√lst', R.transform);
        return R;
      }

      [stf`object`](φ) {
        var R;
        R = this[stf`generator`](entries(φ));
        R.transform = nameit('√obj', R.transform);
        return R;
      }

      [stf`set`](φ) {
        var R;
        R = this[stf`generator`](φ.values());
        R.transform = nameit('√set', R.transform);
        return R;
      }

      [stf`map`](φ) {
        var R;
        R = this[stf`generator`](φ.entries());
        R.transform = nameit('√map', R.transform);
        return R;
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
        if (this.role === 'source') {
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
          switch (this.role) {
            case 'observer':
              this.transform(d);
              this._send(d);
              break;
            case 'transducer':
              this.transform(d, this._send);
              break;
            default:
              throw new Error(`^mr.e#3^ internal error: unknown segment role ${rpr(this.role)}`);
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
    Segment.type_getter = get_sync_types;

    return Segment;

  }).call(this);

  Pipeline = (function() {
    //===========================================================================================================
    class Pipeline {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        var clasz;
        clasz = this.constructor;
        cfg = {...{}, ...cfg};
        // cfg                 = types.create.pipeline_cfg cfg
        this.datacount = 0;
        this.input = this._new_collector();
        this.output = [];
        this./* pipeline output buffer does not participate in datacount */segments = [];
        hide(this, '$', nameit('$', this._segment_from_fitting.bind(this)));
        hide(this, 'types', clasz.type_getter());
        def(this, 'sources', {
          get: function() {
            var s;
            return Object.freeze((function() {
              var i, len, ref, results;
              ref = this.segments;
              results = [];
              for (i = 0, len = ref.length; i < len; i++) {
                s = ref[i];
                if (s.role === 'source') {
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
      _get_modifiers_and_fitting(modifiers, fitting) {
        var arity;
        switch (arity = arguments.length) {
          case 1:
            [modifiers, fitting] = [null, modifiers];
            break;
          case 2:
            null;
            break;
          default:
            throw new Error(`^mr.e#5^ expected 1 or 2 arguments, got ${arity}`);
        }
        modifiers = this.types.create.modifiers(modifiers);
        return [modifiers, fitting];
      }

      //---------------------------------------------------------------------------------------------------------
      _segment_from_fitting(...P) {
        /* TAINT consider to move this code to `Segment` class */
        var R, count, error, fitting, input, modifiers, prv_segment;
        [modifiers, fitting] = this._get_modifiers_and_fitting(...P);
        if (this.types.isa.proto_segment(fitting)) {
          return this._segment_from_fitting(...fitting.values);
        }
        if ((count = this.segments.length) === 0) {
          input = this.input;
        } else {
          prv_segment = this.segments[count - 1];
          prv_segment.output = this._new_collector();
          input = prv_segment.output;
        }
        if (this.types.isa.segment(fitting)) {
          R = fitting;
          R.input = input;
          R.output = this.output;
        } else {
          try {
            R = new this.constructor.segment_class({
              modifiers,
              input,
              fitting,
              output: this.output
            });
          } catch (error1) {
            error = error1;
            error.message = error.message + `\n\n^mr.e#4^ unable to convert a ${this.types.type_of(fitting)} into a segment`;
            throw error;
          }
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      push(...P) {
        var R;
        this.segments.push(R = this._segment_from_fitting(...P));
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
        ref = this.segments;
        for (segment_idx = i = 0, len = ref.length; i < len; segment_idx = ++i) {
          segment = ref[segment_idx];
          segment.process();
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
        var i, j, l, len, len1, len2, ref, ref1, ref2, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment._on_before_walk();
        }
        ref1 = this.segments;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          segment = ref1[j];
          if (segment.first !== misfit) {
            segment.send(segment.first);
          }
        }
        yield* this._walk();
        ref2 = this.segments;
        for (l = 0, len2 = ref2.length; l < len2; l++) {
          segment = ref2[l];
          if (segment.last !== misfit) {
            segment.send(segment.last);
          }
        }
        if (!this.has_finished) {
          yield* this._walk();
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk() {
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
    Pipeline.type_getter = get_sync_types;

    Pipeline.segment_class = Segment;

    return Pipeline;

  }).call(this);

  Async_segment = (function() {
    //###########################################################################################################
    // ASYNC
    //===========================================================================================================
    class Async_segment extends Segment {
      // #---------------------------------------------------------------------------------------------------------
      // _segment_from_fitting: ( P... ) ->
      //   [ modifiers
      //     fitting   ] = @_get_modifiers_and_fitting P...
      //   ### TAINT `modifiers` silently discarded ###
      //   debug '^34953609457^'
      //   return transforms.$sink_from_writestream fitting if @types.isa.nodejs_writestream fitting
      //   return super modifiers, fitting

        //---------------------------------------------------------------------------------------------------------
      async process() {
        var d;
        if (this.role === 'source') {
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
          switch (this.role) {
            case 'observer':
              await this.transform(d);
              this._send(d);
              break;
            case 'transducer':
              await this.transform(d, this._send);
              break;
            default:
              throw new Error(`^mr.e#5^ internal error: unknown transform type ${rpr(this.role)}`);
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
        var transform;
        transform = async(send) => {
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
        return {
          role: 'source',
          transform
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`nodejs_readstream`](source) {
        var Receiver, rcv;
        ({Receiver} = require('jfee'));
        rcv = Receiver.from_readstream(source, {
          bare: true
        });
        return nameit('√readstream', this[stf`asyncgenerator`](rcv));
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Async_segment.type_getter = get_async_types;

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
        ref = this.segments;
        for (segment_idx = i = 0, len = ref.length; i < len; segment_idx = ++i) {
          segment = ref[segment_idx];
          await segment.process();
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
        var d, i, j, len, len1, ref, ref1, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          await segment._on_before_walk();
        }
        while (true) {
          await this.process();
          ref1 = this.output;
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            d = ref1[j];
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
    Async_pipeline.type_getter = get_async_types;

    Async_pipeline.segment_class = Async_segment;

    return Async_pipeline;

  }).call(this);

  //###########################################################################################################
  // HELPERS
  //===========================================================================================================
  Proto_segment = class Proto_segment {
    //---------------------------------------------------------------------------------------------------------
    constructor(...P) {
      this.values = P;
      return void 0;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  $ = function(modifiers, fitting) {
    return new Proto_segment(modifiers, fitting);
  };

  //###########################################################################################################
  module.exports = {Pipeline, Segment, Async_pipeline, Async_segment, Reporting_collector, transforms, Proto_segment, $};

}).call(this);

//# sourceMappingURL=main.js.map
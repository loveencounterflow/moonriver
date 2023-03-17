(function() {
  'use strict';
  var $, Async_pipeline, Async_segment, GUY, Pipeline, Pipeline_module, Proto_segment, Reporting_collector, Segment, UTIL, alert, debug, def, echo, entries, get_async_types, get_base_types, get_sync_types, get_transform_types, help, hide, info, inspect, log, misfit, nameit, noop, plain, praise, rpr, stf, stf_prefix, transforms, urge, warn, whisper;

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

  ({misfit, stf_prefix, get_base_types, get_sync_types, get_async_types, get_transform_types} = require('./types'));

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

  ({Pipeline_module} = require('./pipeline-module'));

  //===========================================================================================================
  Reporting_collector = class Reporting_collector {
    //---------------------------------------------------------------------------------------------------------
    constructor(callback) {
      hide(this, 'callback', callback);
      hide(this, 'd', []);
      GUY.props.def(this, 'length', {
        get: (function() {
          return this.d.length;
        }),
        set: (function(x) {
          return this.d.length = x;
        })
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

    * [Symbol.iterator]() {
      return (yield* this.d);
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
        this.idx = cfg.idx;
        this.protocol = cfg.protocol;
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
      /* NOTE in the below code, `φ` has been used as an abbreviation for 'fitting' */
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
      _is_my_modifier(x) {
        return (x === this.first) || (x === this.last);
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
              if (!this._is_my_modifier(d)) {
                this._send(d);
              }
              this.protocol({
                segment: this,
                d
              });
              break;
            case 'transducer':
              this.transform(d, this._send);
              this.protocol({
                segment: this,
                d
              });
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
        hide(this, 'types', clasz.type_getter());
        cfg = this.types.create.pipeline_cfg(cfg);
        this.datacount = 0;
        this.input = this._new_collector();
        this.output = [];
        this./* pipeline output buffer does not participate in datacount */segments = [];
        hide(this, 'protocol', cfg.protocol ? this._protocol.bind(this) : noop);
        hide(this, 'journal', []);
        hide(this, '_last_output', misfit);
        hide(this, '_journal_template', {});
        hide(this, '$', nameit('$', this._segment_from_fitting.bind(this)));
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
      // PROTOCOL
      //---------------------------------------------------------------------------------------------------------
      _protocol(j = null) {
        var d, i, len, ref, segment;
        // @_prepare_journal() if @journal.length is 0
        d = {};
        d.step = this.journal.length;
        d.i = this._prpr(this.input);
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          d[`${segment.idx} ${segment.transform.name}`] = ' ';
          d[`◊ ${segment.idx}`] = ' ';
        }
        if (j != null) {
          d[`${j.segment.idx} ${j.segment.transform.name}`] = this._prpr(j.d);
          d[`◊ ${j.segment.idx}`] = this._prpr(j.segment.output);
        }
        if (this._last_output !== misfit) {
          d.o = this._last_output;
          this._last_output = misfit;
        } else {
          d.o = this._prpr(this.output);
        }
        this.journal.push(d);
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _prpr(x) {
        /* `rpr()` for the protocol */
        var R;
        R = rpr(x);
        if (this.types.isa.collector(x)) {
          if (x.length === 0) {
            return ' ';
          }
          return R.slice(2, R.length - 2);
        } else if (this.types.isa.symbol(x)) {
          return R.replace(/^Symbol\((.*)\)$/, 'Σ $1');
        }
        return R;
      }

      // #---------------------------------------------------------------------------------------------------------
      // _prepare_journal: ->
      //   @_journal_template = j = {}
      //   for segment in @segments
      //     j[ "i#{segment.idx}" ] = []
      //     j[ "n#{segment.idx}" ] = segment.transform.name
      //   j[ "o#{segment?.idx ? 0}" ] = null
      //   return null

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
        var R, count, error, fitting, input, modifiers, output, prv_segment, segment_cfg;
        [modifiers, fitting] = this._get_modifiers_and_fitting(...P);
        if (this.types.isa.proto_segment(fitting)) {
          return this._segment_from_fitting(...fitting.values);
        }
        if ((count = this.segments.length) === 0) {
          input = this.input;
          output = this.output;
        } else {
          prv_segment = this.segments[count - 1];
          prv_segment.output = this._new_collector();
          input = prv_segment.output;
          output = this.output;
        }
        //.......................................................................................................
        if (this.types.isa.segment(fitting)) {
          R = fitting;
          R.input = input;
          R.output = output;
        } else {
          segment_cfg = {
            idx: this.segments.length,
            protocol: this.protocol,
            modifiers,
            input,
            fitting,
            output
          };
          try {
            R = new this.constructor.segment_class(segment_cfg);
          } catch (error1) {
            error = error1;
            error.message = error.message + `\n\n^mr.e#4^ unable to convert a ${this.types.type_of(fitting)} into a segment`;
            throw error;
          }
        }
        if (this.types.isa.proto_segment(R.transform)) {
          /* TAINT this part should be simplified; we do it so methods `Segment::_transform_from_$type()` can
             make use of the global `$()` method to define transforms. */
          return this._segment_from_fitting(...R.transform.values);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      push(...P) {
        var R, i, len, ref, segment;
        if (this.types.isa.sync_pipeline(R = P[0])) {
          ref = R.segments;
          for (i = 0, len = ref.length; i < len; i++) {
            segment = ref[i];
            this.push(segment);
          }
        } else {
          this.segments.push(R = this._segment_from_fitting(...P));
        }
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
        var _, ref;
        this.protocol();
        this._before_walk();
        yield* this._walk();
        ref = this._prepare_after_walk();
        for (_ of ref) {
          if (!this.has_finished) {
            yield* this._walk();
          }
        }
        /* TAINT should use API */
        this.protocol();
        this._last_output = misfit;
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _before_walk() {
        var i, l, len, len1, ref, ref1, segment;
        if (this.segments.length === 0) {
          this.push(nameit('(dummy)', function(d) {}));
        }
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment._on_before_walk();
        }
        ref1 = this.segments;
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          segment = ref1[l];
          if (segment.first !== misfit) {
            segment.send(segment.first);
          }
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _prepare_after_walk() {
        var i, len, ref, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          if (!(segment.last !== misfit)) {
            continue;
          }
          segment.send(segment.last);
          yield null;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk() {
        var d, i, len, ref;
        while (true) {
          this.process();
          if (this.protocol != null) {
            /* TAINT should use API */
            this._last_output = this._prpr(this.output);
          }
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

      //---------------------------------------------------------------------------------------------------------
      walk_named_pipelines(...P) {
        return this.constructor.walk_named_pipeline(...P);
      }

      //---------------------------------------------------------------------------------------------------------
      static * walk_named_pipelines(named_pipelines) {
        var _, i, idx, k, l, len, len1, names, pipeline, pipelines, process, ref, type, types, v;
        types = get_sync_types();
        types.validate.object.or.list(named_pipelines);
        //.......................................................................................................
        switch (type = types.type_of(named_pipelines)) {
          case 'object':
            names = Object.keys(named_pipelines);
            pipelines = (function() {
              var results;
              results = [];
              for (k in named_pipelines) {
                v = named_pipelines[k];
                results.push(v);
              }
              return results;
            })();
            break;
          case 'list':
            names = (function() {
              var i, len, results;
              results = [];
              for (idx = i = 0, len = named_pipelines.length; i < len; idx = ++i) {
                _ = named_pipelines[idx];
                results.push(idx);
              }
              return results;
            })();
            pipelines = named_pipelines;
        }
        //.......................................................................................................
        process = function*() {
          var data, i, len, name, pipeline, ref;
          while (true) {
            for (idx = i = 0, len = pipelines.length; i < len; idx = ++i) {
              pipeline = pipelines[idx];
              name = names[idx];
              pipeline.process();
              ref = pipeline.output;
              for (data of ref) {
                yield ({name, data});
              }
              pipeline.output.length = 0;
            }
            if (pipelines.every(function(pipeline) {
              return pipeline.has_finished;
            })) {
              break;
            }
          }
          return null;
        };
        for (i = 0, len = pipelines.length; i < len; i++) {
          pipeline = pipelines[i];
          //.......................................................................................................
          pipeline._before_walk();
        }
        yield* process();
        for (l = 0, len1 = pipelines.length; l < len1; l++) {
          pipeline = pipelines[l];
          ref = pipeline._prepare_after_walk();
          for (_ of ref) {
            yield* process();
          }
        }
        //.......................................................................................................
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
              if (!this._is_my_modifier(d)) {
                this._send(d);
              }
              this.protocol({
                segment: this,
                d
              });
              break;
            case 'transducer':
              await this.transform(d, this._send);
              this.protocol({
                segment: this,
                d
              });
              break;
            default:
              throw new Error(`^mr.e#5^ internal error: unknown transform type ${rpr(this.role)}`);
          }
          return 1;
        }
        return 0;
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`asyncgeneratorfunction`](φ) {
        return this[stf`asyncgenerator`](φ());
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`asyncgenerator`](φ) {
        var transform;
        transform = async(send) => {
          var dsc;
          if (this.has_finished) {
            return null;
          }
          dsc = (await φ.next());
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
      [stf`nodejs_readstream`](φ) {
        var Receiver, rcv, transform;
        ({Receiver} = require('jfee'));
        rcv = Receiver.from_readstream(φ, {
          bare: true
        });
        transform = nameit('√readstream', (this[stf`asyncgenerator`](rcv)).transform);
        return {
          role: 'source',
          transform
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`nodejs_writestream`](φ) {
        var last;
        last = Symbol('last');
        return {
          role: 'observer',
          transform: $({last}, async function(d) {
            if (d === last) {
              return (await new Promise(function(resolve) {
                return φ.end(function() {
                  return resolve();
                });
              }));
            }
            // φ.close()
            return (await new Promise(function(resolve) {
              return φ.write(d, function() {
                return resolve();
              });
            }));
          })
        };
      }

      //---------------------------------------------------------------------------------------------------------
      [stf`async_pipeline`](φ) {
        var transform;
        transform = nameit('pipeline', async function(d, send) {
          var e, i, len, ref;
          φ.send(d);
          ref = (await φ.run());
          for (i = 0, len = ref.length; i < len; i++) {
            e = ref[i];
            send(e);
          }
          return null;
        });
        return {
          role: 'transducer',
          transform
        };
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
        var _, ref;
        this.protocol();
        await this._before_walk();
        await (yield* this._walk());
        ref = this._prepare_after_walk();
        for (_ of ref) {
          if (!this.has_finished) {
            await (yield* this._walk());
          }
        }
        /* TAINT should use API */
        this.protocol();
        this._last_output = misfit;
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      async _before_walk() {
        var i, l, len, len1, ref, ref1, segment;
        if (this.segments.length === 0) {
          this.push(nameit('(dummy)', function(d) {}));
        }
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          await segment._on_before_walk();
        }
        ref1 = this.segments;
        for (l = 0, len1 = ref1.length; l < len1; l++) {
          segment = ref1[l];
          if (segment.first !== misfit) {
            await segment.send(segment.first);
          }
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _prepare_after_walk() {
        var i, len, ref, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          if (!(segment.last !== misfit)) {
            continue;
          }
          segment.send(segment.last);
          yield null;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      async * _walk() {
        var d, i, len, ref;
        while (true) {
          await this.process();
          if (this.protocol != null) {
            /* TAINT should use API */
            this._last_output = this._prpr(this.output);
          }
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

      //---------------------------------------------------------------------------------------------------------
      static async * walk_named_pipelines(named_pipelines) {
        var _, i, idx, k, l, len, len1, names, pipeline, pipelines, process, ref, type, types, v;
        types = get_async_types();
        types.validate.object.or.list(named_pipelines);
        //.......................................................................................................
        switch (type = types.type_of(named_pipelines)) {
          case 'object':
            names = Object.keys(named_pipelines);
            pipelines = (function() {
              var results;
              results = [];
              for (k in named_pipelines) {
                v = named_pipelines[k];
                results.push(v);
              }
              return results;
            })();
            break;
          case 'list':
            names = (function() {
              var i, len, results;
              results = [];
              for (idx = i = 0, len = named_pipelines.length; i < len; idx = ++i) {
                _ = named_pipelines[idx];
                results.push(idx);
              }
              return results;
            })();
            pipelines = named_pipelines;
        }
        //.......................................................................................................
        process = async function*() {
          var data, i, len, name, pipeline, ref;
          while (true) {
            for (idx = i = 0, len = pipelines.length; i < len; idx = ++i) {
              pipeline = pipelines[idx];
              name = names[idx];
              await pipeline.process();
              ref = pipeline.output;
              for (data of ref) {
                yield ({name, data});
              }
              pipeline.output.length = 0;
            }
            if (pipelines.every(function(pipeline) {
              return pipeline.has_finished;
            })) {
              break;
            }
          }
          return null;
        };
        for (i = 0, len = pipelines.length; i < len; i++) {
          pipeline = pipelines[i];
          //.......................................................................................................
          await pipeline._before_walk();
        }
        await (yield* process());
        for (l = 0, len1 = pipelines.length; l < len1; l++) {
          pipeline = pipelines[l];
          ref = pipeline._prepare_after_walk();
          for (_ of ref) {
            await (yield* process());
          }
        }
        //.......................................................................................................
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
  module.exports = {Pipeline, Segment, Async_pipeline, Async_segment, Reporting_collector, Pipeline_module, transforms, Proto_segment, $, get_base_types, get_sync_types, get_async_types, get_transform_types, misfit};

}).call(this);

//# sourceMappingURL=main.js.map
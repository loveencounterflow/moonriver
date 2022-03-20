(function() {
  'use strict';
  var CND, Duct, GUY, Modified_transform, Moonriver, Segment, UTIL, add_length_prop, badge, debug, echo, help, info, isa, pluck, rpr, symbol, type_of, types, urge, validate, validate_optional, warn, whisper,
    splice = [].splice;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'MOONRIVER';

  debug = CND.get_logger('debug', badge);

  warn = CND.get_logger('warn', badge);

  info = CND.get_logger('info', badge);

  urge = CND.get_logger('urge', badge);

  help = CND.get_logger('help', badge);

  whisper = CND.get_logger('whisper', badge);

  echo = CND.echo.bind(CND);

  GUY = require('guy');

  types = new (require('intertype')).Intertype();

  ({isa, type_of, validate, validate_optional} = types);

  // { Moonriver }             = require '../../../apps/moonriver'
  UTIL = require('util');

  //-----------------------------------------------------------------------------------------------------------
  symbol = GUY.lft.freeze({
    misfit: Symbol.for('misfit'), // indicates missing value
    drop: Symbol.for('drop'), // this value will not go to output
    exit: Symbol.for('exit'), // exit pipeline processing
    // done:       Symbol.for 'done' # done for this iteration
    over: Symbol.for('over') // do not call again in this round
  });

  
  //-----------------------------------------------------------------------------------------------------------
  add_length_prop = function(target, key) {
    return GUY.props.def(target, 'length', {
      get: function() {
        return this[key].length;
      },
      set: function(x) {
        return this[key].length = x;
      }
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  pluck = function(o, k, fallback = symbol.misfit) {
    var R;
    R = o[k];
    delete o[k];
    if (R === void 0) {
      if (fallback !== symbol.misfit) {
        return fallback;
      }
      throw new Error(`^moonriver@1^ unknown property ${rpr(k)}`);
    }
    return R;
  };

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mrv_modifiers', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.boolean x.is_source": function(x) {
        return this.isa.boolean(x.is_source);
      },
      "@isa.boolean x.once_before_first": function(x) {
        return this.isa.boolean(x.once_before_first);
      },
      "@isa.boolean x.once_after_last": function(x) {
        return this.isa.boolean(x.once_after_last);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('mirage_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa_optional.list x.protocol": function(x) {
        return this.isa_optional.list(x.protocol);
      }
    }
  });

  //-----------------------------------------------------------------------------------------------------------
  types.declare('drive_cfg', {
    tests: {
      "@isa.object x": function(x) {
        return this.isa.object(x);
      },
      "@isa.integer x.first_idx": function(x) {
        return this.isa.integer(x.first_idx);
      },
      "@isa.integer x.last_idx": function(x) {
        return this.isa.integer(x.last_idx);
      },
      "x.mode in [ 'breadth', 'depth', ]": function(x) {
        var ref;
        return (ref = x.mode) === 'breadth' || ref === 'depth';
      },
      "@isa.boolean x.resume": function(x) {
        return this.isa.boolean(x.resume);
      }
    }
  });

  Duct = (function() {
    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Duct {
      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        cfg = {...this.constructor.C.defaults.constructor, ...cfg};
        this.is_oblivious = pluck(cfg, 'is_oblivious');
        this.on_change = pluck(cfg, 'on_change');
        this.cfg = GUY.lft.freeze(this.cfg);
        this.d = [];
        this.transform = null/* transform to be called when data arrives */
        this.prv_length = 0;
        add_length_prop(this, 'd');
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _on_change() {
        var delta;
        delta = this.length - this.prv_length;
        this.prv_length = this.length;
        if (typeof this.on_change === "function") {
          this.on_change(delta);
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      set_oblivious(onoff) {
        validate.boolean(onoff);
        if (onoff && this.length > 0) {
          throw new Error("^moonriver@2^ cannot set to oblivious unless duct is empty");
        }
        this.is_oblivious = onoff;
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      push(x) {
        var R;
        if (this.is_oblivious) {
          return null;
        }
        R = this.d.push(x);
        this._on_change();
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      pop(fallback = symbol.misfit) {
        var R;
        if (this.d.length === 0) {
          if (fallback !== symbol.misfit) {
            return fallback;
          }
          throw new Error("^moonriver@3^ cannot pop() from empty list");
        }
        R = this.d.pop();
        this._on_change();
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      unshift(x) {
        var R;
        if (this.is_oblivious) {
          return null;
        }
        R = this.d.unshift(x);
        this._on_change();
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      shift(fallback = symbol.misfit) {
        var R;
        if (this.d.length === 0) {
          if (fallback !== symbol.misfit) {
            return fallback;
          }
          throw new Error("^moonriver@4^ cannot shift() from empty list");
        }
        if (this.is_oblivious) {
          return null;
        }
        R = this.d.shift();
        this._on_change();
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      clear() {
        this.d.length = 0;
        this._on_change();
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * [Symbol.iterator]() {
        var d, i, len, ref;
        ref = this.d;
        for (i = 0, len = ref.length; i < len; i++) {
          d = ref[i];
          yield d;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      toString() {
        if (this.is_oblivious) {
          return '[X]';
        }
        return rpr(this.d); // + ' ➡︎ ' + ( @transform?.name ? './.' )
      }

      [UTIL.inspect.custom]() {
        return this.toString();
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Duct.C = GUY.lft.freeze({
      defaults: {
        constructor: {
          on_change: null,
          is_oblivious: false
        }
      }
    });

    return Duct;

  }).call(this);

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  Segment = class Segment {
    //---------------------------------------------------------------------------------------------------------
    constructor(moonriver, raw_transform, idx, protocol = null) {
      // constructor: ( modifiers..., raw_transform ) ->
      //   throw new Error "^segment@1^ modifiers not implemented" if modifiers.length > 0
      this.moonriver = moonriver;
      validate_optional.list(protocol);
      this.protocol = protocol;
      this.idx = idx;
      this.call_count = 0;
      this.input = null;
      this.output = null;
      this.modifiers = null;
      this.arity = null;
      this._is_over = false;
      this.has_exited = false;
      // @is_listener      = false
      this.is_sender = false;
      this.is_source = false;
      this.transform = this._transform_from_raw_transform(raw_transform);
      GUY.props.def(this, '_has_input_data', {
        get: () => {
          return this.input.length > 0;
        }
      });
      GUY.props.def(this, 'is_over', {
        get: () => {
          return this._is_over;
        }
      });
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    set_input(duct) {
      this.input = duct;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    set_output(duct) {
      this.output = duct;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    set_is_over(onoff) {
      validate.boolean(onoff);
      this._is_over = onoff;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    set_call_count(call_count) {
      validate.cardinal(call_count);
      this.call_count = call_count;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _transfer() {
      while (this.input.length > 0) {
        this.output.push(this.input.shift());
      }
      return null;
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    _transform_from_raw_transform(raw_transform) {
      var is_repeatable, is_sender, is_source, modifiers, send, transform;
      ({is_sender, is_source, is_repeatable, modifiers, transform} = this._get_transform(raw_transform));
      this.arity = transform.length;
      // @is_listener       = not ( modifiers.do_once_before or modifiers.do_once_after )
      /* TAINT do not treat modifier `is_source` different from others */
      this.is_source = is_source || (pluck(modifiers, 'is_source', false));
      this.modifiers = modifiers;
      this.is_sender = is_sender;
      this.is_repeatable = is_repeatable;
      //...................................................................................................
      if (this.is_sender) {
        if (this.modifiers.once_before_first || this.modifiers.once_after_last) {
          this.call = (d) => {
            this.call_count++;
            this.transform(this.send);
            return null;
          };
        } else {
          this.call = (d) => {
            this.call_count++;
            this.transform(d, this.send);
            return null;
          };
        }
      } else {
        //...................................................................................................
        this.call = (d) => {
          this.call_count++;
          this.transform(d);
          this.send(d);
          return null;
        };
      }
      //...................................................................................................
      send = (d) => {
        switch (d) {
          case symbol.drop:
            null;
            break;
          case symbol.over:
            this.set_is_over(true);
            break;
          case symbol.exit:
            this.has_exited = true;
            break;
          default:
            if (this.is_over) {
              throw new Error("^moonriver@5^ cannot send values after pipeline has terminated; " + `error occurred in segment idx ${this.idx} (${rpr(this._name_of_transform())})`);
            }
            this.output.push(d);
        }
        return null;
      };
      //...................................................................................................
      if (this.protocol != null) {
        this.send = (d) => {
          var i, idx, p, ref;
          send(d);
          p = {
            idx: this.idx,
            call_count: this.call_count,
            turns: this.moonriver.turns,
            d
          };
          for (idx = i = 0, ref = this.moonriver.length; (0 <= ref ? i < ref : i > ref); idx = 0 <= ref ? ++i : --i) {
            p[idx] = (idx === this.idx ? d : null);
          }
          this.protocol.push(p);
          return null;
        };
      } else {
        this.send = send;
      }
      //...................................................................................................
      this.send.symbol = symbol;
      this.send.over = () => {
        return this.send(symbol.over);
      };
      this.send.exit = () => {
        return this.send(symbol.exit);
      };
      return transform;
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    _get_transform(raw_transform) {
      var modifiers, transform;
      if ((type_of(raw_transform)) === 'modified_transform') {
        modifiers = raw_transform.modifiers;
        transform = this._get_transform_2(raw_transform.transform, modifiers);
      } else {
        modifiers = {};
        transform = this._get_transform_2(raw_transform, modifiers);
      }
      //.......................................................................................................
      return {modifiers, ...transform};
    }

    //---------------------------------------------------------------------------------------------------------
    _get_transform_2(raw_transform, modifiers) {
      var arity, is_repeatable, is_sender, is_source, transform, type;
      is_source = false;
      is_sender = true;
      is_repeatable = true;
      switch (type = type_of(raw_transform)) {
        case 'function':
          switch ((arity = raw_transform.length)) {
            case 1:
              is_sender = modifiers.once_after_last === true;
              transform = raw_transform;
              break;
            case 2:
              if (modifiers.once_before_first || modifiers.once_after_last) {
                throw new Error("^moonriver@6^ transform with arity 2 not implemented for modifiers " + "once_before_first, once_after_last");
              }
              transform = raw_transform;
              break;
            default:
              throw new Error(`^moonriver@7^ transform with arity ${arity} not implemented`);
          }
          break;
        case 'generatorfunction':
          is_source = true;
          transform = this._source_from_generatorfunction(raw_transform);
          if ((arity = transform.length) !== 2) {
            throw new Error(`^moonriver@8^ expected function with arity 2 got one with arity ${arity}`);
          }
          break;
        case 'list':
          is_source = true;
          transform = this._source_from_list(raw_transform);
          break;
        default:
          if ((type === 'generator') || (isa.function(raw_transform[Symbol.iterator]))) {
            is_repeatable = false;
            is_source = true;
            transform = this._source_from_generator(raw_transform);
            if ((arity = transform.length) !== 2) {
              throw new Error(`^moonriver@9^ expected function with arity 2 got one with arity ${arity}`);
            }
          } else {
            throw new Error(`^moonriver@10^ cannot convert a ${type} to a source`);
          }
      }
      transform = transform.bind(this);
      return {is_sender, is_source, is_repeatable, transform};
    }

    //---------------------------------------------------------------------------------------------------------
    _source_from_generatorfunction(generatorfunction) {
      var generator, genfΔ;
      generator = null;
      return genfΔ = function(d, send) {
        var done, value;
        if (generator == null) {
          generator = generatorfunction();
        }
        if (d !== symbol.drop) {
          send(d);
        }
        ({value, done} = generator.next());
        if (!done) {
          /* NOTE silently discards value of `return` where present in keeping with JS `for of` loops */
          return send(value);
        }
        generator = null;
        send.over();
        return null;
      };
    }

    //---------------------------------------------------------------------------------------------------------
    _source_from_generator(generator) {
      var genΔ;
      return genΔ = function(d, send) {
        var done, value;
        if (d !== symbol.drop) {
          send(d);
        }
        ({value, done} = generator.next());
        if (!done) {
          /* NOTE silently discards value of `return` where present in keeping with JS `for of` loops */
          return send(value);
        }
        send.over();
        return null;
      };
    }

    //---------------------------------------------------------------------------------------------------------
    _source_from_list(list) {
      var idx, last_idx, listΔ;
      last_idx = list.length - 1;
      idx = -1;
      return listΔ = function(d, send) {
        if (d !== symbol.drop) {
          send(d);
        }
        idx++;
        if (idx > last_idx) {
          idx = -1;
          return send.over();
        }
        send(list[idx]);
        return null;
      };
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    _name_of_transform() {
      if (this.transform == null) {
        return '???';
      }
      if (this.transform.name == null) {
        return '(anon)';
      }
      return this.transform.name.replace(/^bound /, '');
    }

    //---------------------------------------------------------------------------------------------------------
    [UTIL.inspect.custom]() {
      return this.toString();
    }

    toString() {
      var parts;
      parts = [];
      parts.push((rpr(this.input)) + ' ➡︎ ');
      parts.push(this._name_of_transform() + ' ➡︎ ' + (rpr(this.output)));
      return parts.join(' ');
    }

  };

  Modified_transform = (function() {
    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Modified_transform {
      //---------------------------------------------------------------------------------------------------------
      constructor(...modifiers) {
        var base, base1, defaults, key, ref, transform;
        ref = modifiers, [...modifiers] = ref, [transform] = splice.call(modifiers, -1);
        defaults = {
          is_source: false,
          once_before_first: false,
          once_after_last: false,
          first: symbol.misfit,
          last: symbol.misfit
        };
        this.modifiers = {...defaults, ...(Object.assign({}, ...modifiers))};
        validate.mrv_modifiers(this.modifiers);
        for (key in this.modifiers) {
          if (this.constructor.C.known_modifications.has(key)) {
            continue;
          }
          throw new Error(`^moonriver@11^ unknown modifiers key ${rpr(key)}`);
        }
        if (this.modifiers.first === symbol.misfit) {
          this.modifiers.first = false;
        } else {
          ((base = this.modifiers).values != null ? base.values : base.values = {}).first = this.modifiers.first;
          this.modifiers.first = true;
        }
        if (this.modifiers.last === symbol.misfit) {
          this.modifiers.last = false;
        } else {
          ((base1 = this.modifiers).values != null ? base1.values : base1.values = {}).last = this.modifiers.last;
          this.modifiers.last = true;
        }
        this.transform = transform;
        return void 0;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Modified_transform.C = GUY.lft.freeze({
      known_modifications: new Set(['is_source', 'first', 'last', 'once_after_last', 'once_before_first'])
    });

    return Modified_transform;

  }).call(this);

  Moonriver = (function() {
    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Moonriver {
      //---------------------------------------------------------------------------------------------------------
      static $(...modifiers) {
        var ref, transform;
        ref = modifiers, [...modifiers] = ref, [transform] = splice.call(modifiers, -1);
        return new Modified_transform(...modifiers, transform);
      }

      //---------------------------------------------------------------------------------------------------------
      constructor(cfg) {
        //---------------------------------------------------------------------------------------------------------
        this.on_change = this.on_change.bind(this);
        this.types = types;
        cfg = {...this.constructor.C.defaults.constructor, ...cfg};
        this.types.validate.mirage_cfg(cfg);
        this.protocol = pluck(cfg, 'protocol', null);
        this.cfg = GUY.lft.freeze(cfg);
        this.data_count = 0;
        this.segments = [];
        this.turns = 0;
        this.inputs = [];
        this.sources = [];
        this.on_first = [];
        this.on_last = [];
        /* TAINT not a good name for a collection of segments */
        this.on_once_before_first = [];
        this.on_once_after_last = [];
        this.user = {};
        /* user area for sharing state between transforms, etc */        add_length_prop(this, 'segments');
        // @push transform for transform from transforms if transforms?
        //.......................................................................................................
        GUY.props.def(this, 'sources_are_repeatable', {
          get: () => {
            return this.sources.every(function(x) {
              return x.is_repeatable;
            });
          }
        });
        GUY.props.def(this, 'can_repeat', {
          get: () => {
            return this.turns === 0 || this.is_repeatable;
          }
        });
        GUY.props.def(this, 'first_segment', {
          get: () => {
            return this.segments[0];
          }
        });
        GUY.props.def(this, 'last_segment', {
          get: () => {
            return this.segments[this.segments.length - 1];
          }
        });
        //.......................................................................................................
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      push(transform) {
        var alast, bfirst, last_segment, segment;
        segment = new Segment(this, transform, this.segments.length, this.protocol);
        //.......................................................................................................
        if (segment.modifiers.once_before_first || segment.modifiers.once_after_last) {
          if (segment.modifiers.once_before_first) {
            this.push(bfirst = function(d, send) {
              return send(d);
            });
            this.on_once_before_first.push(segment);
          } else {
            this.push(alast = function(d, send) {
              return send(d);
            });
            this.on_once_after_last.push(segment);
          }
          segment.set_output(this.last_segment.input);
        } else {
          //.......................................................................................................
          if ((last_segment = this.last_segment) != null) {
            segment.set_input(last_segment.output);
            last_segment.output.set_oblivious(false);
          } else {
            segment.set_input(new Duct({
              on_change: this.on_change
            }));
          }
          segment.set_output(new Duct({
            on_change: this.on_change,
            is_oblivious: true
          }));
          this.segments.push(segment);
        }
        if (segment.is_source) {
          //.......................................................................................................
          this.sources.push(segment);
        }
        if (segment.modifiers.last) {
          this.on_last.push(segment);
        }
        if (segment.modifiers.first) {
          this.on_first.push(segment);
        }
        return segment;
      }

      on_change(delta) {
        this.data_count += delta;
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * [Symbol.iterator]() {
        var i, len, ref, segment;
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          yield segment;
        }
        return null;
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      drive(cfg) {
        var R, collection, i, j, l, len, len1, len2, len3, len4, m, n, ref, ref1, ref2, ref3, segment;
        if (!this.sources_are_repeatable) {
          throw new Error("^moonriver@12^ pipeline is not repeatable");
        }
        this.turns++;
        cfg = {...this.constructor.C.defaults.drive_cfg, ...cfg};
        this.types.validate.drive_cfg(cfg);
        if (!cfg.resume) {
          ref = [this.segments, this.on_once_before_first, this.on_once_after_last];
          for (i = 0, len = ref.length; i < len; i++) {
            collection = ref[i];
            for (j = 0, len1 = collection.length; j < len1; j++) {
              segment = collection[j];
              segment.set_call_count(0);
              segment.set_is_over(false);
            }
          }
        }
        ref1 = this.on_once_before_first;
        //.......................................................................................................
        for (l = 0, len2 = ref1.length; l < len2; l++) {
          segment = ref1[l];
          segment.call(symbol.drop);
          R = this._drive(cfg);
        }
        //.......................................................................................................
        R = this._drive(cfg);
        ref2 = this.on_last;
        //.......................................................................................................
        for (m = 0, len3 = ref2.length; m < len3; m++) {
          segment = ref2[m];
          // continue if segment.is_over ### (???) ###
          segment.call(segment.modifiers.values.last);
          R = this._drive(cfg);
        }
        ref3 = this.on_once_after_last;
        //.......................................................................................................
        for (n = 0, len4 = ref3.length; n < len4; n++) {
          segment = ref3[n];
          segment.call(symbol.drop);
          R = this._drive(cfg);
        }
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _drive(cfg) {
        var do_exit, first_idx, i, idx, last_idx, ref, ref1, ref2, segment;
        first_idx = cfg.first_idx;
        last_idx = cfg.last_idx;
        last_idx = last_idx >= 0 ? last_idx : this.segments.length + last_idx;
        do_exit = false;
        if (this.segments.length === 0) {
          /* TAINT check for last_idx >= first_idx, last_idx < segments.length and so on */
          return null;
        }
        while (true) {
//.......................................................................................................
          for (idx = i = ref = first_idx, ref1 = last_idx; (ref <= ref1 ? i <= ref1 : i >= ref1); idx = ref <= ref1 ? ++i : --i) {
            segment = this.segments[idx];
            // debug '^443^', ( @toString idx ), segment.modifiers?.once_after_last, segment.modifiers?.once_before_first
            //...................................................................................................
            // if ( segment.is_over or not segment.is_listener )
            if (segment.is_over) {
              /* If current segment has signalled it's gone out of business for this lap or is not a listener
                       in the first place, route all data on its input queue to its output queue: */
              /* TAINT rewrite to single step operation using Array::splice() */
              /* TAINT taking non-listeners out of the pipeline would speed this up but also somehwat
                       complicate the construction */
              /* TAINT code duplication */
              segment._transfer();
              continue;
            }
            //...................................................................................................
            if (((ref2 = segment.modifiers.first) != null ? ref2 : false) && (segment.call_count === 0)) {
              segment.call(segment.modifiers.values.first);
            }
            //...................................................................................................
            if (segment.is_source) {
              /* If current segment is a source, trigger the transform with a discardable `drop` value: */
              if (segment._has_input_data) {
                /* TAINT code duplication */
                segment._transfer();
              }
              segment.call(symbol.drop);
            } else {
              /* Otherwise, call transform with next value from input queue, if any; when in operational mode
                       `breadth`, repeat until input queue is empty: */
              //...................................................................................................
              while (segment.input.length > 0) {
                segment.call(segment.input.shift());
                if (cfg.mode === 'depth') {
                  break;
                }
              }
            }
            //...................................................................................................
            /* Stop processing if the `exit` signal has been received: */
            if (segment.exit) {
              do_exit = true;
              break;
            }
          }
          if (do_exit) {
            break;
          }
          if ((this.data_count === 0) && (this.sources.every(function(source) {
            return source.is_over;
          }))) {
            //.....................................................................................................
            /* When all sources have called it quits and no more input queues have data, end processing: */
            /* TAINT collect stats in above loop */
            break;
          }
        }
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      send(d) {
        if (d !== symbol.drop) {
          this.segments[0].input.push(d);
        }
        return this._drive(this.constructor.C.defaults.drive_cfg);
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      [UTIL.inspect.custom]() {
        return this.toString();
      }

      //---------------------------------------------------------------------------------------------------------
      toString(current_idx) {
        var i, idx, joiner, len, parts, prv_output, ref, segment;
        parts = [];
        joiner = CND.grey(' ▶︎ ');
        prv_output = null;
        ref = this.segments;
        for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
          segment = ref[idx];
          if (segment.input !== prv_output) {
            parts.push(CND.green(rpr(segment.input)));
          }
          parts.push(idx === current_idx ? CND.reverse(CND.gold(segment._name_of_transform())) : CND.gold(segment._name_of_transform()));
          parts.push(CND.green(rpr(segment.output)));
          prv_output = segment.output;
        }
        return parts.join(joiner);
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Moonriver.C = GUY.lft.freeze({
      defaults: {
        constructor: {
          protocol: null
        },
        drive_cfg: {
          mode: 'breadth',
          first_idx: 0,
          last_idx: -1,
          resume: false
        }
      }
    });

    return Moonriver;

  }).call(this);

  // return parts.join ' — '

  //###########################################################################################################
  module.exports = {Moonriver, Segment, Duct};

}).call(this);

//# sourceMappingURL=main.js.map
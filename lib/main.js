(function() {
  'use strict';
  var CND, Duct, GUY, Modified_transform, Moonriver, Segment, UTIL, add_length_prop, badge, debug, echo, help, info, isa, misfit, pluck, rpr, symbol, type_of, types, urge, validate, warn, whisper,
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

  ({isa, type_of, validate} = types);

  // { Moonriver }             = require '../../../apps/moonriver'
  UTIL = require('util');

  misfit = Symbol('misfit');

  //-----------------------------------------------------------------------------------------------------------
  symbol = GUY.lft.freeze({
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
  pluck = function(o, k, fallback = void 0) {
    var R;
    R = o[k];
    delete o[k];
    if (R === void 0) {
      return fallback;
    } else {
      return R;
    }
  };

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
          throw new Error("^XXX@1^ cannot set to oblivious unless duct is empty");
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
      pop(fallback = misfit) {
        var R;
        if (this.d.length === 0) {
          if (fallback !== misfit) {
            return fallback;
          }
          throw new Error("^XXX@1^ cannot pop() from empty list");
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
      shift(fallback = misfit) {
        var R;
        if (this.d.length === 0) {
          if (fallback !== misfit) {
            return fallback;
          }
          throw new Error("^XXX@1^ cannot shift() from empty list");
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
      misfit: misfit,
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
    constructor(raw_transform, idx) {
      // constructor: ( modifiers..., raw_transform ) ->
      //   throw new Error "^segment@1^ modifiers not implemented" if modifiers.length > 0
      this.idx = idx;
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
    _transfer() {
      while (this.input.length > 0) {
        this.output.push(this.input.shift());
      }
      return null;
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    _transform_from_raw_transform(raw_transform) {
      var is_repeatable, is_sender, is_source, modifiers, transform;
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
        if (this.modifiers.once_after_last) {
          this.call = (d) => {
            this.send.call_count++;
            if ((this.send.call_count === 1) && this.modifiers.do_first) {
              this.transform(this.modifiers.first, this.send);
            }
            this.transform(this.send);
            return null;
          };
        } else {
          this.call = (d) => {
            this.send.call_count++;
            if ((this.send.call_count === 1) && this.modifiers.do_first) {
              this.transform(this.modifiers.first, this.send);
            }
            this.transform(d, this.send);
            return null;
          };
        }
      } else {
        //...................................................................................................
        this.call = (d) => {
          this.send.call_count++;
          if ((this.send.call_count === 1) && this.modifiers.do_first) {
            this.transform(this.modifiers.first);
          }
          this.transform(d);
          this.send(d);
          return null;
        };
      }
      //...................................................................................................
      this.send = (d) => {
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
              throw new Error("^moonriver@1^ cannot send values after pipeline has terminated; " + `error occurred in segment idx ${this.idx} (${rpr(this._name_of_transform())})`);
            }
            this.output.push(d);
        }
        return null;
      };
      //...................................................................................................
      this.send.symbol = symbol;
      this.send.over = () => {
        return this.send(symbol.over);
      };
      this.send.exit = () => {
        return this.send(symbol.exit);
      };
      this.send.call_count = 0;
      // GUY.props.hide segment, 'send', send
      // GUY.props.hide segment, 'call', call
      // @pipeline.push        segment
      // @on_once_before.push  segment if modifiers.do_once_before
      // @on_once_after.push   segment if modifiers.do_once_after
      // @on_last.push         segment if modifiers.do_last
      // @sources.push         segment if is_source
      // @inputs.push    input
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
            case 0:
              throw new Error("^moonriver@2^ zero-arity transform not implemented");
            case 1:
              is_sender = modifiers.once_after_last === true;
              transform = raw_transform;
              break;
            case 2:
              transform = raw_transform;
              break;
            default:
              throw new Error(`^moonriver@3^ expected function with arity 2 got one with arity ${arity}`);
          }
          break;
        case 'generatorfunction':
          is_source = true;
          transform = this._source_from_generatorfunction(raw_transform);
          if ((arity = transform.length) !== 2) {
            throw new Error(`^moonriver@4^ expected function with arity 2 got one with arity ${arity}`);
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
              throw new Error(`^moonriver@5^ expected function with arity 2 got one with arity ${arity}`);
            }
          } else {
            throw new Error(`^moonriver@6^ cannot convert a ${type} to a source`);
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
        var key, ref, transform;
        ref = modifiers, [...modifiers] = ref, [transform] = splice.call(modifiers, -1);
        this.modifiers = Object.assign({}, ...modifiers);
        for (key in this.modifiers) {
          if (this.constructor.C.known_modifications.has(key)) {
            continue;
          }
          throw new Error(`^moonriver@7^ unknown modifiers key ${rpr(key)}`);
        }
        if (modifiers.once_after_last != null) {
          // @modifiers.do_once_before = true if @modifiers.once_before  isnt undefined
          // @modifiers.do_first       = true if @modifiers.first        isnt undefined
          // @modifiers.do_last        = true if @modifiers.last         isnt undefined
          // @modifiers.do_once_after  = true if @modifiers.once_after   isnt undefined
          this.modifiers.once_after_last = modifiers.once_after_last;
        }
        if (modifiers.is_source != null) {
          this.modifiers.is_source = modifiers.is_source;
        }
        this.transform = transform;
        return void 0;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Modified_transform.C = GUY.lft.freeze({
      // known_modifications: new Set [ 'once_before', 'first', 'last', 'once_after', ]
      known_modifications: new Set(['is_source', 'once_after_last'])
    });

    return Modified_transform;

  }).call(this);

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  Moonriver = class Moonriver {
    //---------------------------------------------------------------------------------------------------------
    static $(...modifiers) {
      var ref, transform;
      ref = modifiers, [...modifiers] = ref, [transform] = splice.call(modifiers, -1);
      return new Modified_transform(...modifiers, transform);
    }

    //---------------------------------------------------------------------------------------------------------
    constructor(transforms = null) {
      var transform;
      //---------------------------------------------------------------------------------------------------------
      this.on_change = this.on_change.bind(this);
      this.XXX_count = 0;
      this.data_count = 0;
      this.segments = [];
      this.turns = 0;
      this.inputs = [];
      this.sources = [];
      // @on_last        = []
      // @on_once_before = []
      /* TAINT not a good name for a collection of segments */
      this.on_once_after_last = [];
      this.user = {};
      /* user area for sharing state between transforms, etc */      add_length_prop(this, 'segments');
      if (transforms != null) {
        for (transform of transforms) {
          this.push(transform);
        }
      }
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
      var last_segment, moal_helper, segment;
      segment = new Segment(transform, this.segments.length);
      if (segment.modifiers.once_after_last === true) {
        this.push(moal_helper = function(d, send) {
          return send(d);
        });
        this.on_once_after_last.push(segment);
        // segment.set_input new Duct { on_change: @on_change, }
        segment.set_output(this.last_segment.input);
      } else {
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
        this.sources.push(segment);
      }
      return null;
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
    _on_drive_start() {
      if (!this.sources_are_repeatable) {
        return false;
      }
      this.turns++;
      return true;
    }

    //---------------------------------------------------------------------------------------------------------
    drive(cfg) {
      var R, i, len, ref, segment;
      if (!this._on_drive_start()) {
        throw new Error("^moonriver@8^ pipeline is not repeatable");
      }
      R = this._drive(cfg);
      ref = this.on_once_after_last;
      for (i = 0, len = ref.length; i < len; i++) {
        segment = ref[i];
        segment.call(symbol.drop);
        // @_drive { continue: true, first_idx: segment.idx, }
        this._drive({
          continue: true
        });
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _drive(cfg) {
      /* TAINT validate `cfg` */
      var defaults, do_exit, first_idx, i, idx, j, l, last_idx, len, len1, ref, ref1, ref2, ref3, segment;
      defaults = {
        mode: 'breadth',
        continue: false,
        first_idx: 0,
        last_idx: -1
      };
      cfg = {...defaults, ...cfg};
      first_idx = cfg.first_idx;
      last_idx = cfg.last_idx;
      last_idx = last_idx >= 0 ? last_idx : this.segments.length + last_idx;
      if (this.segments.length === 0) {
        /* TAINT check for last_idx >= first_idx, last_idx < segments.length and so on */
        return null;
      }
      if (!cfg.continue) {
        ref = this.segments;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment.set_is_over(false);
        }
        ref1 = this.on_once_after_last;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          segment = ref1[j];
          segment.set_is_over(false);
        }
      }
      do_exit = false;
      while (true) {
//.......................................................................................................
/*
for segment in @on_once_before
  segment.call segment.modifiers.once_before
*/
//.......................................................................................................
        for (idx = l = ref2 = first_idx, ref3 = last_idx; (ref2 <= ref3 ? l <= ref3 : l >= ref3); idx = ref2 <= ref3 ? ++l : --l) {
          segment = this.segments[idx];
          // debug '^443^', ( @toString idx ), { XXX_count: @XXX_count, idx, data_count: @data_count, }, segment
          this.XXX_count++;
          if (this.XXX_count > 500) {
            process.exit(111);
          }
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
        //.....................................................................................................
        /* When all sources have called it quits and no more input queues have data, end processing: */
        /* TAINT collect stats in above loop */
        if (this.sources.every(function(source) {
          return source.is_over;
        })) {
          if (this.data_count === 0) {
            // unless @inputs.some ( input ) -> input.length > 0
            // debug '^453453^', "recognized pipeline exhausted"
            // debug '^453453^', @segments[ 2 ].send Symbol.for 'before_last'
            // continue
            break;
          }
        }
      }
      // #.......................................................................................................
      // ### Call all transforms that have the `last` modifier, then all transforms with the `once_after`
      // modifier, skipping those that have signalled `over` or `exit`: ###
      // ### TAINT make `last` and `once_after` mutually exclusive ###
      // for segment in @on_last
      //   continue if segment.is_over or segment.exit
      //   segment.is_over = true
      //   segment.call segment.modifiers.last, false
      // #.......................................................................................................
      // for segment in @on_once_after
      //   continue if segment.is_over or segment.exit
      //   segment.is_over = true
      //   segment.call segment.modifiers.once_after, false
      //.......................................................................................................
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    send(d) {
      if (d !== symbol.drop) {
        this.segments[0].input.push(d);
      }
      return this._drive({
        continue: true
      });
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

  // return parts.join ' — '

  //###########################################################################################################
  module.exports = {Moonriver, Segment, Duct};

}).call(this);

//# sourceMappingURL=main.js.map
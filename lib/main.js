(function() {
  'use strict';
  var CND, GUY, Modifications, badge, debug, echo, help, info, isa, rpr, symbol, type_of, types, urge, validate, warn, whisper,
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

  symbol = GUY.lft.freeze({
    misfit: Symbol.for('misfit'), // this value indicates absence of a value so can use `null`, `undefined`
    drop: Symbol.for('drop'), // this value will not go to output
    exit: Symbol.for('exit'), // exit pipeline processing
    // done:       Symbol.for 'done' # done for this iteration
    over: Symbol.for('over') // do not call again in this round
  });

  Modifications = (function() {
    
      //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Modifications {
      //---------------------------------------------------------------------------------------------------------
      constructor(...modifications) {
        var ref, transform;
        ref = modifications, [...modifications] = ref, [transform] = splice.call(modifications, -1);
        this.modifications = {...this.constructor.C.defaults.modifications, ...modifications};
        this.modifications.do_once_before = this.modifications.once_before !== symbol.misfit;
        this.modifications.do_first = this.modifications.first !== symbol.misfit;
        this.modifications.do_last = this.modifications.last !== symbol.misfit;
        this.modifications.do_once_after = this.modifications.once_after !== symbol.misfit;
        this.transform = transform;
        return void 0;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Modifications.C = GUY.lft.freeze({
      defaults: {
        modifications: {
          once_before: symbol.misfit,
          first: symbol.misfit,
          last: symbol.misfit,
          once_after: symbol.misfit
        }
      }
    });

    return Modifications;

  }).call(this);

  // #===========================================================================================================
  // #
  // #-----------------------------------------------------------------------------------------------------------
  // class @Classmethods

  //   # #---------------------------------------------------------------------------------------------------------
  //   # @$once = ( f ) ->

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Moonriver = (function() { // extends @Classmethods
    class Moonriver {
      
        //---------------------------------------------------------------------------------------------------------
      static $(...modifications) {
        var ref, transform;
        ref = modifications, [...modifications] = ref, [transform] = splice.call(modifications, -1);
        return new Modifications(...modifications, transform);
      }

      //---------------------------------------------------------------------------------------------------------
      constructor(raw_pipeline) {
        var i, idx, is_sender, is_source, last_idx, len, modifications, raw_transform, transform;
        // super()
        this.first_input = [];
        this.last_output = [];
        this.pipeline = [];
        last_idx = raw_pipeline.length - 1;
        this.inputs = [];
        this.sources = [];
        this.on_last = [];
        this.on_once_before = [];
        this.on_once_after = [];
        this.user = {};
        this./* user area for sharing state between transforms, etc */run_count = 0;
        this.is_repeatable = true;
        for (idx = i = 0, len = raw_pipeline.length; i < len; idx = ++i) {
          raw_transform = raw_pipeline[idx];
          ({is_sender, is_source, modifications, transform} = this._get_transform(raw_transform));
          ((is_sender, is_source, modifications, transform, idx) => {
            var arity, call, input, is_listener, output, segment, send;
            arity = transform.length;
            input = idx === 0 ? this.first_input : this.pipeline[idx - 1].output;
            output = idx === last_idx ? this.last_output : [];
            is_listener = !(modifications.do_once_before || modifications.do_once_after);
            segment = {
              modifications,
              transform,
              arity,
              input,
              output,
              over: false,
              exit: false,
              is_sender,
              is_source
            };
            //...................................................................................................
            if (is_sender) {
              if (modifications.do_once_after) {
                throw new Error("^moonriver@1^ transforms with modifier once_after cannot be senders");
              }
              call = function(d) {
                this.send.call_count++;
                if ((this.send.call_count === 1) && this.modifications.do_first) {
                  this.transform(this.modifications.first, this.send);
                }
                this.transform(d, this.send);
                return null;
              };
            } else {
              //...................................................................................................
              call = function(d) {
                this.send.call_count++;
                if ((this.send.call_count === 1) && this.modifications.do_first) {
                  this.transform(this.modifications.first);
                }
                this.transform(d);
                if ((!this.modifications.do_once_before) && (!this.modifications.do_once_after)) {
                  this.send(d);
                }
                return null;
              };
            }
            //...................................................................................................
            call = call.bind(segment);
            send = function(d) {
              switch (d) {
                case symbol.drop:
                  null;
                  break;
                case symbol.over:
                  this.over = true;
                  break;
                case symbol.exit:
                  this.exit = true;
                  break;
                default:
                  if (this.over) {
                    throw new Error("^moonriver@2^ cannot send values after pipeline has terminated");
                  }
                  this.output.push(d);
              }
              return null;
            };
            send = send.bind(segment);
            send.symbol = symbol;
            send.over = function() {
              return send(send.symbol.over);
            };
            send.exit = function() {
              return send(send.symbol.exit);
            };
            send.call_count = 0;
            GUY.props.hide(segment, 'send', send);
            GUY.props.hide(segment, 'call', call);
            this.pipeline.push(segment);
            if (modifications.do_once_before) {
              this.on_once_before.push(segment);
            }
            if (modifications.do_once_after) {
              this.on_once_after.push(segment);
            }
            if (modifications.do_last) {
              this.on_last.push(segment);
            }
            if (is_source) {
              this.sources.push(segment);
            }
            return this.inputs.push(input);
          })(is_sender, is_source, modifications, transform, idx);
        }
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_transform(raw_transform) {
        var modifications, transform;
        if ((type_of(raw_transform)) === 'modifications') {
          modifications = raw_transform.modifications;
          transform = this._get_transform_2(raw_transform.transform);
        } else {
          modifications = (new Modifications(function() {})).modifications;
          transform = this._get_transform_2(raw_transform);
        }
        //.......................................................................................................
        return {modifications, ...transform};
      }

      //---------------------------------------------------------------------------------------------------------
      _get_transform_2(raw_transform) {
        var arity, is_sender, is_source, transform, type;
        is_source = false;
        is_sender = true;
        switch (type = type_of(raw_transform)) {
          case 'function':
            switch ((arity = raw_transform.length)) {
              case 0:
                throw new Error("^moonriver@3^ zero-arity transform not implemented");
              case 1:
                is_sender = false;
                transform = raw_transform;
                break;
              case 2:
                transform = raw_transform;
                break;
              default:
                throw new Error(`^moonriver@4^ expected function with arity 2 got one with arity ${arity}`);
            }
            break;
          case 'generatorfunction':
            is_source = true;
            transform = this._source_from_generatorfunction(raw_transform);
            if ((arity = transform.length) !== 2) {
              throw new Error(`^moonriver@5^ expected function with arity 2 got one with arity ${arity}`);
            }
            break;
          case 'list':
            is_source = true;
            transform = this._source_from_list(raw_transform);
            break;
          default:
            if ((type === 'generator') || (isa.function(raw_transform[Symbol.iterator]))) {
              this.is_repeatable = false;
              is_source = true;
              transform = this._source_from_generator(raw_transform);
              if ((arity = transform.length) !== 2) {
                throw new Error(`^moonriver@6^ expected function with arity 2 got one with arity ${arity}`);
              }
            } else {
              throw new Error(`^moonriver@7^ cannot convert a ${type} to a source`);
            }
        }
        transform = transform.bind(this);
        return {is_sender, is_source, transform};
      }

      //---------------------------------------------------------------------------------------------------------
      _source_from_generatorfunction(generatorfunction) {
        var generator, generatorfunction_source;
        generator = null;
        return generatorfunction_source = function(d, send) {
          var done, value;
          if (generator == null) {
            generator = generatorfunction();
          }
          send(d);
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
        var generator_source;
        return generator_source = function(d, send) {
          var done, value;
          send(d);
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
        var idx, last_idx, list_source;
        last_idx = list.length - 1;
        idx = -1;
        return list_source = function(d, send) {
          send(d);
          idx++;
          if (idx > last_idx) {
            idx = -1;
            return send.over();
          }
          send(list[idx]);
          return null;
        };
      }

      //---------------------------------------------------------------------------------------------------------
      can_repeat() {
        return this.run_count === 0 || this.repeatable;
      }

      //---------------------------------------------------------------------------------------------------------
      _on_drive_start() {
        if (!this.can_repeat()) {
          return false;
        }
        this.run_count++;
        return true;
      }

      //---------------------------------------------------------------------------------------------------------
      drive(cfg) {
        var defaults, do_exit, i, j, k, l, len, len1, len2, len3, len4, m, mode, ref, ref1, ref2, ref3, ref4, segment;
        if (!this._on_drive_start()) {
          /* TAINT validate `cfg` */
          throw new Error("^moonriver@8^ pipeline is not repeatable");
        }
        defaults = {
          mode: 'depth'
        };
        ({mode} = {...defaults, ...cfg});
        ref = this.pipeline;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment.over = false;
        }
        do_exit = false;
        ref1 = this.on_once_before;
        //.......................................................................................................
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          segment = ref1[j];
          segment.call(segment.modifications.once_before);
        }
        while (true) {
          ref2 = this.pipeline;
          //.......................................................................................................
          for (k = 0, len2 = ref2.length; k < len2; k++) {
            segment = ref2[k];
            //...................................................................................................
            if (segment.over) {
              while (segment.input.length > 0) {
                /* If current segment has signalled it's gone out of business for this lap, route all data on its
                         input queue to its output queue: */
                /* TAINT rewrite to single step operation using Array::splice() */
                segment.output.push(segment.input.shift());
              }
              continue;
            }
            //...................................................................................................
            if (segment.is_source && segment.input.length === 0) {
              /* If current segment is a source and no inputs are waiting to be sent, trigger the transform by
                       calling  with a discardable `drop` value: */
              segment.call(symbol.drop);
            } else {
              /* Otherwise, call transform with next value from input queue, if any; when in operational mode
                       `breadth`, repeat until input queue is empty: */
              //...................................................................................................
              while (segment.input.length > 0) {
                segment.call(segment.input.shift());
                if (mode === 'depth') {
                  break;
                }
              }
            }
            if (this.last_output.length !== 0) {
              //...................................................................................................
              /* Discard any data that has made it to the final output queue of the pipeline: */
              this.last_output.length = 0;
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
            return source.over;
          })) {
            if (!this.inputs.some(function(input) {
              return input.length > 0;
            })) {
              break;
            }
          }
        }
        ref3 = this.on_last;
        //.......................................................................................................
        /* Call all transforms that have the `last` modifier, then all transforms with the `once_after`
           modifier, skipping those that have signalled `over` or `exit`: */
        /* TAINT make `last` and `once_after` mutually exclusive */
        for (l = 0, len3 = ref3.length; l < len3; l++) {
          segment = ref3[l];
          if (segment.over || segment.exit) {
            continue;
          }
          segment.over = true;
          segment.call(segment.modifications.last);
        }
        ref4 = this.on_once_after;
        //.......................................................................................................
        for (m = 0, len4 = ref4.length; m < len4; m++) {
          segment = ref4[m];
          if (segment.over || segment.exit) {
            continue;
          }
          segment.over = true;
          segment.call(segment.modifications.once_after);
        }
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _show_pipeline() {
        var i, len, ref, ref1, segment;
        urge(this.inputs[0]);
        ref = this.pipeline;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          urge((ref1 = segment.transform.name) != null ? ref1 : '?', segment.output);
        }
        return null;
      }

    };

    //---------------------------------------------------------------------------------------------------------
    Moonriver.C = GUY.lft.freeze({
      symbol: symbol
    });

    return Moonriver;

  }).call(this);

}).call(this);

//# sourceMappingURL=main.js.map
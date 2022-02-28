(function() {
  'use strict';
  var CND, GUY, Steampipe, badge, debug, demo, echo, help, info, isa, rpr, type_of, types, urge, validate, warn, whisper;

  //###########################################################################################################
  CND = require('cnd');

  rpr = CND.rpr;

  badge = 'MINIMAL';

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

  //-----------------------------------------------------------------------------------------------------------
  demo = function() {
    var $addsome, $embellish, $generator, $show, $source_A, $source_B, drive, pipeline, trace;
    //.........................................................................................................
    $source_A = function(a_list) {
      var source;
      return source = function(d, send) {
        var e, i, len;
        send(d);
        for (i = 0, len = a_list.length; i < len; i++) {
          e = a_list[i];
          if (trace) {
            help('^source A^', e);
          }
          send(e);
        }
        send.over();
        return null;
      };
    };
    //.........................................................................................................
    $source_B = function(a_list) {
      var idx, last_idx, source;
      last_idx = a_list.length - 1;
      idx = -1;
      return source = function(d, send) {
        send(d);
        idx++;
        if (idx > last_idx) {
          idx = -1;
          return send.over();
        }
        if (trace) {
          help('^source B^', a_list[idx]);
        }
        send(a_list[idx]);
        return null;
      };
    };
    //.........................................................................................................
    $addsome = function() {
      var addsome;
      return addsome = function(d, send) {
        if (trace) {
          help('^addsome^', d);
        }
        if (!isa.float(d)) {
          return send((rpr(d)) + ' * 100 + 1');
        }
        send(d * 100 + 1);
        return null;
      };
    };
    //.........................................................................................................
    $embellish = function() {
      var embellish;
      return embellish = function(d, send) {
        if (trace) {
          help('^embellish^', d);
        }
        send(`*${rpr(d)}*`);
        return null;
      };
    };
    //.........................................................................................................
    $show = function() {
      var show;
      return show = function(d, send) {
        if (trace) {
          help('^show^', d);
        }
        info(d);
        send(d);
        return null;
      };
    };
    //.........................................................................................................
    $generator = function() {
      return function*() {
        yield 22;
        yield 33;
        return null;
      };
    };
    //.........................................................................................................
    pipeline = [];
    // pipeline.push $source_A [ 1, 2, 3, ]
    // pipeline.push $source_B [ 1, 2, ]
    pipeline.push([1, 2]);
    pipeline.push(['A', 'B']);
    pipeline.push(['C', 'D', 'E'].values());
    pipeline.push((new Map([['a', 42]])).entries());
    pipeline.push($generator());
    pipeline.push($addsome());
    pipeline.push($embellish());
    pipeline.push($show());
    trace = false;
    drive = function(mode) {
      var _, i, len, ref, results, sp;
      sp = new Steampipe(pipeline);
      ref = [1, 2];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        _ = ref[i];
        if (!sp.can_repeat()) {
          warn("not repeatable");
          break;
        }
        whisper('————————————————————————————————————————');
        results.push(sp.drive({mode}));
      }
      return results;
    };
    drive('breadth');
    drive('depth');
    return null;
  };

  Steampipe = (function() {
    var symbol;

    //===========================================================================================================

    //-----------------------------------------------------------------------------------------------------------
    class Steampipe {
      
        //---------------------------------------------------------------------------------------------------------
      constructor(raw_pipeline) {
        var i, idx, is_source, last_idx, len, raw_transform, transform;
        this.first_input = [];
        this.last_output = [];
        this.pipeline = [];
        last_idx = raw_pipeline.length - 1;
        this.inputs = [];
        this.sources = [];
        this.run_count = 0;
        this.is_repeatable = true;
        for (idx = i = 0, len = raw_pipeline.length; i < len; idx = ++i) {
          raw_transform = raw_pipeline[idx];
          ({is_source, transform} = this._get_transform(raw_transform));
          ((transform, idx, is_source) => {
            var input, output, segment, send;
            input = idx === 0 ? this.first_input : this.pipeline[idx - 1].output;
            output = idx === last_idx ? this.last_output : [];
            segment = {
              transform,
              input,
              output,
              over: false,
              exit: false,
              is_source
            };
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
            GUY.props.hide(segment, 'send', send);
            this.pipeline.push(segment);
            if (is_source) {
              this.sources.push(segment);
            }
            return this.inputs.push(input);
          })(transform, idx, is_source);
        }
        return void 0;
      }

      //---------------------------------------------------------------------------------------------------------
      _get_transform(raw_transform) {
        var arity, is_source, transform, type;
        is_source = false;
        switch (type = type_of(raw_transform)) {
          case 'function':
            transform = raw_transform;
            if ((arity = transform.length) !== 2) {
              throw new Error(`^steampipes@1^ expected function with arity 2 got one with arity ${arity}`);
            }
            break;
          case 'generatorfunction':
            is_source = true;
            transform = this._source_from_generatorfunction(raw_transform);
            if ((arity = transform.length) !== 2) {
              throw new Error(`^steampipes@2^ expected function with arity 2 got one with arity ${arity}`);
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
                throw new Error(`^steampipes@3^ expected function with arity 2 got one with arity ${arity}`);
              }
            } else {
              throw new Error(`^steampipes@4^ cannot convert a ${type} to a source`);
            }
        }
        return {transform, is_source};
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
        var i, idx, j, len, len1, mode, ref, ref1, segment;
        if (!this._on_drive_start()) {
          throw new Error("^steampipes@5^ pipeline is not repeatable");
        }
        ({mode} = cfg);
        ref = this.pipeline;
        for (i = 0, len = ref.length; i < len; i++) {
          segment = ref[i];
          segment.over = false;
        }
        while (true) {
          ref1 = this.pipeline;
          for (idx = j = 0, len1 = ref1.length; j < len1; idx = ++j) {
            segment = ref1[idx];
            if (segment.over) {
              while (segment.input.length > 0) {
                segment.output.push(segment.input.shift());
              }
              continue;
            }
            if (segment.is_source && segment.input.length === 0) {
              segment.transform(symbol.drop, segment.send);
            } else {
              while (segment.input.length > 0) {
                segment.transform(segment.input.shift(), segment.send);
                if (mode === 'depth') {
                  break;
                }
              }
            }
            this.last_output.length = 0;
            if (segment.exit) {
              throw symbol.exit;
            }
          }
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

    Steampipe.C = symbol = {
      drop: Symbol.for('drop'), // this value will not go to output
      exit: Symbol.for('exit'), // exit pipeline processing
      // done:       Symbol.for 'done' # done for this iteration
      over: Symbol.for('over') // do not call again in this round
    };

    return Steampipe;

  }).call(this);

  //###########################################################################################################
  if (module === require.main) {
    (() => {
      return demo();
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map
(function() {
  'use strict';
  var CND, GUY, badge, debug, echo, help, info, isa, rpr, type_of, types, urge, validate, warn, whisper;

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

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Classmethods = class Classmethods {};

  // #---------------------------------------------------------------------------------------------------------
  // @$once = ( f ) ->

  //===========================================================================================================

  //-----------------------------------------------------------------------------------------------------------
  this.Moonriver = (function() {
    var symbol;

    class Moonriver extends this.Classmethods {
      
        //---------------------------------------------------------------------------------------------------------
      constructor(raw_pipeline) {
        var i, idx, is_source, last_idx, len, raw_transform, transform;
        super();
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
            send.count = 0;
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
            switch ((arity = raw_transform.length)) {
              case 0:
                throw new Error("^moonriver@1^ zero-arity transform not implemented");
              case 1:
                throw new Error("^moonriver@1^ observers not implemented");
              case 2:
                transform = raw_transform;
                break;
              default:
                throw new Error(`^moonriver@1^ expected function with arity 2 got one with arity ${arity}`);
            }
            break;
          case 'generatorfunction':
            is_source = true;
            transform = this._source_from_generatorfunction(raw_transform);
            if ((arity = transform.length) !== 2) {
              throw new Error(`^moonriver@2^ expected function with arity 2 got one with arity ${arity}`);
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
                throw new Error(`^moonriver@3^ expected function with arity 2 got one with arity ${arity}`);
              }
            } else {
              throw new Error(`^moonriver@4^ cannot convert a ${type} to a source`);
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
        var defaults, i, idx, j, len, len1, mode, ref, ref1, segment;
        if (!this._on_drive_start()) {
          /* TAINT validate `cfg` */
          throw new Error("^moonriver@5^ pipeline is not repeatable");
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

    //---------------------------------------------------------------------------------------------------------
    Moonriver.C = symbol = {
      drop: Symbol.for('drop'), // this value will not go to output
      exit: Symbol.for('exit'), // exit pipeline processing
      // done:       Symbol.for 'done' # done for this iteration
      over: Symbol.for('over') // do not call again in this round
    };

    return Moonriver;

  }).call(this);

}).call(this);

//# sourceMappingURL=main.js.map
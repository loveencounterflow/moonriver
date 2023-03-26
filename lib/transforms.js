(function() {
  'use strict';
  var GUY, alert, debug, echo, get_transform_types, help, info, inspect, log, misfit, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/TRANSFORMS'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({get_transform_types, misfit} = require('./types'));

  // { Transformer }           = require './transformer'

  //-----------------------------------------------------------------------------------------------------------
  this.$window = function(cfg, transform = null) {
    var Pipeline, R;
    if (!transform) {
      return this._$window(cfg);
    }
    // @types.validate.function f
    ({Pipeline} = require('./main'));
    R = new Pipeline();
    R.push(this._$window(cfg));
    R.push(transform);
    return R;
  };

  //-----------------------------------------------------------------------------------------------------------
  this._$window = function(cfg) {
    var $, advance, buffer, empty, i, idxs, len, max, min, nr, stop, window, zero_idx;
    cfg = get_transform_types().create.transform_window_cfg(cfg);
    ({min, max, empty} = cfg);
    ({$} = require('./main'));
    stop = Symbol('stop');
    buffer = [];
    idxs = (function() {
      var results = [];
      for (var i = min; min <= max ? i <= max : i >= max; min <= max ? i++ : i--){ results.push(i); }
      return results;
    }).apply(this);
    zero_idx = idxs.indexOf(0);
    if (zero_idx < 0) {
      throw new Error(`^transforms.window^ index 0 missing with settings ${rpr({min, max})}`);
    }
    for (i = 0, len = idxs.length; i < len; i++) {
      nr = idxs[i];
      buffer.push(empty);
    }
    advance = function() {
      return buffer.splice(0, 1);
    };
    //.........................................................................................................
    return $({stop}, window = function(d, send) {
      if (d === stop) {
        while (true) {
          advance();
          buffer.push(empty);
          if (buffer[zero_idx] === empty) {
            /* TAINT incorrect condition */
            break;
          }
          send([...buffer]);
        }
        return null;
      }
      advance();
      buffer.push(d);
      if (buffer[zero_idx] !== empty) {
        return send([...buffer]);
      }
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  this.$split_lines = function() {
    var SL, ctx, split_lines;
    SL = require('intertext-splitlines');
    ctx = SL.new_context();
    return split_lines = function(d, send) {
      var line, ref;
      ref = SL.walk_lines(ctx, d);
      for (line of ref) {
        send(line);
      }
      return null;
    };
  };

  //-----------------------------------------------------------------------------------------------------------
  this.$limit = function(n) {
    var count, limit;
    count = 0;
    return limit = function(d, send) {
      if (count >= n) {
        return null;
      }
      count++;
      send(d);
      return null;
    };
  };

  //-----------------------------------------------------------------------------------------------------------
  this.$collect = function(collector = []) {
    var $, collect, stop;
    ({$} = require('./main'));
    stop = Symbol('stop');
    return $({stop}, collect = function(d, send) {
      if (d === stop) {
        return send(collector);
      }
      collector.push(d);
      return null;
    });
  };

  //-----------------------------------------------------------------------------------------------------------
  this.$map = function(f, ...P) {
    return function(d, send) {
      return send(f(...P));
    };
  };

  this.$async_map = function(f, ...P) {
    return async function(d, send) {
      return send((await f(...P)));
    };
  };

}).call(this);

//# sourceMappingURL=transforms.js.map
(function() {
  'use strict';
  var GUY, alert, debug, echo, get_transform_types, help, info, inspect, log, misfit, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/TRANSFORMS'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({get_transform_types, misfit} = require('./types'));

  //-----------------------------------------------------------------------------------------------------------
  this.$window = function(cfg) {
    var $, advance, buffer, empty, i, idxs, last, len, max, min, nr, window, zero_idx;
    cfg = get_transform_types().create.transform_window_cfg(cfg);
    ({min, max, empty} = cfg);
    ({$} = require('./main'));
    last = Symbol('last');
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
    return $({last}, window = function(d, send) {
      if (d === last) {
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
  this.$named_window = function(cfg) {
    var Pipeline, R, empty, i, idxs, len, list_idx, map, max, min, names, window_idx;
    cfg = get_transform_types().create.transform_named_window_cfg(cfg);
    ({names, empty} = cfg);
    ({Pipeline} = require('./main'));
    R = new Pipeline();
    //.........................................................................................................
    min = -(names.length - 1) / 2;
    max = -min;
    map = {};
    idxs = (function() {
      var results = [];
      for (var i = min; min <= max ? i <= max : i >= max; min <= max ? i++ : i--){ results.push(i); }
      return results;
    }).apply(this);
    for (list_idx = i = 0, len = idxs.length; i < len; list_idx = ++i) {
      window_idx = idxs[list_idx];
      map[names[list_idx]] = window_idx;
    }
    //.........................................................................................................
    R.push(this.$window({min, max, empty}));
    R.push((d, send) => {
      var e, name;
      e = {};
      for (name in map) {
        window_idx = map[name];
        e[name] = d[window_idx];
      }
      return send(e);
    });
    //.........................................................................................................
    return R;
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
    var $, collect, last;
    ({$} = require('./main'));
    last = Symbol('last');
    return $({last}, collect = function(d, send) {
      if (d === last) {
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
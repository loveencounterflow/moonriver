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
    var $, advance, buffer, empty, i, last, max, min, nr, ref, ref1;
    cfg = get_transform_types().create.transform_window_cfg(cfg);
    ({min, max, empty} = cfg);
    ({$} = require('./main'));
    last = Symbol('last');
    buffer = {};
    for (nr = i = ref = min, ref1 = max; (ref <= ref1 ? i <= ref1 : i >= ref1); nr = ref <= ref1 ? ++i : --i) {
      buffer[nr] = empty;
    }
    advance = function() {
      var j, ref2, ref3, results;
      results = [];
      for (nr = j = ref2 = min + 1, ref3 = max; (ref2 <= ref3 ? j <= ref3 : j >= ref3); nr = ref2 <= ref3 ? ++j : --j) {
        results.push(buffer[nr - 1] = buffer[nr]);
      }
      return results;
    };
    //.........................................................................................................
    return $({last}, function(d, send) {
      if (d === last) {
        while (true) {
          advance();
          buffer[max] = empty;
          if (buffer[0] === empty) {
            /* TAINT incorrect condition */
            break;
          }
          send({...buffer});
        }
        return null;
      }
      advance();
      buffer[max] = d;
      if (buffer[0] !== empty) {
        return send({...buffer});
      }
    });
  };

  // #-----------------------------------------------------------------------------------------------------------
  // @$window_list = ( min, max, empty = misfit ) ->
  //   { $ }         = require './main'
  //   last          = Symbol 'last'
  //   buffer        = ( empty for nr in [ min .. max ] )
  //   #.........................................................................................................
  //   return $ { last, }, ( d, send ) ->
  //     if d is last
  //       loop
  //         buffer.shift()
  //         buffer.push empty
  //         break if buffer[ 0 ] is empty
  //         send [ buffer..., ]
  //       return null
  //     buffer.shift()
  //     buffer.push d
  //     send [ buffer..., ] unless buffer[ 0 ] is empty

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

}).call(this);

//# sourceMappingURL=transforms.js.map
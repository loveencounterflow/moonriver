(function() {
  'use strict';
  //-----------------------------------------------------------------------------------------------------------
  this.$window = function(min, max, empty = misfit) {
    var $, advance, buffer, i, last, nr, ref, ref1;
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

  //---------------------------------------------------------------------------------------------------------
  this.$sink_from_writestream = function(writestream) {
    var last;
    // validate.writestream writestream
    last = Symbol('last');
    return $({last}, writestream = async function(d) {
      if (d === last) {
        return (await new Promise(function(resolve) {
          return output.end(function() {
            return resolve();
          });
        }));
      }
      // output.close()
      return (await new Promise(function(resolve) {
        return output.write(d, function() {
          return resolve();
        });
      }));
    });
  };

}).call(this);

//# sourceMappingURL=transforms.js.map
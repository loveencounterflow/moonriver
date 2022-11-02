(function() {
  'use strict';
  //-----------------------------------------------------------------------------------------------------------
  this.$window = function(min, max, empty = misfit) {
    var $, advance, buffer, i, last, nr, ref, ref1;
    ({$} = (require('./main')).Moonriver);
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

}).call(this);

//# sourceMappingURL=transforms.js.map
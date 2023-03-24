(function() {
  'use strict';
  var GUY, Transformer, alert, debug, echo, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/TRANSFORMER'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({get_base_types} = require('./types'));

  //===========================================================================================================
  Transformer = class Transformer {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      GUY.props.hide(this, '_types', get_base_types());
      GUY.props.hide(this, '_transforms', []);
      GUY.props.def(this, 'length', {
        get: function() {
          return this._transforms.length;
        },
        set: function(n) {
          return this._transforms.length = n;
        }
      });
      this._build();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    * [Symbol.iterator]() {
      return (yield* this._transforms);
    }

    //---------------------------------------------------------------------------------------------------------
    _build() {
      var d, i, k, len, ref, ref1;
      ref = GUY.props.keys(this, {
        hidden: true,
        builtins: false,
        depth: null,
        depth_first: true
      });
      for (i = 0, len = ref.length; i < len; i++) {
        k = ref[i];
        if (k === 'constructor') {
          continue;
        }
        if (k === 'length') {
          continue;
        }
        if (k.startsWith('_')) {
          continue;
        }
        ref1 = this._walk_values(this[k]);
        for (d of ref1) {
          this._transforms.push(d);
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_values(value) {
      var d, e, i, len, ref;
      if (this._types.isa.class(value)) {
        return (yield new value());
      }
      //.......................................................................................................
      if (this._types.isa.function(value)) {
        if (!value.name.startsWith('$')) {
          return (yield value);
        }
        return (yield value.call(this));
      }
      //.......................................................................................................
      if (this._types.isa.list(value)) {
        for (i = 0, len = value.length; i < len; i++) {
          e = value[i];
          ref = this._walk_values(e);
          for (d of ref) {
            yield d;
          }
        }
        return null;
      }
      //.......................................................................................................
      return (yield value);
    }

  };

  //===========================================================================================================
  module.exports = {Transformer};

}).call(this);

//# sourceMappingURL=transformer.js.map
(function() {
  'use strict';
  var GUY, Pipeline_module, alert, debug, echo, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('MOONRIVER/MODULES'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({get_base_types} = require('./types'));

  //===========================================================================================================
  Pipeline_module = class Pipeline_module {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      GUY.props.hide(this, 'types', types);
      return this._build();
    }

    //---------------------------------------------------------------------------------------------------------
    _build(value = null) {
      var R, d, i, k, len, ref, ref1;
      R = new Pipeline();
      ref = GUY.props.keys(this, {
        hidden: true
      });
      for (i = 0, len = ref.length; i < len; i++) {
        k = ref[i];
        if (!/^\$/.test(k)) {
          continue;
        }
        ref1 = this._walk_values(this[k]);
        for (d of ref1) {
          R.push(d);
        }
      }
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_values(value) {
      var d, e, i, len, ref;
      if (this.types.isa.class(value)) {
        value = new value();
      }
      //.......................................................................................................
      if (this.types.isa.function(value)) {
        if (!value.name.startsWith('$')) {
          return (yield value);
        }
        return (yield value.call(this));
      }
      //.......................................................................................................
      if (this.types.isa.list(value)) {
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
      if (value instanceof Pipeline) {
        return (yield value);
      }
      //.......................................................................................................
      throw new Error(`^Pipeline_module@1^ unable to ingest ${rpr(value)}`);
    }

  };

}).call(this);

//# sourceMappingURL=pipeline-module.js.map

'use strict'


############################################################################################################
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'MOONRIVER/NG'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
stf_prefix                = '_transform_from_'
{ Intertype }             = require 'intertype'
base_types                = null
snyc_types                = null
async_types               = null
transform_types           = null
misfit                    = Symbol 'misfit'
STREAM                    = require 'node:stream'


#-----------------------------------------------------------------------------------------------------------
get_sync_source_fitting_types = ->
  main  = require './main'
  R     = new Set()
  for name from GUY.props.walk_keys main.Segment::, { hidden: true, }
    continue unless name.startsWith stf_prefix
    R.add name.replace stf_prefix, ''
  return R

#-----------------------------------------------------------------------------------------------------------
get_async_source_fitting_types = ->
  main  = require './main'
  R     = new Set()
  for name from GUY.props.walk_keys main.Async_segment::, { hidden: true, }
    continue unless name.startsWith stf_prefix
    R.add name.replace stf_prefix, ''
  return R

#-----------------------------------------------------------------------------------------------------------
get_base_types = ->
  return base_types if base_types?
  #.........................................................................................................
  base_types                = new Intertype()
  main                      = require './main'
  { declare }               = base_types
  source_fitting_types      = get_sync_source_fitting_types()
  #.........................................................................................................
  declare.function0             override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 0 )
  declare.function1             override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 1 )
  declare.function2             override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 2 )
  declare.asyncfunction0        override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 0 )
  declare.asyncfunction1        override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 1 )
  declare.asyncfunction2        override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 2 )
  #.........................................................................................................
  declare.pipeline                              isa: ( x ) -> x instanceof main.Pipeline
  declare.sync_pipeline         override: true, isa: ( x ) -> ( x instanceof main.Pipeline ) and not \
                                                              ( x instanceof main.Async_pipeline )
  declare.async_pipeline        override: true, isa: ( x ) -> x instanceof main.Async_pipeline
  #.........................................................................................................
  declare.nodejs_writestream    override: true, isa: ( x ) -> x instanceof STREAM.Writable
  declare.nodejs_readstream     override: true, isa: ( x ) -> x instanceof STREAM.Readable
  #.........................................................................................................
  declare.reporting_collector   override: true, isa: ( x ) -> x instanceof main.Reporting_collector
  declare.proto_segment         override: true, isa: ( x ) -> x instanceof main.Proto_segment
  declare.collector                             isa: 'list.or.reporting_collector'
  declare.misfit                override: true, default: misfit, isa: ( x ) -> x is misfit
  #.........................................................................................................
  declare.modifiers
    fields:
      first:      'anything'
      last:       'anything'
    default:
      first:      misfit
      last:       misfit
    create: ( x ) ->
      return { first: misfit, last: misfit, } unless x?
      return x unless @isa.object x
      return { first: ( GUY.props.get x, 'first', misfit ), last: ( GUY.props.get x, 'last',  misfit ), }
  #.........................................................................................................
  return base_types

#-----------------------------------------------------------------------------------------------------------
get_sync_types = ->
  return sync_types if sync_types?
  #.........................................................................................................
  sync_types                = new Intertype get_base_types()
  main                      = require './main'
  { declare }               = sync_types
  source_fitting_types      = get_sync_source_fitting_types()
  #.........................................................................................................
  declare.producer_fitting      override: true, isa: 'function0'
  declare.observer_fitting      override: true, isa: 'function1'
  declare.transducer_fitting    override: true, isa: 'function2'
  declare.source_fitting                        isa:  ( x ) -> source_fitting_types.has @type_of x
  declare.activator_fitting                     isa: 'producer_fitting.or.source_fitting'
  declare.duct_fitting                          isa: 'observer_fitting.or.transducer_fitting'
  declare.fitting                               isa: 'duct_fitting.or.activator_fitting'
  declare.segment                               isa: ( x ) -> x? and x instanceof main.Segment
  #.........................................................................................................
  declare.segment_cfg
    fields:
      input:      'collector'
      output:     'collector'
      fitting:    'fitting'
      modifiers:  'modifiers'
    default:
      input:      null
      output:     null
      fitting:    null
      modifiers:  null
  #.........................................................................................................
  return sync_types


#=========================================================================================================
get_async_types = ->
  return async_types if async_types?
  #.........................................................................................................
  async_types               = new Intertype get_base_types()
  main                      = require './main'
  { declare }               = async_types
  source_fitting_types      = get_async_source_fitting_types()
  #.........................................................................................................
  declare.producer_fitting      override: true, isa: 'function0.or.asyncfunction0'
  declare.observer_fitting      override: true, isa: 'function1.or.asyncfunction1'
  declare.transducer_fitting    override: true, isa: 'function2.or.asyncfunction2'
  declare.source_fitting                        isa: ( x ) -> source_fitting_types.has @type_of x
  declare.activator_fitting                     isa: 'producer_fitting.or.source_fitting'
  declare.duct_fitting                          isa: 'observer_fitting.or.transducer_fitting'
  declare.fitting                               isa: 'duct_fitting.or.activator_fitting'
  declare.segment                               isa: ( x ) -> x? and ( x instanceof main.Async_segment  ) \
                                                                  or ( x instanceof main. Segment       )
  #.........................................................................................................
  declare.segment_cfg
    fields:
      input:      'collector'
      output:     'collector'
      fitting:    'fitting'
      modifiers:  'modifiers'
    default:
      input:      null
      output:     null
      fitting:    null
      modifiers:  null
  #.........................................................................................................
  return async_types


#=========================================================================================================
get_transform_types = ->
  return transform_types if transform_types?
  transform_types = new Intertype get_base_types()
  { declare }     = transform_types
  #.........................................................................................................
  return transform_types


############################################################################################################
module.exports = {
  stf_prefix
  get_base_types
  get_sync_types
  get_async_types
  get_transform_types
  misfit }



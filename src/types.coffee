
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
stf_prefix                = '_source_transform_from_'
{ Intertype }             = require 'intertype'
snyc_types                = null
asnyc_types               = null


#-----------------------------------------------------------------------------------------------------------
get_sync_source_fitting_types = ->
  main  = require './main'
  R     = new Set do =>
    ( name.replace stf_prefix, '' \
      for name in ( GUY.props.keys main.Segment::, { hidden: true, } ) \
        when name.startsWith stf_prefix )
  R.add 'repeatable_source_fitting'
  R.add 'function0'
  return R

#-----------------------------------------------------------------------------------------------------------
get_async_source_fitting_types = ->
  main  = require './main'
  R     = new Set do =>
    ( name.replace stf_prefix, '' \
      for name in ( GUY.props.keys main.Async_segment::, { hidden: true, } ) \
        when name.startsWith stf_prefix )
  R.add 'repeatable_source_fitting'
  R.add 'asyncfunction0'
  return R

#-----------------------------------------------------------------------------------------------------------
get_sync_types = ->
  return sync_types if sync_types?
  #.........................................................................................................
  sync_types                = new Intertype()
  main                      = require './main'
  { declare }               = sync_types
  sync_source_fitting_types = get_sync_source_fitting_types()
  #.........................................................................................................
  declare.function0       override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 0 )
  declare.function1       override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 1 )
  declare.function2       override: true, isa: ( x ) -> ( @isa.function      x ) and ( x.length is 2 )
  #.........................................................................................................
  declare.reporting_collector  override: true, isa: ( x ) -> x instanceof main.Reporting_collector
  declare.collector                            isa: 'list.or.reporting_collector'
  #.........................................................................................................
  declare.source_fitting                              isa:  ( x ) -> source_fitting_types.has @type_of x
  declare.repeatable_source_fitting   override: true, isa: 'function0'
  declare.observer_fitting            override: true, isa: 'function1'
  declare.transducer_fitting          override: true, isa: 'function2'
  declare.duct_fitting                override: true, isa: 'observer_fitting.or.transducer_fitting'
  declare.fitting                                     isa: 'duct_fitting.or.source_fitting'
  #.........................................................................................................
  declare.segment_cfg
    fields:
      input:    'collector'
      output:   'collector'
      fitting:  'fitting'
    default:
      input:    null
      output:   null
      fitting:  null
  #.........................................................................................................
  return sync_types


#=========================================================================================================
get_async_types = ->
  return asnyc_types if asnyc_types?
  #.........................................................................................................
  async_types               = new Intertype get_sync_types()
  main                      = require './main'
  { declare }               = async_types
  async_source_fitting_types  = get_async_source_fitting_types()
  #.........................................................................................................
  declare.asyncfunction0  override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 0 )
  declare.asyncfunction1  override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 1 )
  declare.asyncfunction2  override: true, isa: ( x ) -> ( @isa.asyncfunction x ) and ( x.length is 2 )
  #.........................................................................................................
  declare.source_fitting            ( x ) -> source_fitting_types.has @type_of x
  declare.repeatable_source_fitting override: true, isa: 'function0.or.asyncfunction0'
  declare.observer_fitting          override: true, isa: 'function1.or.asyncfunction1'
  declare.transducer_fitting        override: true, isa: 'function2.or.asyncfunction2'
  declare.duct_fitting              override: true, isa: 'sync_duct_fitting.or.asyncfunction1.or.asyncfunction2'
  declare.fitting                                   isa: 'duct_fitting.or.source_fitting'
  #.........................................................................................................
  declare.segment_cfg
    fields:
      input:    'collector'
      output:   'collector'
      fitting:  'fitting'
    default:
      input:    null
      output:   null
      fitting:  null
  #.........................................................................................................
  return types


############################################################################################################
module.exports = { stf_prefix, get_sync_types, get_async_types, }




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
types                     = null

#===========================================================================================================
get_types = ->
  return types if types?
  types                     = new ( require 'intertype' ).Intertype()
  main                      = require './main'

  #---------------------------------------------------------------------------------------------------------
  sync_source_fitting_types  = new Set do =>
    ( name.replace stf_prefix, '' \
      for name in ( GUY.props.keys main.Segment::, { hidden: true, } ) \
        when name.startsWith stf_prefix )

  #---------------------------------------------------------------------------------------------------------
  async_source_fitting_types  = new Set do =>
    ( name.replace stf_prefix, '' \
      for name in ( GUY.props.keys main.Async_segment::, { hidden: true, } ) \
        when name.startsWith stf_prefix )

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_sync_source_fitting  ( x ) ->  sync_source_fitting_types.has @type_of x
  types.declare.mr_async_source_fitting ( x ) -> async_source_fitting_types.has @type_of x

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_sync_nonsource_fitting ( x ) ->
    return false unless @isa.function x
    return false unless 1 <= x.length <= 2
    return true

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_async_nonsource_fitting ( x ) ->
    return false unless @isa.function.or.asyncfunction x
    return false unless 1 <= x.length <= 2
    return true

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_reporting_collector ( x ) -> x instanceof main.Reporting_collector
  types.declare.mr_collector 'list.or.mr_reporting_collector'
  types.declare.mr_sync_fitting 'mr_sync_nonsource_fitting.or.mr_sync_source_fitting'
  types.declare.mr_async_fitting 'mr_async_nonsource_fitting.or.mr_async_source_fitting'

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_sync_segment_cfg
    fields:
      input:    'mr_collector'
      output:   'mr_collector'
      fitting:  'mr_sync_fitting'
    default:
      input:    null
      output:   null
      fitting:  null

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_async_segment_cfg
    fields:
      input:    'mr_collector'
      output:   'mr_collector'
      fitting:  'mr_async_fitting'
    default:
      input:    null
      output:   null
      fitting:  null

  #---------------------------------------------------------------------------------------------------------
  return types


############################################################################################################
module.exports = { stf_prefix, get_types, }



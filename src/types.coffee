
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
  source_fitting_types  = new Set do =>
    ( name.replace stf_prefix, '' \
      for name in ( Object.getOwnPropertyNames main.Segment:: ) \ ### thx to https://stackoverflow.com/a/31055009/7568091 ###
        when name.startsWith stf_prefix )

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_source_fitting ( x ) -> source_fitting_types.has @type_of x

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_nonsource_fitting ( x ) ->
    return false unless @isa.function x
    return false unless 1 <= x.length <= 2
    return true

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_reporting_collector ( x ) -> x instanceof main.Reporting_collector
  types.declare.mr_collector 'list.or.mr_reporting_collector'
  types.declare.mr_fitting 'mr_nonsource_fitting.or.mr_source_fitting'

  #---------------------------------------------------------------------------------------------------------
  types.declare.mr_segment_cfg
    fields:
      input:    'mr_collector'
      output:   'mr_collector'
      fitting:  'mr_fitting'
    default:
      input:    null
      output:   null
      fitting:  null
    # create: ( x ) ->
    #   return x unless @isa.optional.object x
    #   R         = x
    #   return R

  #---------------------------------------------------------------------------------------------------------
  return types


############################################################################################################
module.exports = { stf_prefix, get_types, }



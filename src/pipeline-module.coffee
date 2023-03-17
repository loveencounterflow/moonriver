
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
  whisper }               = GUY.trm.get_loggers 'MOONRIVER/MODULES'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
{ get_base_types }        = require './types'



#===========================================================================================================
class Pipeline_module

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    GUY.props.hide @, 'types', types
    return @_build()

  #---------------------------------------------------------------------------------------------------------
  _build: ( value = null ) ->
    R = new Pipeline()
    for k in GUY.props.keys @, { hidden: true, }
      continue unless /^\$/.test k
      R.push d for d from @_walk_values @[ k ]
    return R

  #---------------------------------------------------------------------------------------------------------
  _walk_values: ( value ) ->
    value = new value() if @types.isa.class value
    #.......................................................................................................
    if @types.isa.function value
      return yield value unless value.name.startsWith '$'
      return yield value.call @
    #.......................................................................................................
    if @types.isa.list value
      for e in value
        yield d for d from @_walk_values e
      return null
    #.......................................................................................................
    if value instanceof Pipeline
      return yield value
    #.......................................................................................................
    throw new Error "^Pipeline_module@1^ unable to ingest #{rpr value}"




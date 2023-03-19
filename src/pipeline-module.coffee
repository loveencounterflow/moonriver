
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
    GUY.props.hide @, '_types', get_base_types()
    GUY.props.hide @, '_Pipeline', ( require './main' ).Pipeline
    return @_build()

  #---------------------------------------------------------------------------------------------------------
  _build: ( value = null ) ->
    R = new @_Pipeline()
    for k in GUY.props.keys @, { hidden: true, builtins: false, depth: 1, }
      continue if k is 'constructor'
      continue if k.startsWith '_'
      R.push d for d from @_walk_values @[ k ]
    return R

  #---------------------------------------------------------------------------------------------------------
  _walk_values: ( value ) ->
    return yield new value() if @_types.isa.class value
    #.......................................................................................................
    if @_types.isa.function value
      return yield value unless value.name.startsWith '$'
      return yield value.call @
    #.......................................................................................................
    if @_types.isa.list value
      for e in value
        yield d for d from @_walk_values e
      return null
    #.......................................................................................................
    if value instanceof @_Pipeline
      return yield value
    #.......................................................................................................
    throw new Error "^Pipeline_module@1^ unable to turn a #{@_types.type_of value} into a transform (#{rpr value})"


#===========================================================================================================
module.exports = { Pipeline_module, }


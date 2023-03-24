
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
  whisper }               = GUY.trm.get_loggers 'MOONRIVER/TRANSFORMER'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
{ get_base_types }        = require './types'



#===========================================================================================================
class Transformer

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    GUY.props.hide @, '_types', get_base_types()
    GUY.props.hide @, '_transforms', []
    GUY.props.def @, 'length',
      get:        -> @_transforms.length
      set: ( n )  -> @_transforms.length = n
    @_build()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield from @_transforms

  #---------------------------------------------------------------------------------------------------------
  _build: ->
    for k in GUY.props.keys @, { hidden: true, builtins: false, depth: null, depth_first: true, }
      continue if k is 'constructor'
      continue if k is 'length'
      continue if k.startsWith '_'
      @_transforms.push d for d from @_walk_values @[ k ]
    return null

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
    return yield value


#===========================================================================================================
module.exports = { Transformer, }


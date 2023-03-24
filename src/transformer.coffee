
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
  @as_pipeline: ( cfg ) ->
    R = new ( require './main' ).Pipeline cfg; R.push new @(); return R

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
    chain = ( GUY.props.get_prototype_chain @ ).reverse()
    for object in chain
      for key from GUY.props.walk_keys object, { hidden: true, builtins: false, depth: 0, }
        continue if key is 'constructor'
        continue if key is 'length'
        continue if key.startsWith '_'
        @_transforms.push d for d from @_walk_values object[ key ]
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


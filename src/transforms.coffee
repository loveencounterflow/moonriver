
'use strict'

#-----------------------------------------------------------------------------------------------------------
@$window = ( min, max, empty = misfit ) ->
  { $ }         = ( require './main' ).Moonriver
  last          = Symbol 'last'
  buffer        = {}
  buffer[ nr ]  = empty for nr in [ min .. max ]
  advance       = -> buffer[ nr - 1 ]  = buffer[ nr ] for nr in [ min + 1 .. max ]
  #.........................................................................................................
  return $ { last, }, ( d, send ) ->
    if d is last
      loop
        advance()
        buffer[ max ] = empty
        break if buffer[ 0 ] is empty
        send { buffer..., }
      return null
    advance()
    buffer[ max ] = d
    send { buffer..., } unless buffer[ 0 ] is empty

#-----------------------------------------------------------------------------------------------------------
@$split_lines = ->
  SL  = require 'intertext-splitlines'
  ctx = SL.new_context()
  return split_lines = ( d, send ) ->
    for line from SL.walk_lines ctx, d
      send line
    return null

#-----------------------------------------------------------------------------------------------------------
@$limit = ( n ) ->
  count = 0
  return limit = ( d, send ) ->
    return null if count >= n
    count++
    send d
    return null




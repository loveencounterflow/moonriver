
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
  whisper }               = GUY.trm.get_loggers 'MOONRIVER/TRANSFORMS'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
{ get_transform_types
  misfit                } = require './types'


#-----------------------------------------------------------------------------------------------------------
@$window = ( cfg ) ->
  cfg           = get_transform_types().create.transform_window_cfg cfg
  { min
    max
    empty }     = cfg
  { $ }         = require './main'
  stop          = Symbol 'stop'
  buffer        = []
  idxs          = [ min .. max ]
  zero_idx      = idxs.indexOf 0
  if zero_idx < 0
    throw new Error "^transforms.window^ index 0 missing with settings #{rpr { min, max, }}"
  buffer.push empty for nr in idxs
  advance       = -> buffer.splice 0, 1
  #.........................................................................................................
  return $ { stop, }, window = ( d, send ) ->
    if d is stop
      loop
        advance()
        buffer.push empty
        ### TAINT incorrect condition ###
        break if buffer[ zero_idx ] is empty
        send [ buffer..., ]
      return null
    advance()
    buffer.push d
    send [ buffer..., ] unless buffer[ zero_idx ] is empty

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

#-----------------------------------------------------------------------------------------------------------
@$collect = ( collector = [] ) ->
  { $ }         = require './main'
  stop          = Symbol 'stop'
  return $ { stop, }, collect = ( d, send ) ->
    return send collector if d is stop
    collector.push d
    return null

#-----------------------------------------------------------------------------------------------------------
@$map       = ( f, P... ) -> ( d, send ) -> send        f P...
@$async_map = ( f, P... ) -> ( d, send ) -> send await  f P...





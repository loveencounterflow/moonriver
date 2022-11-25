
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
  last          = Symbol 'last'
  buffer        = {}
  buffer[ nr ]  = empty for nr in [ min .. max ]
  advance       = -> buffer[ nr - 1 ]  = buffer[ nr ] for nr in [ min + 1 .. max ]
  #.........................................................................................................
  return $ { last, }, window = ( d, send ) ->
    if d is last
      loop
        advance()
        buffer[ max ] = empty
        ### TAINT incorrect condition ###
        break if buffer[ 0 ] is empty
        send { buffer..., }
      return null
    advance()
    buffer[ max ] = d
    send { buffer..., } unless buffer[ 0 ] is empty

#-----------------------------------------------------------------------------------------------------------
@$named_window = ( cfg ) ->
  cfg                       = get_transform_types().create.transform_named_window_cfg cfg
  { names
    empty }                 = cfg
  { Pipeline }              = require './main'
  R                         = new Pipeline()
  #.........................................................................................................
  min                       = -( names.length - 1 ) / 2
  max                       = -min
  map                       = {}
  idxs                      = [ min .. max ]
  map[ names[ list_idx ] ]  = window_idx for window_idx, list_idx in idxs
  #.........................................................................................................
  R.push @$window { min, max, empty, }
  R.push ( d, send ) =>
    e         = {}
    e[ name ] = d[ window_idx ] for name, window_idx of map
    send e
  #.........................................................................................................
  return R

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




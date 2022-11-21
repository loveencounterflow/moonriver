
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
  whisper }               = GUY.trm.get_loggers 'MOONRIVER/MAIN'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
UTIL                      = require 'node:util'
{ hide
  def }                   = GUY.props
nameit                    = ( name, f ) -> def f, 'name', { value: name, }
{ misfit
  stf_prefix
  get_sync_types
  get_async_types }       = require './types'
stf                       = ( name ) -> stf_prefix + ( if Array.isArray name then name[ 0 ] else name )
transforms                = require './transforms'
noop                      = ->


#===========================================================================================================
class Reporting_collector

  #---------------------------------------------------------------------------------------------------------
  constructor: ( callback ) ->
    hide @, 'callback', callback
    hide @, 'd',        []
    GUY.props.def @,  'length',   get: -> @d.length
    return undefined

  #---------------------------------------------------------------------------------------------------------
  push:     ( d ) -> @callback +1; @d.push d
  unshift:  ( d ) -> @callback +1; @d.unshift d
  pop:            -> @callback -1; @d.pop()
  shift:          -> @callback -1; @d.shift()

  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]:  -> @toString()
  toString:               -> rpr @d



############################################################################################################
# SYNC
#===========================================================================================================
class Segment

  #---------------------------------------------------------------------------------------------------------
  @type_getter:                     get_sync_types

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    clasz             = @constructor
    hide @, 'types', clasz.type_getter()
    @types.create.segment_cfg cfg
    @input            = cfg.input
    @output           = cfg.output
    @has_finished     = null
    @role   = null
    @_on_before_walk  = noop
    @first            = cfg.modifiers.first
    @last             = cfg.modifiers.last
    @_set_transform cfg.fitting
    hide @, '_send', send = ( d ) => @output.push d; d ### 'inner' send method ###
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _set_transform: ( fitting ) ->
    sigil = null
    #.......................................................................................................
    switch fitting_type = @types.type_of fitting
      #.....................................................................................................
      when 'producer_fitting'
        @_on_before_walk  = ->
          source          = fitting()
          @transform      = ( @_get_source_transform ( @types.type_of source ), source ).transform
          @has_finished   = false
          return null
        role    = 'source'
        transform         = fitting
      #.....................................................................................................
      when 'observer_fitting'
        role    = 'observer'
        transform         = fitting
      #.....................................................................................................
      when 'transducer_fitting'
        role    = 'transducer'
        transform         = fitting
      #.....................................................................................................
      else # 'source_fitting'
        { role
          transform     } = @_get_source_transform fitting_type, fitting
    #.......................................................................................................
    name            = if transform.name is '' then 'ƒ' else transform.name
    nameit name, transform
    @has_finished   = false if role is 'source'
    @role = role
    hide @, 'transform', transform
    return null


  #=========================================================================================================
  # SOURCE TRANSFORMS
  #---------------------------------------------------------------------------------------------------------
  _get_source_transform: ( type, source ) ->
    unless ( method = @[stf type] )?
      throw new Error "^mr.e#2^ unable to convert a #{type} to a transform"
    return method.call @, source

  #---------------------------------------------------------------------------------------------------------
  [stf'generator']: ( source ) ->
    transform = ( send ) =>
      return null if @has_finished
      dsc           = source.next()
      @has_finished = dsc.done
      send dsc.value unless @has_finished
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'text']: ( source ) ->
    letter_re = /./uy
    transform = nameit '√txt', ( send ) =>
      return null if @has_finished
      unless ( match = source.match letter_re )?
        @has_finished = true
        return null
      send match[ 0 ]
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'generatorfunction']: ( source ) -> @_get_source_transform 'generator', source()
  [stf'arrayiterator']:     ( source ) -> @[stf'generator'] source
  [stf'setiterator']:       ( source ) -> @[stf'generator'] source
  [stf'mapiterator']:       ( source ) -> @[stf'generator'] source

  #---------------------------------------------------------------------------------------------------------
  [stf'list']:              ( source ) ->
    { transform } = @[stf'generator'] source.values()
    nameit '√lst', transform
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'object']:            ( source ) ->
    { transform } = @[stf'generator'] ( -> yield [ k, v, ] for k, v of source )()
    nameit '√obj', transform
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'set']:               ( source ) ->
    { transform } = @[stf'generator'] source.values()
    nameit '√set', transform
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'map']:               ( source ) ->
    { transform } = @[stf'generator'] source.entries()
    nameit '√map', transform
    return { role: 'source', transform, }


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  ### 'outer' send method ###
  send: ( d ) -> @input.push d; d

  #---------------------------------------------------------------------------------------------------------
  process: ->
    if @role is 'source'
      @_send @input.shift() while @input.length > 0 ### TAINT could be done with `.splice()` ###
      return 0 if @transform.has_finished
      @transform @_send
      return 1
    if @input.length > 0
      d = @input.shift()
      switch @role
        when 'observer'
          @transform  d
          @_send      d
        when 'transducer'
          @transform d, @_send
        else
          throw new Error "^mr.e#3^ internal error: unknown segment role #{rpr @role}"
      return 1
    return 0

  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]:  -> @toString()
  toString:               -> "#{rpr @input} ▶ #{@transform.name} ▶ #{rpr @output}"


#===========================================================================================================
class Pipeline

  #---------------------------------------------------------------------------------------------------------
  @type_getter:   get_sync_types
  @segment_class: Segment

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    clasz               = @constructor
    cfg                 = { {}..., cfg..., }
    # cfg                 = types.create.pipeline_cfg cfg
    @datacount          = 0
    @input              = @_new_collector()
    @output             = [] ### pipeline output buffer does not participate in datacount ###
    @segments           = []
    hide  @, '$',             nameit '$', @_segment_from_fitting.bind @
    hide  @, 'types',         clasz.type_getter()
    def   @, 'sources',       get: -> Object.freeze ( s for s in @segments when s.role is 'source' )
    def   @, 'has_finished',  get: -> ( @datacount < 1 ) and @sources.every ( s ) -> s.has_finished
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _new_collector:                   -> new Reporting_collector ( delta ) => @datacount += delta


  #=========================================================================================================
  # BUILDING PIPELINE FROM SEGMENTS
  #---------------------------------------------------------------------------------------------------------
  _get_modifiers_and_fitting: ( modifiers, fitting ) ->
    switch arity = arguments.length
      when 1 then [ modifiers, fitting, ] = [ null, modifiers, ]
      when 2 then null
      else throw new Error "^mr.e#5^ expected 1 or 2 arguments, got #{arity}"
    modifiers = @types.create.modifiers modifiers
    return [ modifiers, fitting, ]

  #---------------------------------------------------------------------------------------------------------
  _segment_from_fitting: ( P... ) ->
    [ modifiers
      fitting   ] = @_get_modifiers_and_fitting P...
    return @_segment_from_fitting fitting.values... if @types.isa.proto_segment fitting
    ### TAINT consider to move this code to `Segment` class ###
    if ( count = @segments.length ) is 0
      input               = @input
    else
      prv_segment         = @segments[ count - 1 ]
      prv_segment.output  = @_new_collector()
      input               = prv_segment.output
    if @types.isa.segment fitting
      R         = fitting
      R.input   = input
      R.output  = @output
    else
      try R = new @constructor.segment_class { modifiers, input, fitting, output: @output, } catch error
        error.message = error.message + "\n\n^mr.e#4^ unable to convert a #{@types.type_of fitting} into a segment"
        throw error
    return R

  #---------------------------------------------------------------------------------------------------------
  push: ( P... ) ->
    @segments.push R = @_segment_from_fitting P...
    return R


  #=========================================================================================================
  # SENDING DATA
  #---------------------------------------------------------------------------------------------------------
  send: ( d ) -> @input.push d; d


  #=========================================================================================================
  # PROCESSING
  #---------------------------------------------------------------------------------------------------------
  process: ->
    for segment, segment_idx in @segments
      segment.process()
    return null


  #=========================================================================================================
  # ITERATING OVER AND RETRIEVING RESULTS
  #---------------------------------------------------------------------------------------------------------
  run: -> ( d for d from @walk() )
  walk: ->
    segment._on_before_walk()   for segment in @segments
    segment.send segment.first  for segment in @segments when segment.first isnt misfit
    yield from @_walk()
    segment.send segment.last   for segment in @segments when segment.last isnt misfit
    yield from @_walk() unless @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk: ->
    loop
      @process()
      yield d for d in @output
      @output.length = 0
      break if @has_finished
    return null


  #=========================================================================================================
  # CLI REPRESENTATION
  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]:  -> @toString()
  toString:               ->
    R = []
    for segment in @segments
      R.push rpr segment.input
      R.push '▶'
      R.push segment.transform.name
      R.push '▶'
    R.push rpr @output
    return R.join ' '


############################################################################################################
# ASYNC
#===========================================================================================================
class Async_segment extends Segment

  #---------------------------------------------------------------------------------------------------------
  @type_getter:                     get_async_types

  # #---------------------------------------------------------------------------------------------------------
  # _segment_from_fitting: ( P... ) ->
  #   [ modifiers
  #     fitting   ] = @_get_modifiers_and_fitting P...
  #   ### TAINT `modifiers` silently discarded ###
  #   debug '^34953609457^'
  #   return transforms.$sink_from_writestream fitting if @types.isa.nodejs_writestream fitting
  #   return super modifiers, fitting

  #---------------------------------------------------------------------------------------------------------
  process: ->
    if @role is 'source'
      @_send @input.shift() while @input.length > 0 ### TAINT could be done with `.splice()` ###
      return 0 if @transform.has_finished
      await @transform @_send
      return 1
    if @input.length > 0
      d = @input.shift()
      d = await d if d instanceof Promise
      switch @role
        when 'observer'
          await @transform  d
          @_send      d
        when 'transducer'
          await @transform d, @_send
        else
          throw new Error "^mr.e#5^ internal error: unknown transform type #{rpr @role}"
      return 1
    return 0

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgeneratorfunction']: ( source ) -> @[stf'asyncgenerator'] source()

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgenerator']: ( source ) ->
    transform = ( send ) =>
      return null if @has_finished
      dsc           = await source.next()
      @has_finished = dsc.done
      send dsc.value unless @has_finished
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'nodejs_readstream']: ( source ) ->
    { Receiver }  = require 'jfee'
    rcv           = Receiver.from_readstream source, { bare: true, }
    return nameit '√readstream', @[stf'asyncgenerator'] rcv


#===========================================================================================================
class Async_pipeline extends Pipeline

  #---------------------------------------------------------------------------------------------------------
  @type_getter:                     get_async_types
  @segment_class:                   Async_segment

  #=========================================================================================================
  # PROCESSING
  #---------------------------------------------------------------------------------------------------------
  process: ->
    for segment, segment_idx in @segments
      await segment.process()
    return null

  #=========================================================================================================
  # CLI REPRESENTATION
  #---------------------------------------------------------------------------------------------------------
  run: -> ( d for await d from @walk() )
  walk: ->
    await segment._on_before_walk() for segment in @segments
    loop
      await @process()
      yield ( if d instanceof Promise then await d else d ) for d in @output
      @output.length = 0
      break if @has_finished
    return null


############################################################################################################
# HELPERS
#===========================================================================================================
class Proto_segment

  #---------------------------------------------------------------------------------------------------------
  constructor: ( P... ) ->
    @values = P
    return undefined

#-----------------------------------------------------------------------------------------------------------
$ = ( modifiers, fitting ) ->
  new Proto_segment modifiers, fitting


############################################################################################################
module.exports = {
  Pipeline
  Segment
  Async_pipeline
  Async_segment
  Reporting_collector
  transforms
  Proto_segment
  $ }


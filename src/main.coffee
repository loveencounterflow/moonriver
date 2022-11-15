
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
#...........................................................................................................
types                     = null
UTIL                      = require 'node:util'
{ hide
  def }                   = GUY.props
nameit                    = ( name, f ) -> def f, 'name', { value: name, }
{ stf_prefix
  get_types }             = require './types'
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
  @my_type:                         'mr_sync_segment_cfg'
  @fitting_type:                    'mr_sync_fitting'
  @source_fitting_type:             'mr_sync_source_fitting'
  @repeatable_source_fitting_type:  'mr_sync_repeatable_source_fitting'
  @observer_fitting_type:           'mr_sync_observer_fitting'
  @transducer_fitting_type:         'mr_sync_transducer_fitting'
  @duct_fitting_type:               'mr_sync_duct_fitting'

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    hide @, 'types',      get_types()
    @types.create[ @constructor.my_type ] cfg
    @input            = cfg.input
    @output           = cfg.output
    @has_finished     = null
    @transform_type   = null
    @_on_before_walk  = noop
    hide @, 'transform',  @_as_transform cfg.fitting
    hide @, '_send', send = ( d ) => @output.push d; d ### 'inner' send method ###
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _as_transform: ( fitting ) ->
    clasz = @constructor
    sigil = null
    #.......................................................................................................
    if @types.isa[ clasz.repeatable_source_fitting_type ] fitting
      @_on_before_walk  = -> @transform = @_get_source_transform fitting()
      @transform_type   = 'source'
      R                 = fitting
      sigil             = '?sr '
    #.......................................................................................................
    else if ( @types.isa[ clasz.source_fitting_type ] fitting )
      R                 = @_get_source_transform fitting
      @transform_type   = 'source'
      sigil             = '?sn '
    #.......................................................................................................
    else
      R = fitting
      if      @types.isa[ clasz.observer_fitting_type   ] R
        @transform_type = 'observer'
        sigil           = '?o'
      else if @types.isa[ clasz.transducer_fitting_type ] R
        @transform_type = 'transducer'
        sigil           = '?t'
      else
        throw new Error "^mr.e#1^ fittings with arity #{arity} not implemented"
    #.......................................................................................................
    name  = if R.name is '' then 'ƒ' else R.name
    name  = sigil + name
    nameit name, R
    return R


  #=========================================================================================================
  # SOURCE TRANSFORMS
  #---------------------------------------------------------------------------------------------------------
  _get_source_transform: ( source ) ->
    type = @types.type_of source
    unless ( method = @[stf type] )?
      throw new Error "^mr.e#2^ unable to convert a #{type} to a transform"
    @has_finished = false
    R = method.call @, source
    return nameit type, R if R.name is ''
    return R

  #---------------------------------------------------------------------------------------------------------
  [stf'generator']: ( source ) ->
    @has_finished = false
    return ( send ) =>
      return null if @has_finished
      dsc           = source.next()
      @has_finished = dsc.done
      send dsc.value unless @has_finished
      return null

  #---------------------------------------------------------------------------------------------------------
  [stf'text']: ( source ) ->
    letter_re     = /./uy
    @has_finished = false
    return nameit '√txt', ( send ) =>
      return null if @has_finished
      unless ( match = source.match letter_re )?
        @has_finished = true
        return null
      send match[ 0 ]
      return null

  #---------------------------------------------------------------------------------------------------------
  [stf'generatorfunction']: ( source ) -> @_get_source_transform source()
  [stf'arrayiterator']:     ( source ) -> @[stf'generator'] source
  [stf'setiterator']:       ( source ) -> @[stf'generator'] source
  [stf'mapiterator']:       ( source ) -> @[stf'generator'] source
  [stf'list']:              ( source ) -> nameit '√lst', @[stf'generator'] source.values()
  [stf'object']:            ( source ) -> nameit '√obj', @[stf'generator'] ( -> yield [ k, v, ] for k, v of source )()
  [stf'set']:               ( source ) -> nameit '√set', @[stf'generator'] source.values()
  [stf'map']:               ( source ) -> nameit '√map', @[stf'generator'] source.entries()
  [stf'function0']:         ( source ) -> source


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  ### 'outer' send method ###
  send: ( d ) -> @input.push d; d

  #---------------------------------------------------------------------------------------------------------
  process: ->
    if @transform_type is 'source'
      @_send @input.shift() while @input.length > 0 ### TAINT could be done with `.splice()` ###
      return 0 if @transform.has_finished
      @transform @_send
      return 1
    if @input.length > 0
      d = @input.shift()
      switch @transform_type
        when 'observer'
          @transform  d
          @_send      d
        when 'transducer'
          @transform d, @_send
        else
          throw new Error "^mr.e#3^ internal error: unknown transform type #{rpr @transform_type}"
      return 1
    return 0

  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]:  -> @toString()
  toString:               -> "#{rpr @input} ▶ #{@transform.name} ▶ #{rpr @output}"


#===========================================================================================================
class Pipeline

  #---------------------------------------------------------------------------------------------------------
  @segment_class: Segment

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg                 = { {}..., cfg..., }
    # cfg                 = types.create.mr_pipeline_cfg cfg
    @datacount          = 0
    @input              = @_new_collector()
    @output             = [] ### pipeline output buffer does not participate in datacount ###
    @segments           = []
    @on_before_step     = cfg.on_before_step ? null
    @on_after_step      = cfg.on_after_step  ? null
    @on_before_process  = cfg.on_before_process ? null
    @on_after_process   = cfg.on_after_process  ? null
    # hide  @, '$',             nameit '$', @_remit.bind @
    hide  @, 'types',         get_types()
    def   @, 'sources',       get: -> Object.freeze ( s for s in @segments when s.transform_type is 'source' )
    def   @, 'has_finished',  get: -> ( @datacount < 1 ) and @sources.every ( s ) -> s.has_finished
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _new_collector:                   -> new Reporting_collector ( delta ) => @datacount += delta


  #=========================================================================================================
  # BUILDING PIPELINE FROM SEGMENTS
  #---------------------------------------------------------------------------------------------------------
  # _remit: ( modifiers, fitting ) ->
  _remit: ( fitting ) ->
    if ( count = @segments.length ) is 0
      input               = @input
    else
      prv_segment         = @segments[ count - 1 ]
      prv_segment.output  = @_new_collector()
      input               = prv_segment.output
    try R = new @constructor.segment_class { input, fitting, output: @output, } catch error
      error.message = error.message + "\n\n^mr.e#4^ unable to convert a #{@types.type_of fitting} into a segment"
      throw error
    return R

  #---------------------------------------------------------------------------------------------------------
  push: ( P... ) ->
    R = @_remit P...
    @segments.push  R
    # @sources.push   R if R.transform_type is 'source'
    return R


  #=========================================================================================================
  # SENDING DATA
  #---------------------------------------------------------------------------------------------------------
  send: ( d ) -> @input.push d; d


  #=========================================================================================================
  # PROCESSING
  #---------------------------------------------------------------------------------------------------------
  process: ->
    @on_before_process() if @on_before_process?
    for segment, segment_idx in @segments
      @on_before_step segment_idx if @on_before_step?
      segment.process()
      @on_after_step segment_idx if @on_after_step?
    @on_after_process() if @on_after_process?
    return null


  #=========================================================================================================
  # ITERATING OVER AND RETRIEVING RESULTS
  #---------------------------------------------------------------------------------------------------------
  run: -> ( d for d from @walk() )
  walk: ->
    segment._on_before_walk() for segment in @segments
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
  @my_type:                         'mr_async_segment_cfg'
  @fitting_type:                    'mr_async_fitting'
  @source_fitting_type:             'mr_async_source_fitting'
  @repeatable_source_fitting_type:  'mr_async_repeatable_source_fitting'
  @observer_fitting_type:           'mr_async_observer_fitting'
  @transducer_fitting_type:         'mr_async_transducer_fitting'
  @duct_fitting_type:               'mr_async_duct_fitting'

  #---------------------------------------------------------------------------------------------------------
  process: ->
    if @transform_type is 'source'
      @_send @input.shift() while @input.length > 0 ### TAINT could be done with `.splice()` ###
      return 0 if @transform.has_finished
      await @transform @_send
      return 1
    if @input.length > 0
      d = @input.shift()
      d = await d if d instanceof Promise
      switch @transform_type
        when 'observer'
          await @transform  d
          @_send      d
        when 'transducer'
          await @transform d, @_send
        else
          throw new Error "^mr.e#5^ internal error: unknown transform type #{rpr @transform_type}"
      return 1
    return 0

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgeneratorfunction']: ( source ) -> @[stf'asyncgenerator'] source()

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgenerator']: ( source ) -> ( send ) =>
    return null if @has_finished
    dsc           = await source.next()
    @has_finished = dsc.done
    send dsc.value unless @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  [stf'readstream']: ( source ) ->
    { Receiver }  = require 'jfee'
    rcv           = Receiver.from_readstream source, { bare: true, }
    return nameit '√readstream', @[stf'asyncgenerator'] rcv



#===========================================================================================================
class Async_pipeline extends Pipeline

  #---------------------------------------------------------------------------------------------------------
  @segment_class: Async_segment

  #=========================================================================================================
  # PROCESSING
  #---------------------------------------------------------------------------------------------------------
  process: ->
    @on_before_process() if @on_before_process?
    for segment, segment_idx in @segments
      @on_before_step segment_idx if @on_before_step?
      await segment.process()
      @on_after_step segment_idx if @on_after_step?
    @on_after_process() if @on_after_process?
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
module.exports = {
  Pipeline
  Segment
  Async_pipeline
  Async_segment
  Reporting_collector
  transforms }


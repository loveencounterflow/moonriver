
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
  @my_type:       'mr_sync_segment_cfg'
  @fittying_type: 'mr_sync_source_fitting'

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    hide @, 'types',      get_types()
    @types.create[ @constructor.my_type ] cfg
    @input          = cfg.input
    @output         = cfg.output
    @has_finished   = null
    @transform_type = null
    hide @, 'transform',  @_as_transform cfg.fitting
    hide @, '_send', send = ( d ) => @output.push d; d ### 'inner' send method ###
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _as_transform: ( fitting ) ->
    ###

    * `fitting`: a value that may be used as (the central part of) a transform in a pipeline. This may be a
      function of arity 2 (a transducer), a list (a source) &c.
    * `transform`: one of the serial elements that constitute a pipeline. While a `fitting` may be of
      various types, a `transform` is always a function. `transform`s have a `type` attribute which takes
      one of the following values:
      * `source`: a `transform` that does not take any arguments and will yield one value per call
      * `observer`: a `transform` that takes one argument (the current value) and does not send any values
        into the pipeline; the value an observer gets called with will be the same value that the next
        transformer will be called with. Note that if an observer receives a mutable value it can modify it
        and thereby affect one data item at a time.
      * `transducer`: a `transform` that takes two arguments, the current data item and a `send()` function
        that can be used any number of times to send values to the ensuing transform.
      * `observer`s and `transducer`s are collectively called `duct`s as ooposed to `source`s

    ###
    if @types.isa[ @constructor.fittying_type ] fitting
      R               = @_get_source_transform fitting
      @transform_type = 'source'
    #.......................................................................................................
    else
      R = fitting
      switch arity = R.length ? 0
        when 1 then @transform_type = 'observer'
        when 2 then @transform_type = 'transducer'
        else throw new Error "^mr.e#1^ fittings with arity #{arity} not implemented"
    #.......................................................................................................
    nameit 'ƒ', R if R.name is ''
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
    hide  @, '$',             nameit '$', @_remit.bind @
    hide  @, 'types',         get_types()
    hide  @, 'sources',       []
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
    @sources.push   R if R.transform_type is 'source'
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
  @my_type:       'mr_async_segment_cfg'
  @fittying_type: 'mr_async_source_fitting'

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
          throw new Error "^mr.e#3^ internal error: unknown transform type #{rpr @transform_type}"
      return 1
    return 0

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
    loop
      await @process()
      yield ( if d instanceof Promise then await d else d ) for d in @output
      @output.length = 0
      break if @has_finished
    return null


############################################################################################################
module.exports = { Segment, Async_segment, Reporting_collector, Pipeline, Async_pipeline, }


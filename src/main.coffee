
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
  get_base_types
  get_sync_types
  get_async_types
  get_transform_types   } = require './types'
stf                       = ( name ) -> stf_prefix + ( if Array.isArray name then name[ 0 ] else name )
transforms                = require './transforms'
noop                      = ->
entries                   = ( φ ) -> ( -> yield [ k, v, ] for k, v of φ )()
{ Pipeline_module }       = require './pipeline-module'


#===========================================================================================================
class Reporting_collector

  #---------------------------------------------------------------------------------------------------------
  constructor: ( callback ) ->
    hide @, 'callback', callback
    hide @, 'd',        []
    GUY.props.def @,  'length',   get: ( -> @d.length ), set: ( ( x ) -> @d.length = x )
    return undefined

  #---------------------------------------------------------------------------------------------------------
  push:        ( d ) -> @callback +1; @d.push d
  unshift:     ( d ) -> @callback +1; @d.unshift d
  pop:               -> @callback -1; @d.pop()
  shift:             -> @callback -1; @d.shift()
  [Symbol.iterator]: -> yield from @d

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
    @idx              = cfg.idx
    @protocol         = cfg.protocol
    @input            = cfg.input
    @output           = cfg.output
    @has_finished     = null
    @role             = null
    @_on_before_walk  = noop
    @first            = cfg.modifiers.first
    @last             = cfg.modifiers.last
    @start            = cfg.modifiers.start
    @stop             = cfg.modifiers.stop
    @_set_transform cfg.fitting
    hide @, '_send', send = ( d ) => @output.push d; d ### 'inner' send method ###
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _set_transform: ( fitting ) ->
    sigil = null
    #.......................................................................................................
    fitting_type      = @types.type_of fitting
    { role
      transform     } = @_transform_from_fitting fitting_type, fitting
    #.......................................................................................................
    name            = if transform.name is '' then 'ƒ' else transform.name
    nameit name, transform
    @has_finished   = false if role is 'source'
    @role = role
    hide @, 'transform', transform
    return null

  #---------------------------------------------------------------------------------------------------------
  _transform_from_fitting: ( type, source ) ->
    unless ( method = @[stf type] )?
      throw new Error "^mr.e#2^ unable to convert a #{type} to a transform"
    return method.call @, source

  #---------------------------------------------------------------------------------------------------------
  ### NOTE in the below code, `φ` has been used as an abbreviation for 'fitting' ###

  #---------------------------------------------------------------------------------------------------------
  [stf'producer_fitting']: ( φ ) ->
    @_on_before_walk  = ->
      source          = φ()
      @transform      = ( @_transform_from_fitting ( @types.type_of source ), source ).transform
      @has_finished   = false
      return null
    return { role: 'source', transform: φ, }

  #---------------------------------------------------------------------------------------------------------
  [stf'generator']: ( φ ) ->
    transform = ( send ) =>
      return null if @has_finished
      dsc           = φ.next()
      @has_finished = dsc.done
      send dsc.value unless @has_finished
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'text']: ( φ ) ->
    letter_re = /./uy
    transform = nameit '√txt', ( send ) =>
      return null if @has_finished
      unless ( match = φ.match letter_re )?
        @has_finished = true
        return null
      send match[ 0 ]
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'generatorfunction']:   ( φ ) -> @[stf'generator'] φ()
  [stf'arrayiterator']:       ( φ ) -> @[stf'generator'] φ
  [stf'setiterator']:         ( φ ) -> @[stf'generator'] φ
  [stf'mapiterator']:         ( φ ) -> @[stf'generator'] φ
  #.........................................................................................................
  [stf'transducer_fitting']:  ( φ ) -> { role: 'transducer',  transform: φ, }
  [stf'observer_fitting']:    ( φ ) -> { role: 'observer',    transform: φ, }
  #.........................................................................................................
  [stf'list']:   ( φ ) -> R = @[stf'generator'] φ.values();  R.transform = nameit '√lst', R.transform; R
  [stf'object']: ( φ ) -> R = @[stf'generator'] entries φ;   R.transform = nameit '√obj', R.transform; R
  [stf'set']:    ( φ ) -> R = @[stf'generator'] φ.values();  R.transform = nameit '√set', R.transform; R
  [stf'map']:    ( φ ) -> R = @[stf'generator'] φ.entries(); R.transform = nameit '√map', R.transform; R

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  ### 'outer' send method ###
  send: ( d ) -> @input.push d; d

  #---------------------------------------------------------------------------------------------------------
  _is_my_modifier: ( x ) -> ( x is @start ) or ( x is @first ) or ( x is @last ) or ( x is @stop )

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
          @_send      d unless @_is_my_modifier d
          @protocol { segment: @, d, }
        when 'transducer'
          @transform d, @_send
          @protocol { segment: @, d, }
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
    ### TAINT use @cfg, @state to separate static, dynamic properties ###
    clasz             = @constructor
    hide  @, 'types',   clasz.type_getter()
    cfg               = @types.create.pipeline_cfg cfg
    @datacount        = 0
    @input            = @_new_collector()
    @output           = [] ### pipeline output buffer does not participate in datacount ###
    @segments         = []
    hide  @, 'protocol',          if cfg.protocol then @_protocol.bind @ else noop
    hide  @, 'has_started',       false
    hide  @, 'journal',           []
    hide  @, '_last_output',      misfit
    hide  @, '_journal_template', {}
    hide  @, '$',                 nameit '$', @_segment_from_fitting.bind @
    def   @, 'sources',           get: -> Object.freeze ( s for s in @segments when s.role is 'source' )
    def   @, 'has_finished',      get: -> ( @datacount < 1 ) and @sources.every ( s ) -> s.has_finished
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _new_collector:                   -> new Reporting_collector ( delta ) => @datacount += delta


  #=========================================================================================================
  # PROTOCOL
  #---------------------------------------------------------------------------------------------------------
  _protocol: ( j = null ) ->
    # @_prepare_journal() if @journal.length is 0
    d       = {}
    d.step  = @journal.length
    d.i     = @_prpr @input
    for segment in @segments
      d[ "#{segment.idx} #{segment.transform.name}" ] = ' '
      d[ "◊ #{segment.idx}"                         ] = ' '
    if j?
      d[ "#{j.segment.idx} #{j.segment.transform.name}" ] = @_prpr j.d
      d[ "◊ #{j.segment.idx}"                           ] = @_prpr j.segment.output
    if @_last_output isnt misfit then d.o = @_last_output; @_last_output = misfit
    else                              d.o = @_prpr @output
    @journal.push d
    return null

  #---------------------------------------------------------------------------------------------------------
  _prpr: ( x ) ->
    ### `rpr()` for the protocol ###
    R = rpr x
    if @types.isa.collector x
      return ' ' if x.length is 0
      return R[ 2 ... R.length - 2 ]
    else if @types.isa.symbol x
      return R.replace /^Symbol\((.*)\)$/, 'Σ $1'
    return R

  # #---------------------------------------------------------------------------------------------------------
  # _prepare_journal: ->
  #   @_journal_template = j = {}
  #   for segment in @segments
  #     j[ "i#{segment.idx}" ] = []
  #     j[ "n#{segment.idx}" ] = segment.transform.name
  #   j[ "o#{segment?.idx ? 0}" ] = null
  #   return null

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
      output              = @output
    else
      prv_segment         = @segments[ count - 1 ]
      prv_segment.output  = @_new_collector()
      input               = prv_segment.output
      output              = @output
    #.......................................................................................................
    if @types.isa.segment fitting
      R         = fitting
      R.input   = input
      R.output  = output
    else
      segment_cfg = { idx: @segments.length, protocol: @protocol, modifiers, input, fitting, output, }
      try R = new @constructor.segment_class segment_cfg catch error
        error.message = error.message + "\n\n^mr.e#4^ unable to convert a #{@types.type_of fitting} into a segment"
        throw error
    ### TAINT this part should be simplified; we do it so methods `Segment::_transform_from_$type()` can
    make use of the global `$()` method to define transforms. ###
    return @_segment_from_fitting R.transform.values... if @types.isa.proto_segment R.transform
    return R

  #---------------------------------------------------------------------------------------------------------
  push: ( P... ) ->
    R = P[ 0 ]
    ### TAINT move below line to types ###
    if ( R is Pipeline_module or (R::) instanceof Pipeline_module )
      R = new R()
    if R instanceof Pipeline_module
      for transform from R
        @push transform
    else
      if @types.isa.sync_pipeline R
        @push segment for segment in R.segments
      else
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
    @protocol()
    @_before_walk()
    yield from @_walk()
    for _ from @_prepare_after_walk()
      yield from @_walk() unless @has_finished
    ### TAINT should use API ###
    @protocol()
    @_last_output = misfit
    return null

  #---------------------------------------------------------------------------------------------------------
  _before_walk: ->
    @push ( nameit '(dummy)', ( d ) -> ) if @segments.length is 0
    segment._on_before_walk()   for segment in @segments
    unless @has_started
      @has_started = true
      segment.send segment.start  for segment in @segments when segment.start isnt misfit
    segment.send segment.first  for segment in @segments when segment.first isnt misfit
    return null

  #---------------------------------------------------------------------------------------------------------
  _prepare_after_walk: ->
    for segment in @segments when segment.last isnt misfit
      segment.send segment.last
      yield null
    return null

  #---------------------------------------------------------------------------------------------------------
  stop_run:     -> [ @stop_walk()..., ]
  run_and_stop: -> [ @walk_and_stop()..., ]

  #---------------------------------------------------------------------------------------------------------
  stop_walk: ->
    for segment in @segments when segment.stop isnt misfit
      segment.send segment.stop
      yield from @_walk() unless @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  walk_and_stop: ->
    yield from @walk()
    yield from @stop_walk()
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk: ->
    loop
      @process()
      ### TAINT should use API ###
      @_last_output = @_prpr @output if @protocol?
      yield d for d in @output
      @output.length = 0
      break if @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  walk_named_pipelines: ( P... ) -> @constructor.walk_named_pipeline P...

  #---------------------------------------------------------------------------------------------------------
  @walk_named_pipelines: ( named_pipelines ) ->
    types = get_sync_types()
    types.validate.object.or.list named_pipelines
    #.......................................................................................................
    switch type = types.type_of named_pipelines
      when 'object'
        names     = Object.keys named_pipelines
        pipelines = ( v for k, v of named_pipelines )
      when 'list'
        names     = ( idx for _, idx in named_pipelines )
        pipelines = named_pipelines
    #.......................................................................................................
    process = ->
      loop
        for pipeline, idx in pipelines
          name = names[ idx ]
          pipeline.process()
          yield { name, data, } for data from pipeline.output
          pipeline.output.length = 0
        break if pipelines.every ( pipeline ) -> pipeline.has_finished
      return null
    #.......................................................................................................
    pipeline._before_walk() for pipeline in pipelines
    yield from process()
    for pipeline in pipelines
      for _ from pipeline._prepare_after_walk()
        yield from process()
    #.......................................................................................................
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
          @_send            d unless @_is_my_modifier d
          @protocol { segment: @, d, }
        when 'transducer'
          await @transform d, @_send
          @protocol { segment: @, d, }
        else
          throw new Error "^mr.e#5^ internal error: unknown transform type #{rpr @role}"
      return 1
    return 0

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgeneratorfunction']: ( φ ) -> @[stf'asyncgenerator'] φ()

  #---------------------------------------------------------------------------------------------------------
  [stf'asyncgenerator']: ( φ ) ->
    transform = ( send ) =>
      return null if @has_finished
      dsc           = await φ.next()
      @has_finished = dsc.done
      send dsc.value unless @has_finished
      return null
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'nodejs_readstream']: ( φ ) ->
    { Receiver }  = require 'jfee'
    rcv           = Receiver.from_readstream φ, { bare: true, }
    transform     = nameit '√readstream', ( @[stf'asyncgenerator'] rcv ).transform
    return { role: 'source', transform, }

  #---------------------------------------------------------------------------------------------------------
  [stf'nodejs_writestream']: ( φ ) ->
    last = Symbol 'last'
    return role: 'observer', transform: $ { last, }, ( d ) ->
      if d is last
        return await new Promise ( resolve ) ->
          φ.end -> resolve()
          # φ.close()
      return await new Promise ( resolve ) ->
        φ.write d, -> resolve()

  #---------------------------------------------------------------------------------------------------------
  [stf'async_pipeline']: ( φ ) ->
    transform = nameit 'pipeline', ( d, send ) ->
      φ.send d
      send e for e in await φ.run()
      return null
    return { role: 'transducer', transform, }



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
    @protocol()
    await @_before_walk()
    await yield from @_walk()
    for _ from @_prepare_after_walk()
      await yield from @_walk() unless @has_finished
    ### TAINT should use API ###
    @protocol()
    @_last_output = misfit
    return null

  #---------------------------------------------------------------------------------------------------------
  _before_walk: ->
    @push ( nameit '(dummy)', ( d ) -> ) if @segments.length is 0
    await segment._on_before_walk()   for segment in @segments
    await segment.send segment.first  for segment in @segments when segment.first isnt misfit
    return null

  #---------------------------------------------------------------------------------------------------------
  _prepare_after_walk: ->
    for segment in @segments when segment.last isnt misfit
      segment.send segment.last
      yield null
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk: ->
    loop
      await @process()
      ### TAINT should use API ###
      @_last_output = @_prpr @output if @protocol?
      yield d for d in @output
      @output.length = 0
      break if @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  stop_run:     -> [ ( await @stop_walk()     )..., ]
  run_and_stop: -> [ ( await @walk_and_stop() )..., ]

  #---------------------------------------------------------------------------------------------------------
  stop_walk: ->
    for segment in @segments when segment.stop isnt misfit
      segment.send segment.stop
      yield from await @_walk() unless @has_finished
    return null

  #---------------------------------------------------------------------------------------------------------
  walk_and_stop: ->
    yield from await @walk()
    yield from await @stop_walk()
    return null

  #---------------------------------------------------------------------------------------------------------
  @walk_named_pipelines: ( named_pipelines ) ->
    types = get_async_types()
    types.validate.object.or.list named_pipelines
    #.......................................................................................................
    switch type = types.type_of named_pipelines
      when 'object'
        names     = Object.keys named_pipelines
        pipelines = ( v for k, v of named_pipelines )
      when 'list'
        names     = ( idx for _, idx in named_pipelines )
        pipelines = named_pipelines
    #.......................................................................................................
    process = ->
      loop
        for pipeline, idx in pipelines
          name = names[ idx ]
          await pipeline.process()
          yield { name, data, } for data from pipeline.output
          pipeline.output.length = 0
        break if pipelines.every ( pipeline ) -> pipeline.has_finished
      return null
    #.......................................................................................................
    await pipeline._before_walk() for pipeline in pipelines
    await yield from process()
    for pipeline in pipelines
      for _ from pipeline._prepare_after_walk()
        await yield from process()
    #.......................................................................................................
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
  Pipeline_module
  transforms
  Proto_segment
  $
  get_base_types
  get_sync_types
  get_async_types
  get_transform_types
  misfit }


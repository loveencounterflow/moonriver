
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'MOONRIVER'
debug                     = CND.get_logger 'debug',     badge
warn                      = CND.get_logger 'warn',      badge
info                      = CND.get_logger 'info',      badge
urge                      = CND.get_logger 'urge',      badge
help                      = CND.get_logger 'help',      badge
whisper                   = CND.get_logger 'whisper',   badge
echo                      = CND.echo.bind CND
GUY                       = require 'guy'
types                     = new ( require 'intertype' ).Intertype()
{ isa
  type_of
  validate }              = types
# { Moonriver }             = require '../../../apps/moonriver'
UTIL                      = require 'util'
misfit                    = Symbol 'misfit'

#-----------------------------------------------------------------------------------------------------------
symbol                    = GUY.lft.freeze
  drop:       Symbol.for 'drop'   # this value will not go to output
  exit:       Symbol.for 'exit'   # exit pipeline processing
  # done:       Symbol.for 'done' # done for this iteration
  over:       Symbol.for 'over'   # do not call again in this round

#-----------------------------------------------------------------------------------------------------------
add_length_prop = ( target, key ) ->
  GUY.props.def target, 'length',
    get:        -> @[ key ].length
    set: ( x )  -> @[ key ].length = x

#-----------------------------------------------------------------------------------------------------------
pluck = ( o, k, fallback = undefined ) ->
  R = o[ k ]
  delete o[ k ]
  return if R is undefined then fallback else R


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Duct

  #---------------------------------------------------------------------------------------------------------
  @C: GUY.lft.freeze
    misfit:       misfit
    defaults:
      constructor:
        on_change:    null
        is_oblivious: false

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    cfg           = { @constructor.C.defaults.constructor..., cfg..., }
    @is_oblivious = pluck cfg, 'is_oblivious'
    @on_change    = pluck cfg, 'on_change'
    @cfg          = GUY.lft.freeze @cfg
    @d            = []
    @transform    = null ### transform to be called when data arrives ###
    @prv_length   = 0
    add_length_prop @, 'd'
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _on_change: ->
    delta       = @length - @prv_length
    @prv_length = @length
    @on_change? delta
    return null

  #---------------------------------------------------------------------------------------------------------
  set_oblivious: ( onoff ) ->
    validate.boolean onoff
    throw new Error "^XXX@1^ cannot set to oblivious unless duct is empty" if onoff and @length > 0
    @is_oblivious = onoff
    return null

  #---------------------------------------------------------------------------------------------------------
  push: ( x ) ->
    return null if @is_oblivious
    R = @d.push x
    @_on_change()
    return R

  #---------------------------------------------------------------------------------------------------------
  pop: ( fallback = misfit ) ->
    if @d.length is 0
      return fallback unless fallback is misfit
      throw new Error "^XXX@1^ cannot pop() from empty list"
    R = @d.pop()
    @_on_change()
    return R

  #---------------------------------------------------------------------------------------------------------
  unshift: ( x ) ->
    return null if @is_oblivious
    R = @d.unshift x
    @_on_change()
    return R

  #---------------------------------------------------------------------------------------------------------
  shift: ( fallback = misfit ) ->
    if @d.length is 0
      return fallback unless fallback is misfit
      throw new Error "^XXX@1^ cannot shift() from empty list"
    return null if @is_oblivious
    R = @d.shift()
    @_on_change()
    return R

  #---------------------------------------------------------------------------------------------------------
  clear: ->
    @d.length = 0
    @_on_change()
    return null

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield d for d in @d; return null

  #---------------------------------------------------------------------------------------------------------
  toString:               ->
    return '[X]' if @is_oblivious
    return ( rpr @d ) # + ' ➡︎ ' + ( @transform?.name ? './.' )
  [UTIL.inspect.custom]:  -> @toString()


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Segment

  #---------------------------------------------------------------------------------------------------------
  constructor: ( raw_transform, idx ) ->
  # constructor: ( modifiers..., raw_transform ) ->
  #   throw new Error "^segment@1^ modifiers not implemented" if modifiers.length > 0
    @idx              = idx
    @call_count       = 0
    @input            = null
    @output           = null
    @modifiers        = null
    @arity            = null
    @_is_over         = false
    @has_exited       = false
    # @is_listener      = false
    @is_sender        = false
    @is_source        = false
    @transform        = @_transform_from_raw_transform raw_transform
    GUY.props.def @, '_has_input_data', get: => @input.length > 0
    GUY.props.def @, 'is_over',         get: => @_is_over
    return undefined

  #---------------------------------------------------------------------------------------------------------
  set_input: ( duct ) ->
    @input = duct
    return null

  #---------------------------------------------------------------------------------------------------------
  set_output: ( duct ) ->
    @output = duct
    return null

  #---------------------------------------------------------------------------------------------------------
  set_is_over: ( onoff ) ->
    validate.boolean onoff
    @_is_over = onoff
    return null

  #---------------------------------------------------------------------------------------------------------
  set_call_count: ( call_count ) ->
    validate.cardinal call_count
    @call_count = call_count
    return null

  #---------------------------------------------------------------------------------------------------------
  _transfer: ->
    @output.push @input.shift() while @input.length > 0
    return null

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _transform_from_raw_transform: ( raw_transform ) ->
    { is_sender
      is_source
      is_repeatable
      modifiers
      transform     } = @_get_transform raw_transform
    @arity            = transform.length
    # @is_listener       = not ( modifiers.do_once_before or modifiers.do_once_after )
    ### TAINT do not treat modifier `is_source` different from others ###
    @is_source        = is_source or ( pluck modifiers, 'is_source', false )
    @modifiers        = modifiers
    @is_sender        = is_sender
    @is_repeatable    = is_repeatable
    #...................................................................................................
    if @is_sender
      if @modifiers.once_after_last
        @call = ( d ) =>
          @call_count++
          @transform @modifiers.first, @send if ( @call_count is 1 ) and @modifiers.do_first
          @transform @send
          return null
      else
        @call = ( d ) =>
          @call_count++
          @transform @modifiers.first, @send if ( @call_count is 1 ) and @modifiers.do_first
          @transform d, @send
          return null
    #...................................................................................................
    else
      @call = ( d ) =>
        @call_count++
        @transform @modifiers.first if ( @call_count is 1 ) and @modifiers.do_first
        @transform d
        @send d
        return null
    #...................................................................................................
    @send = ( d ) =>
      switch d
        when symbol.drop  then  null
        when symbol.over  then  @set_is_over true
        when symbol.exit  then  @has_exited = true
        else
          if @is_over
            throw new Error "^moonriver@1^ cannot send values after pipeline has terminated; " \
              + "error occurred in segment idx #{@idx} (#{rpr @_name_of_transform()})"
          @output.push d
      return null
    #...................................................................................................
    @send.symbol      = symbol
    @send.over        = => @send symbol.over
    @send.exit        = => @send symbol.exit
    # GUY.props.hide segment, 'send', send
    # GUY.props.hide segment, 'call', call
    # @pipeline.push        segment
    # @on_once_before.push  segment if modifiers.do_once_before
    # @on_once_after.push   segment if modifiers.do_once_after
    # @on_last.push         segment if modifiers.do_last
    # @sources.push         segment if is_source
    # @inputs.push    input
    return transform

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _get_transform: ( raw_transform ) ->
    if ( type_of raw_transform ) is 'modified_transform'
      modifiers = raw_transform.modifiers
      transform = @_get_transform_2 raw_transform.transform, modifiers
    else
      modifiers = {}
      transform = @_get_transform_2 raw_transform, modifiers
    #.......................................................................................................
    return { modifiers, transform..., }

  #---------------------------------------------------------------------------------------------------------
  _get_transform_2: ( raw_transform, modifiers ) ->
    is_source     = false
    is_sender     = true
    is_repeatable = true
    switch type = type_of raw_transform
      when 'function'
        switch ( arity = raw_transform.length )
          when 1
            is_sender = modifiers.once_after_last is true
            transform = raw_transform
          when 2
            if modifiers.once_after_last is true
              throw new Error "^moonriver@2^ transform with arity 2 not implemented for modifier once_after_last"
            transform = raw_transform
          else
            throw new Error "^moonriver@3^ transform with arity #{arity} not implemented"
      when 'generatorfunction'
        is_source       = true
        transform       = @_source_from_generatorfunction raw_transform
        unless ( arity = transform.length ) is 2
          throw new Error "^moonriver@4^ expected function with arity 2 got one with arity #{arity}"
      when 'list'
        is_source       = true
        transform       = @_source_from_list raw_transform
      else
        if ( type is 'generator' ) or ( isa.function raw_transform[ Symbol.iterator ] )
          is_repeatable   = false
          is_source       = true
          transform       = @_source_from_generator raw_transform
          unless ( arity = transform.length ) is 2
            throw new Error "^moonriver@5^ expected function with arity 2 got one with arity #{arity}"
        else
          throw new Error "^moonriver@6^ cannot convert a #{type} to a source"
    transform = transform.bind @
    return { is_sender, is_source, is_repeatable, transform, }

  #---------------------------------------------------------------------------------------------------------
  _source_from_generatorfunction: ( generatorfunction ) ->
    generator = null
    return genfΔ = ( d, send ) ->
      generator ?= generatorfunction()
      send d unless d is symbol.drop
      { value
        done  } = generator.next()
      ### NOTE silently discards value of `return` where present in keeping with JS `for of` loops ###
      return send value unless done
      generator = null
      send.over()
      return null

  #---------------------------------------------------------------------------------------------------------
  _source_from_generator: ( generator ) ->
    return genΔ = ( d, send ) ->
      send d unless d is symbol.drop
      { value
        done  } = generator.next()
      ### NOTE silently discards value of `return` where present in keeping with JS `for of` loops ###
      return send value unless done
      send.over()
      return null

  #---------------------------------------------------------------------------------------------------------
  _source_from_list: ( list ) ->
    last_idx  = list.length - 1
    idx       = -1
    return listΔ = ( d, send ) ->
      send d unless d is symbol.drop
      idx++
      if idx > last_idx
        idx = -1
        return send.over()
      send list[ idx ]
      return null

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _name_of_transform: ->
    return '???'    unless @transform?
    return '(anon)' unless @transform.name?
    return @transform.name.replace /^bound /, ''

  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]:  -> @toString()
  toString:               ->
    parts = []
    parts.push ( rpr @input ) + ' ➡︎ '
    parts.push @_name_of_transform() + ' ➡︎ ' + ( rpr @output )
    return parts.join ' '


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Modified_transform

  #---------------------------------------------------------------------------------------------------------
  @C = GUY.lft.freeze
    # known_modifications: new Set [ 'once_before', 'first', 'last', 'once_after', ]
    known_modifications: new Set [ 'is_source', 'once_after_last', ]

  #---------------------------------------------------------------------------------------------------------
  constructor: ( modifiers..., transform ) ->
    @modifiers                = Object.assign {}, modifiers...
    for key of @modifiers
      continue if @constructor.C.known_modifications.has key
      throw new Error "^moonriver@7^ unknown modifiers key #{rpr key}"
    # @modifiers.do_once_before = true if @modifiers.once_before  isnt undefined
    # @modifiers.do_first       = true if @modifiers.first        isnt undefined
    # @modifiers.do_last        = true if @modifiers.last         isnt undefined
    # @modifiers.do_once_after  = true if @modifiers.once_after   isnt undefined
    @modifiers.once_after_last  = modifiers.once_after_last if modifiers.once_after_last?
    @modifiers.is_source        = modifiers.is_source if modifiers.is_source?
    @transform                  = transform
    return undefined


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Moonriver

  #---------------------------------------------------------------------------------------------------------
  @$: ( modifiers..., transform ) -> new Modified_transform modifiers..., transform

  #---------------------------------------------------------------------------------------------------------
  constructor: ( transforms = null ) ->
    @data_count     = 0
    @segments       = []
    @turns          = 0
    @inputs         = []
    @sources        = []
    # @on_last        = []
    # @on_once_before = []
    ### TAINT not a good name for a collection of segments ###
    @on_once_after_last  = []
    @user           = {} ### user area for sharing state between transforms, etc ###
    add_length_prop @, 'segments'
    @push transform for transform from transforms if transforms?
    #.......................................................................................................
    GUY.props.def @, 'sources_are_repeatable',  get: => @sources.every ( x ) -> x.is_repeatable
    GUY.props.def @, 'can_repeat',              get: => @turns is 0 or @is_repeatable
    GUY.props.def @, 'first_segment',           get: => @segments[ 0 ]
    GUY.props.def @, 'last_segment',            get: => @segments[ @segments.length - 1 ]
    #.......................................................................................................
    return undefined

  #---------------------------------------------------------------------------------------------------------
  push: ( transform ) ->
    segment = new Segment transform, @segments.length
    if segment.modifiers.once_after_last is true
      @push moal_helper = ( d, send ) -> send d
      @on_once_after_last.push segment
      # segment.set_input new Duct { on_change: @on_change, }
      segment.set_output @last_segment.input
    else
      if ( last_segment = @last_segment )?
        segment.set_input last_segment.output
        last_segment.output.set_oblivious false
      else
        segment.set_input new Duct { on_change: @on_change, }
      segment.set_output new Duct { on_change: @on_change, is_oblivious: true, }
      @segments.push segment
    @sources.push segment if segment.is_source
    return segment

  #---------------------------------------------------------------------------------------------------------
  on_change: ( delta ) =>
    @data_count += delta
    return null

  #---------------------------------------------------------------------------------------------------------
  [Symbol.iterator]: -> yield segment for segment in @segments; return null

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _on_drive_start: ->
    return false unless @sources_are_repeatable
    @turns++
    return true

  #---------------------------------------------------------------------------------------------------------
  drive: ( cfg ) ->
    throw new Error "^moonriver@8^ pipeline is not repeatable" unless @_on_drive_start()
    R     = @_drive cfg
    for segment in @on_once_after_last
      segment.call symbol.drop
      # @_drive { continue: true, first_idx: segment.idx, }
      @_drive { continue: true, }
    return R

  #---------------------------------------------------------------------------------------------------------
  _drive: ( cfg ) ->
    ### TAINT validate `cfg` ###
    defaults        = { mode: 'breadth', continue: false, first_idx: 0, last_idx: -1, }
    cfg             = { defaults..., cfg..., }
    first_idx       = cfg.first_idx
    last_idx        = cfg.last_idx
    last_idx        = if last_idx >= 0 then last_idx else @segments.length + last_idx
    do_exit         = false
    ### TAINT check for last_idx >= first_idx, last_idx < segments.length and so on ###
    return null if @segments.length is 0
    unless cfg.continue
      for collection in [ @segments, @on_once_after_last, ]
        for segment in collection
          segment.set_call_count  0
          segment.set_is_over     false
    #.......................................................................................................
    ###
    for segment in @on_once_before
      segment.call segment.modifiers.once_before
    ###
    #.......................................................................................................
    loop
      for idx in [ first_idx .. last_idx ]
        segment = @segments[ idx ]
        # debug '^443^', ( @toString idx ), { XXX_count: @XXX_count, idx, data_count: @data_count, }, segment
        #...................................................................................................
        # if ( segment.is_over or not segment.is_listener )
        if segment.is_over
          ### If current segment has signalled it's gone out of business for this lap or is not a listener
          in the first place, route all data on its input queue to its output queue: ###
          ### TAINT rewrite to single step operation using Array::splice() ###
          ### TAINT taking non-listeners out of the pipeline would speed this up but also somehwat
          complicate the construction ###
          ### TAINT code duplication ###
          segment._transfer()
          continue
        #...................................................................................................
        if segment.is_source
            ### If current segment is a source, trigger the transform with a discardable `drop` value: ###
          if segment._has_input_data
            ### TAINT code duplication ###
            segment._transfer()
          segment.call symbol.drop
        #...................................................................................................
        else
          ### Otherwise, call transform with next value from input queue, if any; when in operational mode
          `breadth`, repeat until input queue is empty: ###
          while segment.input.length > 0
            segment.call segment.input.shift()
            break if cfg.mode is 'depth'
        #...................................................................................................
        ### Stop processing if the `exit` signal has been received: ###
        if segment.exit then do_exit = true; break
      break if do_exit
      #.....................................................................................................
      ### When all sources have called it quits and no more input queues have data, end processing: ###
      ### TAINT collect stats in above loop ###
      if @sources.every ( source ) -> source.is_over
        if @data_count is 0
        # unless @inputs.some ( input ) -> input.length > 0
          # debug '^453453^', "recognized pipeline exhausted"
          # debug '^453453^', @segments[ 2 ].send Symbol.for 'before_last'
          # continue
          break
    # #.......................................................................................................
    # ### Call all transforms that have the `last` modifier, then all transforms with the `once_after`
    # modifier, skipping those that have signalled `over` or `exit`: ###
    # ### TAINT make `last` and `once_after` mutually exclusive ###
    # for segment in @on_last
    #   continue if segment.is_over or segment.exit
    #   segment.is_over = true
    #   segment.call segment.modifiers.last, false
    # #.......................................................................................................
    # for segment in @on_once_after
    #   continue if segment.is_over or segment.exit
    #   segment.is_over = true
    #   segment.call segment.modifiers.once_after, false
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  send: ( d ) ->
    @segments[ 0 ].input.push d unless d is symbol.drop
    @_drive { continue: true, }

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  [UTIL.inspect.custom]: -> @toString()

  #---------------------------------------------------------------------------------------------------------
  toString: ( current_idx ) ->
    parts       = []
    joiner      = CND.grey ' ▶︎ '
    prv_output  = null
    for segment, idx in @segments
      parts.push CND.green rpr segment.input unless segment.input is prv_output
      parts.push \
        if idx is current_idx then CND.reverse  CND.gold segment._name_of_transform() \
        else                                    CND.gold segment._name_of_transform()
      parts.push CND.green rpr segment.output
      prv_output = segment.output
    return parts.join joiner
    # return parts.join ' — '




############################################################################################################
module.exports = { Moonriver, Segment, Duct, }



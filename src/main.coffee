
'use strict'


############################################################################################################
CND                       = require 'cnd'
rpr                       = CND.rpr
badge                     = 'PSEUDO-ARRAY'
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
pluck = ( o, k ) -> R = o[ k ]; delete o[ k ]; return R


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
  toString:               ->
    return '[X]' if @is_oblivious
    return ( rpr @d ) # + ' ➡︎ ' + ( @transform?.name ? './.' )
  [UTIL.inspect.custom]:  -> @toString()


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Segment

  #---------------------------------------------------------------------------------------------------------
  constructor: ( raw_transform ) ->
  # constructor: ( modifiers..., raw_transform ) ->
  #   throw new Error "^segment@1^ modifiers not implemented" if modifiers.length > 0
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
    @input  = duct
    return null

  #---------------------------------------------------------------------------------------------------------
  set_output: ( duct ) ->
    @output  = duct
    return null

  #---------------------------------------------------------------------------------------------------------
  set_is_over: ( onoff ) ->
    validate.boolean onoff
    @_is_over = onoff
    return null

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _transform_from_raw_transform: ( raw_transform ) ->
    { is_sender
      is_source
      is_repeatable
      modifications
      transform     } = @_get_transform raw_transform
    @arity            = transform.length
    # @is_listener       = not ( modifications.do_once_before or modifications.do_once_after )
    @modifications    = {} ### !!!!!!!!!!!!!!!!!!!!!!!!!! ###
    @is_sender        = is_sender
    @is_source        = is_source
    @is_repeatable    = is_repeatable
    #...................................................................................................
    if @is_sender
      if @modifications.do_once_after
        throw new Error "^moonriver@2^ transforms with modifier once_after cannot be senders"
      @call = ( d, _ ) =>
        @send.call_count++
        if ( @send.call_count is 1 ) and @modifications.do_first
          @transform @modifications.first, @send
        @transform d, @send
        return null
    #...................................................................................................
    else
      @call = ( d, forward = true ) =>
        @send.call_count++
        if ( @send.call_count is 1 ) and @modifications.do_first
          @transform @modifications.first
        @transform d
        @send d if forward \
          and ( not @modifications.do_once_before ) and ( not @modifications.do_once_after )
        return null
    #...................................................................................................
    # call        = call.bind segment
    @send = ( d ) =>
      switch d
        when symbol.drop  then  null
        when symbol.over  then  @set_is_over true
        when symbol.exit  then  @has_exited = true
        else
          throw new Error "^moonriver@3^ cannot send values after pipeline has terminated;" \
            + "error occurred in transform idx #{idx} (#{rpr segment.transform.name})" if @is_over
          @output.push d
      return null
    #...................................................................................................
    # send            = send.bind segment
    @send.symbol      = symbol
    @send.over        = => @send symbol.over
    @send.exit        = => @send symbol.exit
    @send.call_count  = 0
    # GUY.props.hide segment, 'send', send
    # GUY.props.hide segment, 'call', call
    # @pipeline.push        segment
    # @on_once_before.push  segment if modifications.do_once_before
    # @on_once_after.push   segment if modifications.do_once_after
    # @on_last.push         segment if modifications.do_last
    # @sources.push         segment if is_source
    # @inputs.push    input
    return transform

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _get_transform: ( raw_transform ) ->
    if ( type_of raw_transform ) is 'XXXXXXXXXXXXXXXXXtransform_with_modifications'
      modifications = raw_transform.modifications
      transform     = @_get_transform_2 raw_transform.transform
    else
      modifications = {}
      transform     = @_get_transform_2 raw_transform
    #.......................................................................................................
    return { modifications, transform..., }

  #---------------------------------------------------------------------------------------------------------
  _get_transform_2: ( raw_transform ) ->
    is_source     = false
    is_sender     = true
    is_repeatable = true
    switch type = type_of raw_transform
      when 'function'
        switch ( arity = raw_transform.length )
          when 0
            throw new Error "^moonriver@4^ zero-arity transform not implemented"
          when 1
            is_sender = false
            transform = raw_transform
          when 2
            transform = raw_transform
          else
            throw new Error "^moonriver@5^ expected function with arity 2 got one with arity #{arity}"
      when 'generatorfunction'
        is_source       = true
        transform       = @_source_from_generatorfunction raw_transform
        unless ( arity = transform.length ) is 2
          throw new Error "^moonriver@6^ expected function with arity 2 got one with arity #{arity}"
      when 'list'
        is_source       = true
        transform       = @_source_from_list raw_transform
      else
        if ( type is 'generator' ) or ( isa.function raw_transform[ Symbol.iterator ] )
          is_repeatable   = false
          is_source       = true
          transform       = @_source_from_generator raw_transform
          unless ( arity = transform.length ) is 2
            throw new Error "^moonriver@7^ expected function with arity 2 got one with arity #{arity}"
        else
          throw new Error "^moonriver@8^ cannot convert a #{type} to a source"
    transform = transform.bind @
    return { is_sender, is_source, is_repeatable, transform, }

  #---------------------------------------------------------------------------------------------------------
  _source_from_generatorfunction: ( generatorfunction ) ->
    generator = null
    return generatorfunction_source = ( d, send ) ->
      generator ?= generatorfunction()
      send d
      { value
        done  } = generator.next()
      ### NOTE silently discards value of `return` where present in keeping with JS `for of` loops ###
      return send value unless done
      generator = null
      send.over()
      return null

  #---------------------------------------------------------------------------------------------------------
  _source_from_generator: ( generator ) ->
    return generator_source = ( d, send ) ->
      send d
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
    return list_source = ( d, send ) ->
      send d
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
class Moonriver

  #---------------------------------------------------------------------------------------------------------
  constructor: ( transforms = null ) ->
    @data_count     = 0
    @segments       = []
    @turns          = 0
    @inputs         = []
    @sources        = []
    # @on_last        = []
    # @on_once_before = []
    # @on_once_after  = []
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
    segment = new Segment transform
    if ( last_segment = @last_segment )?
      segment.set_input last_segment.output
      last_segment.output.set_oblivious false
    else
      segment.set_input new Duct { on_change: @on_change, }
    segment.set_output new Duct { on_change: @on_change, is_oblivious: true, }
    @segments.push  segment
    @sources.push   segment if segment.is_source
    return null

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
    ### TAINT validate `cfg` ###
    throw new Error "^moonriver@9^ pipeline is not repeatable" unless @_on_drive_start()
    return null if @segments.length is 0
    defaults        = { mode: 'depth', continue: false, }
    cfg             = { defaults..., cfg..., }
    segment.set_is_over false for segment in @segments unless cfg.continue
    do_exit         = false
    #.......................................................................................................
    ###
    for segment in @on_once_before
      segment.call segment.modifications.once_before
    ###
    #.......................................................................................................
    loop
      whisper '^534-1^', '-----------------------------'
      for segment, idx in @segments
        # urge '^534-2^', idx, @
        # debug '^534-2^', idx, segment
        #...................................................................................................
        # if ( segment.is_over or not segment.is_listener )
        if segment.is_over
          ### If current segment has signalled it's gone out of business for this lap or is not a listener
          in the first place, route all data on its input queue to its output queue: ###
          ### TAINT rewrite to single step operation using Array::splice() ###
          ### TAINT taking non-listeners out of the pipeline would speed this up but also somehwat
          complicate the construction ###
          segment.output.push segment.input.shift() while segment.input.length > 0
          continue
        #...................................................................................................
        # if segment.is_source then debug '^592^', { has_input_data: segment._has_input_data}
        if segment.is_source and not segment._has_input_data
          ### If current segment is a source and no inputs are waiting to be sent, trigger the transform by
          calling  with a discardable `drop` value: ###
          segment.call symbol.drop
        #...................................................................................................
        else
          ### Otherwise, call transform with next value from input queue, if any; when in operational mode
          `breadth`, repeat until input queue is empty: ###
          # debug '^309-4^', segment.input
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
    #   segment.call segment.modifications.last, false
    # #.......................................................................................................
    # for segment in @on_once_after
    #   continue if segment.is_over or segment.exit
    #   segment.is_over = true
    #   segment.call segment.modifications.once_after, false
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  send: ( d ) ->
    @segments[ 0 ].input.push d
    @drive { continue: true, }

  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  toString:               -> rpr @segments
  [UTIL.inspect.custom]:  -> @toString()


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
demo_2 = ->
  mr1 = new Moonriver()
  mr2 = new Moonriver()
  #.........................................................................................................
  mr1.push [ 1, 4, ]
  mr1.push [ 2, 5, 7, ]
  mr1.push [ 3, 6, ]
  mr1.push ( d ) -> yield e for e in Array.from 'abc'
  # mr1.push show      = ( d ) -> help CND.reverse '^332-1^', d
  mr1.push show     = ( d ) -> help CND.reverse '^332-2^', d
  # mr1.push tee      = ( d, send ) -> mr2.send d; send d
  # mr1.push multiply = ( d, send ) -> send d * 100
  # mr1.push tee      = ( d, send ) -> mr2.send d; send d
  # mr1.push show     = ( d ) -> urge CND.reverse '^332-2^', d
  # #.........................................................................................................
  # mr2.push add      = ( d, send ) -> send d + 300
  # mr2.push show     = ( d ) -> info CND.reverse '^332-3^', d
  # #.........................................................................................................
  # mr1.drive()
  ### can send additional inputs: ###
  help '^343-1^', mr1
  help '^343-1^', mr2
  # mr1.send Symbol.for 'exit'
  mr1.send Symbol.for 'drop'
  # mr1.send 100
  help '^343-2^', mr1
  # mr1.send 200
  # help '^343-3^', mr1
  # mr1.drive { continue: true, }
  # help '^343-4^', mr1
  return null


############################################################################################################
if module is require.main then do =>
  demo_2()
  # f = -> return @a
  # d = { a: 42, f, }
  # e = GUY.lft.freeze d
  # info d.f()
  # info e.f()
  # info f == d.f == e.f





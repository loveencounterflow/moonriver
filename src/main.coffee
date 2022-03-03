
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
symbol                    = GUY.lft.freeze
  misfit:     Symbol.for 'misfit' # this value indicates absence of a value so can use `null`, `undefined`
  drop:       Symbol.for 'drop'   # this value will not go to output
  exit:       Symbol.for 'exit'   # exit pipeline processing
  # done:       Symbol.for 'done' # done for this iteration
  over:       Symbol.for 'over'   # do not call again in this round



#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class Modifications

  #---------------------------------------------------------------------------------------------------------
  constructor: ( modifications..., transform ) ->
    @modifications  = Object.assign {}, modifications...
    @transform      = transform
    # debug '^43957397^', @
    return undefined


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Classmethods

  # #---------------------------------------------------------------------------------------------------------
  # @$once = ( f ) ->


#===========================================================================================================
#
#-----------------------------------------------------------------------------------------------------------
class @Moonriver extends @Classmethods

  #---------------------------------------------------------------------------------------------------------
  @$: ( modifications..., transform ) -> new Modifications modifications..., transform

  #---------------------------------------------------------------------------------------------------------
  @C = GUY.lft.freeze
    symbol: symbol
    defaults:
      modifications:
        once_before:  symbol.misfit
        first:        symbol.misfit
        last:         symbol.misfit
        once_after:   symbol.misfit

  #---------------------------------------------------------------------------------------------------------
  constructor: ( raw_pipeline ) ->
    super()
    @first_input    = []
    @last_output    = []
    @pipeline       = []
    last_idx        = raw_pipeline.length - 1
    @inputs         = []
    @sources        = []
    @on_last        = []
    @on_once_before = []
    @on_once_after  = []
    @user           = {} ### user area for sharing state between transforms, etc ###
    @run_count      = 0
    @is_repeatable  = true
    for raw_transform, idx in raw_pipeline
      { is_sender
        is_source
        modifications
        transform     } = @_get_transform raw_transform
      do ( is_sender, is_source, modifications, transform, idx ) =>
        arity       = transform.length
        input       = if idx is 0         then @first_input else @pipeline[ idx - 1 ].output
        output      = if idx is last_idx  then @last_output else []
        segment     = { modifications, transform, arity, input, output, \
                          over: false, exit: false, is_sender, is_source, }
        #...................................................................................................
        if is_sender
          if modifications.once_after isnt symbol.misfit
            throw new Error "^moonriver@1^ transforms with once_after cannot be senders"
          call = ( d ) ->
            @send.call_count++
            if ( @send.call_count is 1 ) and ( ( first = @modifications.first ) isnt symbol.misfit )
              @transform first, @send
            @transform d, @send
            return null
        #...................................................................................................
        else
          call = ( d ) ->
            @send.call_count++
            if ( @send.call_count is 1 ) and ( ( first = @modifications.first ) isnt symbol.misfit )
              @transform first
            @transform d
            @send d unless ( @modifications.once_before isnt symbol.misfit ) or \
                           ( @modifications.once_after  isnt symbol.misfit )
            return null
        #...................................................................................................
        call        = call.bind segment
        send        = ( d ) ->
          switch d
            when symbol.drop  then  null
            when symbol.over  then  @over = true
            when symbol.exit  then  @exit = true
            else
              throw new Error "^moonriver@2^ cannot send values after pipeline has terminated" if @over
              @output.push d
          return null
        send            = send.bind segment
        send.symbol     = symbol
        send.over       = -> send send.symbol.over
        send.exit       = -> send send.symbol.exit
        send.call_count = 0
        GUY.props.hide segment, 'send', send
        GUY.props.hide segment, 'call', call
        @pipeline.push        segment
        @on_once_before.push  segment if modifications.once_before  isnt symbol.misfit
        @on_once_after.push   segment if modifications.once_after   isnt symbol.misfit
        @on_last.push         segment if modifications.last         isnt symbol.misfit
        @sources.push         segment if is_source
        @inputs.push    input
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _get_transform: ( raw_transform ) ->
    modifications = { @constructor.C.defaults.modifications..., }
    if ( type_of raw_transform ) is 'modifications'
      Object.assign modifications, raw_transform.modifications
      transform     = @_get_transform_2 raw_transform.transform
    else
      transform     = @_get_transform_2 raw_transform
    return { modifications, transform..., }

  #---------------------------------------------------------------------------------------------------------
  _get_transform_2: ( raw_transform ) ->
    is_source     = false
    is_sender     = true
    switch type = type_of raw_transform
      when 'function'
        switch ( arity = raw_transform.length )
          when 0
            throw new Error "^moonriver@3^ zero-arity transform not implemented"
          when 1
            is_sender = false
            transform = raw_transform
          when 2
            transform = raw_transform
          else
            throw new Error "^moonriver@4^ expected function with arity 2 got one with arity #{arity}"
      when 'generatorfunction'
        is_source       = true
        transform       = @_source_from_generatorfunction raw_transform
        unless ( arity = transform.length ) is 2
          throw new Error "^moonriver@5^ expected function with arity 2 got one with arity #{arity}"
      when 'list'
        is_source       = true
        transform       = @_source_from_list raw_transform
      else
        if ( type is 'generator' ) or ( isa.function raw_transform[ Symbol.iterator ] )
          @is_repeatable  = false
          is_source       = true
          transform       = @_source_from_generator raw_transform
          unless ( arity = transform.length ) is 2
            throw new Error "^moonriver@6^ expected function with arity 2 got one with arity #{arity}"
        else
          throw new Error "^moonriver@7^ cannot convert a #{type} to a source"
    transform = transform.bind @
    return { is_sender, is_source, transform, }

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

  #---------------------------------------------------------------------------------------------------------
  can_repeat: -> @run_count is 0 or @repeatable

  #---------------------------------------------------------------------------------------------------------
  _on_drive_start: ->
    return false unless @can_repeat()
    @run_count++
    return true

  #---------------------------------------------------------------------------------------------------------
  drive: ( cfg ) ->
    ### TAINT validate `cfg` ###
    throw new Error "^moonriver@8^ pipeline is not repeatable" unless @_on_drive_start()
    defaults      = { mode: 'depth', }
    { mode      } = { defaults..., cfg..., }
    segment.over  = false for segment in @pipeline
    do_exit       = false
    #.......................................................................................................
    for segment in @on_once_before
      segment.call segment.modifications.once_before
    #.......................................................................................................
    loop
      for segment in @pipeline
        #...................................................................................................
        if segment.over
          ### If current segment has signalled it's gone out of business for this lap, route all data on its
          input queue to its output queue: ###
          ### TAINT rewrite to single step operation using Array::splice() ###
          segment.output.push segment.input.shift() while segment.input.length > 0
          continue
        #...................................................................................................
        if segment.is_source and segment.input.length is 0
          ### If current segment is a source and no inputs are waiting to be sent, trigger the transform by
          calling  with a discardable `drop` value: ###
          segment.call symbol.drop
        #...................................................................................................
        else
          ### Otherwise, call transform with next value from input queue, if any; when in operational mode
          `breadth`, repeat until input queue is empty: ###
          while segment.input.length > 0
            segment.call segment.input.shift()
            break if mode is 'depth'
        #...................................................................................................
        ### Discard any data that has made it to the final output queue of the pipeline: ###
        @last_output.length = 0 if @last_output.length isnt 0
        #...................................................................................................
        ### Stop processing if the `exit` signal has been received: ###
        if segment.exit then do_exit = true; break
      break if do_exit
      #.....................................................................................................
      ### When all sources have called it quits and no more input queues have data, end processing: ###
      ### TAINT collect stats in above loop ###
      if @sources.every ( source ) -> source.over
        unless @inputs.some ( input ) -> input.length > 0
          break
    #.......................................................................................................
    ### Call all transforms that have the `last` modifier, then all transforms with the `once_after`
    modifier, skipping those that have signalled `over` or `exit`: ###
    ### TAINT make `last` and `once_after` mutually exclusive ###
    for segment in @on_last
      continue if segment.over or segment.exit
      segment.over = true
      segment.call segment.modifications.last
    #.......................................................................................................
    for segment in @on_once_after
      continue if segment.over or segment.exit
      segment.over = true
      segment.call segment.modifications.once_after
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _show_pipeline: ->
    urge @inputs[ 0 ]
    for segment in @pipeline
      urge segment.transform.name ? '?', segment.output
    return null





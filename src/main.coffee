
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
  @C =
    symbol =
      drop:       Symbol.for 'drop' # this value will not go to output
      exit:       Symbol.for 'exit' # exit pipeline processing
      # done:       Symbol.for 'done' # done for this iteration
      over:       Symbol.for 'over' # do not call again in this round

  #---------------------------------------------------------------------------------------------------------
  constructor: ( raw_pipeline ) ->
    super()
    @first_input    = []
    @last_output    = []
    @pipeline       = []
    last_idx        = raw_pipeline.length - 1
    @inputs         = []
    @sources        = []
    @user           = {} ### user area for sharing state between transforms, etc ###
    @run_count      = 0
    @is_repeatable  = true
    for raw_transform, idx in raw_pipeline
      { is_sender
        is_source
        transform } = @_get_transform raw_transform
      do ( is_sender, is_source, transform, idx ) =>
        arity       = transform.length
        input       = if idx is 0         then @first_input else @pipeline[ idx - 1 ].output
        output      = if idx is last_idx  then @last_output else []
        segment     = { transform, arity, input, output, over: false, exit: false, is_sender, is_source, }
        if is_sender then call  = ( d ) -> @send.call_count++; @transform d, @send;   return null
        else              call  = ( d ) -> @send.call_count++; @transform d; @send d; return null
        call        = call.bind segment
        send        = ( d ) ->
          switch d
            when symbol.drop  then  null
            when symbol.over  then  @over = true
            when symbol.exit  then  @exit = true
            else @output.push d
          return null
        send            = send.bind segment
        send.symbol     = symbol
        send.over       = -> send send.symbol.over
        send.exit       = -> send send.symbol.exit
        send.call_count = 0
        GUY.props.hide segment, 'send', send
        GUY.props.hide segment, 'call', call
        @pipeline.push  segment
        @sources.push   segment if is_source
        @inputs.push    input
    return undefined

  #---------------------------------------------------------------------------------------------------------
  _get_transform: ( raw_transform ) ->
    is_source = false
    is_sender = true
    switch type = type_of raw_transform
      when 'function'
        switch ( arity = raw_transform.length )
          when 0
            throw new Error "^moonriver@1^ zero-arity transform not implemented"
          when 1
            is_sender = false
            transform = raw_transform
          when 2
            transform = raw_transform
          else
            throw new Error "^moonriver@1^ expected function with arity 2 got one with arity #{arity}"
      when 'generatorfunction'
        is_source       = true
        transform       = @_source_from_generatorfunction raw_transform
        unless ( arity = transform.length ) is 2
          throw new Error "^moonriver@2^ expected function with arity 2 got one with arity #{arity}"
      when 'list'
        is_source       = true
        transform       = @_source_from_list raw_transform
      else
        if ( type is 'generator' ) or ( isa.function raw_transform[ Symbol.iterator ] )
          @is_repeatable  = false
          is_source       = true
          transform       = @_source_from_generator raw_transform
          unless ( arity = transform.length ) is 2
            throw new Error "^moonriver@3^ expected function with arity 2 got one with arity #{arity}"
        else
          throw new Error "^moonriver@4^ cannot convert a #{type} to a source"
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
    throw new Error "^moonriver@5^ pipeline is not repeatable" unless @_on_drive_start()
    defaults      = { mode: 'depth', }
    { mode      } = { defaults..., cfg..., }
    segment.over  = false for segment in @pipeline
    loop
      for segment, idx in @pipeline
        if segment.over
          segment.output.push segment.input.shift() while segment.input.length > 0
          continue
        if segment.is_source and segment.input.length is 0
          segment.call symbol.drop
        else
          while segment.input.length > 0
            segment.call segment.input.shift()
            break if mode is 'depth'
        @last_output.length = 0
        throw symbol.exit if segment.exit
      ### TAINT collect stats in above loop ###
      if @sources.every ( source ) -> source.over
        unless @inputs.some ( input ) -> input.length > 0
          break
    return null

  #---------------------------------------------------------------------------------------------------------
  _show_pipeline: ->
    urge @inputs[ 0 ]
    for segment in @pipeline
      urge segment.transform.name ? '?', segment.output
    return null








# MoonRiver



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [MoonRiver](#moonriver)
  - [Notes](#notes)
    - [Symbols and Signals](#symbols-and-signals)
    - [Transforms are Bound to Moonriver Instance (Where Possible)](#transforms-are-bound-to-moonriver-instance-where-possible)
  - [Asynchronous Sources and Asynchronous Transforms](#asynchronous-sources-and-asynchronous-transforms)
    - [The Remit Method `$()`](#the-remit-method-)
      - [Modifiers](#modifiers)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# MoonRiver

## Notes

* 🚧 Work in progress 🚧
* see [here](https://github.com/loveencounterflow/hengist/tree/master/dev/moonriver/src) for examples and
  tests
* in pipelines,
  * <del>a function with zero arguments will be called for its result; the result can take on any role (source,
    transform, or sink)</del> <ins>under review</ins>
  * a function with one argument will be called only with the current data item `d`; its return value will
    be discarded (so-called observers)
  * use `$map f` to turn an ordinary synchronous function into a transform
  * a function with two arguments will be called once for each lap; it must return a value that can be used
    as a transform ( such as a list of values, an iterator, a function with arity 2 and so on)

### Symbols and Signals

Symbols enjoy a special status in MoonRiver as they are used to send signals to guide the processing of data
in pipelines. Here


```coffee
symbol =
  misfit:     Symbol.for 'misfit' # this value indicates absence of a value so can use `null`, `undefined`
  drop:       Symbol.for 'drop'   # this value will not go to output
  exit:       Symbol.for 'exit'   # exit pipeline processing
  over:       Symbol.for 'over'   # do not call again in this round
  value:      Symbol.for 'value'  # represents the current `d` value going down the pipeline
  # once:       Symbol.for 'once'   # signals wish of transform to be called only once
```



### Transforms are Bound to Moonriver Instance (Where Possible)

* all transforms will be bound to the Moonriver instance (a.k.a. 'the pipeline') they are part of, so from
  within the function body one can access the `this` property (`@` in CoffeeScript) to access that object.
  Pass in a bound function or a fat arrow function (defined with `=>`) to opt out of `this` (pun intended).

* This is one more reason to use higher order functions (factory functions for functions) instead of plain,
  'direct' functions for transforms. The way this works means if one just passed around a plain function to
  do work independently in several pipelines (totally doable), then the `this` property in the second and
  third and so on pipelines would always refere to the *first* pipeline (because a bound function will not
  get re-bound when its `f.bind()` is called). This is surprising and very probably not what one wants.
  Using the factory pattern (`$tf = -> return ( d, send ) -> ...`) avoids this pitfall.

* While one will not want to mess with the pipeline's properties directly outside of using the API,
  Moonriver instances have an initially empty object called `user` which is intended to be used to share
  data across all transforms in the pipeline.

## Asynchronous Sources and Asynchronous Transforms

* Asynchronous transforms are not yet supported.
* Asynchronous sources are not yet supported, either, but one can simulate them as shown in this test case:

```coffee
@can_use_asyncfunction_as_source = ( T, done ) ->
  # T?.halt_on_error()
  GUY           = require '../../../apps/guy'
  { Moonriver } = require '../../../apps/moonriver'
  { $ }         = Moonriver
  collector     = []
  mr            = new Moonriver()
  #.......................................................................................................
  count = 0
  get_source = ( send ) ->
    return -> new Promise ( resolve ) ->
      # `GUY.async.after()` is a nicer version of `setTimeout()`
      GUY.async.after 0.2, -> count++; info count; send count; resolve()
  #.......................................................................................................
  mr.push show = ( d ) -> urge '^4948-1^', d
  mr.push collect = ( d ) -> collector.push d
  source = get_source mr.send.bind mr
  for _ in [ 1 .. 5 ]
    await source()
  #.........................................................................................................
  T?.eq collector, [ 1, 2, 3, 4, 5 ]
  done?()
  return null
```

Reading lines from a NodeJS read stream can be accomplished with the help of a library like
[`readlines-ng`](https://github.com/iximiuz/readlines-ng/blob/master/index.js):

```coffee
@can_use_nodejs_readable_stream_as_source = ( T, done ) ->
  # T?.halt_on_error()
  GUY             = require '../../../apps/guy'
  { Moonriver }   = require '../../../apps/moonriver'
  { readlines }   = require 'readlines-ng'
  FS              = require 'node:fs'
  path            = PATH.join __dirname, '../../../assets/short-proposal.mkts.md'
  source          = FS.createReadStream path, { encoding: 'utf-8', }
  collector       = []
  mr              = new Moonriver()
  mr.push show    = ( d ) -> urge '^4948-1^', d
  mr.push collect = ( d ) -> collector.push d
  #.......................................................................................................
  count         = 0
  for await line from readlines source
    count++
    continue if count > 5
    mr.send line
    ### to achieve interleaving of data ingestion steps and data processing steps use `sleep 0`; ###
    ### here we use a bigger value to demonstrate that output actually happens in a piecemeal fashion: ###
    info count
    await GUY.async.sleep 0.2
  #.........................................................................................................
  T?.eq collector, [ '<title>A Proposal</title>', '<h1>Motivation</h1>', '<p>It has been suggested to further the cause.</p>', '<p>This is <i>very</i> desirable indeed.</p>', '' ]
  done?()
  return null
```

### The Remit Method `$()`

The 'Dollar sign' or 'remit' method is an optional device used to implement transform variations. By way of
example, one often wants a given transform in a pipeline to deal with setup or teardown tasks, and hence
to know whether the transform is being called for the first or the last time, or configure it to be called
only once.

```coffee
{ Moonriver } = require 'moonriver'
{ $ }         = Moonriver
first         = Symbol 'first'
$my_setup_transform = $ { first, }, ( d ) ->
  if d is first
    do_setup()
  return null

pipeline = [
  source
  $my_setup_transform()
  ...
  ]

mr = new Moonriver pipeline
mr.drive()
```

#### Modifiers

* `once_before_first`:
  * called exactly once;
  * called with the associated value;
  * called *before* any data is sent down pipeline;
  * *always* called, even if pipeline should be empty.
* `first`:
  * called with the associated value;
  * also called with all other data items;
  * called *before* the first data item comes down the pipeline;
  * *not* called if pipeline should be empty.
* `last`:
  * called with the associated value;
  * also called with all other data items;
  * called *after* the last data item has come down the pipeline;
  * *not* called if pipeline should be empty;
  * **NB** transforms modified with `last` can send values, but not after the point the transform has been
    called with the associated value for `last` as the pipeline has already finished by then.
* `once_after_last`:
  * a boolean;
  * transform must be unary with signature `( send ) ->`, so no data passed in
  * transform to be called exactly once per turn *after* all other data is sent down pipeline;
  * *always* called, even if pipeline should be empty.


* Modes
  * `drive()` can use modes `breadth`, `depth`; proper ordering of data items only guaranteed in mode
    `breadth` (the default)

## To Do

* **[–]** make modifiers `first`, `last` mutually exclusive with both `once_before_first` `once_after_last`
* **[–]** consider to mark `first`, `last` etc. on `send()`
* **[–]** turn more attributes into fiddle-proof managed properties
* **[–]** use callback-based messaging for `is_over` so no more iteration over sources to find which ones have
  finished (NB any transform can announce `over`)
* **[–]** validate input to `new Moonriver()`
* **[–]** do not send any value into transforms modified as `once_before_first`, `once_after_last`
* **[–]** review usage of `is_repeatable` in `drive()`

## Is Done

* **[+]** sort-of fixed behavior of `is_repeatable` in `drive()`









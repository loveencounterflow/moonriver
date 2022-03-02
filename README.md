


# MoonRiver



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [MoonRiver](#moonriver)
  - [Notes](#notes)
    - [Symbols and Signals](#symbols-and-signals)
    - [Transforms are Bound to Moonriver Instance (Where Possible)](#transforms-are-bound-to-moonriver-instance-where-possible)
    - [The Remit Method `$()`](#the-remit-method-)
      - [Modifiers](#modifiers)
  - [To Do](#to-do)

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

* `once_before`:
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
  * *not* called if pipeline should be empty.
* `once_after`:
  * called exactly once;
  * called with the associated value;
  * called *after* any data is sent down pipeline;
  * *always* called, even if pipeline should be empty.

## To Do


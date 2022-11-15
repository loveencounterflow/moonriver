


# MoonRiver



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [MoonRiver](#moonriver)
  - [Async Pipelines](#async-pipelines)
  - [Common Tasks](#common-tasks)
    - [Iterate over Lines of a File](#iterate-over-lines-of-a-file)
  - [Glossary](#glossary)
  - [List of Implemented Transforms](#list-of-implemented-transforms)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

![moonriver](artwork/moonriver.png)

# MoonRiver

This is the incipient new version 2 of `moonriver`; install v1 for the functionally more complete previous
version (also see [documentation for v1](./README-v1.md)).

## Async Pipelines

Can return `new Promise()` from (formally sync) function:

```coffee
demo_3 = ->
  { Pipeline
    Async_pipeline }  = require '../../../apps/moonriver'
  p = new Async_pipeline()
  p.push [ 1, 2, 3, ]
  p.push ( d ) -> whisper 'Ⅱ', rpr d
  p.push ( d, send ) -> send new Promise ( resolve ) -> GUY.async.after 0.1, -> resolve d * 3
  p.push ( d ) -> whisper 'Ⅲ', rpr d
  info '^98-6^', await p.run() # [ 3, 6, 9, ]
  return null
```

Can use async function using `await`:

```coffee
demo_3b = ->
  echo '—————————————————————————————————————————————'
  { Pipeline
    Async_pipeline
    Segment
    Async_segment } = require '../../../apps/moonriver'
  after  = ( dts, f  ) => new Promise ( resolve ) -> setTimeout ( -> resolve f() ), dts * 1000
  p = new Async_pipeline()
  p.push [ 1, 2, 3, ]
  p.push show_2 = ( d ) -> whisper 'Ⅱ', rpr d
  p.push mul_3b = ( d, send ) -> send await after 0.1, -> d * 3
  p.push show_2 = ( d ) -> whisper 'Ⅲ', rpr d
  info '^24-7^', p
  info '^24-8^', await p.run() # [ 3, 6, 9, ]
  return null
```

## Common Tasks

### Iterate over Lines of a File

* Can use `GUY.fs.walk_lines()` which gives you a synchronous iterator over lines of a (UTF-8-encoded) file:

```coffee
p = new Pipeline()
p.push GUY.fs.walk_lines __filename
p.push $do_something_with_one_line()
p.run()
```

* using a NodeJS `ReadableStream` with Transform `$split_lines()`:

```coffee
FS                  = require 'node:fs'
{ Async_pipeline, \
  transforms: T,  } = require '../../../apps/moonriver'
p = new Async_pipeline()
p.push FS.createReadStream __filename # , { highWaterMark: 50, }
p.push T.$split_lines()
p.push show = ( d ) -> whisper 'Ⅱ', rpr d
await p.run()
```

**NB** this stream is asynchronous because of the `ReadableStream`; `$split_lines()` is synchronous.

## Glossary

* **`fitting`**: a value that may be used as (the central part of) a transform in a pipeline. This may be a
  function of arity 2 (a transducer), a list (a source) &c.
* **`transform`**: one of the serial elements that constitute a pipeline. While a `fitting` may be of
  various types, a `transform` is always a function. `transform`s have a `type` attribute which takes one of
  the following values:
  * **`source`**: a `transform` that does not take any arguments and will yield one value per call. There
    are two kinds of `source`s:
  * **`repeatable sources`** or **`source factories`** are (synchronous or asynchronous)
    [nullary](https://en.wikipedia.org/wiki/Arity#Nullary) functions that return a nonrepeatable source
    when called.
  * **`nonrepeatable sources`** or **`proper sources`** are all values whose type (as returned by `type =
    pipeline.types.type_of x`) is recognized by the segment class (i.e. for which there is a method named
    `Segment::_source_transform_from_$type()`)
  * **`observer`**: a `transform` that takes one argument (the current value) and does not send any values
    into the pipeline; the value an observer gets called with will be the same value that the next
    transformer will be called with. Note that if an observer receives a mutable value it can modify it and
    thereby affect one data item at a time.
  * **`transducer`**: a `transform` that takes two arguments, the current data item and a `send()` function
    that can be used any number of times to send values to the ensuing transform.
  * **`duct`**: `observer`s and `transducer`s are collectively called `duct`s as opposed to `source`s

## List of Implemented Transforms

* `(async)function`s:
  * nullary `(async)function`: a repeatable source; its return value must be a proper source.
  * unary `(async)function`s: an observer, to be called as `fn d`, where `d` is the current data item.
  * binary `(async)function`s: a transducer, to be called as `fn d, send`, where `send()` is a function to
    be called by the transducer any number of times with any kind of values (but with exactly one value each
    time).
* `text`s (i.e. `String`s): adds the text's codepoints to the stream.
* `list`s (i.e. `Array`s): adds the list's elements to the stream.
* `(async)generatorfunction`s: will be called once to obtain an `(async)generator`, for which see below.
* `(async)generator`s: adds the generator's yielded values to the stream.
* `set`s: adds the set's elements to the stream.
* `objects`s: adds the object's attributes as `[ key, value, ]` pairs to the stream.
* `maps`s: adds the map's entries as `[ key, value, ]` pairs to the stream.

## To Do

* **[–]** documentation
* **[–]** implement modifiers `first`, `last` (and `once_before_first` `once_after_last`?)
* **[–]** move source documentation from `Segment._as_transform()`
* **[–]** implement `start()` method that will signal all sources (with `Symbol 'start'`) to reset.
  Compliant sources that *can* reset themselves to be repeated must respond with `Symbol 'ok'`; all other
  return values will be interpreted as an error condition.
* **[–]** allow, document how to implement source adapters (`@_transform_from_*()`), probably by deriving
  from class `Segment`

## Is Done

* **[+]** v2 MVP
* **[+]** async sources, transducers






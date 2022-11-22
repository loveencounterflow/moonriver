


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
  - [Synchronous and Asynchronous Pipelines](#synchronous-and-asynchronous-pipelines)
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
* **`segment`**: one of the serial elements that constitute a pipeline. Each segment has a function called
* a **`transform`**. `transform`s have a `type` attribute which takes one of the following values:
  * An **`activator`** is a `transform` that provides data items for the pipeline. There are two kinds of
    `activator`s:
    * **`producer`s** are (synchronous or asynchronous)
      [nullary](https://en.wikipedia.org/wiki/Arity#Nullary) functions that return a `source` when called.
    * **`source`s** in turn are all values whose type (as returned by `type = pipeline.types.type_of x`) is
      recognized by the segment class (i.e. for which there is a method named
      `Segment::_source_transform_from_$type()`). Sources include lists, strings, generators, generator
      functions, maps, sets and so on.
  * **`duct`s** are fittings that are called if and when a data item is delivered to their position in the
    pipeline:
    * an **`observer`** is a function `f1 = ( d ) ->` that takes one argument (`d`, the current data item)
      and does not send any values into the pipeline; the value an observer gets called with will be the
      same value that the next transformer will be called with. Note that if an observer receives a mutable
      value it can modify it and thereby affect one data item at a time.
    * a **`transducer`** is a function `f2 = ( d, send ) ->` that takes two arguments: the current data item
      `d` and a `send` function that can be used any number of times to send values to the next transform
      down the line.

Without there being an `activator`, a pipeline will immediately finish without any results when its `run()`
method is called; this is the reason `producer`s and `source`s are called `activator`s—without them, a
pipeline will not do anything. That said, all pipelines do have a `send()` method which can be called with
data which will be buffered until `walk()` or `run()` are called.

## List of Implemented Transforms

* `(async)function`s:
  * nullary `(async)function`: a repeatable source; its return value must be a proper source.
  * unary `(async)function`: an observer, to be called as `fn d`, where `d` is the current data item.
  * binary `(async)function`: a transducer, to be called as `fn d, send`, where `send()` is a function to
    be called by the transducer any number of times with any kind of values (but with exactly one value each
    time).
* `text` (i.e. `String`): adds the text's codepoints to the stream.
* `list` (i.e. `Array`): adds the list's elements to the stream.
* `(async)generatorfunction`: will be called once to obtain an `(async)generator`, for which see below.
* `(async)generator`: adds the generator's yielded values to the stream.
* `set`: adds the set's elements to the stream.
* `object`: adds the object's attributes as `[ key, value, ]` pairs to the stream.
* `map`: adds the map's entries as `[ key, value, ]` pairs to the stream.
* `writestream`: adds like an `observer` with the side effect that data is written to the stream (and hence
  a file in case the wtream was created using `node:fs.createWriteStream()` or something similar). Observe
  that *no effort will be made to convert data items to comply with the requirements of a NodeJS
  `writestream`* and, in general, only `text`s, `buffer`s and `uint8array`s are acceptable inputs for
  transforms derived from a `writestream`.
  * (An implementation detail: the `role` of a segment derived from a `writestream` is `observer`, not
    something like `sink`, a concept that exist only informally in MoonRiver; a transform that writes to a
    file or some other receiver might as well be implemented as a transducer that modifies or holds back
    data should that make sense for the application at hand.)
* `readstream`: a stream created with something like `node:fs.createReadStream()` can act as a `source` in
  MoonRiver pipelines.

## Synchronous and Asynchronous Pipelines

Any pipeline that contains one or more explicitly or implicitly asynchronous segments must be created as `p
= new Async_pipeline()` and run as `await p.run()` or `for await d from p.walk()`. Asynchronous segments
include all segments derived from `asyncfunction`s, `asyncgeneratorfunction`s, `asyncgenerator`s,
`readstream`s, `writestream`s, and all `function`s that return a `Promise`.


## To Do

* **[–]** documentation
* **[–]** move source documentation from `Segment._as_transform()`
* **[–]** implement `start()` method that will signal all sources (with `Symbol 'start'`) to reset.
  Compliant sources that *can* reset themselves to be repeated must respond with `Symbol 'ok'`; all other
  return values will be interpreted as an error condition.
* **[–]** allow, document how to implement source adapters (`@_transform_from_*()`), probably by deriving
  from class `Segment`
* **[–]** does it make sense to implement Tees and Wyes?

## Is Done

* **[+]** v2 MVP
* **[+]** async sources, transducers
* **[+]** implement modifiers `first`, `last` <del>(and `once_before_first` `once_after_last`?)</del>






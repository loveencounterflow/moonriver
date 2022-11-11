


# MoonRiver



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [MoonRiver](#moonriver)
  - [Async Pipelines](#async-pipelines)
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

## To Do

* **[–]** documentation
* **[–]** implement modifiers `first`, `last` (and `once_before_first` `once_after_last`?)
* **[–]** async sources, transducers
* **[–]** move source documentation from `Segment._as_transform()`


## Is Done

* **[+]** v2 MVP






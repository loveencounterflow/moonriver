


# MoonRiver



<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [MoonRiver](#moonriver)
  - [Notes](#notes)
  - [Demo](#demo)
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
* all transforms will be bound to the pipeline they are part of, so from within the function body one can
  access the `this` property (`@` in CoffeeScript) to access that object. Pass in a bound function or a fat
  arrow function (defined with `=>`) to opt out of `this` (pun intended).
  * This is one more reason to use higher order functions (factory functions for functions) instead of
    plain, 'direct' functions for transforms. The way this works means if one just passed around a plain
    function to do work independently in several pipelines (totally doable), then the `this` property in the
    second and third and so on pipelines would always refere to the *first* pipeline (because a bound
    function will not get re-bound when its `f.bind()` is called). This is surprising and very probably not
    what one wants. Using the factory pattern (`$tf = -> return ( d, send ) -> ...`) avoids this pitfall.

## Demo

## To Do


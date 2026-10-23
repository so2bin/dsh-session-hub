/**
 * Host half of the Session Hub bundle.
 *
 * The floating session island is a Client-only surface rendered into the
 * frame-wide `shell.overlay` slot; the Host row exists so the bundle is part
 * of the composed profile and its Client module enters the Web plugin graph.
 * There is nothing to configure or serve from the Host.
 */
export function apply() {}

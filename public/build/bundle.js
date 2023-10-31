
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function ascending(a, b) {
      return a == null || b == null ? NaN
        : a < b ? -1
        : a > b ? 1
        : a >= b ? 0
        : NaN;
    }

    function bisector(f) {
      let delta = f;
      let compare = f;

      if (f.length === 1) {
        delta = (d, x) => f(d) - x;
        compare = ascendingComparator(f);
      }

      function left(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      }

      function right(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }

      function center(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function ascendingComparator(f) {
      return (d, x) => ascending(f(d), x);
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;

    var e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function ticks(start, stop, count) {
      var reverse,
          i = -1,
          n,
          ticks,
          step;

      stop = +stop, start = +start, count = +count;
      if (start === stop && count > 0) return [start];
      if (reverse = stop < start) n = start, start = stop, stop = n;
      if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

      if (step > 0) {
        let r0 = Math.round(start / step), r1 = Math.round(stop / step);
        if (r0 * step < start) ++r0;
        if (r1 * step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) * step;
      } else {
        step = -step;
        let r0 = Math.round(start * step), r1 = Math.round(stop * step);
        if (r0 / step < start) ++r0;
        if (r1 / step > stop) --r1;
        ticks = new Array(n = r1 - r0 + 1);
        while (++i < n) ticks[i] = (r0 + i) / step;
      }

      if (reverse) ticks.reverse();

      return ticks;
    }

    function tickIncrement(start, stop, count) {
      var step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log(step) / Math.LN10),
          error = step / Math.pow(10, power);
      return power >= 0
          ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
          : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
    }

    function tickStep(start, stop, count) {
      var step0 = Math.abs(stop - start) / Math.max(0, count),
          step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
          error = step0 / step1;
      if (error >= e10) step1 *= 10;
      else if (error >= e5) step1 *= 5;
      else if (error >= e2) step1 *= 2;
      return stop < start ? -step1 : step1;
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
        reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
        reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
        reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
        reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
        reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHex8: color_formatHex8,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHex8() {
      return this.rgb().formatHex8();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb() {
        return this;
      },
      clamp() {
        return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
      },
      displayable() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatHex8: rgb_formatHex8,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
    }

    function rgb_formatHex8() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
    }

    function rgb_formatRgb() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
    }

    function clampa(opacity) {
      return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
    }

    function clampi(value) {
      return Math.max(0, Math.min(255, Math.round(value) || 0));
    }

    function hex(value) {
      value = clampi(value);
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      clamp() {
        return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
      },
      displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl() {
        const a = clampa(this.opacity);
        return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
      }
    }));

    function clamph(value) {
      value = (value || 0) % 360;
      return value < 0 ? value + 360 : value;
    }

    function clampt(value) {
      return Math.max(0, Math.min(1, value || 0));
    }

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant(isNaN(a) ? b : a);
    }

    var rgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb(start, end) {
        var r = color((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb.gamma = rgbGamma;

      return rgb;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function string(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, rgb) : string)
          : b instanceof color ? rgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity$1(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisectRight(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity$1,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity$1) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity$1, rescale()) : clamp !== identity$1;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity$1, identity$1);
    }

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "−" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    /* src\IntervalsForProtein.svelte generated by Svelte v3.59.1 */

    const file$4 = "src\\IntervalsForProtein.svelte";

    function create_fragment$5(ctx) {
    	let g;
    	let line0;
    	let line1;
    	let line1_y__value;
    	let line1_y__value_1;
    	let line2;
    	let line2_y__value;
    	let line2_y__value_1;
    	let line3;
    	let line3_y__value;
    	let line3_y__value_1;
    	let circle;
    	let circle_cy_value;
    	let line4;
    	let line4_y__value;
    	let line4_y__value_1;
    	let line5;
    	let line5_y__value;
    	let line5_y__value_1;
    	let line6;
    	let line6_y__value;
    	let line6_y__value_1;
    	let text_1;
    	let t_value = /*datapoint*/ ctx[1].assay + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			circle = svg_element("circle");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(line0, "class", "grid svelte-r5opux");
    			attr_dev(line0, "x1", "0");
    			attr_dev(line0, "x2", "0");
    			attr_dev(line0, "y1", "0");
    			attr_dev(line0, "y2", "400");
    			add_location(line0, file$4, 31, 4, 606);
    			attr_dev(line1, "class", "iaf svelte-r5opux");
    			attr_dev(line1, "x1", "0");
    			attr_dev(line1, "x2", "0");
    			attr_dev(line1, "y1", line1_y__value = /*datapoint*/ ctx[1].min_iaf);
    			attr_dev(line1, "y2", line1_y__value_1 = /*datapoint*/ ctx[1].max_iaf);
    			add_location(line1, file$4, 34, 4, 672);
    			attr_dev(line2, "class", "iaf svelte-r5opux");
    			attr_dev(line2, "x1", "-3");
    			attr_dev(line2, "x2", "3");
    			attr_dev(line2, "y1", line2_y__value = /*datapoint*/ ctx[1].min_iaf);
    			attr_dev(line2, "y2", line2_y__value_1 = /*datapoint*/ ctx[1].min_iaf);
    			add_location(line2, file$4, 35, 4, 753);
    			attr_dev(line3, "class", "iaf svelte-r5opux");
    			attr_dev(line3, "x1", "-3");
    			attr_dev(line3, "x2", "3");
    			attr_dev(line3, "y1", line3_y__value = /*datapoint*/ ctx[1].max_iaf);
    			attr_dev(line3, "y2", line3_y__value_1 = /*datapoint*/ ctx[1].max_iaf);
    			add_location(line3, file$4, 36, 4, 835);
    			attr_dev(circle, "class", "sepsis svelte-r5opux");
    			attr_dev(circle, "cx", "0");
    			attr_dev(circle, "cy", circle_cy_value = /*datapoint*/ ctx[1].sepsis);
    			attr_dev(circle, "r", "3");
    			add_location(circle, file$4, 39, 4, 938);
    			attr_dev(line4, "class", "sepsis svelte-r5opux");
    			attr_dev(line4, "x1", "0");
    			attr_dev(line4, "x2", "0");
    			attr_dev(line4, "y1", line4_y__value = /*datapoint*/ ctx[1].min_sepsis);
    			attr_dev(line4, "y2", line4_y__value_1 = /*datapoint*/ ctx[1].max_sepsis);
    			add_location(line4, file$4, 40, 4, 999);
    			attr_dev(line5, "class", "sepsis svelte-r5opux");
    			attr_dev(line5, "x1", "-3");
    			attr_dev(line5, "x2", "3");
    			attr_dev(line5, "y1", line5_y__value = /*datapoint*/ ctx[1].min_sepsis);
    			attr_dev(line5, "y2", line5_y__value_1 = /*datapoint*/ ctx[1].min_sepsis);
    			add_location(line5, file$4, 41, 4, 1089);
    			attr_dev(line6, "class", "sepsis svelte-r5opux");
    			attr_dev(line6, "x1", "-3");
    			attr_dev(line6, "x2", "3");
    			attr_dev(line6, "y1", line6_y__value = /*datapoint*/ ctx[1].max_sepsis);
    			attr_dev(line6, "y2", line6_y__value_1 = /*datapoint*/ ctx[1].max_sepsis);
    			add_location(line6, file$4, 42, 4, 1180);
    			attr_dev(text_1, "x", "0");
    			attr_dev(text_1, "y", "0");
    			attr_dev(text_1, "dominant-baseline", "middle");
    			attr_dev(text_1, "transform", "translate(0,405) rotate(-90)");
    			attr_dev(text_1, "class", "svelte-r5opux");
    			add_location(text_1, file$4, 45, 4, 1298);
    			add_location(g, file$4, 29, 0, 528);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, line0);
    			append_dev(g, line1);
    			append_dev(g, line2);
    			append_dev(g, line3);
    			append_dev(g, circle);
    			append_dev(g, line4);
    			append_dev(g, line5);
    			append_dev(g, line6);
    			append_dev(g, text_1);
    			append_dev(text_1, t);

    			if (!mounted) {
    				dispose = listen_dev(g, "mouseover", /*mouseover_handler*/ ctx[2], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*datapoint*/ 2 && line1_y__value !== (line1_y__value = /*datapoint*/ ctx[1].min_iaf)) {
    				attr_dev(line1, "y1", line1_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line1_y__value_1 !== (line1_y__value_1 = /*datapoint*/ ctx[1].max_iaf)) {
    				attr_dev(line1, "y2", line1_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && line2_y__value !== (line2_y__value = /*datapoint*/ ctx[1].min_iaf)) {
    				attr_dev(line2, "y1", line2_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line2_y__value_1 !== (line2_y__value_1 = /*datapoint*/ ctx[1].min_iaf)) {
    				attr_dev(line2, "y2", line2_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && line3_y__value !== (line3_y__value = /*datapoint*/ ctx[1].max_iaf)) {
    				attr_dev(line3, "y1", line3_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line3_y__value_1 !== (line3_y__value_1 = /*datapoint*/ ctx[1].max_iaf)) {
    				attr_dev(line3, "y2", line3_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && circle_cy_value !== (circle_cy_value = /*datapoint*/ ctx[1].sepsis)) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty & /*datapoint*/ 2 && line4_y__value !== (line4_y__value = /*datapoint*/ ctx[1].min_sepsis)) {
    				attr_dev(line4, "y1", line4_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line4_y__value_1 !== (line4_y__value_1 = /*datapoint*/ ctx[1].max_sepsis)) {
    				attr_dev(line4, "y2", line4_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && line5_y__value !== (line5_y__value = /*datapoint*/ ctx[1].min_sepsis)) {
    				attr_dev(line5, "y1", line5_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line5_y__value_1 !== (line5_y__value_1 = /*datapoint*/ ctx[1].min_sepsis)) {
    				attr_dev(line5, "y2", line5_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && line6_y__value !== (line6_y__value = /*datapoint*/ ctx[1].max_sepsis)) {
    				attr_dev(line6, "y1", line6_y__value);
    			}

    			if (dirty & /*datapoint*/ 2 && line6_y__value_1 !== (line6_y__value_1 = /*datapoint*/ ctx[1].max_sepsis)) {
    				attr_dev(line6, "y2", line6_y__value_1);
    			}

    			if (dirty & /*datapoint*/ 2 && t_value !== (t_value = /*datapoint*/ ctx[1].assay + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('IntervalsForProtein', slots, []);
    	let { datapoint } = $$props;
    	let { selected_datapoint = undefined } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (datapoint === undefined && !('datapoint' in $$props || $$self.$$.bound[$$self.$$.props['datapoint']])) {
    			console.warn("<IntervalsForProtein> was created without expected prop 'datapoint'");
    		}
    	});

    	const writable_props = ['datapoint', 'selected_datapoint'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<IntervalsForProtein> was created with unknown prop '${key}'`);
    	});

    	const mouseover_handler = () => $$invalidate(0, selected_datapoint = datapoint);

    	$$self.$$set = $$props => {
    		if ('datapoint' in $$props) $$invalidate(1, datapoint = $$props.datapoint);
    		if ('selected_datapoint' in $$props) $$invalidate(0, selected_datapoint = $$props.selected_datapoint);
    	};

    	$$self.$capture_state = () => ({ datapoint, selected_datapoint });

    	$$self.$inject_state = $$props => {
    		if ('datapoint' in $$props) $$invalidate(1, datapoint = $$props.datapoint);
    		if ('selected_datapoint' in $$props) $$invalidate(0, selected_datapoint = $$props.selected_datapoint);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [selected_datapoint, datapoint, mouseover_handler];
    }

    class IntervalsForProtein extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { datapoint: 1, selected_datapoint: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IntervalsForProtein",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get datapoint() {
    		throw new Error("<IntervalsForProtein>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datapoint(value) {
    		throw new Error("<IntervalsForProtein>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected_datapoint() {
    		throw new Error("<IntervalsForProtein>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected_datapoint(value) {
    		throw new Error("<IntervalsForProtein>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\DetailsText.svelte generated by Svelte v3.59.1 */

    const file$3 = "src\\DetailsText.svelte";

    function create_fragment$4(ctx) {
    	let table;
    	let tr0;
    	let td0;
    	let td1;
    	let t1_value = /*datapoint*/ ctx[0].assay + "";
    	let t1;
    	let t2;
    	let tr1;
    	let td2;
    	let td3;
    	let t4_value = /*datapoint*/ ctx[0].sd_threshold + "";
    	let t4;
    	let t5;
    	let tr2;
    	let td4;
    	let td5;
    	let t7_value = /*datapoint*/ ctx[0].severe_sepsis_outcome_average + "";
    	let t7;
    	let t8;
    	let tr3;
    	let td6;
    	let td7;
    	let t10_value = /*datapoint*/ ctx[0].IAF_normals + "";
    	let t10;
    	let t11;
    	let tr4;
    	let td8;
    	let td9;
    	let t13_value = /*datapoint*/ ctx[0].IAF_lowerbound + "";
    	let t13;
    	let t14;
    	let tr5;
    	let td10;
    	let td11;
    	let t16_value = /*datapoint*/ ctx[0].IAF_upperbound + "";
    	let t16;
    	let t17;
    	let tr6;
    	let td12;
    	let td13;
    	let t19_value = /*datapoint*/ ctx[0].abs_difference_sepsissevere_IAF + "";
    	let t19;
    	let t20;
    	let tr7;
    	let td14;
    	let td15;
    	let t22_value = /*datapoint*/ ctx[0].lower_for_baseline_0 + "";
    	let t22;
    	let t23;
    	let tr8;
    	let td16;
    	let td17;
    	let t25_value = /*datapoint*/ ctx[0].upper_for_baseline_0 + "";
    	let t25;
    	let t26;
    	let tr9;
    	let td18;
    	let td19;
    	let t28_value = /*datapoint*/ ctx[0].difference_sepsissevere_IAF + "";
    	let t28;

    	const block = {
    		c: function create() {
    			table = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "assay";
    			td1 = element("td");
    			t1 = text(t1_value);
    			t2 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "sd_threshold";
    			td3 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "severe_sepsis_outcome_average";
    			td5 = element("td");
    			t7 = text(t7_value);
    			t8 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "IAF_normals";
    			td7 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			tr4 = element("tr");
    			td8 = element("td");
    			td8.textContent = "IAF_lowerbound";
    			td9 = element("td");
    			t13 = text(t13_value);
    			t14 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = "IAF_upperbound";
    			td11 = element("td");
    			t16 = text(t16_value);
    			t17 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "abs_difference_sepsissevere_IAF";
    			td13 = element("td");
    			t19 = text(t19_value);
    			t20 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			td14.textContent = "lower_for_baseline_0";
    			td15 = element("td");
    			t22 = text(t22_value);
    			t23 = space();
    			tr8 = element("tr");
    			td16 = element("td");
    			td16.textContent = "upper_for_baseline_0";
    			td17 = element("td");
    			t25 = text(t25_value);
    			t26 = space();
    			tr9 = element("tr");
    			td18 = element("td");
    			td18.textContent = "difference_sepsissevere_IAF";
    			td19 = element("td");
    			t28 = text(t28_value);
    			add_location(td0, file$3, 5, 8, 62);
    			add_location(td1, file$3, 5, 22, 76);
    			add_location(tr0, file$3, 5, 4, 58);
    			add_location(td2, file$3, 6, 8, 116);
    			add_location(td3, file$3, 6, 29, 137);
    			add_location(tr1, file$3, 6, 4, 112);
    			add_location(td4, file$3, 7, 8, 184);
    			add_location(td5, file$3, 7, 46, 222);
    			add_location(tr2, file$3, 7, 4, 180);
    			add_location(td6, file$3, 8, 8, 286);
    			add_location(td7, file$3, 8, 28, 306);
    			add_location(tr3, file$3, 8, 4, 282);
    			add_location(td8, file$3, 9, 8, 352);
    			add_location(td9, file$3, 9, 31, 375);
    			add_location(tr4, file$3, 9, 4, 348);
    			add_location(td10, file$3, 10, 8, 424);
    			add_location(td11, file$3, 10, 31, 447);
    			add_location(tr5, file$3, 10, 4, 420);
    			add_location(td12, file$3, 11, 8, 496);
    			add_location(td13, file$3, 11, 48, 536);
    			add_location(tr6, file$3, 11, 4, 492);
    			add_location(td14, file$3, 12, 8, 602);
    			add_location(td15, file$3, 12, 37, 631);
    			add_location(tr7, file$3, 12, 4, 598);
    			add_location(td16, file$3, 13, 8, 686);
    			add_location(td17, file$3, 13, 37, 715);
    			add_location(tr8, file$3, 13, 4, 682);
    			add_location(td18, file$3, 14, 8, 770);
    			add_location(td19, file$3, 14, 44, 806);
    			add_location(tr9, file$3, 14, 4, 766);
    			add_location(table, file$3, 4, 0, 46);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, td1);
    			append_dev(td1, t1);
    			append_dev(table, t2);
    			append_dev(table, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, td3);
    			append_dev(td3, t4);
    			append_dev(table, t5);
    			append_dev(table, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, td5);
    			append_dev(td5, t7);
    			append_dev(table, t8);
    			append_dev(table, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, td7);
    			append_dev(td7, t10);
    			append_dev(table, t11);
    			append_dev(table, tr4);
    			append_dev(tr4, td8);
    			append_dev(tr4, td9);
    			append_dev(td9, t13);
    			append_dev(table, t14);
    			append_dev(table, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, td11);
    			append_dev(td11, t16);
    			append_dev(table, t17);
    			append_dev(table, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, td13);
    			append_dev(td13, t19);
    			append_dev(table, t20);
    			append_dev(table, tr7);
    			append_dev(tr7, td14);
    			append_dev(tr7, td15);
    			append_dev(td15, t22);
    			append_dev(table, t23);
    			append_dev(table, tr8);
    			append_dev(tr8, td16);
    			append_dev(tr8, td17);
    			append_dev(td17, t25);
    			append_dev(table, t26);
    			append_dev(table, tr9);
    			append_dev(tr9, td18);
    			append_dev(tr9, td19);
    			append_dev(td19, t28);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*datapoint*/ 1 && t1_value !== (t1_value = /*datapoint*/ ctx[0].assay + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*datapoint*/ 1 && t4_value !== (t4_value = /*datapoint*/ ctx[0].sd_threshold + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*datapoint*/ 1 && t7_value !== (t7_value = /*datapoint*/ ctx[0].severe_sepsis_outcome_average + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*datapoint*/ 1 && t10_value !== (t10_value = /*datapoint*/ ctx[0].IAF_normals + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*datapoint*/ 1 && t13_value !== (t13_value = /*datapoint*/ ctx[0].IAF_lowerbound + "")) set_data_dev(t13, t13_value);
    			if (dirty & /*datapoint*/ 1 && t16_value !== (t16_value = /*datapoint*/ ctx[0].IAF_upperbound + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*datapoint*/ 1 && t19_value !== (t19_value = /*datapoint*/ ctx[0].abs_difference_sepsissevere_IAF + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*datapoint*/ 1 && t22_value !== (t22_value = /*datapoint*/ ctx[0].lower_for_baseline_0 + "")) set_data_dev(t22, t22_value);
    			if (dirty & /*datapoint*/ 1 && t25_value !== (t25_value = /*datapoint*/ ctx[0].upper_for_baseline_0 + "")) set_data_dev(t25, t25_value);
    			if (dirty & /*datapoint*/ 1 && t28_value !== (t28_value = /*datapoint*/ ctx[0].difference_sepsissevere_IAF + "")) set_data_dev(t28, t28_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DetailsText', slots, []);
    	let { datapoint } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (datapoint === undefined && !('datapoint' in $$props || $$self.$$.bound[$$self.$$.props['datapoint']])) {
    			console.warn("<DetailsText> was created without expected prop 'datapoint'");
    		}
    	});

    	const writable_props = ['datapoint'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DetailsText> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('datapoint' in $$props) $$invalidate(0, datapoint = $$props.datapoint);
    	};

    	$$self.$capture_state = () => ({ datapoint });

    	$$self.$inject_state = $$props => {
    		if ('datapoint' in $$props) $$invalidate(0, datapoint = $$props.datapoint);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [datapoint];
    }

    class DetailsText extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { datapoint: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DetailsText",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get datapoint() {
    		throw new Error("<DetailsText>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datapoint(value) {
    		throw new Error("<DetailsText>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\DetailsFigure.svelte generated by Svelte v3.59.1 */
    const file$2 = "src\\DetailsFigure.svelte";

    function create_fragment$3(ctx) {
    	let svg;
    	let rect0;
    	let rect1;
    	let line0;
    	let line1;
    	let line2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			attr_dev(rect0, "class", "iaf svelte-hwub71");
    			attr_dev(rect0, "x", "0");
    			attr_dev(rect0, "y", /*max_iaf*/ ctx[2]);
    			attr_dev(rect0, "width", "200");
    			attr_dev(rect0, "height", /*range_iaf*/ ctx[5]);
    			add_location(rect0, file$2, 39, 4, 925);
    			attr_dev(rect1, "class", "sepsis svelte-hwub71");
    			attr_dev(rect1, "x", "0");
    			attr_dev(rect1, "y", /*max_sepsis*/ ctx[0]);
    			attr_dev(rect1, "width", "200");
    			attr_dev(rect1, "height", /*range_sepsis*/ ctx[4]);
    			add_location(rect1, file$2, 41, 4, 1017);
    			attr_dev(line0, "x1", "50");
    			attr_dev(line0, "x2", "50");
    			attr_dev(line0, "y1", /*max_iaf*/ ctx[2]);
    			attr_dev(line0, "y2", /*min_iaf*/ ctx[3]);
    			attr_dev(line0, "class", "svelte-hwub71");
    			add_location(line0, file$2, 43, 4, 1121);
    			attr_dev(line1, "x1", "150");
    			attr_dev(line1, "x2", "150");
    			attr_dev(line1, "y1", /*max_sepsis*/ ctx[0]);
    			attr_dev(line1, "y2", /*min_sepsis*/ ctx[1]);
    			attr_dev(line1, "class", "svelte-hwub71");
    			add_location(line1, file$2, 44, 4, 1172);
    			attr_dev(line2, "class", "rect svelte-hwub71");
    			attr_dev(line2, "x1", "0");
    			attr_dev(line2, "x2", "200");
    			attr_dev(line2, "y1", "100");
    			attr_dev(line2, "y2", "100");
    			add_location(line2, file$2, 45, 4, 1231);
    			attr_dev(svg, "width", "200");
    			attr_dev(svg, "height", "200");
    			attr_dev(svg, "class", "svelte-hwub71");
    			add_location(svg, file$2, 38, 0, 894);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, rect0);
    			append_dev(svg, rect1);
    			append_dev(svg, line0);
    			append_dev(svg, line1);
    			append_dev(svg, line2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*max_iaf*/ 4) {
    				attr_dev(rect0, "y", /*max_iaf*/ ctx[2]);
    			}

    			if (dirty & /*range_iaf*/ 32) {
    				attr_dev(rect0, "height", /*range_iaf*/ ctx[5]);
    			}

    			if (dirty & /*max_sepsis*/ 1) {
    				attr_dev(rect1, "y", /*max_sepsis*/ ctx[0]);
    			}

    			if (dirty & /*range_sepsis*/ 16) {
    				attr_dev(rect1, "height", /*range_sepsis*/ ctx[4]);
    			}

    			if (dirty & /*max_iaf*/ 4) {
    				attr_dev(line0, "y1", /*max_iaf*/ ctx[2]);
    			}

    			if (dirty & /*min_iaf*/ 8) {
    				attr_dev(line0, "y2", /*min_iaf*/ ctx[3]);
    			}

    			if (dirty & /*max_sepsis*/ 1) {
    				attr_dev(line1, "y1", /*max_sepsis*/ ctx[0]);
    			}

    			if (dirty & /*min_sepsis*/ 2) {
    				attr_dev(line1, "y2", /*min_sepsis*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let max_iaf;
    	let min_iaf;
    	let range_iaf;
    	let max_sepsis;
    	let min_sepsis;
    	let range_sepsis;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DetailsFigure', slots, []);
    	let { datapoint } = $$props;
    	const rescale = linear().domain([-10, 10]).range([200, 0]);

    	$$self.$$.on_mount.push(function () {
    		if (datapoint === undefined && !('datapoint' in $$props || $$self.$$.bound[$$self.$$.props['datapoint']])) {
    			console.warn("<DetailsFigure> was created without expected prop 'datapoint'");
    		}
    	});

    	const writable_props = ['datapoint'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DetailsFigure> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('datapoint' in $$props) $$invalidate(6, datapoint = $$props.datapoint);
    	};

    	$$self.$capture_state = () => ({
    		scaleLinear: linear,
    		datapoint,
    		rescale,
    		max_sepsis,
    		min_sepsis,
    		range_sepsis,
    		max_iaf,
    		min_iaf,
    		range_iaf
    	});

    	$$self.$inject_state = $$props => {
    		if ('datapoint' in $$props) $$invalidate(6, datapoint = $$props.datapoint);
    		if ('max_sepsis' in $$props) $$invalidate(0, max_sepsis = $$props.max_sepsis);
    		if ('min_sepsis' in $$props) $$invalidate(1, min_sepsis = $$props.min_sepsis);
    		if ('range_sepsis' in $$props) $$invalidate(4, range_sepsis = $$props.range_sepsis);
    		if ('max_iaf' in $$props) $$invalidate(2, max_iaf = $$props.max_iaf);
    		if ('min_iaf' in $$props) $$invalidate(3, min_iaf = $$props.min_iaf);
    		if ('range_iaf' in $$props) $$invalidate(5, range_iaf = $$props.range_iaf);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*datapoint*/ 64) {
    			$$invalidate(2, max_iaf = rescale(datapoint.upper_for_baseline_0));
    		}

    		if ($$self.$$.dirty & /*datapoint*/ 64) {
    			$$invalidate(3, min_iaf = rescale(datapoint.lower_for_baseline_0));
    		}

    		if ($$self.$$.dirty & /*min_iaf, max_iaf*/ 12) {
    			$$invalidate(5, range_iaf = min_iaf - max_iaf);
    		}

    		if ($$self.$$.dirty & /*datapoint*/ 64) {
    			$$invalidate(0, max_sepsis = rescale(datapoint.difference_sepsissevere_IAF + datapoint.sd_threshold));
    		}

    		if ($$self.$$.dirty & /*datapoint*/ 64) {
    			$$invalidate(1, min_sepsis = rescale(datapoint.difference_sepsissevere_IAF - datapoint.sd_threshold));
    		}

    		if ($$self.$$.dirty & /*min_sepsis, max_sepsis*/ 3) {
    			$$invalidate(4, range_sepsis = min_sepsis - max_sepsis);
    		}
    	};

    	return [max_sepsis, min_sepsis, max_iaf, min_iaf, range_sepsis, range_iaf, datapoint];
    }

    class DetailsFigure extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { datapoint: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DetailsFigure",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get datapoint() {
    		throw new Error("<DetailsFigure>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datapoint(value) {
    		throw new Error("<DetailsFigure>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Details.svelte generated by Svelte v3.59.1 */
    const file$1 = "src\\Details.svelte";

    function create_fragment$2(ctx) {
    	let h3;
    	let t0_value = /*datapoint*/ ctx[0].assay + "";
    	let t0;
    	let t1;
    	let table;
    	let tr;
    	let td0;
    	let detailstext;
    	let t2;
    	let td1;
    	let detailsfigure;
    	let current;

    	detailstext = new DetailsText({
    			props: { datapoint: /*datapoint*/ ctx[0] },
    			$$inline: true
    		});

    	detailsfigure = new DetailsFigure({
    			props: { datapoint: /*datapoint*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			table = element("table");
    			tr = element("tr");
    			td0 = element("td");
    			create_component(detailstext.$$.fragment);
    			t2 = space();
    			td1 = element("td");
    			create_component(detailsfigure.$$.fragment);
    			add_location(h3, file$1, 14, 0, 241);
    			add_location(td0, file$1, 17, 8, 293);
    			add_location(td1, file$1, 18, 8, 348);
    			add_location(tr, file$1, 16, 4, 280);
    			attr_dev(table, "class", "svelte-163gqn1");
    			add_location(table, file$1, 15, 0, 268);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			append_dev(tr, td0);
    			mount_component(detailstext, td0, null);
    			append_dev(tr, t2);
    			append_dev(tr, td1);
    			mount_component(detailsfigure, td1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*datapoint*/ 1) && t0_value !== (t0_value = /*datapoint*/ ctx[0].assay + "")) set_data_dev(t0, t0_value);
    			const detailstext_changes = {};
    			if (dirty & /*datapoint*/ 1) detailstext_changes.datapoint = /*datapoint*/ ctx[0];
    			detailstext.$set(detailstext_changes);
    			const detailsfigure_changes = {};
    			if (dirty & /*datapoint*/ 1) detailsfigure_changes.datapoint = /*datapoint*/ ctx[0];
    			detailsfigure.$set(detailsfigure_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(detailstext.$$.fragment, local);
    			transition_in(detailsfigure.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(detailstext.$$.fragment, local);
    			transition_out(detailsfigure.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    			destroy_component(detailstext);
    			destroy_component(detailsfigure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Details', slots, []);
    	let { datapoint } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (datapoint === undefined && !('datapoint' in $$props || $$self.$$.bound[$$self.$$.props['datapoint']])) {
    			console.warn("<Details> was created without expected prop 'datapoint'");
    		}
    	});

    	const writable_props = ['datapoint'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Details> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('datapoint' in $$props) $$invalidate(0, datapoint = $$props.datapoint);
    	};

    	$$self.$capture_state = () => ({ DetailsText, DetailsFigure, datapoint });

    	$$self.$inject_state = $$props => {
    		if ('datapoint' in $$props) $$invalidate(0, datapoint = $$props.datapoint);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [datapoint];
    }

    class Details extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { datapoint: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Details",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get datapoint() {
    		throw new Error("<Details>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datapoint(value) {
    		throw new Error("<Details>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Viz1.svelte generated by Svelte v3.59.1 */
    const file = "src\\Viz1.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (61:8) {#each columns as column}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*column*/ ctx[20] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*column*/ ctx[20];
    			option.value = option.__value;
    			add_location(option, file, 61, 12, 1958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(61:8) {#each columns as column}",
    		ctx
    	});

    	return block;
    }

    // (67:4) {#each horizontal_grid as tick}
    function create_each_block_1(ctx) {
    	let line;
    	let line_y__value;
    	let line_y__value_1;
    	let text_1;
    	let t_value = /*tick*/ ctx[17] + "";
    	let t;
    	let text_1_y_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr_dev(line, "class", "grid svelte-1wojpja");
    			attr_dev(line, "x1", "0");
    			attr_dev(line, "x2", /*w*/ ctx[4]);
    			attr_dev(line, "y1", line_y__value = /*scaleY*/ ctx[7](/*tick*/ ctx[17]));
    			attr_dev(line, "y2", line_y__value_1 = /*scaleY*/ ctx[7](/*tick*/ ctx[17]));
    			add_location(line, file, 67, 8, 2198);
    			attr_dev(text_1, "x", /*w*/ ctx[4] + 10);
    			attr_dev(text_1, "y", text_1_y_value = /*scaleY*/ ctx[7](/*tick*/ ctx[17]));
    			attr_dev(text_1, "class", "svelte-1wojpja");
    			add_location(text_1, file, 68, 8, 2276);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horizontal_grid*/ 8 && line_y__value !== (line_y__value = /*scaleY*/ ctx[7](/*tick*/ ctx[17]))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*horizontal_grid*/ 8 && line_y__value_1 !== (line_y__value_1 = /*scaleY*/ ctx[7](/*tick*/ ctx[17]))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*horizontal_grid*/ 8 && t_value !== (t_value = /*tick*/ ctx[17] + "")) set_data_dev(t, t_value);

    			if (dirty & /*horizontal_grid*/ 8 && text_1_y_value !== (text_1_y_value = /*scaleY*/ ctx[7](/*tick*/ ctx[17]))) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(67:4) {#each horizontal_grid as tick}",
    		ctx
    	});

    	return block;
    }

    // (71:4) {#each sorted_datapoints as datapoint}
    function create_each_block(ctx) {
    	let g;
    	let intervalsforprotein;
    	let updating_selected_datapoint;
    	let g_transform_value;
    	let current;

    	function intervalsforprotein_selected_datapoint_binding(value) {
    		/*intervalsforprotein_selected_datapoint_binding*/ ctx[12](value);
    	}

    	let intervalsforprotein_props = { datapoint: /*datapoint*/ ctx[14] };

    	if (/*selected_datapoint*/ ctx[2] !== void 0) {
    		intervalsforprotein_props.selected_datapoint = /*selected_datapoint*/ ctx[2];
    	}

    	intervalsforprotein = new IntervalsForProtein({
    			props: intervalsforprotein_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(intervalsforprotein, 'selected_datapoint', intervalsforprotein_selected_datapoint_binding));

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			create_component(intervalsforprotein.$$.fragment);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*datapoint*/ ctx[14].translate_x + ",0)");
    			add_location(g, file, 71, 8, 2385);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			mount_component(intervalsforprotein, g, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const intervalsforprotein_changes = {};
    			if (dirty & /*sorted_datapoints*/ 2) intervalsforprotein_changes.datapoint = /*datapoint*/ ctx[14];

    			if (!updating_selected_datapoint && dirty & /*selected_datapoint*/ 4) {
    				updating_selected_datapoint = true;
    				intervalsforprotein_changes.selected_datapoint = /*selected_datapoint*/ ctx[2];
    				add_flush_callback(() => updating_selected_datapoint = false);
    			}

    			intervalsforprotein.$set(intervalsforprotein_changes);

    			if (!current || dirty & /*sorted_datapoints*/ 2 && g_transform_value !== (g_transform_value = "translate(" + /*datapoint*/ ctx[14].translate_x + ",0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(intervalsforprotein.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(intervalsforprotein.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			destroy_component(intervalsforprotein);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(71:4) {#each sorted_datapoints as datapoint}",
    		ctx
    	});

    	return block;
    }

    // (81:0) {#if selected_datapoint != undefined }
    function create_if_block(ctx) {
    	let details;
    	let current;

    	details = new Details({
    			props: { datapoint: /*selected_datapoint*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(details.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(details, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const details_changes = {};
    			if (dirty & /*selected_datapoint*/ 4) details_changes.datapoint = /*selected_datapoint*/ ctx[2];
    			details.$set(details_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(details.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(details.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(details, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(81:0) {#if selected_datapoint != undefined }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let h1;
    	let t1;
    	let div;
    	let t2;
    	let select;
    	let t3;
    	let svg;
    	let each1_anchor;
    	let text0;
    	let t4;
    	let text1;
    	let t5;
    	let t6;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*columns*/ ctx[6];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*horizontal_grid*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*sorted_datapoints*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*selected_datapoint*/ ctx[2] != undefined && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Range transfer of reference data to contextualise disease data";
    			t1 = space();
    			div = element("div");
    			t2 = text("Sort by: ");
    			select = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t3 = space();
    			svg = svg_element("svg");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			text0 = svg_element("text");
    			t4 = text("Inflammation proteins");
    			text1 = svg_element("text");
    			t5 = text("Difference in NPX value sepsis vs IAF");
    			t6 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(h1, file, 56, 0, 1786);
    			if (/*sort_column*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[11].call(select));
    			add_location(select, file, 59, 13, 1878);
    			add_location(div, file, 58, 0, 1859);
    			attr_dev(text0, "x", /*w*/ ctx[4] / 2);
    			attr_dev(text0, "y", /*h*/ ctx[5] + 90);
    			attr_dev(text0, "class", "svelte-1wojpja");
    			add_location(text0, file, 75, 4, 2577);
    			attr_dev(text1, "x", /*w*/ ctx[4] + 40);
    			attr_dev(text1, "y", /*h*/ ctx[5] / 2);
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "dominant-baseline", "central");
    			attr_dev(text1, "transform", "rotate(90," + (/*w*/ ctx[4] + 40) + "," + /*h*/ ctx[5] / 2 + ")");
    			attr_dev(text1, "class", "svelte-1wojpja");
    			add_location(text1, file, 76, 4, 2633);
    			attr_dev(svg, "width", /*w*/ ctx[4] + 50);
    			attr_dev(svg, "height", /*h*/ ctx[5] + 100);
    			attr_dev(svg, "class", "svelte-1wojpja");
    			add_location(svg, file, 65, 0, 2036);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t2);
    			append_dev(div, select);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select, null);
    				}
    			}

    			select_option(select, /*sort_column*/ ctx[0], true);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, svg, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(svg, null);
    				}
    			}

    			append_dev(svg, each1_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(svg, null);
    				}
    			}

    			append_dev(svg, text0);
    			append_dev(text0, t4);
    			append_dev(svg, text1);
    			append_dev(text1, t5);
    			insert_dev(target, t6, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[11]),
    					listen_dev(svg, "mouseleave", /*mouseleave_handler*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*columns*/ 64) {
    				each_value_2 = /*columns*/ ctx[6];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*sort_column, columns*/ 65) {
    				select_option(select, /*sort_column*/ ctx[0]);
    			}

    			if (dirty & /*w, scaleY, horizontal_grid*/ 152) {
    				each_value_1 = /*horizontal_grid*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(svg, each1_anchor);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*sorted_datapoints, selected_datapoint*/ 6) {
    				each_value = /*sorted_datapoints*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(svg, text0);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*selected_datapoint*/ ctx[2] != undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*selected_datapoint*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_2, detaching);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t6);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let deltaX;
    	let horizontal_grid;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Viz1', slots, []);
    	let w = 800;
    	let h = 400;
    	let selected_datapoint = undefined;

    	let columns = [
    		'assay',
    		'sd_threshold',
    		'correct_severe_sepsis_outcome_average',
    		'severe_sepsis_outcome_average',
    		'IAF_normals',
    		'IAF_lowerbound',
    		'IAF_upperbound',
    		'abs_difference_sepsissevere_IAF',
    		'lower_for_baseline_0',
    		'upper_for_baseline_0',
    		'difference_sepsissevere_IAF',
    		'NS_sepsis'
    	];

    	let sort_column = 'assay';
    	const scaleY = linear().domain([-10, 10]).range([h, 0]);
    	let { datapoints } = $$props;
    	let augmented_datapoints;
    	let sorted_datapoints;

    	$$self.$$.on_mount.push(function () {
    		if (datapoints === undefined && !('datapoints' in $$props || $$self.$$.bound[$$self.$$.props['datapoints']])) {
    			console.warn("<Viz1> was created without expected prop 'datapoints'");
    		}
    	});

    	const writable_props = ['datapoints'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Viz1> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		sort_column = select_value(this);
    		$$invalidate(0, sort_column);
    		$$invalidate(6, columns);
    	}

    	function intervalsforprotein_selected_datapoint_binding(value) {
    		selected_datapoint = value;
    		$$invalidate(2, selected_datapoint);
    	}

    	const mouseleave_handler = () => {
    		$$invalidate(2, selected_datapoint = undefined);
    	};

    	$$self.$$set = $$props => {
    		if ('datapoints' in $$props) $$invalidate(8, datapoints = $$props.datapoints);
    	};

    	$$self.$capture_state = () => ({
    		scaleLinear: linear,
    		IntervalsForProtein,
    		Details,
    		w,
    		h,
    		selected_datapoint,
    		columns,
    		sort_column,
    		scaleY,
    		datapoints,
    		augmented_datapoints,
    		sorted_datapoints,
    		deltaX,
    		horizontal_grid
    	});

    	$$self.$inject_state = $$props => {
    		if ('w' in $$props) $$invalidate(4, w = $$props.w);
    		if ('h' in $$props) $$invalidate(5, h = $$props.h);
    		if ('selected_datapoint' in $$props) $$invalidate(2, selected_datapoint = $$props.selected_datapoint);
    		if ('columns' in $$props) $$invalidate(6, columns = $$props.columns);
    		if ('sort_column' in $$props) $$invalidate(0, sort_column = $$props.sort_column);
    		if ('datapoints' in $$props) $$invalidate(8, datapoints = $$props.datapoints);
    		if ('augmented_datapoints' in $$props) $$invalidate(9, augmented_datapoints = $$props.augmented_datapoints);
    		if ('sorted_datapoints' in $$props) $$invalidate(1, sorted_datapoints = $$props.sorted_datapoints);
    		if ('deltaX' in $$props) $$invalidate(10, deltaX = $$props.deltaX);
    		if ('horizontal_grid' in $$props) $$invalidate(3, horizontal_grid = $$props.horizontal_grid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*datapoints*/ 256) {
    			$$invalidate(10, deltaX = w / datapoints.length);
    		}

    		if ($$self.$$.dirty & /*datapoints, augmented_datapoints*/ 768) {
    			{
    				$$invalidate(9, augmented_datapoints = []);

    				datapoints.forEach(d => {
    					d.min_iaf = scaleY(d.lower_for_baseline_0);
    					d.max_iaf = scaleY(d.upper_for_baseline_0);
    					d.min_sepsis = scaleY(d.difference_sepsissevere_IAF - d.sd_threshold);
    					d.max_sepsis = scaleY(d.difference_sepsissevere_IAF + d.sd_threshold);
    					d.sepsis = scaleY(d.difference_sepsissevere_IAF);
    					$$invalidate(9, augmented_datapoints = [...augmented_datapoints, d]);
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*augmented_datapoints, sort_column, deltaX, sorted_datapoints*/ 1539) {
    			{
    				$$invalidate(1, sorted_datapoints = []);

    				augmented_datapoints.sort((a, b) => a[sort_column] < b[sort_column] ? -1 : 1).forEach((d, i) => {
    					d.translate_x = i * deltaX + 5;
    					$$invalidate(1, sorted_datapoints = [...sorted_datapoints, d]);
    				});
    			}
    		}
    	};

    	$$invalidate(3, horizontal_grid = scaleY.ticks(7));

    	return [
    		sort_column,
    		sorted_datapoints,
    		selected_datapoint,
    		horizontal_grid,
    		w,
    		h,
    		columns,
    		scaleY,
    		datapoints,
    		augmented_datapoints,
    		deltaX,
    		select_change_handler,
    		intervalsforprotein_selected_datapoint_binding,
    		mouseleave_handler
    	];
    }

    class Viz1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { datapoints: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Viz1",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get datapoints() {
    		throw new Error("<Viz1>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set datapoints(value) {
    		throw new Error("<Viz1>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /* @license
    Papa Parse
    v5.3.1
    https://github.com/mholt/PapaParse
    License: MIT
    */

    var papaparse_min = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function s(){var f="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==f?f:{};var n=!f.document&&!!f.postMessage,o=n&&/blob:/i.test((f.location||{}).protocol),a={},h=0,b={parse:function(e,t){var i=(t=t||{}).dynamicTyping||!1;M(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!M(t.transform)&&t.transform,t.worker&&b.WORKERS_SUPPORTED){var r=function(){if(!b.WORKERS_SUPPORTED)return !1;var e=(i=f.URL||f.webkitURL||null,r=s.toString(),b.BLOB_URL||(b.BLOB_URL=i.createObjectURL(new Blob(["(",r,")();"],{type:"text/javascript"})))),t=new f.Worker(e);var i,r;return t.onmessage=_,t.id=h++,a[t.id]=t}();return r.userStep=t.step,r.userChunk=t.chunk,r.userComplete=t.complete,r.userError=t.error,t.step=M(t.step),t.chunk=M(t.chunk),t.complete=M(t.complete),t.error=M(t.error),delete t.worker,void r.postMessage({input:e,config:t,workerId:r.id})}var n=null;b.NODE_STREAM_INPUT,"string"==typeof e?n=t.download?new l(t):new p(t):!0===e.readable&&M(e.read)&&M(e.on)?n=new g(t):(f.File&&e instanceof File||e instanceof Object)&&(n=new c(t));return n.stream(e)},unparse:function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1;!function(){if("object"!=typeof t)return;"string"!=typeof t.delimiter||b.BAD_DELIMITERS.filter(function(e){return -1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter);("boolean"==typeof t.quotes||"function"==typeof t.quotes||Array.isArray(t.quotes))&&(n=t.quotes);"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines);"string"==typeof t.newline&&(y=t.newline);"string"==typeof t.quoteChar&&(s=t.quoteChar);"boolean"==typeof t.header&&(_=t.header);if(Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns;}void 0!==t.escapeChar&&(a=t.escapeChar+s);"boolean"==typeof t.escapeFormulae&&(o=t.escapeFormulae);}();var h=new RegExp(j(s),"g");"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return "string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="";"string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t));var n=Array.isArray(e)&&0<e.length,s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=v(e[a],a);0<t.length&&(r+=y);}for(var o=0;o<t.length;o++){var h=n?e.length:t[o].length,u=!1,f=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var d=[],l=0;l<h;l++){var c=s?e[l]:l;d.push(t[o][c]);}u=""===d.join("").trim();}if(!u){for(var p=0;p<h;p++){0<p&&!f&&(r+=m);var g=n&&s?e[p]:p;r+=v(t[o][g],p);}o<t.length-1&&(!i||0<h&&!f)&&(r+=y);}}return r}function v(e,t){if(null==e)return "";if(e.constructor===Date)return JSON.stringify(e).slice(1,25);!0===o&&"string"==typeof e&&null!==e.match(/^[=+\-@].*$/)&&(e="'"+e);var i=e.toString().replace(h,a),r="boolean"==typeof n&&n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||function(e,t){for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return !0;return !1}(i,b.BAD_DELIMITERS)||-1<i.indexOf(m)||" "===i.charAt(0)||" "===i.charAt(i.length-1);return r?s+i+s:i}}};if(b.RECORD_SEP=String.fromCharCode(30),b.UNIT_SEP=String.fromCharCode(31),b.BYTE_ORDER_MARK="\ufeff",b.BAD_DELIMITERS=["\r","\n",'"',b.BYTE_ORDER_MARK],b.WORKERS_SUPPORTED=!n&&!!f.Worker,b.NODE_STREAM_INPUT=1,b.LocalChunkSize=10485760,b.RemoteChunkSize=5242880,b.DefaultDelimiter=",",b.Parser=E,b.ParserHandle=i,b.NetworkStreamer=l,b.FileStreamer=c,b.StringStreamer=p,b.ReadableStreamStreamer=g,f.jQuery){var d=f.jQuery;d.fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&f.FileReader)||!this.files||0===this.files.length)return !0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)});}),e(),this;function e(){if(0!==h.length){var e,t,i,r,n=h[0];if(M(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(M(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config));}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){M(a)&&a(e,n.file,n.inputElem),u();},b.parse(n.file,n.instanceConfig);}else M(o.complete)&&o.complete();}function u(){h.splice(0,1),e();}};}function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=w(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t;}.call(this,e),this.parseChunk=function(e,t){if(this.isFirstChunk&&M(this._config.beforeFirstChunk)){var i=this._config.beforeFirstChunk(e);void 0!==i&&(e=i);}this.isFirstChunk=!1,this._halted=!1;var r=this._partialLine+e;this._partialLine="";var n=this._handle.parse(r,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var s=n.meta.cursor;this._finished||(this._partialLine=r.substring(s-this._baseIndex),this._baseIndex=s),n&&n.data&&(this._rowCount+=n.data.length);var a=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(o)f.postMessage({results:n,workerId:b.WORKER_ID,finished:a});else if(M(this._config.chunk)&&!t){if(this._config.chunk(n,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);n=void 0,this._completeResults=void 0;}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(n.data),this._completeResults.errors=this._completeResults.errors.concat(n.errors),this._completeResults.meta=n.meta),this._completed||!a||!M(this._config.complete)||n&&n.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||n&&n.meta.paused||this._nextChunk(),n}this._halted=!0;},this._sendError=function(e){M(this._config.error)?this._config.error(e):o&&this._config.error&&f.postMessage({workerId:b.WORKER_ID,error:e,finished:!1});};}function l(e){var r;(e=e||{}).chunkSize||(e.chunkSize=b.RemoteChunkSize),u.call(this,e),this._nextChunk=n?function(){this._readChunk(),this._chunkLoaded();}:function(){this._readChunk();},this.stream=function(e){this._input=e,this._nextChunk();},this._readChunk=function(){if(this._finished)this._chunkLoaded();else {if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),n||(r.onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!n),this._config.downloadRequestHeaders){var e=this._config.downloadRequestHeaders;for(var t in e)r.setRequestHeader(t,e[t]);}if(this._config.chunkSize){var i=this._start+this._config.chunkSize-1;r.setRequestHeader("Range","bytes="+this._start+"-"+i);}try{r.send(this._config.downloadRequestBody);}catch(e){this._chunkError(e.message);}n&&0===r.status&&this._chunkError();}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize?this._config.chunkSize:r.responseText.length,this._finished=!this._config.chunkSize||this._start>=function(e){var t=e.getResponseHeader("Content-Range");if(null===t)return -1;return parseInt(t.substring(t.lastIndexOf("/")+1))}(r),this.parseChunk(r.responseText)));},this._chunkError=function(e){var t=r.statusText||e;this._sendError(new Error(t));};}function c(e){var r,n;(e=e||{}).chunkSize||(e.chunkSize=b.LocalChunkSize),u.call(this,e);var s="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,n=e.slice||e.webkitSlice||e.mozSlice,s?((r=new FileReader).onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)):r=new FileReaderSync,this._nextChunk();},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk();},this._readChunk=function(){var e=this._input;if(this._config.chunkSize){var t=Math.min(this._start+this._config.chunkSize,this._input.size);e=n.call(e,this._start,t);}var i=r.readAsText(e,this._config.encoding);s||this._chunkLoaded({target:{result:i}});},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result);},this._chunkError=function(){this._sendError(r.error);};}function p(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var e,t=this._config.chunkSize;return t?(e=i.substring(0,t),i=i.substring(t)):(e=i,i=""),this._finished=!i,this.parseChunk(e)}};}function g(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause();},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume();},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError);},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0);},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0;},this._streamData=v(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()));}catch(e){this._streamError(e);}},this),this._streamError=v(function(e){this._streamCleanUp(),this._sendError(e);},this),this._streamEnd=v(function(){this._streamCleanUp(),r=!0,this._streamData("");},this),this._streamCleanUp=v(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError);},this);}function i(m){var a,o,h,r=Math.pow(2,53),n=-r,s=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,u=/^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/,t=this,i=0,f=0,d=!1,e=!1,l=[],c={data:[],errors:[],meta:{}};if(M(m.step)){var p=m.step;m.step=function(e){if(c=e,_())g();else {if(g(),0===c.data.length)return;i+=e.data.length,m.preview&&i>m.preview?o.abort():(c.data=c.data[0],p(c,t));}};}function y(e){return "greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){if(c&&h&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+b.DefaultDelimiter+"'"),h=!1),m.skipEmptyLines)for(var e=0;e<c.data.length;e++)y(c.data[e])&&c.data.splice(e--,1);return _()&&function(){if(!c)return;function e(e,t){M(m.transformHeader)&&(e=m.transformHeader(e,t)),l.push(e);}if(Array.isArray(c.data[0])){for(var t=0;_()&&t<c.data.length;t++)c.data[t].forEach(e);c.data.splice(0,1);}else c.data.forEach(e);}(),function(){if(!c||!m.header&&!m.dynamicTyping&&!m.transform)return c;function e(e,t){var i,r=m.header?{}:[];for(i=0;i<e.length;i++){var n=i,s=e[i];m.header&&(n=i>=l.length?"__parsed_extra":l[i]),m.transform&&(s=m.transform(s,n)),s=v(n,s),"__parsed_extra"===n?(r[n]=r[n]||[],r[n].push(s)):r[n]=s;}return m.header&&(i>l.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+l.length+" fields but parsed "+i,f+t):i<l.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+l.length+" fields but parsed "+i,f+t)),r}var t=1;!c.data.length||Array.isArray(c.data[0])?(c.data=c.data.map(e),t=c.data.length):c.data=e(c.data,0);m.header&&c.meta&&(c.meta.fields=l);return f+=t,c}()}function _(){return m.header&&0===l.length}function v(e,t){return i=e,m.dynamicTypingFunction&&void 0===m.dynamicTyping[i]&&(m.dynamicTyping[i]=m.dynamicTypingFunction(i)),!0===(m.dynamicTyping[i]||m.dynamicTyping)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&(function(e){if(s.test(e)){var t=parseFloat(e);if(n<t&&t<r)return !0}return !1}(t)?parseFloat(t):u.test(t)?new Date(t):""===t?null:t):t;var i;}function k(e,t,i,r){var n={type:e,code:t,message:i};void 0!==r&&(n.row=r),c.errors.push(n);}this.parse=function(e,t,i){var r=m.quoteChar||'"';if(m.newline||(m.newline=function(e,t){e=e.substring(0,1048576);var i=new RegExp(j(t)+"([^]*?)"+j(t),"gm"),r=(e=e.replace(i,"")).split("\r"),n=e.split("\n"),s=1<n.length&&n[0].length<r[0].length;if(1===r.length||s)return "\n";for(var a=0,o=0;o<r.length;o++)"\n"===r[o][0]&&a++;return a>=r.length/2?"\r\n":"\r"}(e,r)),h=!1,m.delimiter)M(m.delimiter)&&(m.delimiter=m.delimiter(e),c.meta.delimiter=m.delimiter);else {var n=function(e,t,i,r,n){var s,a,o,h;n=n||[",","\t","|",";",b.RECORD_SEP,b.UNIT_SEP];for(var u=0;u<n.length;u++){var f=n[u],d=0,l=0,c=0;o=void 0;for(var p=new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e),g=0;g<p.data.length;g++)if(i&&y(p.data[g]))c++;else {var _=p.data[g].length;l+=_,void 0!==o?0<_&&(d+=Math.abs(_-o),o=_):o=_;}0<p.data.length&&(l/=p.data.length-c),(void 0===a||d<=a)&&(void 0===h||h<l)&&1.99<l&&(a=d,s=f,h=l);}return {successful:!!(m.delimiter=s),bestDelimiter:s}}(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess);n.successful?m.delimiter=n.bestDelimiter:(h=!0,m.delimiter=b.DefaultDelimiter),c.meta.delimiter=m.delimiter;}var s=w(m);return m.preview&&m.header&&s.preview++,a=e,o=new E(s),c=o.parse(a,t,i),g(),d?{meta:{paused:!0}}:c||{meta:{paused:!1}}},this.paused=function(){return d},this.pause=function(){d=!0,o.abort(),a=M(m.chunk)?"":a.substring(o.getCharIndex());},this.resume=function(){t.streamer._halted?(d=!1,t.streamer.parseChunk(a,!0)):setTimeout(t.resume,3);},this.aborted=function(){return e},this.abort=function(){e=!0,o.abort(),c.meta.aborted=!0,M(m.complete)&&m.complete(c),a="";};}function j(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(e){var S,O=(e=e||{}).delimiter,x=e.newline,I=e.comments,T=e.step,D=e.preview,A=e.fastMode,L=S=void 0===e.quoteChar?'"':e.quoteChar;if(void 0!==e.escapeChar&&(L=e.escapeChar),("string"!=typeof O||-1<b.BAD_DELIMITERS.indexOf(O))&&(O=","),I===O)throw new Error("Comment character same as delimiter");!0===I?I="#":("string"!=typeof I||-1<b.BAD_DELIMITERS.indexOf(I))&&(I=!1),"\n"!==x&&"\r"!==x&&"\r\n"!==x&&(x="\n");var F=0,z=!1;this.parse=function(r,t,i){if("string"!=typeof r)throw new Error("Input must be a string");var n=r.length,e=O.length,s=x.length,a=I.length,o=M(T),h=[],u=[],f=[],d=F=0;if(!r)return C();if(A||!1!==A&&-1===r.indexOf(S)){for(var l=r.split(x),c=0;c<l.length;c++){if(f=l[c],F+=f.length,c!==l.length-1)F+=x.length;else if(i)return C();if(!I||f.substring(0,a)!==I){if(o){if(h=[],k(f.split(O)),R(),z)return C()}else k(f.split(O));if(D&&D<=c)return h=h.slice(0,D),C(!0)}}return C()}for(var p=r.indexOf(O,F),g=r.indexOf(x,F),_=new RegExp(j(L)+j(S),"g"),m=r.indexOf(S,F);;)if(r[F]!==S)if(I&&0===f.length&&r.substring(F,F+a)===I){if(-1===g)return C();F=g+s,g=r.indexOf(x,F),p=r.indexOf(O,F);}else if(-1!==p&&(p<g||-1===g))f.push(r.substring(F,p)),F=p+e,p=r.indexOf(O,F);else {if(-1===g)break;if(f.push(r.substring(F,g)),w(g+s),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0)}else for(m=F,F++;;){if(-1===(m=r.indexOf(S,m+1)))return i||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:F}),E();if(m===n-1)return E(r.substring(F,m).replace(_,S));if(S!==L||r[m+1]!==L){if(S===L||0===m||r[m-1]!==L){-1!==p&&p<m+1&&(p=r.indexOf(O,m+1)),-1!==g&&g<m+1&&(g=r.indexOf(x,m+1));var y=b(-1===g?p:Math.min(p,g));if(r[m+1+y]===O){f.push(r.substring(F,m).replace(_,S)),r[F=m+1+y+e]!==S&&(m=r.indexOf(S,F)),p=r.indexOf(O,F),g=r.indexOf(x,F);break}var v=b(g);if(r.substring(m+1+v,m+1+v+s)===x){if(f.push(r.substring(F,m).replace(_,S)),w(m+1+v+s),p=r.indexOf(O,F),m=r.indexOf(S,F),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:F}),m++;}}else m++;}return E();function k(e){h.push(e),d=F;}function b(e){var t=0;if(-1!==e){var i=r.substring(m+1,e);i&&""===i.trim()&&(t=i.length);}return t}function E(e){return i||(void 0===e&&(e=r.substring(F)),f.push(e),F=n,k(f),o&&R()),C()}function w(e){F=e,k(f),f=[],g=r.indexOf(x,F);}function C(e){return {data:h,errors:u,meta:{delimiter:O,linebreak:x,aborted:z,truncated:!!e,cursor:d+(t||0)}}}function R(){T(C()),h=[],u=[];}},this.abort=function(){z=!0;},this.getCharIndex=function(){return F};}function _(e){var t=e.data,i=a[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,m(t.workerId,{data:[],errors:[],meta:{aborted:!0}});},pause:y,resume:y};if(M(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results;}else M(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results);}t.finished&&!r&&m(t.workerId,t.results);}function m(e,t){var i=a[e];M(i.userComplete)&&i.userComplete(t),i.terminate(),delete a[e];}function y(){throw new Error("Not implemented.")}function w(e){if("object"!=typeof e||null===e)return e;var t=Array.isArray(e)?[]:{};for(var i in e)t[i]=w(e[i]);return t}function v(e,t){return function(){e.apply(t,arguments);}}function M(e){return "function"==typeof e}return o&&(f.onmessage=function(e){var t=e.data;void 0===b.WORKER_ID&&t&&(b.WORKER_ID=t.workerId);if("string"==typeof t.input)f.postMessage({workerId:b.WORKER_ID,results:b.parse(t.input,t.config),finished:!0});else if(f.File&&t.input instanceof File||t.input instanceof Object){var i=b.parse(t.input,t.config);i&&f.postMessage({workerId:b.WORKER_ID,results:i,finished:!0});}}),(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(u.prototype)).constructor=c,(p.prototype=Object.create(p.prototype)).constructor=p,(g.prototype=Object.create(u.prototype)).constructor=g,b});
    });

    /* src\App.svelte generated by Svelte v3.59.1 */

    const { console: console_1 } = globals;

    function create_fragment(ctx) {
    	let viz1;
    	let current;

    	viz1 = new Viz1({
    			props: { datapoints: /*datapoints*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(viz1.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(viz1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const viz1_changes = {};
    			if (dirty & /*datapoints*/ 1) viz1_changes.datapoints = /*datapoints*/ ctx[0];
    			viz1.$set(viz1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(viz1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(viz1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(viz1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let datapoints = [];

    	papaparse_min.parse("test.csv", {
    		header: true,
    		download: true,
    		dynamicTyping: true,
    		complete(results) {
    			$$invalidate(0, datapoints = results.data);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Viz1, Papa: papaparse_min, datapoints });

    	$$self.$inject_state = $$props => {
    		if ('datapoints' in $$props) $$invalidate(0, datapoints = $$props.datapoints);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*datapoints*/ 1) {
    			console.log(datapoints);
    		}
    	};

    	return [datapoints];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    	
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['svelte-typeahead'] = factory());
}(this, (function () { 'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
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
        flushing = false;
        seen_callbacks.clear();
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
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
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

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var fuzzy = createCommonjsModule(function (module, exports) {
    /*
     * Fuzzy
     * https://github.com/myork/fuzzy
     *
     * Copyright (c) 2012 Matt York
     * Licensed under the MIT license.
     */

    (function() {

    var fuzzy = {};

    // Use in node or in browser
    {
      module.exports = fuzzy;
    }

    // Return all elements of `array` that have a fuzzy
    // match against `pattern`.
    fuzzy.simpleFilter = function(pattern, array) {
      return array.filter(function(str) {
        return fuzzy.test(pattern, str);
      });
    };

    // Does `pattern` fuzzy match `str`?
    fuzzy.test = function(pattern, str) {
      return fuzzy.match(pattern, str) !== null;
    };

    // If `pattern` matches `str`, wrap each matching character
    // in `opts.pre` and `opts.post`. If no match, return null
    fuzzy.match = function(pattern, str, opts) {
      opts = opts || {};
      var patternIdx = 0
        , result = []
        , len = str.length
        , totalScore = 0
        , currScore = 0
        // prefix
        , pre = opts.pre || ''
        // suffix
        , post = opts.post || ''
        // String to compare against. This might be a lowercase version of the
        // raw string
        , compareString =  opts.caseSensitive && str || str.toLowerCase()
        , ch;

      pattern = opts.caseSensitive && pattern || pattern.toLowerCase();

      // For each character in the string, either add it to the result
      // or wrap in template if it's the next string in the pattern
      for(var idx = 0; idx < len; idx++) {
        ch = str[idx];
        if(compareString[idx] === pattern[patternIdx]) {
          ch = pre + ch + post;
          patternIdx += 1;

          // consecutive characters should increase the score more than linearly
          currScore += 1 + currScore;
        } else {
          currScore = 0;
        }
        totalScore += currScore;
        result[result.length] = ch;
      }

      // return rendered string if we have a match for every char
      if(patternIdx === pattern.length) {
        // if the string is an exact match with pattern, totalScore should be maxed
        totalScore = (compareString === pattern) ? Infinity : totalScore;
        return {rendered: result.join(''), score: totalScore};
      }

      return null;
    };

    // The normal entry point. Filters `arr` for matches against `pattern`.
    // It returns an array with matching values of the type:
    //
    //     [{
    //         string:   '<b>lah' // The rendered string
    //       , index:    2        // The index of the element in `arr`
    //       , original: 'blah'   // The original element in `arr`
    //     }]
    //
    // `opts` is an optional argument bag. Details:
    //
    //    opts = {
    //        // string to put before a matching character
    //        pre:     '<b>'
    //
    //        // string to put after matching character
    //      , post:    '</b>'
    //
    //        // Optional function. Input is an entry in the given arr`,
    //        // output should be the string to test `pattern` against.
    //        // In this example, if `arr = [{crying: 'koala'}]` we would return
    //        // 'koala'.
    //      , extract: function(arg) { return arg.crying; }
    //    }
    fuzzy.filter = function(pattern, arr, opts) {
      if(!arr || arr.length === 0) {
        return [];
      }
      if (typeof pattern !== 'string') {
        return arr;
      }
      opts = opts || {};
      return arr
        .reduce(function(prev, element, idx, arr) {
          var str = element;
          if(opts.extract) {
            str = opts.extract(element);
          }
          var rendered = fuzzy.match(pattern, str, opts);
          if(rendered != null) {
            prev[prev.length] = {
                string: rendered.rendered
              , score: rendered.score
              , index: idx
              , original: element
            };
          }
          return prev;
        }, [])

        // Sort by score. Browsers are inconsistent wrt stable/unstable
        // sorting, so force stable by using the index in the case of tie.
        // See http://ofb.net/~sethml/is-sort-stable.html
        .sort(function(a,b) {
          var compare = b.score - a.score;
          if(compare) return compare;
          return a.index - b.index;
        });
    };


    }());
    });

    /* node_modules/svelte-search/src/Search.svelte generated by Svelte v3.27.0 */

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-5m0wg6-style";
    	style.textContent = ".hide-label.svelte-5m0wg6{position:absolute;height:1px;width:1px;overflow:hidden;clip:rect(1px 1px 1px 1px);clip:rect(1px, 1px, 1px, 1px);white-space:nowrap}";
    	append(document.head, style);
    }

    function create_fragment(ctx) {
    	let form;
    	let label_1;
    	let t0;
    	let label_1_id_value;
    	let t1;
    	let input_1;
    	let mounted;
    	let dispose;

    	let input_1_levels = [
    		/*$$restProps*/ ctx[6],
    		{ type: "search" },
    		{ id: /*id*/ ctx[1] },
    		{ name: /*name*/ ctx[4] }
    	];

    	let input_1_data = {};

    	for (let i = 0; i < input_1_levels.length; i += 1) {
    		input_1_data = assign(input_1_data, input_1_levels[i]);
    	}

    	return {
    		c() {
    			form = element("form");
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[2]);
    			t1 = space();
    			input_1 = element("input");
    			attr(label_1, "id", label_1_id_value = "" + (/*id*/ ctx[1] + "-label"));
    			attr(label_1, "for", /*id*/ ctx[1]);
    			attr(label_1, "class", "svelte-5m0wg6");
    			toggle_class(label_1, "hide-label", /*hideLabel*/ ctx[3]);
    			set_attributes(input_1, input_1_data);
    			toggle_class(input_1, "svelte-5m0wg6", true);
    			attr(form, "class", "svelte-search");
    			attr(form, "role", "search");
    			attr(form, "aria-labelledby", /*id*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, form, anchor);
    			append(form, label_1);
    			append(label_1, t0);
    			append(form, t1);
    			append(form, input_1);
    			/*input_1_binding*/ ctx[17](input_1);
    			set_input_value(input_1, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen(input_1, "input", /*input_1_input_handler*/ ctx[18]),
    					listen(input_1, "input", /*input_handler*/ ctx[12]),
    					listen(input_1, "change", /*change_handler*/ ctx[13]),
    					listen(input_1, "focus", /*focus_handler*/ ctx[14]),
    					listen(input_1, "blur", /*blur_handler*/ ctx[15]),
    					listen(input_1, "keydown", /*keydown_handler*/ ctx[16]),
    					listen(form, "submit", prevent_default(/*submit_handler*/ ctx[11]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 4) set_data(t0, /*label*/ ctx[2]);

    			if (dirty & /*id*/ 2 && label_1_id_value !== (label_1_id_value = "" + (/*id*/ ctx[1] + "-label"))) {
    				attr(label_1, "id", label_1_id_value);
    			}

    			if (dirty & /*id*/ 2) {
    				attr(label_1, "for", /*id*/ ctx[1]);
    			}

    			if (dirty & /*hideLabel*/ 8) {
    				toggle_class(label_1, "hide-label", /*hideLabel*/ ctx[3]);
    			}

    			set_attributes(input_1, input_1_data = get_spread_update(input_1_levels, [
    				dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6],
    				{ type: "search" },
    				dirty & /*id*/ 2 && { id: /*id*/ ctx[1] },
    				dirty & /*name*/ 16 && { name: /*name*/ ctx[4] }
    			]));

    			if (dirty & /*value*/ 1) {
    				set_input_value(input_1, /*value*/ ctx[0]);
    			}

    			toggle_class(input_1, "svelte-5m0wg6", true);

    			if (dirty & /*id*/ 2) {
    				attr(form, "aria-labelledby", /*id*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(form);
    			/*input_1_binding*/ ctx[17](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	const omit_props_names = [
    		"id","label","hideLabel","name","value","debounce","debounceValue","clear","focus"
    	];

    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { id = "search" + Math.random().toString(36) } = $$props;
    	let { label = "Search" } = $$props;
    	let { hideLabel = false } = $$props;
    	let { name = "search" } = $$props;
    	let { value = "" } = $$props;
    	let { debounce = false } = $$props;
    	let { debounceValue = 250 } = $$props;

    	function clear() {
    		$$invalidate(0, value = "");
    	}

    	function focus() {
    		input.focus();
    	}

    	const dispatch = createEventDispatcher();
    	let prevValue = value;
    	let input = undefined;
    	let calling = false;
    	let timeout = undefined;

    	function debounced(cb) {
    		if (calling) return;
    		calling = true;

    		timeout = setTimeout(
    			() => {
    				cb();
    				calling = false;
    			},
    			debounceValue
    		);
    	}

    	onMount(() => {
    		if ($$props.autofocus) {
    			window.requestAnimationFrame(() => {
    				input.focus();
    			});
    		}

    		return () => {
    			if (timeout !== undefined) {
    				clearTimeout(timeout);
    			}
    		};
    	});

    	afterUpdate(() => {
    		if (value.length > 0 && value !== prevValue) {
    			if (debounce) {
    				debounced(() => dispatch("type"));
    			} else {
    				dispatch("type");
    			}
    		}

    		if (value.length === 0 && prevValue.length > 0) {
    			dispatch("clear");
    		}

    		prevValue = value;
    	});

    	function submit_handler(event) {
    		bubble($$self, event);
    	}

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	function input_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			input = $$value;
    			$$invalidate(5, input);
    		});
    	}

    	function input_1_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(24, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("label" in $$new_props) $$invalidate(2, label = $$new_props.label);
    		if ("hideLabel" in $$new_props) $$invalidate(3, hideLabel = $$new_props.hideLabel);
    		if ("name" in $$new_props) $$invalidate(4, name = $$new_props.name);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("debounce" in $$new_props) $$invalidate(7, debounce = $$new_props.debounce);
    		if ("debounceValue" in $$new_props) $$invalidate(8, debounceValue = $$new_props.debounceValue);
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		value,
    		id,
    		label,
    		hideLabel,
    		name,
    		input,
    		$$restProps,
    		debounce,
    		debounceValue,
    		clear,
    		focus,
    		submit_handler,
    		input_handler,
    		change_handler,
    		focus_handler,
    		blur_handler,
    		keydown_handler,
    		input_1_binding,
    		input_1_input_handler
    	];
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-5m0wg6-style")) add_css();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			id: 1,
    			label: 2,
    			hideLabel: 3,
    			name: 4,
    			value: 0,
    			debounce: 7,
    			debounceValue: 8,
    			clear: 9,
    			focus: 10
    		});
    	}

    	get clear() {
    		return this.$$.ctx[9];
    	}

    	get focus() {
    		return this.$$.ctx[10];
    	}
    }

    /* src/Typeahead.svelte generated by Svelte v3.27.0 */

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-9qlbg2-style";
    	style.textContent = ".svelte-typeahead.svelte-9qlbg2{position:relative}ul.svelte-9qlbg2{position:absolute;top:100%;left:0;width:100%;padding:0.5rem 0;list-style:none;background-color:#fff;box-shadow:0 8px 16px rgba(0, 0, 0, 0.15);border-bottom-right-radius:0.25rem;border-bottom-left-radius:0.25rem}li.svelte-9qlbg2{padding:0.75rem 1rem;font-size:1.25rem;cursor:pointer}li.svelte-9qlbg2:not(:last-of-type){border-bottom:1px solid #e0e0e0}li.svelte-9qlbg2:hover{background-color:#e5e5e5}.selected.svelte-9qlbg2{background-color:#e5e5e5}.selected.svelte-9qlbg2:hover{background-color:#cacaca}.svelte-typeahead.dropdown .svelte-search input{border-bottom-right-radius:0;border-bottom-left-radius:0}.svelte-search input{border:0;background:none;width:100%;font:inherit;font-size:1.5rem;padding:1rem;border:2px solid #e0e0e0;border-radius:0.25rem}.svelte-search input:focus{outline:0;box-shadow:0 4px 12px rgba(0, 0, 0, 0.1);border-color:#0f62fe}";
    	append(document.head, style);
    }

    const get_default_slot_changes = dirty => ({ result: dirty[0] & /*results*/ 64 });
    const get_default_slot_context = ctx => ({ result: /*result*/ ctx[31] });

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	child_ctx[33] = i;
    	return child_ctx;
    }

    // (189:2) {#if !hideDropdown && results.length > 0}
    function create_if_block(ctx) {
    	let ul;
    	let ul_id_value;
    	let current;
    	let each_value = /*results*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", "svelte-typeahead-list svelte-9qlbg2");
    			attr(ul, "role", "listbox");
    			attr(ul, "aria-labelledby", "");
    			attr(ul, "id", ul_id_value = "" + (/*id*/ ctx[1] + "-listbox"));
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*id, selectedIndex, select, results, $$scope*/ 4322) {
    				each_value = /*results*/ ctx[6];
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
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty[0] & /*id*/ 2 && ul_id_value !== (ul_id_value = "" + (/*id*/ ctx[1] + "-listbox"))) {
    				attr(ul, "id", ul_id_value);
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (205:34)              
    function fallback_block(ctx) {
    	let html_tag;
    	let raw_value = /*result*/ ctx[31].string + "";
    	let html_anchor;

    	return {
    		c() {
    			html_anchor = empty();
    			html_tag = new HtmlTag(html_anchor);
    		},
    		m(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert(target, html_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*results*/ 64 && raw_value !== (raw_value = /*result*/ ctx[31].string + "")) html_tag.p(raw_value);
    		},
    		d(detaching) {
    			if (detaching) detach(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};
    }

    // (195:6) {#each results as result, i}
    function create_each_block(ctx) {
    	let li;
    	let t;
    	let li_id_value;
    	let li_aria_selected_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[13].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[12], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[25](/*i*/ ctx[33], ...args);
    	}

    	return {
    		c() {
    			li = element("li");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			attr(li, "role", "option");
    			attr(li, "id", li_id_value = "" + (/*id*/ ctx[1] + "-result"));
    			attr(li, "aria-selected", li_aria_selected_value = /*selectedIndex*/ ctx[5] === /*i*/ ctx[33]);
    			attr(li, "class", "svelte-9qlbg2");
    			toggle_class(li, "selected", /*selectedIndex*/ ctx[5] === /*i*/ ctx[33]);
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(li, null);
    			}

    			append(li, t);
    			current = true;

    			if (!mounted) {
    				dispose = listen(li, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (default_slot) {
    				if (default_slot.p && dirty[0] & /*$$scope, results*/ 4160) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[12], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			} else {
    				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty[0] & /*results*/ 64) {
    					default_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty[0] & /*id*/ 2 && li_id_value !== (li_id_value = "" + (/*id*/ ctx[1] + "-result"))) {
    				attr(li, "id", li_id_value);
    			}

    			if (!current || dirty[0] & /*selectedIndex*/ 32 && li_aria_selected_value !== (li_aria_selected_value = /*selectedIndex*/ ctx[5] === /*i*/ ctx[33])) {
    				attr(li, "aria-selected", li_aria_selected_value);
    			}

    			if (dirty[0] & /*selectedIndex*/ 32) {
    				toggle_class(li, "selected", /*selectedIndex*/ ctx[5] === /*i*/ ctx[33]);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div;
    	let search;
    	let updating_value;
    	let t;
    	let div_aria_owns_value;
    	let div_aria_expanded_value;
    	let current;
    	let mounted;
    	let dispose;

    	const search_spread_levels = [
    		/*$$restProps*/ ctx[8],
    		{ "aria-autocomplete": "list" },
    		{
    			"aria-controls": "" + (/*id*/ ctx[1] + "-listbox")
    		},
    		{
    			"aria-labelledby": "" + (/*id*/ ctx[1] + "-label")
    		},
    		{ "aria-activedescendant": "" },
    		{ id: /*id*/ ctx[1] }
    	];

    	function search_value_binding(value) {
    		/*search_value_binding*/ ctx[16].call(null, value);
    	}

    	let search_props = {};

    	for (let i = 0; i < search_spread_levels.length; i += 1) {
    		search_props = assign(search_props, search_spread_levels[i]);
    	}

    	if (/*value*/ ctx[0] !== void 0) {
    		search_props.value = /*value*/ ctx[0];
    	}

    	search = new Search({ props: search_props });
    	/*search_binding*/ ctx[15](search);
    	binding_callbacks.push(() => bind(search, "value", search_value_binding));
    	search.$on("input", /*input_handler*/ ctx[17]);
    	search.$on("change", /*change_handler*/ ctx[18]);
    	search.$on("focus", /*focus_handler*/ ctx[19]);
    	search.$on("focus", /*focus_handler_1*/ ctx[20]);
    	search.$on("clear", /*clear_handler*/ ctx[21]);
    	search.$on("blur", /*blur_handler*/ ctx[22]);
    	search.$on("keydown", /*keydown_handler*/ ctx[23]);
    	search.$on("keydown", /*keydown_handler_1*/ ctx[24]);
    	let if_block = !/*hideDropdown*/ ctx[4] && /*results*/ ctx[6].length > 0 && create_if_block(ctx);

    	return {
    		c() {
    			div = element("div");
    			create_component(search.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			attr(div, "role", "combobox");
    			attr(div, "aria-haspopup", "listbox");
    			attr(div, "aria-owns", div_aria_owns_value = "" + (/*id*/ ctx[1] + "-listbox"));
    			attr(div, "class", "svelte-typeahead svelte-9qlbg2");
    			attr(div, "aria-expanded", div_aria_expanded_value = !/*hideDropdown*/ ctx[4] && /*results*/ ctx[6].length > 0);
    			attr(div, "id", /*id*/ ctx[1]);
    			toggle_class(div, "dropdown", /*results*/ ctx[6].length > 0);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(search, div, null);
    			append(div, t);
    			if (if_block) if_block.m(div, null);
    			/*div_binding*/ ctx[26](div);
    			current = true;

    			if (!mounted) {
    				dispose = listen(window, "click", /*click_handler*/ ctx[14]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const search_changes = (dirty[0] & /*$$restProps, id*/ 258)
    			? get_spread_update(search_spread_levels, [
    					dirty[0] & /*$$restProps*/ 256 && get_spread_object(/*$$restProps*/ ctx[8]),
    					search_spread_levels[1],
    					dirty[0] & /*id*/ 2 && {
    						"aria-controls": "" + (/*id*/ ctx[1] + "-listbox")
    					},
    					dirty[0] & /*id*/ 2 && {
    						"aria-labelledby": "" + (/*id*/ ctx[1] + "-label")
    					},
    					search_spread_levels[4],
    					dirty[0] & /*id*/ 2 && { id: /*id*/ ctx[1] }
    				])
    			: {};

    			if (!updating_value && dirty[0] & /*value*/ 1) {
    				updating_value = true;
    				search_changes.value = /*value*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			search.$set(search_changes);

    			if (!/*hideDropdown*/ ctx[4] && /*results*/ ctx[6].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty[0] & /*hideDropdown, results*/ 80) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*id*/ 2 && div_aria_owns_value !== (div_aria_owns_value = "" + (/*id*/ ctx[1] + "-listbox"))) {
    				attr(div, "aria-owns", div_aria_owns_value);
    			}

    			if (!current || dirty[0] & /*hideDropdown, results*/ 80 && div_aria_expanded_value !== (div_aria_expanded_value = !/*hideDropdown*/ ctx[4] && /*results*/ ctx[6].length > 0)) {
    				attr(div, "aria-expanded", div_aria_expanded_value);
    			}

    			if (!current || dirty[0] & /*id*/ 2) {
    				attr(div, "id", /*id*/ ctx[1]);
    			}

    			if (dirty[0] & /*results*/ 64) {
    				toggle_class(div, "dropdown", /*results*/ ctx[6].length > 0);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(search.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			/*search_binding*/ ctx[15](null);
    			destroy_component(search);
    			if (if_block) if_block.d();
    			/*div_binding*/ ctx[26](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const omit_props_names = ["id","value","data","extract","autoselect"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { id = "typeahead-" + Math.random().toString(36) } = $$props;
    	let { value = "" } = $$props;
    	let { data = [] } = $$props;
    	let { extract = item => item } = $$props;
    	let { autoselect = true } = $$props;
    	const dispatch = createEventDispatcher();
    	let comboboxRef = undefined;
    	let searchRef = undefined;
    	let hideDropdown = false;
    	let selectedIndex = -1;
    	let prevResults = "";

    	afterUpdate(() => {
    		if (prevResults !== resultsId && autoselect) {
    			$$invalidate(5, selectedIndex = 0);
    		}

    		prevResults = resultsId;
    	});

    	async function select() {
    		$$invalidate(0, value = extract(results[selectedIndex].original));

    		dispatch("select", {
    			selectedIndex,
    			selected: results[selectedIndex].original
    		});

    		await tick();
    		searchRef.focus();
    		$$invalidate(4, hideDropdown = true);
    	}

    	const click_handler = ({ target }) => {
    		if (!hideDropdown && results.length > 0 && comboboxRef && !comboboxRef.contains(target)) {
    			$$invalidate(4, hideDropdown = true);
    		}
    	};

    	function search_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			searchRef = $$value;
    			$$invalidate(3, searchRef);
    		});
    	}

    	function search_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(0, value);
    	}

    	function input_handler(event) {
    		bubble($$self, event);
    	}

    	function change_handler(event) {
    		bubble($$self, event);
    	}

    	function focus_handler(event) {
    		bubble($$self, event);
    	}

    	const focus_handler_1 = () => {
    		$$invalidate(4, hideDropdown = false);
    	};

    	const clear_handler = () => {
    		$$invalidate(4, hideDropdown = false);
    	};

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function keydown_handler(event) {
    		bubble($$self, event);
    	}

    	const keydown_handler_1 = ({ key }) => {
    		switch (key) {
    			case "Enter":
    				select();
    				break;
    			case "ArrowDown":
    				$$invalidate(5, selectedIndex += 1);
    				if (selectedIndex === results.length) {
    					$$invalidate(5, selectedIndex = 0);
    				}
    				break;
    			case "ArrowUp":
    				$$invalidate(5, selectedIndex -= 1);
    				if (selectedIndex < 0) {
    					$$invalidate(5, selectedIndex = results.length - 1);
    				}
    				break;
    			case "Escape":
    				$$invalidate(0, value = "");
    				searchRef.focus();
    				$$invalidate(4, hideDropdown = true);
    				break;
    		}
    	};

    	const click_handler_1 = i => {
    		$$invalidate(5, selectedIndex = i);
    		select();
    	};

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			comboboxRef = $$value;
    			$$invalidate(2, comboboxRef);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(8, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("id" in $$new_props) $$invalidate(1, id = $$new_props.id);
    		if ("value" in $$new_props) $$invalidate(0, value = $$new_props.value);
    		if ("data" in $$new_props) $$invalidate(9, data = $$new_props.data);
    		if ("extract" in $$new_props) $$invalidate(10, extract = $$new_props.extract);
    		if ("autoselect" in $$new_props) $$invalidate(11, autoselect = $$new_props.autoselect);
    		if ("$$scope" in $$new_props) $$invalidate(12, $$scope = $$new_props.$$scope);
    	};

    	let options;
    	let results;
    	let resultsId;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*extract*/ 1024) {
    			 $$invalidate(29, options = { pre: "<mark>", post: "</mark>", extract });
    		}

    		if ($$self.$$.dirty[0] & /*value, data, options*/ 536871425) {
    			 $$invalidate(6, results = fuzzy.filter(value, data, options).filter(({ score }) => score > 0));
    		}

    		if ($$self.$$.dirty[0] & /*results, extract*/ 1088) {
    			 resultsId = results.map(result => extract(result.original)).join("");
    		}
    	};

    	return [
    		value,
    		id,
    		comboboxRef,
    		searchRef,
    		hideDropdown,
    		selectedIndex,
    		results,
    		select,
    		$$restProps,
    		data,
    		extract,
    		autoselect,
    		$$scope,
    		slots,
    		click_handler,
    		search_binding,
    		search_value_binding,
    		input_handler,
    		change_handler,
    		focus_handler,
    		focus_handler_1,
    		clear_handler,
    		blur_handler,
    		keydown_handler,
    		keydown_handler_1,
    		click_handler_1,
    		div_binding
    	];
    }

    class Typeahead extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-9qlbg2-style")) add_css$1();

    		init(
    			this,
    			options,
    			instance$1,
    			create_fragment$1,
    			safe_not_equal,
    			{
    				id: 1,
    				value: 0,
    				data: 9,
    				extract: 10,
    				autoselect: 11
    			},
    			[-1, -1]
    		);
    	}
    }

    return Typeahead;

})));

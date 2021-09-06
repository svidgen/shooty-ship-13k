const { isa } = require('wirejs-dom');

const Event = function (singleFire) {
	this.fns = [];
	this.fired = 0;
	this.singleFire = singleFire || false;
	this.args = [];

	this.register = function (fn) {
		if (this.singleFire && this.fired > 0) {
			fn.apply(null, this.args);
		} else {
			this.fns.push(fn);
		}
	}; // register()

	this.fire = function (arg1, arg2, etc) {
		this.fired += 1;
		var firedFns = [];
		this.args = arguments;
		
		while (this.fns.length > 0) {
			var fn = this.fns.pop();
			fn.apply(null, this.args);
			firedFns.push(fn);
		}

		if (!this.singleFire) {
			this.fns = firedFns;
		}
	}; // fire()
};


const on = function (o, a, f, sf) {
	var eventName = "__TGEvent_on" + a;

	var singleFire = sf || false;

	// todo: add other enumerable types:
	if (isa(o, Array) || isa(o, NodeList)) {
		var _o = [];
		for (var i = 0; i < o.length; i++) {
			if (isa(o[i], Object) && (isa(o[i], Element) || !isa(o[i], Node))) {
				_o.push(o[i]);
			}
		}
		var registry = {
			objects: _o,    /* for debugging */
			count: _o.length,
			fired: 0,
			fn: f,
			fire: function () {
				this.fired++;
				if (this.fired >= this.count) {
					f();
				}
			}
		};

		if (_o.length > 0) {
			for (var i = 0; i < _o.length; i++) {
				on(_o[i], a, function () { registry.fire(); }, singleFire);
			}
		} else {
			registry.fire();
		}

		return registry;
	}

	var fns = [];

	if (typeof (o[eventName]) === 'undefined') {
		o[eventName] = new Event(singleFire);
	} else if (typeof (o[eventName]) == 'function' && !o[eventName] instanceof Event) {
		fns.push(o[eventName]);
		o[eventName] = new TG.Event(singleFire);
	} else if (isa(o[eventName], Array)) {
		fns = fns.concat(o[eventName]);
	}

	if (o[eventName] instanceof Event) {
		if (f) {
			fns.push(f);
		}
		for (var i = 0; i < fns.length; i++) {
			o[eventName].register(fns[i]);
		}
	}

	return o[eventName];
};


const onready = function (o, f) {
	return on(o, 'ready', f, true);
};


module.exports = {
	on,
	onready,
	Event
};
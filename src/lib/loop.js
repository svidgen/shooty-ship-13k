function MainLoop() {
	const now = new Date();
	const elapsed_ms = MainLoop.__lastTime ? (now - MainLoop.__lastTime) : 0;
	const elapsed = elapsed_ms / 1000;
	MainLoop.__lastTime = now;

	// remove "dead" objects
	var objects = MainLoop.objects.filter(item => !item.dead);
	MainLoop.objects = objects;

	// step loop
	for (var i = 0; i < objects.length; i++) {
		objects[i].step({now, elapsed, elapsed_ms});
	}
	
	// draw loop
	for (var i = 0; i < objects.length; i++) {
		objects[i].draw();
	}

	// not that we used to run "plugin" functions here,
	// added with MainLoop.addFunction(f).
	// this was removed because we could not find any uses thereof.
	// but ... if something breaks, we obviously need to add it back in.

	if (MainLoop.__interval) {
		requestAnimationFrame(() => MainLoop());
	}
}

MainLoop.__fps = 30;
MainLoop.__interval = null;
MainLoop.objects = [];
MainLoop.functions = [];

MainLoop.running = function() {
	return MainLoop.__interval;
} // TPDC.MainLoop.running()

MainLoop.addObject = function(o) {
	if (typeof(o) == 'object'
		&& o.step && typeof(o.step) == 'function'
		&& o.draw && typeof(o.draw) == 'function'
	) {
		var mo = MainLoop.objects;
		for (var i = 0; i < mo.length; i++) {
			if (o === mo[i]) {
				return true;
			}
		}
		mo.push(o);
		MainLoop.start();
		return true;
	} else {
		return false;
	}
} // TPDC.MainLoop.addObject()

MainLoop.removeObject = function(o) {
	const mo = MainLoop.objects;
	for (var i = 0; i < mo.length; i++) {
		if (mo[i] === o) {
			mo.splice(i, 1);
			return;
		}
	}
} // TPDC.MainLoop.removeObject()

MainLoop.start = function(fps) {
	if (!MainLoop.__interval) {
		MainLoop.__interval = true;
		requestAnimationFrame(() => MainLoop());
	}
} // TPDC.MainLoop.start()

MainLoop.stop = function() {
	MainLoop.__interval = null;
} // TPDC.MainLoop.stop()

MainLoop.pause = function() {
	return MainLoop.stop();
} // TPDC.MainLoop.pause()


module.exports = {
	MainLoop
};

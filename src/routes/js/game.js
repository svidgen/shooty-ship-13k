const { DomClass, setType, isa, getNodes } = require('wirejs-dom');
const { MouseCoords, NodeBox } = require('/src/lib/coords');
const { MainLoop } = require('/src/lib/loop');
const { on } = require('/src/lib/event');

// wait. why am i doing this again?
global.MainLoop = MainLoop;

let HIGHSCORE_KEY = 'shooty-ship-tiny.highscore';
let SHRAPNEL_TYPES = ['enemy'];
let ENEMY_TYPES = ['enemy'];
let GAME_NAME = "Shooty Ship 13k";

function rotateCss(node, deg) {
	node.style.transform = `rotate(${deg}rad)`;
	node.style.webkitTransform = `rotate(${deg}rad)`;
	node.style.mozTransform = `rotate(${deg}rad)`;
	node.style.msTransform = `rotate(${deg}rad)`;
};

const gameTemplate = `<ss:game>
	<ss:gameoversplash data-id='presplash'></ss:gameoversplash>
	<ss:ship data-id='ship' style='top: -100%; left: -100%;'></ss:ship>
</ss:game>`;

const Game = DomClass(gameTemplate, function _Board() {
	var _t = this;

	this.enabled = false;

	this.minX = 0;
	this.maxX = 100;
	this.minY = 0;
	this.maxY = 100;

	this._enemies = [];

	this.presplash.heading = GAME_NAME;

	this.enable = function() {
		if (!this.enabled) {
			this.register_event_proxies();
			this.enabled = true;
			MainLoop.addObject(_t);
		}
	};

	this.disable = function() {
		this.unregister_event_proxies();
		this.enabled = false;
	};

	this.resize = function() {
		this.style.width = '100%';
		this.style.height = '100%';
		this.style.top = '';
		this.style.left = '';
		this.minX = 0;
		this.maxX = 100;
		this.minY = 0;
		this.maxY = 100;

		var box = new NodeBox(this);

		// hack: make square == make relative sizing easier?
		// at least that was the logic at the time... to be revisited.
		var max = Math.max(box.width, box.height);
		var min = Math.min(box.width, box.height);
		var correction = 100 * max/min;
		var offset = (correction - 100)/2;
		var comp = 100 * offset/correction;
		if (box.width == max) {
			this.style.height = correction + '%';
			this.style.top = -1 * offset + '%';
			this.minY = comp;
			this.maxY = 100 - comp;
		} else {
			this.style.width = correction + '%';
			this.style.left = -1 * offset + '%';
			this.minX = comp;
			this.maxX = 100 - comp;
		}
	};

	this.getSpawnPoint = function() {
		var x, y;
		if (Math.random() < 0.5) {
			x = Math.random() < 0.5 ? this.minX : this.maxX;
			y = Math.random() * this.maxY;
		} else {
			y = Math.random() < 0.5 ? this.minY : this.maxY;
			x = Math.random() * this.maxX;
		}
		return {x: x, y: y};
	};

	this.step = function() {
		if (!this.enabled) { return; }

		if (this._enemies.length < this.maxRocks) {
			var spawn = this.getSpawnPoint();
			var target = {
				x: this.ship.x + (Math.random() * 20 - 10),
				y: this.ship.y + (Math.random() * 20 - 10)
			};

			// heading
			var rise = target.y - spawn.y;
			var run = target.x - spawn.x;
			var d = Math.atan2(rise, run);

			// enemy type
			const subtypes = ENEMY_TYPES || [];
			if (subtypes.length < 0) {
				throw new Error("No enemy types registered!");
				
			}

			var enemy = new BigEnemy({
				x: spawn.x, y: spawn.y, direction: d,
				speed: 6.0 + (10 * Math.random() * _t.maxRocks),
				game: _t,
				subtype: subtypes[Math.floor(Math.random() * subtypes.length)]
			});

			this.addEnemy(enemy);
		}
	};

	this.addEnemy = function(enemy) {
		on(enemy, 'shot', function() {
			_t.score += 1;
			_t.maxRocks = Math.max(1, Math.log(_t.score)/Math.log(Math.E));
		});

		on(enemy, 'destroy', function() {
			_t._enemies.splice(_t._enemies.indexOf(enemy), 1);
		});

		on(enemy, 'shatter', function(newEnemy) {
			_t.addEnemy(newEnemy);
		});

		this.appendChild(enemy);
		this._enemies.push(enemy);
	}; // addEnemy()

	this.draw = function() {
	}; // draw()

	this.gameover = function() {
		this.disable();
		setTimeout(function() {
			var splash = new GameOverSplash({
				board: _t,
				score: _t.score,
			});
			on(splash, 'restartClick', function() { _t.start(); });
			_t.appendChild(splash);
		}, 2000);
	}; // gameover()

	this.start = function() {
		this._enemies.forEach(function(enemy) {
			enemy.destroy();
		});

		this.score = 0;
		this.maxRocks = 1;

		this.enable();
		this.ship.respawn();
		this.ship.leapTo(50 - _t.ship.width/2, 50 - _t.ship.height/2);
	}; // restart()

	this.interact = function(e) {
		if (!this.enabled) { return; }

		var mc = new MouseCoords(e);
		var tc = new NodeBox(this);
		var destination = {
			x: 100 * (mc.x - tc.x)/tc.width,
			y: 100 * (mc.y - tc.y)/tc.height
		};
		this.ship.pushTo(destination);

		return false;
	}; // interact()

	this.register_event_proxies = function() {
		this.ontouchstart = eventProxy(_t, function(e) { _t.interact(e); });
		this.ontouchmove = function() { return false; }
		this.ontouchend = function() { return false; }
		this.ontouchleave  = function() { return false; }
		this.ontouchcancel = function() { return false; }
		this.onmousedown = eventProxy(_t, function(e) { _t.interact(e); });
		this.onclick = function() { return false; }
		this.onmouseup = function() { return false; }
	};

	this.unregister_event_proxies = function() {
		[
			'touchstart',
			'touchmove',
			'touchend',
			'touchleave',
			'touchecancel',
			'mousedown',
			'click',
			'mouseup'
		].forEach(function(event_name) {
			_t['on' + event_name] = null;
		});
	};

	var eventProxy = function(o, fn) {
		return function(e) {
			var evt = e || window.event;
			if (evt.type.match(/touch/)) {
				o.onmousedown = null;
				o.onmousemove = null;
				o.onmouseup = null;
			}
			var rv = fn(evt);
			if (!rv && typeof(evt.preventDefault) == 'function') {
				evt.preventDefault();
			}
			return rv;
		};
	};

	on(_t.presplash, 'restartClick', function() { _t.start(); });

	on(_t.ship, 'shoot', function(bullet) {
		_t.appendChild(bullet);
	});

	on(_t.ship, 'destroy', function() {
		_t.gameover();
	});

	this.resize();
	window.onresize = function() {
		_t.resize();
	};
});


const AudioPool = {
	channels : {},
	play : function(src) {
		if (typeof(this.channels[src]) == 'undefined') {
			this.prepare(src);
		} else {
			this.channels[src].play();
		}
	},
	prepare : function(src) {
		var AudioContext = window.AudioContext || window.webkitAudioContext;
		var _t = this;
		_t.context = _t.context || new AudioContext();
		var player = {
			buffer: null,
			play: function() {
				if (this.buffer) {
					var source = _t.context.createBufferSource();
					source.buffer = this.buffer;
					source.connect(_t.context.destination);
					source.start ? source.start(0) : source.noteOn(0);
				}
			} // play
		};
		var r = new XMLHttpRequest();
		r.open('GET', src, true);
		r.responseType = 'arraybuffer';
		r.onload = function() {
			_t.context.decodeAudioData(r.response, function(buffer) {
				player.buffer = buffer;
			});
		};
		r.send();
		this.channels[src] = player;
	}
};

const Button = function() {
	this.onclick = function() {
		on(this, 'click').fire();
		return false;
	};
	this.ontouchend = this.onclick;
};


const StartButton = DomClass("<ss:startbutton>Start</ss:startbutton>", function StartButton() {
	Button.apply(this);
});


const MagicallySizedObject = function() {
	var coords = new NodeBox(this);
	var pCoords = new NodeBox(this.parentNode || document.body);

	this.width = 100 * coords.width / pCoords.width;
	this.height = 100 * coords.height / pCoords.height;
};


const Ship = DomClass('<ss:ship></ss:ship>', function Ship() {
	var _t = this;

	this.x = this.x || 0;
	this.y = this.y || 0;

	this.style.backgroundImage = "url(./img/shooty-ship.svg)";

	MagicallySizedObject.apply(this);

	this.direction = this.direction || Math.PI/-2; 
	this.target = {x: _t.x, y: _t.y, direction: _t.direction};

	this.enabled = false;

	this.enable = function() {
		if (!this.enabled) {
			MainLoop.addObject(this);
			this.enabled = true;
		}
	};

	this.disable = function() {
		if (this.enabled) {
			MainLoop.removeObject(this);
			this.enabled = false;
		}
	};

	this.leapTo = function(x, y, direction) {
		this.x = x;
		this.y = y;
		this.direction = direction || Math.PI/-2;
		this.target = {x: _t.x, y: _t.y, direction: _t.direction};
	};

	this.step = function({elapsed}) {
		if (!elapsed) return;

		var t = this.target.direction;
		var c = this.direction;
		this.direction = this.direction + 30 * elapsed * Math.atan2(
			Math.sin(this.target.direction - this.direction),
			Math.cos(this.target.direction - this.direction)
		) / 4;

		const xSpeed = 30 * (this.target.x - this.x) / 12;
		const ySpeed = 30 * (this.target.y - this.y) / 12;

		this.x += xSpeed * elapsed;
		this.y += ySpeed * elapsed;
	};

	this.draw = function() {
		var d = Number(this.direction) + (Math.PI/2);
		rotateCss(this, d);
		this.style.left = this.x + '%';
		this.style.top = this.y + '%';
	};

	this.destroy = function() {
		if (this.dead || this.disabled) { return; }

		this.dead = true;
		this.disable();

		var pn = this.parentNode;
		var x = this.x;
		var y = this.y;
		for (var i = 0; i < 8; i++) {
			setTimeout(function() {
				pn.appendChild(
					new Explosion({
						x: x + (Math.random() * 10) - 5,
						y: y + (Math.random() * 10) - 5,
						duration: i * 100
					})
				);
			}, i * 100);
		}

		on(this, 'destroy').fire();
		this.style.display = 'none';
	};

	this.respawn = function() {
		this.dead = false;
		this.style.display = '';
		this.enable();
	};

	this.pushTo = function(coords) {
		if (this.dead) { return false; }

		this.shoot();

		this.target.x = coords.x - this.width/2;
		this.target.y = coords.y - this.height/2;

		var rise = this.target.y - this.y;
		var run = this.target.x - this.x;
		this.target.direction = Math.atan2(rise, run);
	};

	this.shoot = function() {
		var bullet = new Bullet({
			x: _t.x + this.width/2,
			y: _t.y + this.height/2,
			direction: _t.direction
		});
		on(this, 'shoot').fire(bullet);
	};

	on(this, 'collide', function(o) {
		if(isa(o, 'SS.Enemy')) {
			_t.destroy();
		}
	});

	setType(this, 'SS.Ship');
});

const Projectile = function() {
	var _t = this;

	this.x = Number(this.x || 0);
	this.y = Number(this.y || 0);
	this.width = Number(this.width || 1);
	this.height = Number(this.height || 1);

	this.ix = this.x;
	this.iy = this.y;

	this.direction = this.direction || 0;
	this.speed = this.speed || 75;
	this.range = this.range || 130;
	this.dead = false;

	this.conflicts = this.conflicts || [];

	this.destroy = function() {
		on(this, 'destroy').fire();
		this.dead = true;
		this.parentNode ? this.parentNode.removeChild(this) : 1;
	};

	this.step = function({elapsed}) {
		var dx = this.x - this.ix;
		var dy = this.y - this.iy;
		var travelled = Math.sqrt(dx * dx + dy * dy);
		if (travelled >= this.range) {
			this.destroy();
		} else {
			const stepSize = this.speed * elapsed;
			this.x += Math.cos(this.direction) * stepSize;
			this.y += Math.sin(this.direction) * stepSize;
			this.findCollisions();
		}
	};

	this.draw = function() {
		this.style.top = this.y - this.height/2 + '%';
		this.style.left = this.x - this.width/2 + '%'; 
	};

	this.findCollisions = function() {
		for (var i = 0; i < this.conflicts.length; i++) {
			this.findCollisionsWith(this.conflicts[i]);
		}
	};

	this.findCollisionsWith = function(search) {
		if (this.dead) {
			return;
		}

		var box = new NodeBox(this);
		var nodes = getNodes(document, search);
		for (var i = 0; i < nodes.length; i++) {
			var target = nodes[i];
			if (!target.dead && box.overlaps(new NodeBox(target))) {
				on(this, 'collide').fire(nodes[i]);
				on(nodes[i], 'collide').fire(this);
			}
		}
	};
};


const Bullet = DomClass('<ss:bullet></ss:bullet>', function _Bullet() {
	var _t = this;

	this.speed = this.speed || 60;
	this.conflicts = [Enemy, BigEnemy, Shrapnel];

	on(this, 'collide', function(o) {
		if (isa(o, 'SS.Enemy')) {
			_t.destroy();
		}
	});

	this.init = function() {
		AudioPool.play(Bullet.sound);
		MainLoop.addObject(this);
	};

	Projectile.apply(this);
	setType(this, 'SS.Bullet');
});
Bullet.sound = "audio/pew.mp3";
AudioPool.prepare(Bullet.sound);


const Enemy = DomClass('<ss:enemy></ss:enemy>', function Enemy() {
	Projectile.apply(this);
	var _t = this;

	this.speed = this.speed || 30;
	this.width = 11.7;
	this.height = 11.7;

	this.visibleDirection = this.visibleDirection || 0;
	this.rotationSpeed = 30 * (Math.random() * 0.4 - 0.2);

	this.conflicts = [Ship];

	this._step = this.step;
	this.step = function({now, elapsed, elapsed_ms}) {
		const rotationStep = elapsed * this.rotationSpeed;
		this.visibleDirection = this.visibleDirection + rotationStep;
		this._step({now, elapsed, elapsed_ms});
	};

	var innerDraw = this.draw;
	this.draw = function() {
		var d = Number(this.visibleDirection) + (Math.PI/2);
		rotateCss(this, d);
		innerDraw.call(this);
	};

	this.explode = function(v, impact) {
		on(_t, 'shot').fire();
		_t.parentNode.appendChild(new Explosion({
			x: _t.x,
			y: _t.y,
			text: v === undefined ? _t.game.score : v
		}));
		_t.destroy();
	};

	on(this, 'collide', function(o) {
		if (isa(o, 'SS.Bullet')) {
			_t.explode(_t.game.score + 1, new Momentum({
				direction: o.direction, speed: o.speed, mass: 1
			}));
		}
	});

	this.init = function() {
		MainLoop.addObject(this);
	};

	setType(this, 'SS.Enemy');
});


const BigEnemy = DomClass('<ss:bigenemy></ss:bigenemy>', function _BigEnemy() {
	var _t = this;
	Enemy.apply(this);

	this.mass = 5;

	this.scale = 0.09;
	if (this.subtype) {
		var img = new Image();
		img.onload = function() {
			_t.style.width = img.width * _t.scale + 'vmin';
			_t.style.height = img.height * _t.scale + 'vmin';
		};
		img.src = 'img/' + this.subtype + ".svg";
		this.style.backgroundImage = "url('" + img.src + "')";
	}

	var baseExplode = this.explode;
	this.explode = function(v, impact) {
		baseExplode.call(this, v);

		if (!impact) {
			return;
		}

		var combined_impact = new Momentum({
			direction: this.direction,
			speed: this.speed,
			mass: this.mass
		});

		combined_impact.impactBy(impact);

		const shrapnel_count = Math.floor(Math.random() * 5);
		combined_impact.speed = (combined_impact.speed*0.75)/shrapnel_count;
		for (var i = 0; i < shrapnel_count; i++) {
			this.emitRandomShrapnel(combined_impact);
		}
	};

	this.emitRandomShrapnel = function(impact) {
		const subtypes = SHRAPNEL_TYPES;
		if (subtypes.length > 0) {
			var subtype = subtypes[Math.floor(Math.random() * subtypes.length)];
			this.emitShrapnel(impact, subtype);
		}
	};

	this.emitShrapnel = function(impact, subtype) {
		var momentum = new Momentum({
			direction: (Math.random() * Math.PI * 2) - Math.PI,
			speed: 7.5,
			mass: 1.5
		});

		momentum.impactBy(impact);

		var rv = new Shrapnel({
			x: _t.x, y: _t.y, direction: momentum.direction,
			speed: momentum.speed,
			game: _t.game,
			subtype: subtype
		});

		on(this, 'shatter').fire(rv);
	};


	setType(this, 'SS.BigEnemy');
});


const Shrapnel = DomClass('<ss:shrapnel></ss:shrapnel>', function Shrapnel() {
	Enemy.apply(this);
	var _t = this;

	this.scale = 0.05;

	if (this.subtype) {
		var img = new Image();
		img.onload = function() {
			_t.style.width = img.width * _t.scale + 'vmin';
			_t.style.height = img.height * _t.scale + 'vmin';
		};
		img.src = 'img/' + this.subtype + ".svg";
		this.style.backgroundImage = "url('" + img.src + "')";
	}

	setType(this, 'SS.Shrapnel');
});


const explosionTemplate = `<ss:explosion>
	<table><tr><td data-id='text'></td></tr></table>
</ss:explosion>`;

const Explosion = DomClass(explosionTemplate, function _Explosion() {
	this.dead = false;
	this.duration = this.duration || 500;
	this.radius = this.radius || 15;
	this.startTime = new Date();
	this.x = this.x || 50;
	this.y = this.y || 50;

	this.pct = 0;

	this.destroy = function() {
		this.dead = true;
		this.parentNode.removeChild(this);
		on(this, 'destroy').fire();
	};

	this.step = function({now}) {
		this.pct = Math.min(1, (now.getTime() - this.startTime.getTime())/this.duration);
		if (this.pct > 0.98) {
			this.destroy();
		}
	};

	this.draw = function() {
		var c = this.pct * this.radius;
		this.style.width = c + '%';
		this.style.height = this.offsetWidth - 30 + 'px';
		this.style.left = this.x - c/2 + '%';
		this.style.top = this.y - c/2 + '%';
		this.style.opacity = 1 - this.pct;
		this.style.filter = "alpha(opacity=" + (1 - this.pct) * 100 + ")";
		this.style.fontSize = this.offsetWidth * 0.5 + 'px';
	};

	this.init = function() {
		MainLoop.addObject(this);
		AudioPool.play(Explosion.sound);
	};

});
Explosion.sound = 'audio/pkewh.mp3';
AudioPool.prepare(Explosion.sound);


const Momentum = function({direction, speed, mass}) {

	this.direction = direction || 0;
	this.speed = speed || 0;
	this.mass = mass || 1;

	this.impactBy = function(impactVector) {
		var x = this.getXMomentum() + impactVector.getXMomentum();
		var y = this.getYMomentum() + impactVector.getYMomentum();
		this.direction = Math.atan2(y, x);
		this.speed = Math.sqrt(x * x + y * y) / this.mass;
	};

	this.getXMomentum = function() {
		return Math.cos(this.direction) * this.speed * this.mass;
	};

	this.getYMomentum = function() {
		return Math.sin(this.direction) * this.speed * this.mass;
	};

};

const gameOverSplashTemplate = `<ss:gameoversplash>
	<div class='background'></div>
	<div class='foreground'>
		<h1 data-id='heading'>Game Over</h1>
		<div class='scoreline'>Your score: <span data-id='score' class='score'>...?</span></div>
		<div data-id='maxScoreLine' class='max-scoreline'>Your best: <span data-id='maxScore' class='score'>...?</span></div>
		<p><img src='img/shooty-ship.svg' style='width: 5em;' /></p>
		<p><i>"The world is thy ship; not thy home."</i></p>
		<p>&ndash; St. Therese of Lisieux</p>
		<p>(And what better ship than a <b>shooty</b> ship.)</p>
		<ss:startbutton data-id='restart'>Restart</ss:startbutton>
		<tpdc:share data-id='share'></tpdc:share>
		<div class='copyright'><a target='_blank' href='https://www.thepointless.com'>www.thepointless.com</a></div>
	</div>
</ss:gameoversplash>`;

const GameOverSplash = DomClass(gameOverSplashTemplate, function _GameOverSplash() {
	var _t = this;

	this.delay = this.delay || 1000;

	const score = parseInt(this.score) || 0;

	if (score == 0) {
		this.share.parentNode.removeChild(this.share);
	} else {
		this.share.object = {
			text: `I scored ${score} in ${GAME_NAME}!`,
			category: "game"
		};
	}

	let max = 0;
	if (localStorage) {
		max = Math.max(
			parseInt(localStorage.getItem(HIGHSCORE_KEY)) || 0,
			score
		);
		localStorage.setItem(HIGHSCORE_KEY, max);
		_t.maxScore = max;
	} else {
		_t.maxScoreLine.parentNode.removeChild(this.maxScoreLine);
	}

	on(_t.restart, 'click', function() {
		on(_t, 'restartClick').fire();
		_t.parentNode.removeChild(_t);
	});

	this.init = function() {
		setTimeout(function() {
			_t.classList.add('visible');
		}, this.delay);
	};
});

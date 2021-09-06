class MouseCoords {
	constructor(event) {
		var e = event || global.event;
		if (e.changedTouches) {
			this.x = e.changedTouches[0].pageX;
			this.y = e.changedTouches[0].pageY;
		} else if (e.pageX || e.pageY) {
			this.x = e.pageX;
			this.y = e.pageY;
		} else if (e.clientX || e.clientY) {
			this.x = e.clientX + document.body.scrollLeft;
			this.y = e.clientY + document.body.scrollTop;
		}
	}
};

class Box {
	constructor(x, y, w, h, mt, mr, mb, ml) {
		this.x = x || 0;
		this.y = y || 0;
		this.width = w || 0;
		this.height = h || 0;
		this.marginTop = mt || 0;
		this.marginRight = mr || 0;
		this.marginBottom = mb || 0;
		this.marginLeft = ml || 0;
	}

	contains(x, y) {
		var ex = this.x - Math.ceil(this.marginLeft/2);
		var ey = this.y - Math.ceil(this.marginTop/2);
		var eright = this.x + this.width - Math.ceil(this.marginRight/2);
		var ebottom = this.y + this.height - Math.ceil(this.marginBottom/2);
		if (x >= ex && x <= eright && y >= ey && y <= ebottom) {
			return true;
		} else {
			return false;
		}
	};

	getBottom() {
		return this.y + this.height;
	};

	getRight() {
		return this.x + this.width;
	};

	rangeOverlaps(aMin, aMax, bMin, bMax) {
		return aMin <= bMax && bMin <= aMax;
	};

	xOverlaps(box) {
		return this.rangeOverlaps(
			this.x, this.getRight(), box.x, box.getRight()
		);
	};

	yOverlaps(box) {
		return this.rangeOverlaps(
			this.y, this.getBottom(), box.y, box.getBottom()
		);
	};

	overlaps(box) {
		return this.xOverlaps(box) && this.yOverlaps(box);
	};
};

class NodeBox extends Box {
	constructor(n) {
		let x = n.offsetLeft;
		let y = n.offsetTop;

		var temp = n;
		while (temp = temp.offsetParent) {
			x += temp.offsetLeft;
			y += temp.offsetTop;
		}

		let width = n.offsetWidth;
		let height = n.offsetHeight;

		var style = {
			marginLeft: '', marginRight: '', marginTop: '', marginBottom: ''
		};

		let marginLeft = parseInt(style.marginLeft.replace(/[^0-9]/g, '') || '0');
		let marginRight = parseInt(style.marginRight.replace(/[^0-9]/g, '') || '0');
		let marginTop = parseInt(style.marginTop.replace(/[^0-9]/g, '') || '0');
		let marginBottom = parseInt(style.marginBottom.replace(/[^0-9]/g, '') || '0');

		super(x, y, width, height, marginTop, marginRight, marginBottom, marginLeft);

		this.left = this.x;
		this.top = this.y;
		this.right = this.x + this.width;
		this.bottom = this.x + this.height;
	};
};

module.exports = {
	Box,
	MouseCoords,
	NodeBox
};
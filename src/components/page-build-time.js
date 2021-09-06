const { DomClass } = require('wirejs-dom');

const template = `<eg:pagebuildtime><span data-id='time'
	>record time</
span></eg:pagebuildtime>`;

const PageBuildTime = DomClass(template, function _PageBuildTime() {
	const _t = this;
	if (window.performance) {
		const loop = setInterval(() => {
			const perfData = window.performance.timing;
			const time = perfData.loadEventEnd - perfData.navigationStart;
			if (time > 0) {
				_t.time = `${(time/1000).toFixed(1)} seconds`;
				clearInterval(loop);
			}
		}, 100);
	}
});

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const CopyWebpackPlugin = require('copy-webpack-plugin'); 
const marked = require('marked');

const BUILD_ID = (new Date()).getTime();

fs.writeFileSync('./src/build_id.json', JSON.stringify(BUILD_ID.toString()));


// TODO: Refactor these transforms out of here.
// TODO: Create a separate package to manage all of this for easy reuse on
// other projects.
// TODO: consider whether using the front-end framework for SSG would be safe,
// and intuitive, rather than having two completely separate rendering modes.

function distPath({subpathOut = '', subpathIn = ''} = {}) {
	return function({context, absoluteFilename}) {
		const prefixIn = path.resolve(context, subpathIn);
		const prefixOut = path.resolve(context, 'dist', subpathOut);
		const relativeName = path.join('./', absoluteFilename.slice(prefixIn.toString().length));
		const fullOutPath = path.resolve(prefixOut, relativeName)
			.replace(/\.md$/, ".html");
		console.log(`Mapping ${relativeName} to ${fullOutPath}`);
		return fullOutPath;
	};
};

const layouts = {};
const CollectLayouts = {
	transformer: (content, path) => {
		// add one to dirname prefix to include separating slash
		const relativePath = path.slice(__dirname.length + 1);
		layouts[relativePath] = content.toString();
		return content.toString();
	}
};

const SSG = {
	transformer: (content, _path) => {

		// TODO: move to a directives module.
		let _meta = {};
		function meta(o) {
			_meta = o;
			return '';
		}

		let body;
		try {
			let isInCodeBlock = false;
			const escapedMarkdown = content.toString().split(/\n/)
				.reduce((lines, line) => {
					if (isInCodeBlock) {
						lines[lines.length-1] += "\n" + line;
					} else {
						lines.push(line);
					}
					if (line.startsWith('```')) {
						isInCodeBlock = !isInCodeBlock;
					}
					return lines;
				}, [])
				.map(l => l.trim()).join('\n')
				.replace(/(``+)/g, m => Array(m.length).fill('\\`').join(''))
			;
			const bodyMarkdown = eval('`' + escapedMarkdown + '`');
			body = marked(bodyMarkdown);
		} catch (err) {
			console.error(`Could not parse page ${_path}`, err);
			throw err;
		}

		const metatags = Object.entries(_meta).map(([tag, content]) => {
			tag = tag.replace(/"/g, '&quot;');
			content = content.replace(/"/g, '&quot;');
			return `<meta name="${tag}" content="${content}" />`;
		}).join('\n');
		let title = _meta.title;

		const layoutPath = path.join(
			'src',
			'layouts',
			(_meta.layout || 'default')
		) + '.html';
		const layout = layouts[layoutPath];
		
		try {
			return eval('`' + layout + '`');
		} catch (err) {
			console.error(`Could not parse layout ${layoutPath}`, err);
			throw err;
		}
	}
};

module.exports = (env, argv) => {
	var devtool = 'source-map';
	if (argv.mode == 'development') {
		devtool = 'eval-cheap-source-map';
	}

	const sources = ['./src/index.js']
		.concat(glob.sync('./src/routes/**/*.js'))
		.concat(glob.sync('./src/layouts/**/*.js'))
	;

	const entry = sources.reduce((files, path) => {
		if (path.match(/src\/routes/)) {
			files[path.toString().slice('./src/routes'.length)] = path;
		} else if (path.match(/src\/layouts/)) {
			files[path.toString().slice('./src/'.length)] = path;
		}
		return files;
	}, {});

	return {
		// devServer: {
		// 	// contentBase: path.join(__dirname, 'dist'),
		// 	compress: true,
		// 	// open: true,
		// 	port: 9999,
		// 	watchContentBase: true,
		// 	liveReload: true,
		// 	hot: true
		// },
		entry,
		output: {
			filename: "[name]"
		},
		devtool,
		plugins: [
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'static',
						noErrorOnMissing: true
					},
					{
						from: './src/layouts/**/*.html',
						to: distPath({
							subpathIn: 'src/layouts',
							subpathOut: 'layouts'
						}),
						transform: CollectLayouts,
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.md',
						to: distPath({ subpathIn: 'src/routes' }),
						transform: SSG,
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.html',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.css',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
						// trasform: ???
					},
					{
						from: './src/routes/**/*.png',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.jpg',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.json',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.svg',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
					{
						from: './src/routes/**/*.mp3',
						to: distPath({ subpathIn: 'src/routes' }),
						noErrorOnMissing: true
					},
				],
			})
		],
		module: {
			rules: [
				{
					test: /\.css$/,
					use: [
						"style-loader",
						{ loader: "css-loader", options: {
							// don't try to require() url assets
							url: false
						} }
					]
				},
				{
					test: /\.html$/,
					loader: "file-loader",
					options: {
						name: "[name].[ext]",
					}
				},
				{
					test: /\.mjs$/,
					resolve: {
						fullySpecified: false
					}
				},
				{
					test: /\.tpl$/,
					use: "raw-loader",
				},
			]
		}
	};
};

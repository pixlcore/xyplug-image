// xyplug-image
// xyOps Plugin for manipulating images using canvas-plus

const fs = require('fs');
const CanvasPlus = require('pixl-canvas-plus');

const app = {
	
	files: [],
	
	async run() {
		const chunks = [];
		for await (const chunk of process.stdin) chunks.push(chunk);
		this.job = JSON.parse( chunks.join('') );
		this.params = this.job.params;
		this.input = this.job.input || {};
		const files = this.input.files || [];
		
		if (!this.params.config) this.params.config = {};
		
		// flatten jpeg/png config objects into top-level
		if (this.params.config.jpeg) {
			for (let key in this.params.config.jpeg) { this.params.config[key] = this.params.config.jpeg[key]; }
			delete this.params.config.jpeg;
		}
		if (this.params.config.png) {
			for (let key in this.params.config.png) { this.params.config[key] = this.params.config.png[key]; }
			delete this.params.config.png;
		}
		
		if (!files || !files.length) {
			throw new Error("No input files found.");
		}
		
		this.log(`Starting processing on ${files.length} files...`);
		
		for (const [idx, file] of files.entries()) {
			await this.processFile(file);
			this.send({ progress: idx / files.length });
		}
		
		console.log( `🟢 Job complete` );
		this.send({ code: 0, files: this.files });
	},
	
	async processFile(file) {
		// process single file
		const params = this.params;
		
		this.log("Processing file: " + file.filename);
		
		// init canvas
		this.canvas = new CanvasPlus();
		this.canvas.set( params.config );
		
		// load image
		await this.canvas.load( file.filename );
		
		// optional filters
		let filters = [];
		
		// resize
		if (params.resize_enabled) {
			delete params.resize_enabled;
			filters.push({
				name: 'resize',
				params: this.extractParams('resize_')
			});
		}
		
		// crop
		if (params.crop_enabled) {
			delete params.crop_enabled;
			filters.push({
				name: 'crop',
				params: this.extractParams('crop_')
			});
		}
		
		// transform
		if (params.transform_enabled) {
			delete params.transform_enabled;
			filters.push({
				name: 'transform',
				params: this.extractParams('transform_')
			});
		}
		
		// adjust
		if (params.adjust_enabled) {
			delete params.adjust_enabled;
			filters.push({
				name: 'adjust',
				params: this.extractParams('adjust_')
			});
		}
		
		// custom filter
		if (params.filter_tool && (params.filter_tool != 'none')) {
			filters.push({
				name: params.filter_tool,
				params: this.extractParams( params.filter_tool + '_' )
			});
		}
		
		// quantize
		if (params.quantize_enabled) {
			delete params.quantize_enabled;
			filters.push({
				name: 'quantize',
				params: this.extractParams('quantize_')
			});
		}
		
		// apply all filters in sequence
		for (const [idx, filter] of filters.entries()) {
			await this.applyFilter(filter);
		}
		
		// write
		let output = this.extractParams('output_');
		let append = output.append || '';
		delete output.append;
		
		output.file = file.filename.replace(/\.\w+$/, '') + append + '.' + output.format.replace(/jpeg/, 'jpg');
		
		await this.canvas.write(output);
		this.log(`Wrote: ` + output.file);
		this.files.push( output.file );
		
		// done
		this.canvas.reset();
		delete this.canvas;
	},
	
	async applyFilter(filter) {
		// apply single filter to current canvas
		let func = 'filter_' + filter.name;
		if (this[func]) {
			await this[func](filter.params);
		}
		else {
			this.canvas[filter.name](filter.params);
		}
	},
	
	async filter_transform(filter) {
		// intercept transform
		switch (filter.mode) {
			case 'rotate':
				this.canvas.transform({
					rotate: filter.rotate,
					background: filter.background,
					antialias: filter.antialias,
					fixed: filter.fixed
				});
			break;
			
			case 'matrix':
				this.canvas.transform({
					matrix: filter.matrix.split(/\,\s*/).map( parseFloat ),
					background: filter.background,
					antialias: filter.antialias,
					fixed: filter.fixed
				});
			break;
			
			case 'fliph':
				this.canvas.flipHorizontal();
			break;
			
			case 'flipv':
				this.canvas.flipVertical();
			break;
		}
	},
	
	async filter_adjust(filter) {
		// intercept adjustments
		if (filter.hue || filter.saturation || filter.brightness || filter.contrast) {
			this.canvas.adjust({
				hue: filter.hue,
				saturation: filter.saturation,
				brightness: filter.brightness,
				contrast: filter.contrast
			});
		}
		
		if (filter.highlights || filter.shadows) {
			this.canvas.lighting({
				highlights: filter.highlights,
				shadows: filter.shadows,
				channels: filter.channels
			});
		}
		
		if (filter.gamma && (filter.gamma != 1.0)) {
			this.canvas.gamma({
				amount: filter.gamma,
				channels: filter.channels
			});
		}
		
		if (filter.normalize) {
			this.canvas.normalize({
				channels: filter.channels
			});
		}
	},
	
	async filter_composite(filter) {
		// intercept composite to fetch url or load from disk
		
		// work around quirk in canvas-plus
        if (!('width' in filter)) filter.width = 0;
        if (!('height' in filter)) filter.height = 0;
		
		let overlay = new CanvasPlus();
		overlay.set( this.params.config );
		
		// load overlay
		await overlay.load( filter.image );
		
		// replace file path / URL with actual canvas-plus overlay object
		filter.image = overlay;
		
		// now we can call composite
		this.canvas.composite( filter );
	},
	
	async filter_quantize(filter) {
		// intercept quantize to go fast/quality
		let mode = filter.mode;
		delete filter.mode;
		this.canvas[mode](filter);
	},
	
	extractParams(prefix) {
		// extract all params matching prefix, and strip prefix
		var extraction = {};
		
		for (let key in this.params) {
			if (key.startsWith(prefix)) {
				extraction[ key.substring(prefix.length) ] = this.params[key];
			}
		}
		
		return extraction;
	},
	
	send(args) {
		// send message to xyOps
		console.log( JSON.stringify({ xy: 1, ...args }) );
	},
	
	log(msg) {
		console.log( `🔵 ` + msg );
	}
	
}; // app

app.run().catch( async (err) => {
	// universal error catch
	console.error( `🛑 Error: ` + err, err );
	
	if (app.canvas) app.canvas.reset();
	delete app.canvas;
	
	if (app.job && app.job.xy) console.log( JSON.stringify({ 
		xy: 1, 
		code: 1, 
		description: '' + err
	}) );
	
	process.exit(1);
});

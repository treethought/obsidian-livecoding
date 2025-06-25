import { initStrudel, hush } from './strudelWeb';
import { aliasBank, registerSynthSounds, registerZZFXSounds, samples } from "@strudel/webaudio"
import { registerSoundfonts } from '@strudel/soundfonts';
import { flash, flashField } from "@strudel/codemirror";

import { initHydra, clearHydra } from "@strudel/hydra";


export class StrudelClient {
	constructor() {
		this.strudel = null;
	}

	async init(options = {}) {
		options = {
			prebake: prebake,
			...options,
		}
		console.log('Initializing Strudel...');
		await initStrudel(options);
	}

	async evaluate(code) {
		return evaluate(code);
	}

	async stop() {
		console.log('Stopping ...');
		this.evaluate('hush()');
		hush();
		clearHydra();
	}

	async startHydra() {
		console.log('Starting hydra...');
		initHydra();
	}

	async stopHydra() {
		console.log('Stopping hydra...');
		clearHydra();
	}

	flashCode(editorView) {
		flash(editorView);
	}

	extensions() {
		return [
			flashField,
		];
	}
}


async function prebake() {
	// see @strudel/repl prebake script
	const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
	const ts = 'https://raw.githubusercontent.com/todepond/samples/main/';
	await Promise.all([
		registerSoundfonts(),
		registerSynthSounds(),
		registerZZFXSounds(),
		// samples('http://localhost:5432'),
		samples('github:tidalcycles/dirt-samples'),
		samples(`${ds}/tidal-drum-machines.json`),
		samples(`${ds}/piano.json`),
		samples(`${ds}/Dirt-Samples.json`),
		samples(`${ds}/EmuSP12.json`),
		samples(`${ds}/vcsl.json`),
		samples(`${ds}/mridangam.json`),
	]);

	aliasBank(`${ts}/tidal-drum-machines-alias.json`);
}

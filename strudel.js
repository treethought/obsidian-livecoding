import { initStrudel } from '@strudel/web';

export class StrudelClient {
	constructor() {
		this.strudel = null;
	}

	async init() {
		console.log('Initializing Strudel Client...');
		await initStrudel({
			prebake: prebake,
		});
	}

	async evaluate(code) {
		return evaluate(code);
	}
}


async function prebake() {
	// see @strudel/repl prebake script
	const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main/';
	const ts = 'https://raw.githubusercontent.com/todepond/samples/main/';
	await Promise.all([
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

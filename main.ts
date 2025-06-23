import { Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import { StrudelClient } from './strudel';


interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	strudel: StrudelClient;

	async onload() {
		await this.loadSettings();
		this.strudel = new StrudelClient();
		await this.strudel.init()
		console.log("Strudel done intit");


		this.addRibbonIcon('music', 'ALGORAVE', () => {
			// this.activateView(VIEW_TYPE_REPO);
		});

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		this.addCommand({
			id: 'RAVE-hush',
			name: 'HUSH',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'h',
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const sel = editor.getValue()
				console.log("Evaluating file content:")
				console.log(sel)
				this.strudel.evaluate('hush()')
			},
		})

		this.addCommand({
			id: 'RAVE-evaluate-file',
			name: 'Evaluate File',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'p',
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const sel = editor.getValue()
				console.log("Evaluating file content:")
				console.log(sel)
				this.strudel.evaluate(sel)
			},
		})

		this.addCommand({
			id: 'RAVE-evaluate-block',
			name: 'Evaluate Block',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'e',
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				// conse bodeBlocks = view.contentEl
				const sel = editor.getValue()
				console.log(sel)
			},
		})


		this.registerMarkdownPostProcessor((element, context) => {
			const codeblocks = element.findAll('code');

			for (let codeblock of codeblocks) {
				const text = codeblock.innerText.trim();
				this.strudel.evaluate(text)
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

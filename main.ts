import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { StrudelClient } from './strudel';
import { EditorView } from '@codemirror/view';
import { flash, flashField } from "@strudel/codemirror";


interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class AlogRavePlugin extends Plugin {
	settings: MyPluginSettings;
	strudel: StrudelClient;

	onunload() {
		this.strudel?.stop()
	}

	async onload() {
		await this.loadSettings();
		if (!this.strudel) {
			this.strudel = new StrudelClient();
			await this.strudel.init()
		}


		this.registerEditorExtension(flashField);
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
			callback: () => {
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
				this.strudel.evaluate(sel)
			},
		})

		this.addCommand({
			id: 'RAVE-evaluate-block',
			name: 'Evaluate Block',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'e',
			},
			{
				modifiers: ["Shift", "Ctrl"],
				key: "enter",
			}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!editor) {
					new Notice("No editor found.");
					return;
				}

				const content = this.getCodeBlockContent(editor);
				if (!content) {
					new Notice("No code block found at cursor position.");
					return;
				}
				// @ts-expect-error, not typed
				const editorView = view.editor.cm as EditorView
				flash(editorView)
				this.strudel.evaluate(content);
			},
		})


		this.registerMarkdownPostProcessor((element, context) => {
			// TODO eval from processor if mode enabled
			return
			const codeblocks = element.findAll('code');

			for (let codeblock of codeblocks) {
				const text = codeblock.innerText.trim();
				this.strudel.evaluate(text)
			}
		});
	}

	getCodeBlockContent(editor: Editor): string | null {
		const cursor = editor.getCursor();

		const doc = editor.getDoc();
		let startLine = cursor.line;
		let endLine = cursor.line;

		while (startLine >= 0) {
			const line = doc.getLine(startLine);
			if (line.trim().startsWith('```')) {
				break;
			}
			startLine--;
		}

		while (endLine < doc.lineCount()) {
			const line = doc.getLine(endLine);
			if (line.trim().startsWith('```') && endLine > startLine) {
				break;
			}
			endLine++;
		}

		// extract code content excluding ``` lines
		if (startLine >= 0 && endLine < doc.lineCount()) {
			const codeBlockText = doc.getRange(
				{ line: startLine + 1, ch: 0 },
				{ line: endLine, ch: 0 }
			).trim();

			return codeBlockText;
		}
		return null;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

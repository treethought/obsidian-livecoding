import { Editor, MarkdownView, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { StrudelClient } from './strudel';
import { EditorView } from '@codemirror/view';

import { flash, flashField } from "@strudel/codemirror";
import { initHydra, clearHydra } from "@strudel/hydra";
import { AlgoRaveSamplesView, VIEW_TYPE_ALGORAVE_SAMPLES } from 'view';

interface AlgoRavePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AlgoRavePluginSettings = {
	mySetting: 'default'
}

export default class AlogRavePlugin extends Plugin {
	settings: AlgoRavePluginSettings;
	strudel: StrudelClient;

	onunload() {
		document.body.removeClass('hydra-active');
		this.strudel?.stop()
		clearHydra();
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_ALGORAVE_SAMPLES,
			(leaf) => new AlgoRaveSamplesView(leaf),
		);

		// Check for hydra canvas periodically
		this.registerInterval(window.setInterval(() => {
			const hydraCanvas = document.getElementById('hydra-canvas');
			if (hydraCanvas && !document.body.hasClass('hydra-active')) {
				document.body.addClass('hydra-active');
			} else if (!hydraCanvas && document.body.hasClass('hydra-active')) {
				document.body.removeClass('hydra-active');
			}
		}, 1000));

		// This creates an icon in the left ribbon.
		const ribbonIcon = this.addRibbonIcon(
			"music",
			"AlgoRave Samples",
			(_evt: MouseEvent) => {
				// Called when the user clicks the icon.
				this.activateView(VIEW_TYPE_ALGORAVE_SAMPLES);
			},
		);
		ribbonIcon.addClass("my-plugin-ribbWebClipson-class");


		this.strudel = new StrudelClient();

		await this.strudel.init({
			onEvalError: (err: string) => this.onEvalError(err),
			beforeStart: () => { new Notice("Starting Strudel..."); },
		});


		this.registerEditorExtension([
			flashField,
		]);


		this.addCommand({
			id: 'RAVE-hush',
			name: 'HUSH',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'h',
			}],
			callback: () => {
				this.strudel.evaluate('hush()');
			},
		})
		this.addCommand({
			id: 'RAVE-stop',
			name: 'Stop',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'x',
			}],
			callback: () => {
				this.strudel.evaluate('hush()');
				this.strudel.stop();
				clearHydra();
				document.body.removeClass('hydra-active');
			},
		})
		this.addCommand({
			id: 'rave-toggle-hydra',
			name: 'toggle Hydra style',
			hotkeys: [{
				modifiers: ['Shift', "Alt"],
				key: 'h',
			}],
			callback: () => {
				if (document.body.hasClass('hydra-active')) {
					clearHydra();
					document.body.removeClass('hydra-active');
				} else {
					initHydra();
				}
				document.body.addClass('hydra-active');
			},
		})

		this.addCommand({
			id: 'RAVE-evaluate-file',
			name: 'Evaluate File',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'p',
			}],
			editorCallback: (editor: Editor, _view: MarkdownView) => {
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
				console.log(content)
				// @ts-expect-error, not typed
				const editorView = view.editor.cm as EditorView
				flash(editorView)
				this.strudel.evaluate(content);
			},
		})

	}
	onEvalError(err: string) {
		new Notice(err);
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
	async activateView(v: string) {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(v);

		if (leaves.length > 0) {
			console.log("Found existing leaves:", leaves);
			// A leaf with our view already exists, use that
			leaf = leaves[0];
			workspace.revealLeaf(leaf);
			return;
		}

		// Our view could not be found in the workspace, create a new leaf
		// in the right sidebar for it
		leaf = workspace.getRightLeaf(false);
		await leaf?.setViewState({ type: v, active: true });

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}


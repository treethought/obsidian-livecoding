import { App, Editor, MarkdownView, Modal, Notice, Plugin, Setting, WorkspaceLeaf } from 'obsidian';
import { StrudelClient } from './strudel';
import { EditorView } from '@codemirror/view';

import { AlgoRaveSamplesView, VIEW_TYPE_ALGORAVE_SAMPLES } from 'view';

interface AlgoRavePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AlgoRavePluginSettings = {
	mySetting: 'default'
}

export default class AlogRavePlugin extends Plugin {
	settings: AlgoRavePluginSettings;
	strudel: StrudelClient | null = null;
	extensionsRegistered: boolean = false;

	onunload() {
		this.stop()
	}

	async onload() {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_ALGORAVE_SAMPLES,
			(leaf) => new AlgoRaveSamplesView(leaf),
		);

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

		// Check for hydra canvas periodically
		this.registerInterval(window.setInterval(() => {
			const hydraCanvas = document.getElementById('hydra-canvas');
			if (hydraCanvas && !document.body.hasClass('hydra-active')) {
				document.body.addClass('hydra-active');
			} else if (!hydraCanvas && document.body.hasClass('hydra-active')) {
				document.body.removeClass('hydra-active');
			}
		}, 1000));


		this.addCommand({
			id: 'RAVE-start',
			name: 'Enable RAVE',
			checkCallback: (checking: boolean) => {
				if (checking) {
					return !this.strudel;
				}
				this.start();
			},
		})
		this.addCommand({
			id: 'RAVE-stop',
			name: 'Stop',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'x',
			}],
			checkCallback: (checking: boolean) => {
				if (checking) {
					return this.strudel !== null;
				}
				this.stop()
			},
		})
		this.addCommand({
			id: 'rave-toggle-hydra',
			name: 'toggle Hydra style',
			hotkeys: [{
				modifiers: ['Shift', "Alt"],
				key: 'h',
			}],
			checkCallback: (checking: boolean) => {
				if (checking) {
					return this.strudel !== null;
				}
				if (document.body.hasClass('hydra-active')) {
					this.strudel?.stopHydra()
					document.body.removeClass('hydra-active');
				} else {
					this.strudel?.startHydra();
				}
				document.body.addClass('hydra-active');
			},
		})

		this.addCommand({
			id: 'RAVE-hush',
			name: 'HUSH',
			hotkeys: [{
				modifiers: ['Shift', "Ctrl"],
				key: 'h',
			}],
			checkCallback: (checking: boolean) => {
				if (checking) {
					return this.strudel !== null;
				}
				this.strudel?.evaluate('hush()');
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
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
				if (checking) {
					return (this.strudel !== null) && (editor !== null);
				}
				if (!this.strudel) {
					new Notice("RAVE is not running.");
					console.log("RAVE is not running., prompting to enable");
					new EnableModal(this.app, async (result: boolean) => {
						if (result) {
							await this.start();
							this.evalBlock(editor, view)
						}
					}).open()
					return;
				}
				this.evalBlock(editor, view)

			},
		})

	}

	evalBlock(editor: Editor, view: MarkdownView) {
		const content = this.getCodeBlockContent(editor);
		if (!content) {
			new Notice("No code block found at cursor position.");
			return;
		}
		console.log(content)
		// @ts-expect-error, not typed
		const editorView = view.editor.cm as EditorView
		this.strudel?.flashCode(editorView)
		this.strudel?.evaluate(content);

	}
	onEvalError(err: string) {
		new Notice(err);
	}

	async start() {
		if (this.strudel) {
			this.stop()
		}

		console.log("Starting RAVE");
		this.strudel = new StrudelClient();
		await this.strudel.init({
			onEvalError: (err: string) => this.onEvalError(err),
			beforeStart: () => { new Notice("Starting Strudel..."); },
		});

		if (!this.extensionsRegistered) {
			this.extensionsRegistered = true;
			this.registerEditorExtension(this.strudel.extensions())
		}
	}

	stop() {
		console.log("Stopping RAVE");
		const strudel = this.strudel;
		this.strudel = null;
		document.body.removeClass('hydra-active');
		strudel?.stop()
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

export class EnableModal extends Modal {
	constructor(app: App, onSubmit: (result: boolean) => void) {
		super(app);
		this.setTitle('Enable RAVE?');
		this.setContent("Enabling RAVE mode will allow obisidan-livecodiing plugin to evaluate JS code in strudel and hydra")

		const mod = new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Yes')
					.setCta()
					.onClick(() => {
						this.close();
						onSubmit(true);
					}));

		mod.addButton((btn) =>
			btn
				.setButtonText('No')
				.setCta()
				.onClick(() => {
					this.close();
					onSubmit(false);
				}));

	}
}

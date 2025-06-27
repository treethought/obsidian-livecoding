import { App, Editor, MarkdownView, Modal, Notice, Plugin, Setting, WorkspaceLeaf } from 'obsidian';
import { StrudelClient } from './strudel';
import { EditorView } from '@codemirror/view';
import { clipperTemplate } from 'clipperTemplate';

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
		this.addCommand({
			id: 'RAVE-show-template',
			name: 'Strudel Web Clipper Template',
			callback: () => {
				new ClipperTemplateModal(this.app).open()

			},
		})
		this.addCommand({
			id: 'RAVE-open-block-in-strudel',
			name: 'Open Block in Strudel',
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
				if (checking) {
					return (this.strudel !== null) && (editor !== null);
				}
				this.openBlockInStrudel(editor, view)
			}
		})
		this.addCommand({
			id: 'RAVE-save-block-version',
			name: 'Save Revision',
			editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
				if (checking) {
					return (editor !== null);
				}
				this.saveRevision(editor, view)
				// TODO: input for revision name for non-propert revision
				// new InputModal(this.app,
				// 	"Revision Title", "Optional title for this revision", (result: string) => {
				// 		this.saveRevision(editor, view)
				// 	}).open()
			}
		})
	}

	evalBlock(editor: Editor, view: MarkdownView) {
		const block = this.getCodeBlock(editor);
		if (!block) {
			new Notice("No code block found at cursor position.");
			return;
		}
		console.log(block.content)
		// @ts-expect-error, not typed
		const editorView = view.editor.cm as EditorView
		this.strudel?.flashCode(editorView)
		this.strudel?.evaluate(block.content);

	}

	saveRevision(editor: Editor, view: MarkdownView) {
		let u = this.getBlockUrl(editor, view);
		if (!u) {
			return;
		}

		const file = this.app.workspace.getActiveFile()
		if (!file) {
			new Notice("No active file to save to.");
			return;
		}
		this.app.fileManager.processFrontMatter(file, (fm) => {
			// add to revisions list
			if (!fm["revisions"]) {
				fm["revisions"] = [];
			}
			// avoid duplicates
			if (fm["revisions"].includes(u)) {
				new Notice("Revision already saved.");
				return;
			}

			fm.revisions.push(u);
		})
	}

	openBlockInStrudel(editor: Editor, view: MarkdownView) {
		const u = this.getBlockUrl(editor, view);
		if (!u) {
			return;
		}
		window.open(u, '_blank')?.focus();
	}

	getBlockUrl(editor: Editor, view: MarkdownView): string | null {
		const block = this.getCodeBlock(editor);
		if (!block) {
			new Notice("No code block found at cursor position.");
			return null;
		}
		// @ts-expect-error, not typed
		const editorView = view.editor.cm as EditorView
		this.strudel?.flashCode(editorView)
		return `https://strudel.cc/#${encodeURIComponent(btoa(block.content))}`;
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


	getCodeBlock(editor: Editor): CodeBlock | null {
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

			return {
				content: codeBlockText,
				startLine,
				endLine
			};
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

type CodeBlock = {
	content: string;
	startLine: number;
	endLine: number;
}




export class ClipperTemplateModal extends Modal {

	constructor(app: App) {
		super(app);
		this.setTitle('Web Clipper Template');
		this.setContent("Sample template for clipping from strudel REPL")

		new Setting(this.contentEl)
			.setDesc(JSON.stringify(clipperTemplate, null, 2))
			.setHeading()
			.addButton((btn) =>
				btn
					.setButtonText('Copy')
					.setCta()
					.onClick(async () => {
						this.close();
						await navigator.clipboard.writeText(JSON.stringify(clipperTemplate, null, 2));
						new Notice("Copied to clipboard");
					}));
	}
}

export class InputModal extends Modal {
	constructor(app: App, title: string, desc: string, onSubmit: (result: string) => void) {
		super(app);
		this.setTitle(title);
		this.setContent("")

		let val = "";
		new Setting(this.contentEl)
			.setName(title)
			.setDesc(desc)
			.addText((text) =>
				text
					.onChange((value) => {
						val = value;
					}));
		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Submit')
					.setCta()
					.onClick(() => {
						this.close();
						onSubmit(val);
					}));

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

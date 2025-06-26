import {
	ItemView,
	WorkspaceLeaf,
} from "obsidian";

export const VIEW_TYPE_ALGORAVE_SAMPLES = "aglorave-samples";

interface SoundData {
	type: 'sample' | 'synth' | 'soundfont';
	samples?: any[];
	baseUrl?: string;
	prebake?: boolean;
	tag?: string;
}

interface Sound {
	onTrigger: Function;
	data: SoundData;
}

export class AlgoRaveSamplesView extends ItemView {
	private sounds: Record<string, Sound> = {};
	private filteredSounds: [string, Sound][] = [];
	private currentFilter: 'all' | 'samples' | 'drums' | 'synths' | 'user' = 'all';
	private searchTerm: string = '';

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_ALGORAVE_SAMPLES;
	}

	getDisplayText() {
		return "Strudel Sounds";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();

		const bc = container.createEl("div", { cls: "nav-files-container" });

		this.createHeader(bc);
		this.createSearchAndFilters(bc);
		this.createSoundList(bc);

		await this.loadSounds();
	}

	private createHeader(container: HTMLElement) {
		const header = container.createEl("div", { cls: "nav-header" });
		const buttonsContainer = header.createEl("div", { cls: "nav-buttons-container" });

		const filters = [
			{ key: 'all', label: 'All' },
			{ key: 'samples', label: 'Samples' },
			{ key: 'drums', label: 'Drums' },
			{ key: 'synths', label: 'Synths' },
			{ key: 'user', label: 'User' }
		];

		filters.forEach(filter => {
			const btn = buttonsContainer.createEl("div", {
				cls: `clickable-icon nav-action-button${this.currentFilter === filter.key ? ' is-active' : ''}`,
				attr: { 'aria-label': filter.label, cursor: 'pointer' }
			});
			btn.setText(filter.label);

			btn.addEventListener("click", () => {
				this.currentFilter = filter.key as any;
				buttonsContainer.querySelectorAll('.nav-action-button').forEach(b => b.removeClass('is-active'));
				btn.addClass('is-active');
				this.updateSoundList();
			});
		});
	}

	private createSearchAndFilters(container: HTMLElement) {
		const searchContainer = container.createEl("div", { cls: "search-input-container" });
		
		const searchInput = searchContainer.createEl("input", {
			type: "text",
			placeholder: "Search sounds...",
			cls: "search-input"
		});

		searchInput.addEventListener("input", (e) => {
			this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
			this.updateSoundList();
		});
	}

	private createSoundList(container: HTMLElement) {
		const listDiv = container.createEl("div", { cls: "nav-files-container" });
		listDiv.id = "sound-list";
	}

	private async loadSounds() {
		try {
			const win = (window as any);
			if (win.strudelSounds) {
				this.sounds = win.strudelSounds;
			} else if (win.soundMap?.value) {
				this.sounds = win.soundMap.value;
			} else {
				this.sounds = {
					'kick': {
						onTrigger: () => console.log('kick'),
						data: { type: 'sample', tag: 'drum-machines', prebake: true }
					},
					'snare': {
						onTrigger: () => console.log('snare'),
						data: { type: 'sample', tag: 'drum-machines', prebake: true }
					},
					'hihat': {
						onTrigger: () => console.log('hihat'),
						data: { type: 'sample', tag: 'drum-machines', prebake: true }
					},
					'piano': {
						onTrigger: () => console.log('piano'),
						data: { type: 'sample', prebake: true }
					},
					'bass': {
						onTrigger: () => console.log('bass'),
						data: { type: 'synth', prebake: true }
					}
				};
			}
			this.updateSoundList();
		} catch (error) {
			console.error('Failed to load sounds:', error);
		}
	}

	private updateSoundList() {
		this.filteredSounds = Object.entries(this.sounds)
			.filter(([key]) => !key.startsWith('_'))
			.filter(([name]) => name.toLowerCase().includes(this.searchTerm))
			.filter(([_, sound]) => {
				switch (this.currentFilter) {
					case 'user':
						return !sound.data.prebake;
					case 'drums':
						return sound.data.type === 'sample' && sound.data.tag === 'drum-machines';
					case 'samples':
						return sound.data.type === 'sample' && sound.data.tag !== 'drum-machines';
					case 'synths':
						return ['synth', 'soundfont'].includes(sound.data.type);
					default:
						return true;
				}
			})
			.sort((a, b) => a[0].localeCompare(b[0]));

		this.renderSoundList();
	}

	private renderSoundList() {
		const listEl = this.containerEl.querySelector('#sound-list');
		if (!listEl) return;

		listEl.empty();

		if (this.filteredSounds.length === 0) {
			const emptyState = listEl.createEl("div", { cls: "nav-empty" });
			emptyState.createEl("div", { text: "No sounds found", cls: "nav-empty-message" });
			return;
		}

		this.filteredSounds.forEach(([name, sound]) => {
			const soundItem = listEl.createEl("div", { cls: "tree-item nav-file" });
			const selfEl = soundItem.createEl("div", { cls: "tree-item-self nav-file-title" });
			
			const innerEl = selfEl.createEl("div", { cls: "tree-item-inner nav-file-title-content" });
			innerEl.createEl("div", { text: name, cls: "nav-file-title-text" });

			const typeEl = innerEl.createEl("div", { 
				text: this.getSoundTypeDisplay(sound.data),
				cls: "nav-file-tag"
			});
		});
	}

	private getSoundTypeDisplay(data: SoundData): string {
		if (data.type === 'sample' && data.tag === 'drum-machines') {
			return 'drum';
		}
		return data.type || 'unknown';
	}


	async onClose() {
		const container = this.containerEl.children[1];
		container.empty();
	}
}

# Obsidian Livecoding

[Obsidian](https://obsidian.md/) plugin for live coding music and visuals with [Strudel](https://strudel.cc/workshop/getting-started/) and [Hydra](https://hydra.ojack.xyz/). 

## Usage

Write Strudel or Hydra code in `js` code blocks. Use `Shift+Ctrl+E` to evaluate the code block where your cursor is positioned. 

You can have multiple code blocks in a single note - only the block containing your cursor will be evaluated. Code is evaluated directly as written, so both Strudel and Hydra evaluated code will replace the previously evaluated code for each respectively.


Paste this README into note as an example.

**Strudel:**
```js
setCpm(20)

$DRUMS: stack(
s("bd(4, 4)").struct("t(6, 8)"),
s("[hc cpu](6, 8)").jux(rev).struct("f(5, 8)"),
)
.jux((x)=>x.room("0 .. 0.2"))
.delay(0.1)
.lpf(2900)
.swing("1/3", 4)

$MELODY: n("0 2 4 <[6,8] [7,9]>".off(1/8, x=>x.add("4 12 <7 5> 17")))
.scale("<C G>:minor").sound("piano")
.off(1/4, x=>x.s("gm_steel_drums")
	.sometimes(ply(3)).room(0.5).crush("<4 [1 2] 0>"))
.room(0.8)
.size(0.3)
.swing("1/3", 4)
```

**Hydra:**
Note that Hydra is loaded via Strudel, so you must call `initHydra`.

```js
await initHydra()
let pat = "4 2 [8 .. 16] 6 6"
let pat2 = "<[0.2 0.7] [0.8 0.1] 0 3>".add(0.1)
voronoi(H(pat), 0.2, H(pat2))
//.blend(noise(H(pat), 0.2))
//.mult(osc(H(pat), H("0.2 0.7"), H(pat2)))
.modulate(shape(H("<5 4 3 6 5 4 3>")).rotate(0, 0.4).repeat(H(pat),H(pat2)))
.out()
```


## Key Bindings

| Command | Key Binding | Description |
|---------|-------------|-------------|
| Evaluate Block | `Shift+Ctrl+E` or `Shift+Ctrl+Enter` | Evaluate code block at cursor |
| Evaluate File | `Shift+Ctrl+P` | Evaluate entire file |
| Hush | `Shift+Ctrl+H` | Stop all sounds |
| Stop | `Shift+Ctrl+X` | Stop Strudel and Hydra |
| Toggle Hydra | `Shift+Alt+H` | Start/stop Hydra visuals |

## Installation

1. Copy the plugin folder to `.obsidian/plugins/obsidian-algorave/` in your vault
2. Enable the plugin in Obsidian's Community Plugins settings
3. Use the music icon in the ribbon to open the sound browser


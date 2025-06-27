export const clipperTemplate = {
	"schemaVersion": "0.1.0",
	"name": "Strudel",
	"behavior": "create",
	"noteContentFormat": "```js\n{{selector:.cm-content .cm-line|innerHtml|join:\"\\n\"|trim}}\n```\n",
	"properties": [
		{
			"name": "title",
			"value": "{{title|replace:\\\"/\\s*-\\s*Strudel\\s*REPL\\s*/g\\\":\\\"\\\"|trim}}",
			"type": "text"
		},
		{
			"name": "source",
			"value": "{{url}}",
			"type": "text"
		},
		{
			"name": "domain",
			"value": "{{domain}}",
			"type": "text"
		},
		{
			"name": "created",
			"value": "{{date}}",
			"type": "date"
		},
		{
			"name": "tags",
			"value": "strudel-code",
			"type": "multitext"
		},
		{
			"name": "artist",
			"value": "",
			"type": "text"
		}
	],
	"triggers": [
		"https://strudel.cc/#"
	],
	"noteNameFormat": "{{title|safe_name}}",
	"path": "StrudelClips"
}

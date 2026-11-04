import frappeUIPreset from "frappe-ui/tailwind"

export default {
	presets: [frappeUIPreset],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: "#005ca9",
					hover: "#004e8f",
					active: "#004075",
				},
				secondary: {
					DEFAULT: "#8b9c2b",
					hover: "#768525",
					active: "#616d1e",
				},
			},
		},
	},
	plugins: [],
}

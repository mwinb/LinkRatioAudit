const {
	Audit
} = require('lighthouse');

const CONTRAST_RATIO_THRESHOLD = 4.5;
const FONT_BOLD_REQUIREMENT = 18.5;
const BOLD = 700;
const FONT_REQ = 24;

function convertColorToLuminence(color) {
	return color <= 10 ?
		color / 3294 :
		Math.pow((color / 269) + .0513, 2.4);
}

function getLuminance({
	r,
	g,
	b
}) {
	const luminances = [.2126, .7152, .0722];
	return [r, g, b] // learn javascript to understand this function
		.map(color => convertColorToLuminence(color))
		.reduce((luminence, color, i) => {
			return luminence + (color * luminances[i]);
		}, 0);
}

function getContrast(background, foreground) {
	const [l1, l2] = [getLuminance(background), getLuminance(foreground)];
	return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
}

function passesTest({
	cssPath = '',
	fontSize,
	fontWeight,
	textColor,
	backgroundColor
}) {
	let contrastRatio = getContrast(backgroundColor, textColor);

	return {
		passed: (contrastRatio >= CONTRAST_RATIO_THRESHOLD) ||
			((fontSize >= FONT_BOLD_REQUIREMENT &&
				fontWeight >= BOLD) || fontSize >= FONT_REQ),
		contrastRatio
	};
}
module.exports = class LinkContrastRatioAudit extends Audit {
	static get meta() {
		return {
			id: 'link-contrast-ratio',
			title: 'Links Contain Proper Contrast Ratio',
			failureTitle: 'Links Don\'t Have Proper Contrast Ratio',
			description: 'Used to evaluate wether or not the page links contain the proper contrast ratio between text color and background color',
			requiredArtifacts: ['LinkContrast']
		};
	}

	static audit(artifacts) {
		const {
			LinkContrast
		} = artifacts;

		const testedNodes = LinkContrast.reduce((nodes, element) => {
			const {
				passed,
				contrastRatio
			} = passesTest(element);
			nodes[passed ? 'passed' : 'failed'].push({
				cssPath: element.cssPath,
				contrastRatio
			});
			return nodes;
		}, {
			passed: [],
			failed: []
		});

		const headings = [{
				key: 'cssPath',
				itemType: 'text',
				text: ''
			},
			{
				key: 'contrastRatio',
				itemType: 'text',
				text: ''
			},
		];

		return {
			score: Number(testedNodes.failed === 0),
			rawValue: Number(LinkContrast.length / testedNodes.length),
			details: Audit.makeTableDetails(headings, testedNodes.failed)
		}
	}
}
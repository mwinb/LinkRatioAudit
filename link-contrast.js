const Gatherer = require('lighthouse').Gatherer;

function collectLinkElementInfo() {

	function fullPath(el) {
		var names = [];
		while (el.parentNode) {
			if (el.id) {
				names.unshift("#" + el.id);
				break;
			} else {
				if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
				else {
					for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
					names.unshift(el.tagName + ":nth-child(" + c + ")");
				}
				el = el.parentNode;
			}
		}
		return names.join(" > ");
	};

	function getElementsInDocument(selector) {
		const realMatchesFn = window.__ElementMatches || Element.prototype.matches;
		/** @type {Array<Element>} */
		const results = [];

		/** @param {NodeListOf<Element>} nodes */
		const _findAllElements = nodes => {
			for (let i = 0, el; el = nodes[i]; ++i) {
				if (!selector || realMatchesFn.call(el, selector)) {
					results.push(el);
				}
				// If the element has a shadow root, dig deeper.
				if (el.shadowRoot) {
					_findAllElements(el.shadowRoot.querySelectorAll("*"));
				}
			}
		};
		_findAllElements(document.querySelectorAll("*"));

		return results;
	}

	function getBackgroundColor(element) {
		let transparent = "rgba(0, 0, 0, 0)";
		let currElement = element;
		let currBackground = window.getComputedStyle(currElement).getPropertyValue("background-color");
		while (currBackground === transparent) {
			currElement = currElement.parentElement;
			currBackground = window.getComputedStyle(currElement).getPropertyValue("background-color");
		}
		return currBackground;
	};

	function parseColors(colorString) {
		if (colorString.includes("rgba")) {
			colorString = colorString.substring(5);
		} else {
			colorString = colorString.substring(4);
		}

		colorString = colorString.slice(0, -1);
		let [r, g, b] = colorString.split(",").map(parseFloat);
		return {
			r,
			g,
			b
		};
	}

	function parseFontSize(fontSizeString) {
		return parseFloat(fontSizeString.slice(-2));
	}

	const linkElements = getElementsInDocument("a");

	const linkAttributes = linkElements.map(element => {
		const computedStyle = window.getComputedStyle(element);
		return {
			cssPath: fullPath(element),
			textColor: parseColors(computedStyle.getPropertyValue("color")),
			backgroundColor: parseColors(getBackgroundColor(element)),
			fontWeight: computedStyle.getPropertyValue("font-weight"),
			fontSize: parseFontSize(computedStyle.getPropertyValue("font-size")),
		}
	});
	return linkAttributes;
}

module.exports = class LinkContrast extends Gatherer {
	afterPass(options) {
		const driver = options.driver;
		const expression = `(function(){
             var collectLinkElementInfo = eval('(' + ${collectLinkElementInfo.toString()} + ')');
             return collectLinkElementInfo();
        })()`;

		return driver.evaluateAsync(expression).then(results => {
			return results;
		}).catch(console.error);
	}

}
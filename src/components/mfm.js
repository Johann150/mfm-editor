import { VNode, h } from 'vue';
import * as mfm from 'mfm-js';
import { concat } from '../prelude/array.js';
import MkFormula from "./formula.vue";

export default {
	props: {
		text: {
			type: String,
			required: true
		},
		plain: {
			type: Boolean,
			default: false
		},
		nowrap: {
			type: Boolean,
			default: false
		},
		author: {
			type: Object,
			default: null
		},
		i: {
			type: Object,
			default: null
		},
		customEmojis: {
			required: false,
		},
		isNote: {
			type: Boolean,
			default: true
		},
	},

	render() {
		if (this.text == null || this.text == '') return;

		const ast = (this.plain ? mfm.parsePlain : mfm.parse)(this.text);

		const validTime = (t) => {
			if (t == null) return null;
			return t.match(/^[0-9.]+s$/) ? t : null;
		};

		const genEl = (ast) => concat(ast.map((token) => {
			switch (token.type) {
				case 'text': {
					const text = token.props.text.replace(/(\r\n|\n|\r)/g, '\n');

					if (!this.plain) {
						const res = [];
						for (const t of text.split('\n')) {
							res.push(h('br'));
							res.push(t);
						}
						res.shift();
						return res;
					} else {
						return [text.replace(/\n/g, ' ')];
					}
				}

				case 'bold': {
					return [h('b', genEl(token.children))];
				}

				case 'strike': {
					return [h('del', genEl(token.children))];
				}

				case 'italic': {
					return h('i', {
						style: 'font-style: oblique;'
					}, genEl(token.children));
				}

				case 'fn': {
					// TODO: CSSを文字列で組み立てていくと token.props.args.~~~ 経由でCSSインジェクションできるのでよしなにやる
					let style;
					switch (token.props.name) {
						case 'tada': {
							style = `font-size: 150%;` + 'animation: tada 1s linear infinite both;';
							break;
						}
						case 'jelly': {
							const speed = validTime(token.props.args.speed) || '1s';
							style = `animation: mfm-rubberBand ${speed} linear infinite both;`;
							break;
						}
						case 'twitch': {
							const speed = validTime(token.props.args.speed) || '0.5s';
							style = `animation: mfm-twitch ${speed} ease infinite;`;
							break;
						}
						case 'shake': {
							const speed = validTime(token.props.args.speed) || '0.5s';
							style = `animation: mfm-shake ${speed} ease infinite;`;
							break;
						}
						case 'spin': {
							const direction =
								token.props.args.left ? 'reverse' :
								token.props.args.alternate ? 'alternate' :
								'normal';
							const anime =
								token.props.args.x ? 'mfm-spinX' :
								token.props.args.y ? 'mfm-spinY' :
								'mfm-spin';
							const speed = validTime(token.props.args.speed) || '1.5s';
							style = `animation: ${anime} ${speed} linear infinite; animation-direction: ${direction};`;
							break;
						}
						case 'jump': {
							style = 'animation: mfm-jump 0.75s linear infinite;';
							break;
						}
						case 'bounce': {
							style = 'animation: mfm-bounce 0.75s linear infinite; transform-origin: center bottom;';
							break;
						}
						case 'flip': {
							const transform =
								(token.props.args.h && token.props.args.v) ? 'scale(-1, -1)' :
								token.props.args.v ? 'scaleY(-1)' :
								'scaleX(-1)';
							style = `transform: ${transform};`;
							break;
						}
						case 'x2': {
							style = `font-size: 200%;`;
							break;
						}
						case 'x3': {
							style = `font-size: 400%;`;
							break;
						}
						case 'x4': {
							style = `font-size: 600%;`;
							break;
						}
						case 'font': {
							const family =
								token.props.args.serif ? 'serif' :
								token.props.args.monospace ? 'monospace' :
								token.props.args.cursive ? 'cursive' :
								token.props.args.fantasy ? 'fantasy' :
								token.props.args.emoji ? 'emoji' :
								token.props.args.math ? 'math' :
								null;
							if (family) style = `font-family: ${family};`;
							break;
						}
						case 'blur': {
							return h('span', {
								class: '_mfm_blur_',
							}, genEl(token.children));
						}
						case 'rainbow': {
							style = 'animation: mfm-rainbow 1s linear infinite;';
							break;
						}

					}
					if (style == null) {
						return h('span', {}, ['[', token.props.name, ...genEl(token.children), ']']);
					} else {
						return h('span', {
							style: 'display: inline-block;' + style,
						}, genEl(token.children));
					}
				}

				case 'small': {
					return [h('small', {
						style: 'opacity: 0.7;'
					}, genEl(token.children))];
				}

				case 'center': {
					return [h('div', {
						style: 'text-align:center;'
					}, genEl(token.children))];
				}

        case 'url': {
          return [h("a", {
            href: token.props.url,
            rel: 'nofollow noopener',
          }, token.props.url)];
        }

        case 'link': {
          return [h("a", {
            href: token.props.url,
            rel: 'nofollow noopener',
          }, genEl(token.children))];
        }

        case 'mention': {
          return [h("a", {
            href: "#",
          }, "@" + token.props.username)];
        }

        case 'hashtag': {
          return [h("a", {
            href: `#`,
            style: 'color:var(--hashtag);'
          }, `#${token.props.hashtag}`)];
        }

        case 'blockCode': {
          return [h("code", {
            code: token.props.code,
            lang: token.props.lang,
          })];
        }

        case 'inlineCode': {
          return [h("code", {
            code: token.props.code,
            inline: true
          })];
        }

        case 'quote': {
          if (!this.nowrap) {
            return [h('div', {
              class: 'quote'
            }, genEl(token.children))];
          } else {
            return [h('span', {
              class: 'quote'
            }, genEl(token.children))];
          }
        }

        case 'emojiCode': {
          return `:${token.props.name}:`;
        }

        case 'unicodeEmoji': {
          return token.props.emoji;
        }

        case 'mathInline': {
          return [h(MkFormula, {
            key: Math.random(),
            formula: token.props.formula,
            block: false
          })];
        }

        case 'mathBlock': {
          return [h(MkFormula, {
            key: Math.random(),
            formula: token.props.formula,
            block: true
          })];
        }

        case 'search': {
          return token.props.query;
        }

				default: {
					console.error('unrecognized ast type:', token.type);

					return [];
				}
			}
		}));

		// Parse ast to DOM
		return h('span', genEl(ast));
	}
};

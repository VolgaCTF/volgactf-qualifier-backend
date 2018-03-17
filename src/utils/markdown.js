const MarkdownIt = require('markdown-it')
const twemoji = require('twemoji')
const emoji = require('markdown-it-emoji')
const sub = require('markdown-it-sub')
const sup = require('markdown-it-sup')
const ins = require('markdown-it-ins')
const mark = require('markdown-it-mark')
const linkAttributes = require('markdown-it-link-attributes')

class MarkdownRenderer {
  constructor () {
    this.md = new MarkdownIt()
    this.md
      .use(emoji, {})
      .use(mark)
      .use(ins)
      .use(sup)
      .use(sub)
      .use(linkAttributes, {
        attrs: {
          target: '_blank',
          rel: 'noopener'
        }
      })

    this.md.renderer.rules.emoji = (token, idx) => {
      return twemoji.parse(token[idx].content)
    }
  }

  render (data) {
    return this.md.render(data)
  }
}

module.exports = MarkdownRenderer

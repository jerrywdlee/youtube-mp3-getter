'use strict'

const r2 = require('r2')

class Slack {
  constructor(incomingUrl) {
    this.incomingUrl = incomingUrl
  }

  async postMessage(msg) {
    let res = await r2.post(this.incomingUrl, { json: msg }).text
    return res
  }
}

module.exports = Slack
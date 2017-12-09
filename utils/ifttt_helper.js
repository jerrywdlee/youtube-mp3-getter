'use strict'

const r2 = require('r2')
const _ = require('lodash')

class Ifttt {
  constructor(ifttt_key) {
    this.ifttt_key = ifttt_key
  }

  createEventUrl(eventName) {
    return `https://maker.ifttt.com/trigger/${eventName}/with/key/${this.ifttt_key}`
  }

  async archiveAlbumInfo(songInfo) {
    const eventName = 'archive_album_info'
    const url = this.createEventUrl(eventName)
    const postMsg = {
      value1: songInfo.albumName,
      value2: songInfo.songName,
      value3: songInfo.originSongUrl
    }
    let res = await r2.post(url, { json: postMsg }).text
    // Congratulations! You've fired the archive_album_info event
    return res
  }

  async createAlbum(songInfo) {
    const eventName = 'create_album'
    const url = this.createEventUrl(eventName)
    // console.log(url)
    const postMsg = {
      value1: songInfo.albumName,
      value2: songInfo.songName,
      value3: songInfo.originSongUrl
    }
    let res = await r2.post(url, { json: postMsg }).text
    return res
  }

  async uploadMusic(songInfo) {
    const eventName = 'upload_music'
    const url = this.createEventUrl(eventName)
    const postMsg = {
      value1: songInfo.albumName,
      value2: songInfo.songName,
      value3: songInfo.streamUrl
    }
    let res = await r2.post(url, { json: postMsg }).text
    // Congratulations! You've fired the archive_album_info event
    return res
  }
}

module.exports = Ifttt
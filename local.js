// const path = require('path')
const _ = require('lodash')

const GoogleDrive = require('./utils/google_drive_api')
const googleDrive = new GoogleDrive()

// const { getConfigs, setConfigs } = require('./utils/configs')
const getAlbum = require('./puppeteers/p_get_album')
const delay = require('./utils/delay')
const TIMEOUT = 5 * 1000

// googleDrive.getNewToken(authCode).then()
// let configs = {}
// getConfigs().then(res => {
//   configs = res
// }).catch(e => console.error(e))

const url = 'https://downloads.khinsider.com/game-soundtracks/album/persona-5-strikers-original-soundtrack-2020'

;(async () => {
  let list = await Promise.race([getAlbum(url), delay(30 * TIMEOUT)])
  if (_.isEmpty(list) || !Array.isArray(list)) throw Error('cannot get song list')
  songUrlList = [...list]

  const parentFolder = await googleDrive.locateFolder(`Music/${songUrlList[0].albumName}`)

  let songInfoIndex = 0
  for (let songInfo of songUrlList) {
    const runner = [
      googleDrive.uploadFromUrl(songInfo.originSongUrl, songInfo.songName, parentFolder.id),
      delay(30 * TIMEOUT)
    ]
    const res = await Promise.race(runner)
    // console.log(res)

    songInfoIndex++
    if (songInfoIndex < songUrlList.length) await delay(TIMEOUT)
  }
})()

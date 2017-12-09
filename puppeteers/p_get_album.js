// puppeteer of https://downloads.khinsider.com/game-soundtracks
// https://downloads.khinsider.com/game-soundtracks

'use strict'
const puppeteer = require('puppeteer')
const { createSongInfo, 
        getOriginSongUrl, 
        getSongPageUrl 
      } = require('../utils/url_helper')
// const Ifttt = require('../utils/ifttt_helper')
const _ = require('lodash')
/*
const getAlbum = async (albumUrl) => {
  if (!albumUrl) throw Error('invaild-url')
  // use puppeteer headless if as module
  let launchOption = { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  if (!module.parent) {
    launchOption = { headless: false }
  }
  const browser = await puppeteer.launch(launchOption)
  const page = await browser.newPage()
  await page.goto(albumUrl)
  await page.waitForSelector('table#songlist',{ timeout: 60*1000 })
  // await page.screenshot({ path: 'yt-to-mp3.png' })
  const albumName = await page.$eval('#EchoTopic h2', el => el.textContent)
  await page.waitFor(2 * 1000)
  const songPageUrl = await page.evaluate(() => {
    const songList = document.querySelectorAll('#songlist tr:not(#songlist_header):not(#songlist_footer) a')
    const songUrlList = []
    for (let i = 0; i < songList.length; i+=3) {
      const songUrl = songList[i].href;
      songUrlList.push(songUrl)
    }
    return songUrlList
  })
  
  const songUrlList = []
  
  // await getSongPageUrl(albumUrl)
  // console.log(albumName)
  for (let url of songPageUrl) {
    // const songUrl = await getSongUrl(url, page)
    const songUrl = await getOriginSongUrl(url)
    let songInfo = createSongInfo(songUrl)
    console.log(songInfo.songName)
    songUrlList.push(songInfo)
  }
  // let mp3Url = await page.evaluate(() => {
  //   let link = document.querySelector('a.btn-download-mp3')
  //   return link.href
  // })
  // mp3Urls.push(mp3Url)
  await browser.close()
  return songUrlList
}

const getSongUrl = async (songUrlBefore, page) => {
  await page.goto(songUrlBefore)
  await page.waitForSelector('#EchoTopic a[style="color: #21363f;"]', { timeout: 60 * 1000 })
  return await page.$eval('#EchoTopic a[style="color: #21363f;"]', el => el.href)
}
*/
const getAlbum = async (albumUrl, sliceOption) => {
  if (!albumUrl) throw Error('invaild-url')
  let { albumName, songPageUrlList } = await getSongPageUrl(albumUrl)
  if (!_.isEmpty(sliceOption)) {
    songPageUrlList = _.slice(songPageUrlList, sliceOption[0] - 1, sliceOption[1])
  }
  let songUrlList = []
  for (let url of songPageUrlList) {
    // const songUrl = await getSongUrl(url, page)
    const songUrl = await getOriginSongUrl(url)
    let songInfo = createSongInfo(songUrl)
    songInfo.albumName = albumName
    songInfo.songPageUrl = url
    console.log(songInfo.songName)
    songUrlList.push(songInfo)
  }
  return songUrlList
}

module.exports = getAlbum

if (!module.parent) {
  (async () => {
    let albumUrl = 'https://downloads.khinsider.com/game-soundtracks/album/persona-5-sounds-of-rebellion' 
    // Persona 5 - Sounds of Rebellion
    let songUrlList = await getAlbum(albumUrl)
    console.log(songUrlList)
  })()
}
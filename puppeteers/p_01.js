// puppeteer of https://www.yt-download.org/@api/button/mp3/{{YouTube-Video-ID}}
// https://github.com/matthew-asuncion/Fast-YouTube-to-MP3-Converter-API

'use strict'
const puppeteer = require('puppeteer')

let getMp3Urls = async (youtubeUrl) => {
  // youtubeUrl likes https://www.youtube.com/watch?v=i62Zjga8JOM
  // OR like https://youtu.be/30Ef7i3qq-U
  let videoId = ''
  let [subId_1, subId_2] = youtubeUrl.trim().split('watch?v=')
  videoId = subId_2 ? subId_2 : subId_1 // if not url just a video ID, will work
  if (videoId.indexOf('youtu.be\/') > -1) {
    // if like https://youtu.be/30Ef7i3qq-U , will work
    [subId_1, subId_2] = videoId.split('youtu.be\/')
    videoId = subId_2 ? subId_2 : subId_1 
  }
  let converterUrl = 'https://www.yt-download.org/@api/button/mp3/' + videoId.trim()
  if (!videoId) throw Error('invaid-url')

  // use puppeteer
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto(converterUrl)
  // await page.screenshot({ path: 'Y3GrHLOgF3c.png' })
  let mp3Urls = []
  mp3Urls = await page.evaluate(() => {
    let links = document.querySelectorAll('a')
    return [].map.call(links, a => a.href)
  })
  await browser.close()
  return mp3Urls
}

module.exports = getMp3Urls;

if (!module.parent) {
  (async () => {
    let youtubeUrl = 'https://www.youtube.com/watch?v=WQYN2P3E06s' 
    // Christopher Tin - Sogno di Volare ("The Dream of Flight") (Civilization VI Main Theme)
    let mp3Urls = await getMp3Urls(youtubeUrl)
    console.log(mp3Urls)
  })()
}
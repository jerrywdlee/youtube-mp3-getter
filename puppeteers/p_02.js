// puppeteer of https://www.yt-to-mp3.com/api/mp3.html#[videoId]
// https://www.yt-to-mp3.com/youtube-mp3-api.html

'use strict'
const puppeteer = require('puppeteer')

let getMp3Urls = async (youtubeUrl) => {

  let videoId = getVideoId(youtubeUrl)
  // if (!videoId) throw Error('invaid-url')
  if (!videoId) return null
  let converterUrl = `https://www.yt-to-mp3.com/api/mp3.html#${videoId.trim()}`

  // use puppeteer
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  // const browser = await puppeteer.launch({ headless: false }); // default is true
  const page = await browser.newPage()
  await page.goto(converterUrl)
  await page.waitForSelector('a.btn-download-mp3',{ timeout: 60*1000 })
  // await page.screenshot({ path: 'yt-to-mp3.png' })
  let mp3Urls = []
  let mp3Url = await page.evaluate(() => {
    let link = document.querySelector('a.btn-download-mp3')
    return link.href
  })
  mp3Urls.push(mp3Url)
  await browser.close()
  return mp3Urls
}

let getVideoId = (youtubeUrl) => {
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
  if (!videoId) return null
  return videoId
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
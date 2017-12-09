'use strict'

const cheerio = require('cheerio')
const r2 = require('r2')
const fetch = require('node-fetch') // installed by r2
const _ = require('lodash')

const getVideoId = (youtubeUrl) => {
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

const createSongInfo = (originSongUrl) => {
  const urlFragment = originSongUrl.split('\/')
  const songNameTag = urlFragment[urlFragment.length - 1]
  const songName = decodeURIComponent(songNameTag)
  return { songNameTag, songName, originSongUrl }
}

const getOriginSongUrl = async (songPageUrl) => {
  const songPage = await r2(songPageUrl).text
  const $ = cheerio.load(songPage)
  const originSongUrl = $('#EchoTopic a[style="color: #21363f;"]').attr('href')
  return originSongUrl
}

const getSongPageUrl = async (albumUrl) => {
  // r2's require failed, wait for update
  // https://github.com/mikeal/r2/issues/45
  // const albumPage = await r2(albumUrl).text
  const albumPage = await fetch(albumUrl).then(res => res.text())
  // console.log(albumPage)
  const $ = cheerio.load(albumPage)
  const albumName = $('#EchoTopic h2').first().text()
  
  const songListSelector = '#songlist tr:not(#songlist_header):not(#songlist_footer) a'
  const songList = $(songListSelector)
  // console.log(songList[0])
  let songPageUrlList = []
  for (let i = 0; i < songList.length; i++) {
    const songPageUrl = $(songListSelector).eq(i).attr('href');
    songPageUrlList.push(songPageUrl)
  }
  songPageUrlList = _.uniq(songPageUrlList)
  return { albumName, songPageUrlList }
}

module.exports = { getVideoId, createSongInfo, getOriginSongUrl, getSongPageUrl }
'use strict'

const Koa = require('koa')
const Router = require('koa-router')
const koaStatic = require('koa-static')
const bodyParser = require('koa-bodyparser')
const path = require('path')
const _ = require('lodash')
const req = require('request')
const PORT = process.env.PORT || 5000

const app = new Koa()
const router = new Router()

const getMp3Urls = require('./puppeteers/p_02')
const GoogleDrive = require('./utils/google_drive_api')
const googleDrive = new GoogleDrive()

const { getConfigs, setConfigs } = require('./utils/configs')
const Slack = require('./utils/slack_helper')
const Ifttt = require('./utils/ifttt_helper')
const getAlbum = require('./puppeteers/p_get_album')
const delay = require('./utils/delay')
const TIMEOUT = 5 * 1000
let configs = {}
let slack, ifttt, messageTmp, counter = 0
getConfigs().then(res => {
  configs = res
  slack = new Slack(configs.incoming_url)
  ifttt = new Ifttt(configs.ifttt_key)
}).catch(e => console.error(e))

let songUrlList = []
let BUSY_FLAG = false
const urlReg = /https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/g



app
  .use(logger)
  .use(bodyParser()) // bodyParser must upper than router
  .use(router.routes())
  .use(router.allowedMethods())
  .use(koaStatic(path.join(__dirname, 'public')))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

// router
router
  .get('/api/youtube_2_mp3', async (ctx, next) => {
    let videoUrl = ctx.query['video_url']
    let mp3Urls = await getMp3Urls(videoUrl)
    // ctx.body = `URL: \n${mp3Urls.join('\n')}`
    if (mp3Urls && mp3Urls[0]) {
      ctx.redirect(mp3Urls[0])
    } else {
      ctx.status = 404
    }
  })
  .post('/api/slack', async (ctx, next) => {
    // format of POST Data: 
    // view https://api.slack.com/custom-integrations/outgoing-webhooks
    let message = ctx.request.body
    // console.log(message)
    if (message.token === configs.outgoing_token) {
      const urls = message.text.match(urlReg)
      let responceMsg = ''
      if (BUSY_FLAG) {
        responceMsg = '現在処理中、お待ち下さい'
      } else if (!_.isEmpty(urls)) {
        responceMsg = 'URL解析中...'
        next()
      } else {
        responceMsg = 'Album URLを入れて下さい'
      }
      const responce = {
        text: responceMsg
      }
      ctx.body = responce
    } else {
      ctx.status = 403
    }
  }, async (ctx, next) => {
    const message = ctx.request.body
    messageTmp = {
      channel: `#${message.channel_name}`,
      username: message.trigger_word,
      text: ``,
      icon_emoji: ':dvd:'
    }
    const url = message.text.match(urlReg)[0]
    const origin = ctx.origin.replace('http:', 'https:')
    let sliceOption = null
    let getInfoOnly = null
    try {
      sliceOption = JSON.parse(message.text.match(/\[.*?\]/))
    } catch(e) {}
    getInfoOnly = message.text.match(/info_only/)
    let noInfoFlag = message.text.match(/no_info/)
    BUSY_FLAG = true
    try {
      let list = await Promise.race([getAlbum(url, sliceOption), delay(30 * TIMEOUT)])
      // if (getInfoOnly) throw Error('Info Only Break!')
      // debug
      // throw Error('Debug Break')
      /*
      if (!_.isEmpty(sliceOption)) {
        list = _.slice(list, sliceOption[0] - 1, sliceOption[1])
      }
      */
      // console.log('list', list)
      if (_.isEmpty(list) || !Array.isArray(list)) throw Error('cannot get song list')
      songUrlList = [...list]

      await slack.postMessage({ 
        ...messageTmp,
        text: `Albumアクセス開始：${songUrlList[0].albumName}\n合計 ${songUrlList.length} 曲`
      })

      if (getInfoOnly) {
        for (let songInfo of songUrlList) {
          let res = await ifttt.createAlbum(songInfo)
          // console.log(res)
          await delay(TIMEOUT)
        }
        await slack.postMessage({
          ...messageTmp,
          // icon_emoji: ':white_flower:',
          text: `:cherry_blossom: Album Info 収集完了：${songUrlList[0].albumName}`
        })
        throw Error('Info Only Break!')
      }

      const parentFolder = await googleDrive.locateFolder(`Music/${songUrlList[0].albumName}`)
      // debug
      /*
      await slack.postMessage({
        ...messageTmp,
        text: `<${origin}/api/stream/${songUrlList[0].songNameTag} | ${songUrlList[0].songName}>`
      })
      */

      let songInfoIndex = 0
      for (let songInfo of songUrlList) {
        // songInfo.streamUrl = `${origin}/api/stream/${songInfo.songNameTag}`
        // await ifttt.uploadMusic(songInfo)
        const runner = [
          googleDrive.uploadFromUrl(songInfo.originSongUrl, songInfo.songName, parentFolder.id),
          delay(30 * TIMEOUT)
        ]
        const res = await Promise.race(runner)
        let message = ''
        if (res.id) {
          await ifttt.archiveAlbumInfo(songInfo)
          message = `ダウンロード完了[${songInfoIndex + 1}/${songUrlList.length}]：<${songInfo.songPageUrl} | ${songInfo.songName}>`
        } else {
          message = `:warning: ダウンロード失敗[${songInfoIndex + 1}/${songUrlList.length}]：<${songInfo.songPageUrl} | ${songInfo.songName}>`
        }
        
        await slack.postMessage({
          ...messageTmp,
          text: message
        })
        songInfoIndex ++
        if (songInfoIndex < songUrlList.length) await delay(TIMEOUT)
      }
      await slack.postMessage({
        ...messageTmp,
        // icon_emoji: ':white_flower:',
        text: `:cherry_blossom: Albumダウンロード完了：${songUrlList[0].albumName}`
      })

    } catch (e) {
      let errorMsg = { 
        ...messageTmp,
        icon_emoji: ':warning:',
        text: `Error! ${e.message}`}
      await slack.postMessage(errorMsg)
    } finally {
      // 後処理
      try {
        // await delay(TIMEOUT)
        songUrlList = []
        counter = 0
        BUSY_FLAG = false
      } catch (e) {
        console.error(e)
      }
    }
    /*
    setTimeout(async () => {
      let postMessage = {
        channel: `#${message.channel_name}`,
        username: message.trigger_word,
        text: `Repeat ${message.text}`,
        icon_emoji: ':dvd:'
      }
      let postMessageUrl = configs.incoming_url
      let res = await r2.post(postMessageUrl, { json: postMessage }).text
      console.log(res)
    }, 20 * 1000)
    */
    // console.log('ctx.origin', ctx.origin)
    // console.log('ctx.href', ctx.href)
    // console.log('ctx.url', ctx.url)
    // console.log('ctx.originalUrl', ctx.originalUrl)
    // console.log('ctx.host', ctx.host)
    // console.log('ctx.ip', ctx.ip)
    // ctx.origin http://e97e6e49.ngrok.io
    // ctx.href http://e97e6e49.ngrok.io/api/slack
    // ctx.url / api / slack
    // ctx.originalUrl / api / slack
    // ctx.host e97e6e49.ngrok.io
    // ctx.ip :: 1
  })
  /*
  .get('/api/stream/:songName', async (ctx, next) => {
    // console.log(ctx.params);
    const { songName } = ctx.params
    // console.log(songName)
    const songInfo = _.find(songUrlList, info => info.songName === songName)
    const songInfoIndex = _.findIndex(songUrlList, info => info.songName === songName)
    console.log(songInfo)
    // await ifttt.archiveAlbumInfo(songInfo)
    if (songInfo) {
      await slack.postMessage({
        ...messageTmp,
        text: `ダウンロード開始[${songInfoIndex + 1}/${songUrlList.length}]：<${songInfo.songPageUrl} | ${songInfo.songName}>`
      })
      counter = songInfoIndex
      ctx.body = req(songInfo.originSongUrl)
      next()
    } else {
      ctx.status = 404
    }
  }, async (ctx, next) => {
    if (counter >= songUrlList.length - 1) {
      // 後処理
      try {
        await delay(TIMEOUT)
        await slack.postMessage({
          ...messageTmp,
          // icon_emoji: ':white_flower:',
          text: `:cherry_blossom: Albumダウンロード完了：${songUrlList[0].albumName}`
        })
        songUrlList = []
        counter = 0
        BUSY_FLAG = false
      } catch (e) {
        console.error(e)
      }
    }
  })
  */
  /*
  .get('/api/upload_demo', async (ctx, next) => {
    try {
      const folder = 'DEMO/01'
      const urls = [
        'https://www.google.co.jp/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
      ]
      
      await googleDrive.uploadFromUrl()
      ctx.status = 200
    } catch (e) {
      console.error(e)
      ctx.body = e.message
    }
  })
  */
  .get('/api/auth_code', async (ctx, next) => {
    const authCode = ctx.query['auth_code']
    try {
      await googleDrive.getNewToken(authCode)
      ctx.status = 200
    } catch (e) {
      console.error(e)
      ctx.body = e.message
    }
  })
  .get('/refreash_configs', async (ctx, next) => {
    try {
      let res = await getConfigs()
      configs = res
      slack = new Slack(configs.incoming_url)
      ifttt = new Ifttt(configs.ifttt_key)
      ctx.status = 200
    } catch (e) {
      ctx.body = e.message
      console.error(e)
    }
  })
  /*
  .get('/api/stream', async (ctx, next) => {
    ctx.body = req('http://66.90.93.122/ost/persona-5-sounds-of-rebellion/dtyqmytq/04%20Life%20Will%20Change.mp3')
    ctx.req.on('close', () => {
      console.log('stream connection closed')
    })
  })
  */

// logger
async function logger(ctx, next) {
  if (!process.env.URL_ORIGIN) {
    const origin = ctx.origin.replace('http:', 'https:')
    process.env.URL_ORIGIN = origin
  }
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`[${new Date(start)}] ${ctx.method} ${ctx.url} - ${ms}ms`)
}
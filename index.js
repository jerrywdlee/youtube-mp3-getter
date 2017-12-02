'use strict'

const Koa = require('koa')
const Router = require('koa-router')
const koa_static = require('koa-static')
const path = require('path')
const PORT = process.env.PORT || 5000

const app = new Koa()
const router = new Router()

const getMp3Urls = require('./puppeteers/p_01')

app
  .use(logger)
  .use(router.routes())
  .use(router.allowedMethods())
  .use(koa_static(path.join(__dirname, 'public')))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

// router
router.get('/api', async (ctx, next) => {
  let videoUrl = ctx.query['video_url']
  let mp3Urls = await getMp3Urls(videoUrl)
  ctx.body = `URL: \n${mp3Urls.join('\n')}`
})

// logger
async function logger(ctx, next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`[${new Date(start)}] ${ctx.method} ${ctx.url} - ${ms}ms`)
}
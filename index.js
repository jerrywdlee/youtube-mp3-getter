'use strict'

const Koa = require('koa')
const Router = require('koa-router')
const koa_static = require('koa-static')
const path = require('path')
const PORT = process.env.PORT || 5000

const app = new Koa()
const router = new Router()

app
  .use(router.routes())
  .use(router.allowedMethods())
  .use(koa_static(path.join(__dirname, 'public')))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

router.get('/api', (ctx, next) => {
  let videoUrl = ctx.query['video_url']
  ctx.body = `URL: ${videoUrl}`
})
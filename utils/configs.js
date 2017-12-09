'use strict'

// Database
const { Client } = require('pg')
let connectOption = {
  host: 'localhost',
  database: 'youtube_mp3_getter' // use YOUR local db
}
if (process.env.DATABASE_URL) {
  connectOption = {
    connectionString: process.env.DATABASE_URL
  }
}

const keywords = [
  'outgoing_token', 
  'incoming_url', 
  'ifttt_key', 
  'google_client_secret_json',
  'google_auth_token_json'
]

const getConfigs = async () => {
  const client = new Client(connectOption)
  await client.connect()
  /*
  let querys = keywords.map(key => {
    return client.query('select value from configs where key = $1', [key])
  })
  */
  const res = await client.query('select key, value from configs')
  let configs = {}
  res.rows.forEach(record => {
    configs[record.key] = record.value
  })

  /*
  const [{ rows: [{ value: outgoing_token }] },
    { rows: [{ value: incoming_url }] }] = await Promise.all(querys)
  */
  // const [{rows: [{value: res}]}] = await Promise.all(querys)
  // console.log(res)
  await client.end()
  return configs
}

const setConfigs = async (newConfigs = {}) => {
  const client = new Client(connectOption)
  await client.connect()
  try {
    await client.query('BEGIN')
    for (const key of keywords) {
      const value = newConfigs[key]
      if (value) {
        const res = await client.query('update configs set value = $2 where key = $1', [key, value])
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    await client.end()
  }
}

module.exports = { getConfigs, setConfigs }

if (!module.parent) {
  (async () => {
    try {
      let configs = await getConfigs()
      console.log(configs)
      const newConfigs = {
        outgoing_token: 'example',
        incoming_url: 'https://example.com/'
      }
      // await setConfigs(newConfigs)
      // configs = await getConfigs()
      // console.log(configs)
    } catch (e) {
      console.error(e)
    }
  })()
}
'use strict'

const _ = require('lodash')
var fs = require('fs')
const google = require('googleapis')
const googleAuth = require('google-auth-library')
const req = require('request')
const util = require('util')
const { getConfigs, setConfigs } = require('./configs')

// google api setting
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

class GoogleDrive {
  constructor() {
    // google api setting
    this.configs = null
  }

  async authorize() {
    if (!this.configs) {
      this.configs = await getConfigs()
    }
    const token = this.configs['google_auth_token_json']
    const oauth2Client = await this.getOauth2Client()
    if (token) {
      // console.log(token)
      oauth2Client.credentials = JSON.parse(token)
      return oauth2Client
    } else {
      await this.sendAuthUrl(oauth2Client);
    }
  }

  async sendAuthUrl(oauth2Client) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    })
    let errorMsg = `Get app Auth Code by visiting this url:\n${authUrl}`
    errorMsg += `\n And submit Auth Code in ${process.env.URL_ORIGIN}/code.html`
    this.configs = null // refresh needed
    throw Error(errorMsg)
  }

  async getNewToken(code) {
    const oauth2Client = await this.getOauth2Client()
    try {
      const token = await getToken(oauth2Client, code)
      await setConfigs({ 'google_auth_token_json': token })
      this.configs['google_auth_token_json'] = token
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async getOauth2Client() {
    if (!this.configs) {
      this.configs = await getConfigs()
    }
    const credentials = JSON.parse(this.configs['google_client_secret_json'])

    const clientSecret = credentials.installed.client_secret
    const clientId = credentials.installed.client_id
    const redirectUrl = credentials.installed.redirect_uris[0]
    const auth = new googleAuth()
    const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
    return oauth2Client
  }

  async locateFolder(query) {
    const auth = await this.authorize()
    const folderInfo = await findOrCreateFolder(query, auth)
    // console.log('folderInfo', folderInfo)
    return folderInfo
  }

  async uploadFromUrl(url, fileName, parentId) {
    const auth = await this.authorize()

    fileName = fileName || decodeURIComponent(_.last(url.trim().split('/')))
    
    // const fileStream = req(url).on('response', (response) => {
    //   // console.log(response)
    //   console.log(response.statusCode) // 200
    //   console.log(response.headers['content-type']) // 'image/png'
    // })
    
    let fileInfo = {
      fileName: fileName,
      fileStream: req(url),
      // fileStream: fs.createReadStream('doodle.png'),
      // fileStream: fileStream
    }
    
    if (parentId) fileInfo.parentId = parentId

    // console.log(fileInfo.fileName, fileInfo.parentId)
    const res = await uploadFile(fileInfo, auth)
    // console.log('File uploaded:', res)
    return res
  }
}

const getToken = (oauth2Client, code) => {
  return new Promise((resolve, reject) => {
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err)
        reject(err)
        return
      }
      oauth2Client.credentials = token;
      resolve(token);
      // callback(oauth2Client);
    })
  })
}

const listFlies = (auth) => {
  return new Promise((resolve, reject) => {
    var service = google.drive('v3')
    service.files.list({
      auth: auth,
      // pageSize: 10,
      q: "mimeType = 'application/vnd.google-apps.folder' and 'root' in parents",
      spaces: 'drive',
      fields: "nextPageToken, files(id, name, parents)"
    }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err)
        reject(err)
        return;
      }
      // console.log(response)
      var files = response.files;
      resolve(files)
    })
  })
}

const findOrCreateFolder = async (query, auth) => {
  const folderNameList = _.compact(query.trim().split('/'))
  if (folderNameList.length > 5) throw Error('Folders Too Deep!')
  let currentFolderInfo = null
  // let nextFolderId = undefined
  let nextParentId = undefined
  for (let folderName of folderNameList) {
    let folderInfo = await findFolderInfo(folderName, nextParentId, auth)
    if (folderInfo) {
      currentFolderInfo = folderInfo
      nextParentId = folderInfo.id
    } else {
      folderInfo = await createFolder(folderName, nextParentId, auth)
      currentFolderInfo = folderInfo
      nextParentId = folderInfo.id
    }
  }
  return currentFolderInfo
}

const findFolderInfo = (folderName, parentId = 'root', auth) => {
  const drive = google.drive('v3')
  const mimeType = 'application/vnd.google-apps.folder'
  const q = `mimeType = '${mimeType}' and name ='${folderName}' and '${parentId}' in parents`
  // console.log(q)
  return new Promise((resolve, reject) => {
    drive.files.list({
      auth: auth,
      q: q,
      fields: 'nextPageToken, files(id, name, parents)'
    }, (err, response) => {
      if (err) {
        console.log('The API returned an error: ' + err)
        reject(err)
        return
      }
      const files = response.files
      // console.log(response)
      if (_.isEmpty(files)) {
        resolve(null)
      }
      resolve(files[0])
    })
  })
}

const createFolder = async (folderName, parentId, auth) => {
  const drive = google.drive('v3')
  const mimeType = 'application/vnd.google-apps.folder'
  let fileMetadata = {
    'name': folderName,
    'mimeType': mimeType,
  }
  if (parentId) fileMetadata['parents'] = [parentId]
  return new Promise((resolve, reject) => {
    drive.files.create({
      auth: auth,
      resource: fileMetadata,
      fields: 'id, name, parents'
    }, function (err, file) {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        // console.log('Folder :', file)
        resolve(file)
      }
    })
  })
}

const uploadFile = async (fileInfo, auth) => {
  const { fileName, fileStream, parentId, mimeType } = fileInfo
  const drive = google.drive('v3');
  let fileMetadata = {
    'name': fileName
  }
  if (parentId) fileMetadata['parents'] = [parentId]
  if (mimeType) fileMetadata['mimeType'] = mimeType

  const media = {
    'uploadType': 'resumable',
    body: fileStream
  }
  return new Promise((resolve, reject) => {
    drive.files.create({
      auth: auth,
      resource: fileMetadata,
      media: media,
      fields: 'id, name, parents'
    }, function (err, file) {
      if (err) {
        console.error(err)
        reject(err)
      } else {
        console.log('File :', file)
        resolve(file)
      }
    })
  })
}

module.exports = GoogleDrive

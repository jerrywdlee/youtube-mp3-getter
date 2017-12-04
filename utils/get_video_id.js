'use strict'

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

module.exports = getVideoId;
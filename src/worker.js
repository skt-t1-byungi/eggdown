const Client = require('./Client')
const autobind = require('auto-bind')
const fs = require('fs-extra')
const path = require('path')
const ytdl = require('ytdl-run')

class Worker {
  constructor () {
    this._client = null
    this._overwrite = true
    this._baseDir = null

    autobind(this)
  }

  init ({saved, overwrite, baseDir}) {
    this._client = Client.restore(saved)
    this._overwrite = overwrite
    this._baseDir = baseDir
  }

  getSeriesList (page, perpage) {
    return this._client.getSeriesList(page, perpage)
  }

  getLessons (page, perpage) {
    return this._client.getLessons(page, perpage)
  }

  async downLessonVideo ({signedUrl, mpdUrl}, downDir, fileName) {
    downDir = path.join(this._baseDir, downDir)
    const downPath = path.join(downDir, fileName)

    if (!this._overwrite && await fs.pathExists(downPath)) return

    await fs.ensureDir(downDir)

    try {
      if (!signedUrl) throw new Error('to be processed by youtube-dl..')
      await this._client.downVideoBySigned(signedUrl, downPath)
    } catch (err) {
      await fs.remove(downPath) // not supports overwrite..
      await ytdl([mpdUrl, '-o', path.toNamespacedPath(downPath)])
    }
  }
}

module.exports = new Worker()

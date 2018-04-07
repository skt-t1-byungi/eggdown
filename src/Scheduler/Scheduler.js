const range = require('lodash.range')

module.exports = class Scheduler {
  constructor (workers, {concurrency, perPage = 10} = {}) {
    this._workers = workers
    this._concurrency = concurrency

    // for parsing
    this._perPage = perPage
    this._page = 0
    this._parsedPages = 0
    this._endPage = false

    // for stats
    this._completed = 0
    this._totals = 0

    this._resolve = null
    this._reject = null
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  get stats () {
    return { completed: this._completed, totals: this._totals }
  }

  run () {
    range(this._concurrency).forEach(_ => this._next())
    return this._promise
  }

  async _next () {
    try {
      await this._parseNext(++this._page, this._perPage)
      this._parsedPages++

      this._endPage ? this.resolveIfDone() : this._next()
    } catch (err) {
      this._reject(err)
    }
  }

  resolveIfDone () {
    if (
      this._endPage &&
      this._page === this._parsedPages &&
      this._totals === this._completed
    ) {
      this._resolve(this._completed)
    }
  }

  _parseNext () {
    throw new Error('needs implement!')
  }

  _endParsing () {
    if (!this._endPage) this._endPage = true
  }

  async _downLessonVideo ({signedUrl, mpdUrl}, downDir, fileName) {
    this._totals++
    await this._workers.downLessonVideo({signedUrl, mpdUrl}, downDir, fileName)
    this._completed++

    this.resolveIfDone()
  }
}

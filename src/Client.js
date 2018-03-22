const {CookieJar} = require('tough-cookie')
const jarGot = require('jar-got')
const fs = require('fs')

module.exports = class Client {
  static restore (saved) {
    return new Client(jarGot(CookieJar.deserializeSync(saved)))
  }

  constructor (got = jarGot()) {
    this._got = got
  }

  save () {
    return this._got.jar.serializeSync()
  }

  async attemptLogin (email, pswd) {
    const {statusCode} = await this._got.post('https://egghead.io/users/sign_in', {
      form: true,
      throwHttpErrors: false,
      body: {
        'user[email]': email,
        'user[password]': pswd,
        'authenticity_token': await this.getCsrfToken()
      }
    })

    // if login succeeds, it redirects.
    return statusCode === 302
  }

  async getCsrfToken () {
    const {body} = await this._got('https://egghead.io/users/sign_in')
    const [, csrfToken] = /<meta name="csrf-token" content="(.*)" \/>/.exec(body)
    return csrfToken
  }

  async isProMember () {
    const {body} = (await this._got('https://egghead.io'))
    return body.includes("'PRO Member': true")
  }

  async getSeriesList (page = 1, perPage = 10) {
    const {body: seriesList} = await this._got(`https://egghead.io/api/v1/series?load_lessons=true&published=true&page=${page}&per_page=${perPage}`, {json: true})

    return seriesList.map(series => ({
      label: series.primary_tag.label,
      slug: series.slug,
      lessons: formatLessons(series.lessons)
    }))
  }

  async getLessons (page = 1, perPage = 10) {
    const {body: lessons} = await this._got(`https://egghead.io/api/v1/lessons?state=published&page=${page}&per_page=${perPage}`, {json: true})

    return formatLessons(lessons)
  }

  async downVideoBySigned (signedUrl, downPath) {
    const {body: downUrl} = await this._got(signedUrl)

    return new Promise((resolve, reject) => {
      this._got.stream(downUrl)
        .on('error', reject)
        .pipe(fs.createWriteStream(downPath))
        .on('error', reject)
        .on('finish', resolve)
    })
  }
}

function formatLessons (lessons) {
  return lessons
    .filter(lesson => lesson && lesson.media_urls && lesson.media_urls.dash_url)
    .map((lesson, i) => {
      return {
        order: i + 1,
        id: lesson.id,
        slug: lesson.slug,
        mpdUrl: lesson.media_urls.dash_url,
        signedUrl: lesson.download_url
      }
    })
}

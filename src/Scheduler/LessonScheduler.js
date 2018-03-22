const Scheduler = require('./Scheduler')

module.exports = class LessonScheduler extends Scheduler {
  async _parseNext () {
    const lessons = await this._workers.getLessons(++this._page, this._perPage)

    if (lessons.length === 0) return this._doneEndPage()

    lessons.forEach(lesson => this._downLessonVideo(lesson, 'lessons', `${lesson.id}-${lesson.slug}.mp4`))
  }
}

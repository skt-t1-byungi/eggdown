const Scheduler = require('./Scheduler')

module.exports = class LessonScheduler extends Scheduler {
  async _parseNext (page, perPage) {
    const lessons = await this._workers.getLessons(page, perPage)

    if (lessons.length === 0) return this._endParsing()

    lessons.forEach(lesson => this._downLessonVideo(lesson, 'lessons', `${lesson.id}-${lesson.slug}.mp4`))
  }
}

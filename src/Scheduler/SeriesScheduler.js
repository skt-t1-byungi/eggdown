const Scheduler = require('./Scheduler')
const sanitize = require('sanitize-filename')

module.exports = class SeriesScheduler extends Scheduler {
    async _parseNext (page, perPage) {
        const serieses = await this._workers.getSeriesList(page, perPage)

        if (serieses.length === 0) return this._endParsing()

        for (const series of serieses) {
            const downDir = `series/${sanitize(series.label)}/${series.slug}/`

            series.lessons.forEach(lesson => {
                const filename = `${String(lesson.order).padStart(3, '0')}-${lesson.slug}.mp4`
                this._downLessonVideo(lesson, downDir, filename)
            })
        }
    }
}

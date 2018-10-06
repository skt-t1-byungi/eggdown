#!/usr/bin/env node
const prompts = require('prompts')
const ora = require('ora')
const path = require('path')
const {default: Worker} = require('jest-worker')
const cpus = require('os').cpus().length
const range = require('lodash.range')
const logger = ora()

const {
    Client,
    SeriesScheduler,
    LessonScheduler
} = require('../src')

const ask = config => prompts(config, {onCancel: () => logger.fail('plz answer..') && process.exit()});

(async () => {
    const account = await ask([
        { type: 'text', name: 'email', message: 'egghead email?' },
        { type: 'password', name: 'pswd', message: 'password?' }
    ])

    let tasks
    while (true) {
        tasks = await ask([
            { type: 'confirm', name: 'seriesAll', message: 'download all series?', initial: true },
            { type: 'confirm', name: 'lessonAll', message: 'download all lesson?', initial: true }
        ])

        if (tasks.seriesAll || tasks.lessonAll) break
        logger.warn('plz choose at least one.')
    }

    const etc = await ask([
        { type: 'text',
            name: 'downDir',
            message: 'download path?',
            initial: path.resolve(process.cwd(), 'videos/')
        },
        { type: 'confirm', name: 'overwrite', message: 'overwrite?', initial: true }
    ])

    const concurrency = Math.min(8, cpus)
    const workers = new Worker(require.resolve('../src/worker.js'), {numWorkers: concurrency})

    try {
        await run({...account, ...tasks, ...etc, workers, concurrency})
    } catch (err) {
        logger.fail('unknown error occurred! T-T')
        process.exit(1)
    } finally {
        workers.end()
    }
})()

async function run ({
    email, pswd, downDir, overwrite, seriesAll, lessonAll,
    workers, concurrency
}) {
    const client = new Client()

    // for login
    const loginMsg = ora('attempting login..').start()

    if (!await client.attemptLogin(email, pswd)) return loginMsg.fail('login failed. plz correct email, password.')
    if (!await client.isProMember()) return loginMsg.fail('not a pro account.')

    loginMsg.succeed('login success.')

    // for worker
    const initMsg = ora('preparing workers..').start()

    await Promise.all(
        range(concurrency)
            .map(_ => workers.init({saved: client.save(), baseDir: downDir, overwrite}))
    )

    initMsg.succeed('wake up workers.')

    // series download
    if (seriesAll) {
        const seriesMsg = ora('start series download..').start()
        const scheduler = new SeriesScheduler(workers, {concurrency, perPage: 2})

        const interval = setInterval(_ => {
            const stats = scheduler.stats
            seriesMsg.text = `series downloading.. [${stats.completed}/${stats.totals}]`
        }, 250)

        const count = await scheduler.run()
        clearInterval(interval)

        seriesMsg.succeed(`complete series download.. (${count})`)
    }

    // lessons download
    if (lessonAll) {
        const lessonMsg = ora('start lesson download..').start()
        const scheduler = new LessonScheduler(workers, {concurrency})

        const interval = setInterval(_ => {
            const stats = scheduler.stats
            lessonMsg.text = `lessons downloading.. [${stats.completed}/${stats.totals}]`
        }, 250)

        const count = await scheduler.run()
        clearInterval(interval)

        lessonMsg.succeed(`complete lesson download.. (${count})`)
    }

    logger.succeed('All done!! good bye~')
}

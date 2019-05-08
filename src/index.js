const debug = require('debug')('metalsmith:contentascode_next_index')
const async = require('async')
const path = require('path')
const match = require('multimatch')
const spawnSync = require('child_process').spawnSync
const spawn = require('child_process').spawn
const fs = require('fs-extra')
/**
 * Expose `plugin`.
 */

module.exports = plugin

/**
 * Metalsmith plugin to transform content for a contentascode next.js pipeline.
 *
 *
 * @param {Object} options
 *
 * @return {Function}
 */

function plugin(options) {
  const { destination, patterns = ['**/*.md'], install = true, start = true } =
    options || {}

  return function contentascode_next_index(files, metalsmith, done) {
    const transform = (file, key, cb) => {
      if (match(key, patterns).length === 0) {
        debug('skip', key)
        return cb() // do nothing
      }
      cb(null, file)
    }

    async.mapValuesSeries(files, transform, (err, res) => {
      if (err) throw err

      // Create content.json file of form
      // {
      //   "methods": {
      //     "1": {
      //       "id": "1",
      //       "name": "Preparation"
      //       "summary": "./reconnaissance/summary.md",
      //       "purpose": "./"
      //     },
      //     "2": {
      //       "id": "2",
      //       "name": "Context Research"
      //     },
      //   },
      //   "activities": {
      //     "1": {
      //       "id": "1",
      //       "id_method": "1",
      //       "name": "Test",
      //       "time": 0,
      //       "tech": true,
      //       "research": false,
      //       "interpersonal": false,
      //       "content": "./activities/",
      //       "id_summary": "1",
      //       "id_preparation": "./activities/automated_reconnaissance/preparation.md"
      //     },
      //   },
      //   "content": {
      //     "1": {
      //       "html": "./content/test.html"
      //     },
      //     "2": {
      //       "html": "./content/methods/reconnaissance.html"
      //     },
      //     "3": {}
      //   }
      // }

      const { taxonomy, navigation } = metalsmith.metadata()
      let method_index = -1
      debug('taxonomy.categories', JSON.stringify(taxonomy.categories, true, 2))

      const methods = Object.keys(taxonomy.categories).reduce((acc, method) => {
        method_index += 1
        const file = files[`${method}.md`]
        return {
          ...acc,
          [`${method_index}`]: {
            ...acc[`${method_index}`],
            id: `${method_index}`,
            name: file.name,
            description: file.description,
            content: method,
          },
        }
      }, {})

      method_index = -1
      let activity_index = -1
      const activities = Object.keys(taxonomy.categories).reduce(
        (ac, method) => {
          method_index += 1

          const acts = Object.keys(taxonomy.categories[method]).reduce(
            (acc, i) => {
              activity_index += 1
              const file = files[`${taxonomy.categories[method][i]}.md`]
              delete file[`..`]
              const {
                contents,
                raw,
                mode,
                paths,
                stats,
                next,
                previous,
                ...metadata
              } = file
              debug(`${taxonomy.categories[method][i]}.md metadata`, metadata)
              return {
                ...acc,
                [`${activity_index}`]: {
                  ...metadata,
                  id: `${activity_index}`,
                  id_method: `${method_index}`,
                  content: taxonomy.categories[method][i],
                },
              }
            },
            {}
          )

          return {
            ...ac,
            ...acts,
          }
        },
        {}
      )

      const content = {
        methods,
        activities,
        content: {},
      }

      files[path.join(destination, 'content.json')] = {
        contents: new Buffer(JSON.stringify(content, true, 2)),
      }

      done()
    })
  }
}

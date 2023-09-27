'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RedisRoute extends Model {
      static get table() {
        return 'redis_routes_dev'
      }
}

module.exports = RedisRoute

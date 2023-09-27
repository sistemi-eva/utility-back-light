'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RedisRoutesSchema extends Schema {
  up () {
    this.create('redis_routes', (table) => {
      table.increments()
      table.string('name_function').notNullable()
      table.string('name_controller').notNullable()
      table.jsonb('request').notNullable()
      table.string("mese").notNullable()
      table.string("anno").notNullable()
      table.string('tenant').notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('redis_routes')
  }
}

module.exports = RedisRoutesSchema

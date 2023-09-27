'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FlowsSchema extends Schema {
  up () {
    this.create('flows', (table) => {
      table.string('code').primary().notNullable().unique();
      table.string('flow_type').notNullable()
      table.string('flow_limit').notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('flows')
  }
}

module.exports = FlowsSchema

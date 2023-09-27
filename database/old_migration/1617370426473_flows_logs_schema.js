'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FlowsLogsSchema extends Schema {
  up () {
    this.create('flows_logs', (table) => {
      table.increments()
      table.string('flow_code').notNullable()
      table.string('type').notNullable()
      table.text('text').notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('flows_logs')
  }
}

module.exports = FlowsLogsSchema

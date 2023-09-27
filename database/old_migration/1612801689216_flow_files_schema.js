'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FlowFilesSchema extends Schema {
  up () {
    this.create('flow_files', (table) => {
      table.increments()
      table.string('flow_code').notNullable()
      table.string('file_name').notNullable()
      table.integer('total').notNullable()
      table.integer('processed').notNullable()
      table.string('status').notNullable()
      table.boolean('sent').notNullable()
      table.string('type').notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('flow_files')
  }
}

module.exports = FlowFilesSchema

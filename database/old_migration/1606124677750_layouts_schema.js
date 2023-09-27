'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LayoutsSchema extends Schema {
  up () {
    this.create('layouts', (table) => {
      table.increments()
      table.string('name').notNullable()
      table.string('type').notNullable()
      table.string('path').notNullable()
      table.string('tenant_code').notNullable()
      
    })
  }

  down () {
    this.drop('layouts')
  }
}

module.exports = LayoutsSchema

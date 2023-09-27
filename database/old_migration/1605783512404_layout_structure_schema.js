'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class LayoutStructureSchema extends Schema {
  up () {
    this.create('layout_structures', (table) => {
      table.increments()
      table.integer('layout_id').notNullable()
      table.string('xml_code').notNullable()
      table.string('x').notNullable()
      table.string('y').notNullable()
      table.string('suffix')
      table.string('prefix')
      table.string('font').notNullable()
      table.integer('size').notNullable()
      table.string('color').notNullable()
      table.string('reference').notNullable()
    })
  }

  down () {
    this.drop('layout_structures')
  }
}

module.exports = LayoutStructureSchema

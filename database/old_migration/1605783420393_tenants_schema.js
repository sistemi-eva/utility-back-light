'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TenantsSchema extends Schema {
  up () {
    this.create('tenants', (table) => {
      table.string('code').primary().notNullable().unique();
      table.string('external_code')
      table.string('896auth')
    })
  }

  down () {
    this.drop('tenants')
  }
}

module.exports = TenantsSchema

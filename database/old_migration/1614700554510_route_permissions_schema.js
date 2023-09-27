'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class RoutePermissionsSchema extends Schema {
  up () {
    this.create('route_permissions', (table) => {
      table.string('name').primary().notNullable().unique();
      table.json('member_of').defaultTo('{}')
      table.timestamps()
    })
  }

  down () {
    this.drop('route_permissions')
  }
}

module.exports = RoutePermissionsSchema

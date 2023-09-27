'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SmsSchema extends Schema {
  up () {
    this.create('sms', (table) => {
      table.increments()
      table.string('tenant').notNullable()
      table.string('message').notNullable()
      table.string('recipients').notNullable()
      table.string('owner').notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('sms')
  }
}

module.exports = SmsSchema

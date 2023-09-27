'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class GasUddHistorySchema extends Schema {
  static get connection () {
    return 'rcu'
  }
  
  up () {
    this.create('gas_udd_histories', (table) => {
      table.increments()
      table.integer('mese')
      table.integer('anno')
      table.integer('importati')
      table.string('status')
      table.string('note').notNullable()
      table.string('owner').notNullable()
      table.string('owner_ip').notNullable()
      table.boolean('deleted').notNullable().defaultTo(false)
      table.string('delete_owner')
      table.string('delete_owner_ip')
      table.timestamps()
    })
  }

  down () {
    this.drop('gas_udd_histories')
  }
}

module.exports = GasUddHistorySchema

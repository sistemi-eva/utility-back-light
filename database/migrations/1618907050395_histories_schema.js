'use strict'

//PDF CREATOR DATABASE

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HistorySchema extends Schema {
  static get connection () {
    return 'fatturazionepassiva'
  }

  up () {
    this.create('histories', (table) => {
      table.increments()
      table.string('fornitore').notNullable()
      table.integer('importati')
      table.string('owner').notNullable()
      table.string('owner_ip').notNullable()
      table.string('status')
      table.string('note')
      table.integer('mese')
      table.integer('anno')
      table.timestamps()
    })
  }

  down () {
    this.drop('histories')
  }
}

module.exports = HistorySchema

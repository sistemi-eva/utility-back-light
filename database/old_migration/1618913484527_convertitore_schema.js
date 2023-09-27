'use strict'

//fatturazionepassiva DATABASE


/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ConvertitoreSchema extends Schema {
  static get connection () {
    return 'fatturazionepassiva'
  }
  up () {
    this.create('convertitore', (table) => {
      table.increments()
      table.string('value')
      table.string('corrispondente')
      table.timestamps()
    })
  }

  down () {
    this.drop('convertitore')
  }
}

module.exports = ConvertitoreSchema

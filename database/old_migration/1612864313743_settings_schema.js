'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SettingsSchema extends Schema {
  up () {
    this.create('settings', (table) => {
      table.string('getters_path_xml')
      table.string('definitive_path_save')
      table.string('test_path_save')
      table.string('stampatore_app')
    })
  }

  down () {
    this.drop('settings')
  }
}

module.exports = SettingsSchema

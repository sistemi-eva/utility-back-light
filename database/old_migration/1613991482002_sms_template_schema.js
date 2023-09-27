'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SmsTemplateSchema extends Schema {
  up () {
    this.create('sms_templates', (table) => {
      table.increments()
      table.string('azienda',32)
      table.string('nome',32)
      table.text('messaggio')
    })
  }

  down () {
    this.drop('sms_templates')
  }
}

module.exports = SmsTemplateSchema

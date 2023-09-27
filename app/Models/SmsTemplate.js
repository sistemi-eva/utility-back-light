'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SmsTemplate extends Model {
    static boot () {
        super.boot()
        
      }
    static get updatedAtColumn () {
        return null
      }
    static get createdAtColumn () {
        return null
    }
}

module.exports = SmsTemplate

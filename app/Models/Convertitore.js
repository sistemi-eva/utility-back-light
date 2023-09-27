'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Convertitore extends Model {
    static get connection() {
        return 'fatturazionepassiva'
      }
    static get table() {
        return 'convertitore'
    }
}

module.exports = Convertitore

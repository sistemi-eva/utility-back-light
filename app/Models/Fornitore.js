'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Fornitore extends Model {
    static get connection() {
        return 'fatturazionepassiva'
    }
    static get table() {
        return 'fornitori'
    }

    static get incrementing () {
        return false
      }

    static get primaryKey() {
        return "name";
      }

    static get updatedAtColumn () {
        return null
      }
    static get createdAtColumn () {
        return null
    }
}

module.exports = Fornitore

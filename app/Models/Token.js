'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Token extends Model {
    static get primaryKey() {
        return "token";
      }
    static get updatedAtColumn () {
        return null
      }
    static get createdAtColumn () {
        return null
    }
}

module.exports = Token

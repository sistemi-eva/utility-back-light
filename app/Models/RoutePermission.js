'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RoutePermission extends Model {
  static boot () {
    super.boot()
    
  }
    static get primaryKey() {
        return "name";
      }
}

module.exports = RoutePermission

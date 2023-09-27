'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const Config = use('Config')


class RcuEnergiaUdd extends Model {
  static get connection() {
    return 'rcu'
  }
    
  static get table() {
    // return Config.get('app.namespace_ee') + '.ee_udd'
    // return 'ee_udd'
  }
}

module.exports = RcuEnergiaUdd

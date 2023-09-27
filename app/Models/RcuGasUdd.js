'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RcuGasUdd extends Model {
  static get connection() {
    return 'rcu'
  }
    
  static get table() {
    return 'ugm.gas_udd'
  }
}

module.exports = RcuGasUdd

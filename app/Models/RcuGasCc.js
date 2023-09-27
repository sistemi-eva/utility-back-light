'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class RcuGasCc extends Model {
  static get connection() {
    return 'rcu'
  }

  static get table() {
    return 'ugm.gas_cc'
  }
}

module.exports = RcuGasCc

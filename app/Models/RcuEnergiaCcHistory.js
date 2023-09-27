'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const moment = use('moment')
const Config = use('Config')

class RcuEnergiaCcHistory extends Model {
    static get connection() {
      return 'rcu'
    }
    static get table() {
      return Config.get('app.namespace_ee')+'.ee_cc_histories'
      return 'ee_cc_histories'
    }

    static get hidden() {
      return ['created_at', 'updated_at']
    }

    static get computed() {
      return ['start_date','end_date']
    }

    getStartDate({ created_at }) {
      return moment(created_at).format("DD/MM/YYYY HH:mm:ss ")   
    }

    getEndDate({ updated_at }) {
      return moment(updated_at).format("DD/MM/YYYY HH:mm:ss ")   
    }
}

module.exports = RcuEnergiaCcHistory

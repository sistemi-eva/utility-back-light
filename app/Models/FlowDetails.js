'use strict'

const moment = use('moment')


/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FlowDetails extends Model {
  static boot () {
    super.boot()
    
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

      Tenant(){
        return this.hasOne('App/Models/Tenant','tenant_code','code')
      }
}

module.exports = FlowDetails

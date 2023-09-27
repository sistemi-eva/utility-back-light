'use strict'
const moment = use('moment')

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Flow extends Model {
  static boot () {
    super.boot()
    
  }
  static get primaryKey() {
      return "code";
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
    files () {
      return this.hasMany('App/Models/FlowFiles','code', 'flow_code')
    }
    logs(){
      return this.hasMany('App/Models/FlowsLog','code', 'flow_code').orderBy('created_at','asc')
    }
    details(){
      return this.hasMany('App/Models/FlowDetails','code', 'flow_code')
      // .orderBy('created_at','asc')
    }
}

module.exports = Flow

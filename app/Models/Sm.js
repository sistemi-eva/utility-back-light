'use strict'

const moment = use('moment')

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Sm extends Model {
    static get computed() {
        return ['send_date']
    }
    getSendDate({ created_at }) {
        return moment(created_at).format("DD/MM/YYYY HH:mm:ss ")   
    }
}

module.exports = Sm

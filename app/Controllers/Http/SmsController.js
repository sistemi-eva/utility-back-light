'use strict'

const Tenant = use('App/Models/Tenant')
const Token = use('App/Models/Token')
const SmsTemplate = use('App/Models/SmsTemplate')
const Sm = use('App/Models/Sm')
const axios = require('axios');
var https = require('https')

class SmsController {

    async getTemplates({request,response}){
        try {
          const tenant = request.input('tenant')
          var results = SmsTemplate.query()
          if(tenant) results.where('azienda','=',tenant)
          results = await results.orderBy('id','asc').fetch()
          return response.send({"status": "success","data": results.toJSON(),"message": "Questi sono i template degli SMS"})
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }

    async setTemplates({request,response}){
    try {
        const richiesta = request.only(['azienda','nome','messaggio'])
        if(richiesta.azienda && richiesta.nome && richiesta.messaggio ) {
        await SmsTemplate.create(richiesta)
        return response.send({"status": "success","data": null,"message": "Creazione nuovo template per gli SMS"})
        }else return response.status(400).send({"status": "BAD_REQUEST","message": "La richiesta non è completa"})
    } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
    }

    async createNewSMS({request,response}){
    try {
        const richiesta = request.only(['tenant','message','recipients'])
        if(richiesta.tenant && richiesta.message && richiesta.recipients ) {
        const config = await Tenant.query().where('code','=',richiesta.tenant).first()
        let sb_key = config.sms_config.key
        let sb_token = config.sms_config.access_token
        await axios.post(
        'https://api.skebby.it/API/v1.0/REST/sms',
        {
        "message_type": "GP",
        "message": richiesta.message,
        "recipient": richiesta.recipients
        },
        {
        headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'EVA-SIGN-GATEWAY',
        'user_key': sb_key,
        'Access_token': sb_token
        },
        responseType: 'json',
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
        })
        const key_code = request.header('Secret-Key')
        var tokenUser = await Token.query().where('token','=',key_code).first()
        await Sm.create({tenant:richiesta.tenant,message:richiesta.message,recipients: richiesta.recipients[0], owner: tokenUser.username, owner_ip:tokenUser.ip_address})
        return response.send({"status": "success","data": null,"message": "Messaggio Inviato con successo"})
        }else return response.status(400).send({"status": "BAD_REQUEST","message": "La richiesta non è completa"})
    } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
    }

    async getSmsHistory({response,request}){
        const page = request.input("page", 1);
        const rowsPerPage = request.input("perPage", 99999999);
        const sortBy = request.input("sortBy", "created_at");
        const order = request.input("order", "desc");
      try {
          var sms = await Sm.query().orderBy(sortBy, order).paginate(page, rowsPerPage);
          return response.send({"status": "success","data": sms,"message": null})
      } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
}

module.exports = SmsController

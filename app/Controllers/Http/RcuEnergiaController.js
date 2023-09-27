'use strict'
const Config = use('Config')

class RcuEnergiaController {

  async getNameSpace({request,response}){
    try {
      return response.send({"status": "success","data": Config.get('app.namespace_ee'),"message": `Ritorno di tutti le informazioni necessarie per la dashboard`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async setNameSpace({request,response}){
    try {
      const {tenant} = request.all()
      Config.set('app.namespace_ee',tenant)
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

}

module.exports = RcuEnergiaController

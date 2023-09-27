const { list } = require("@adonisjs/framework/src/Route/Store")

const RedisRoute = use('App/Models/RedisRoute')
const Redis = use('Redis')
const moment = use('moment')
const Database = use('Database')

'use strict'
class RedisRouteController {



    async statusCache(tenant,name_controller,mese,anno){
        try {
            let in_lavorazione =  RedisRoute.query()
            if(name_controller) in_lavorazione.where('name_controller',name_controller)
            if(tenant) in_lavorazione.where('tenant',tenant)
            in_lavorazione = await in_lavorazione.where('status',1).fetch()
            if(in_lavorazione.rows.length > 0) return 'in_lavorazione'
            else {
                let cached = RedisRoute.query()
                if(name_controller) cached.where('name_controller',name_controller)
                if(tenant) cached.where('tenant',tenant)
                cached = await cached.where('status',2).fetch()
                if(cached.rows.length > 0) {
                    if(mese && anno) {
                        if(cached.rows[0].mese == mese && cached.rows[0].anno == anno) return 'cached'
                        else return 'cached_old'
                    }else return 'cached'
                }
            }
            return 'no_cached'
        } catch (error) {
            console.log("error",error)
            throw error
        }
    }


    async updateAllCacheImport(){
        try {
            let listCached = await RedisRoute.query().select('name_controller','tenant').groupBy('name_controller','tenant').fetch()
            listCached = listCached.toJSON()
            for(let i in listCached) {
                let db = null
                let tenant = listCached[i].tenant
                let name_controller = listCached[i].name_controller
                console.log("ten",tenant)
                switch(name_controller){
                    case 'RcuEnergiaUddController' : db = 'ee_udd';break;
                    case 'RcuGasUddController' : db = 'gas_udd';break;
                    case 'RcuEnergiaCcController' : db = 'ee_cc';break;
                }
                let query = await Database.connection('rcu')
                .raw(`select "MESE","ANNO" from ${tenant}.${db} order by "ANNO" desc,"MESE" desc limit 1 `)
                if(query.rows.length > 0) {
                    RedisRoute.query().where('name_controller',name_controller)
                    .where('tenant',tenant).update({mese:query.rows[0].MESE,anno:query.rows[0].ANNO,status:1})
                    this.updateCacheImport(tenant,name_controller,query.rows[0].MESE,query.rows[0].ANNO)
                }
            }
        } catch (error) {
            throw error
            console.log("error",error)
        }
    }

    async updateCacheImport(tenant,name_controller,mese,anno){
        try {
            await this.deleteKeys(tenant,name_controller)
            let defaultKeys = await RedisRoute.query().where('name_controller',name_controller)
            .where('tenant',tenant).update({mese,anno,status:1})
            await this.cacheData(tenant,name_controller)
            return defaultKeys
        } catch (error) {
            throw error
            console.log("error",error)
        }
    }

    async deleteAllCache(){
        try {
            let allKeys = await Redis.keys('*')
            for(let k in allKeys) {
                await Redis.del(allKeys[k])
            }
            await RedisRoute.query().update({status: 0})
        } catch (error) {
            console.log("error",error)
        }
    }

    async cacheData(tenant,name_controller){
        try {
            let results =  RedisRoute.query()
            if(tenant) results.where('tenant',tenant)
            if(name_controller) results.where('name_controller',name_controller)
            results = await results.fetch()
            let risultato = results.rows
            for(let i in risultato) {
                // await RedisRoute.query().where('id',risultato[i].id).update({status: 1})
                // let promiseList = []
                let tempController = use(`App/Controllers/Http/${risultato[i].name_controller}`)
                const tempClass = new tempController()
                let richiesta = risultato[i].request
                for(let k in richiesta){
                    if(!!richiesta[k].limitElements) {
                        let limitElementsArr = richiesta[k].limitElements
                        for(let c in limitElementsArr) {
                            delete richiesta[k].limitElements
                            let request = {...richiesta[k],mese: risultato[i].mese,limitElements: limitElementsArr[c],anno: risultato[i].anno}
                            // promiseList.push({func: tempClass[risultato[i].name_function],args: {request,tenant: risultato[i].tenant}})
                            await tempClass[risultato[i].name_function](request,risultato[i].tenant)
                        }
                    }else{
                        let request = {...richiesta[k],mese: risultato[i].mese,anno: risultato[i].anno}
                        // promiseList.push({func: tempClass[risultato[i].name_function],args: {request,tenant: risultato[i].tenant}})
                        await tempClass[risultato[i].name_function](request,risultato[i].tenant)
                    }
                }
                // const resultsPromise = await Promise.all(promiseList.map( (prom) => prom.func(prom.args.request, prom.args.tenant)))
                // console.log("result",resultsPromise)
                await RedisRoute.query().where('id',risultato[i].id).update({status: 2})
            }
        } catch (error) {
            console.log("error",error)
        }
    }

    async deleteKeys(tenant,name_controller){
        try {
            await RedisRoute.query().where('name_controller',name_controller).where('tenant',tenant).update({status: 0})
            let allKeys = await Redis.keys('*')
            for(let k in allKeys) {
                if(allKeys[k].includes(`${name_controller}_${tenant}`)) {
                    await Redis.del(allKeys[k])
                }
            }
        } catch (error) {
            throw error
        }
    }

    async queryDate(){
        try {
            var dateStart = moment('2020-02-01');
            var dateEnd = moment('2020-07-28');
            var interim = dateStart.clone();
            var timeValues = [];
            while (dateEnd > interim || interim.format('M') === dateEnd.format('M')) {
               timeValues.push(interim.format('YYYY-MM'));
               interim.add(1,'month');
            }
            console.log("timeV",timeValues)
           
        } catch (error) {
            console.log("error",error)
        }
    }
}

module.exports = RedisRouteController

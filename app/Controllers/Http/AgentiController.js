'use strict'
const Database = use('Database')

class AgentiController {

    transformToTree(arr){
        var _ = require('lodash');
        var nodes = {};    
        return arr.filter(function(obj){
            var id = obj["id"],
            parentId = obj["agente_padre_id"];
            nodes[id] = _.defaults(obj, nodes[id], { children: [] });
            parentId && (nodes[parentId] = (nodes[parentId] || { children: [] }))["children"].push(obj);
            return !parentId;
        });    
    }
    async getAgenti({response,request}){
        var items = await Database.connection('rcu').raw(`
        select idagente as id, nome as nominativo, case when idagenteparent = 1254 then null else idagenteparent end as agente_padre_id, idfather from ugm.recursive_agenti ra order by nome`)
        var result = this.transformToTree(items.rows);
        result = result.sort((a,b) => a.children.length - b.children.length);
        return response.send(result)
    }

    async searchAgenti({response,request}){
        const query= request.input('query',null)
        if(query) {
            var items = await Database.connection('rcu').raw(`
            select idagente as id, nome as nominativo, case when idagenteparent = 1254 then null else idagenteparent end as agente_padre_id, idfather from ugm.recursive_agenti ra where nome ilike '%${query}%' order by nome`)
            return response.send(items.rows)
        }else return []
    }
}

module.exports = AgentiController

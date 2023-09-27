'use strict'
const XLSX = require('xlsx');
const mkdirp = require('mkdirp')
const fsExtra = require('fs');
const Env = use('Env')
const axios = require('axios');
var json2xlsx = require('node-json-xlsx');


class AgingController {

    async xlsxToJson(file){
        var workbook = XLSX.readFile(file);
        var sheet_name_list = workbook.SheetNames;
        var data = [];
        sheet_name_list.forEach(function(y) {
          var worksheet = workbook.Sheets[y];
          var headers = {};
          for(let z in worksheet) {
              if(z[0] === '!') continue;
              //parse out the column, row, and value
              var col = z.replace(/[0-9]/g, '')
              var row = parseInt(z.replace(/\D/g,''))
              var value = worksheet[z].v;
              //store header names
              if(row == 1) {
                  headers[col] = value;
                  continue;
              }
  
              if(!data[row]) data[row]={};
              data[row][headers[col]] = value;
          }
          //drop those first two rows which are empty
          data.shift();
          data.shift();
        });
        return data
    }

    chooseDB(el){
        switch(el) {
          case 1: return DuegUtenti;
          case 2: return AurahUtenti;
          case 3: return PiuenergieUtenti;
          case 4: return SempliceUtenti;
          case 5: return UgmUtenti;
        }
      }

    async checkOnDB(codice_fiscale,IDAZIENDA){
        try {
          let modelDatabase = this.chooseDB(IDAZIENDA)
          var temp = await modelDatabase.query().where('cod_fiscale',codice_fiscale).orWhere('part_iva',codice_fiscale).fetch()
          if(temp) {
            temp = temp.toJSON()
            if(temp.length > 0) {
              let finalObject = {'EMAIL':'','TELEFONO': '','PEC': '','FAX': ''}
              for(let i in temp) {
                if(temp[i].email) finalObject.EMAIL = temp[i].email
                if(temp[i].cellulare) finalObject.TELEFONO = Number(temp[i].cellulare)
                else if(temp[i].tel_1) finalObject.TELEFONO = Number(temp[i].tel_1)
                if(temp[i].pec) finalObject.PEC = temp[i].pec
                if(temp[i].fax) finalObject.FAX = Number(temp[i].fax)
              }
              return {status: 200, data: finalObject}
            }else return {status:500}
          }else return {status:500}
        } catch (error) {
          console.log("error",error)
          return {status:500}
        }
    }

    async startAging({response,request}) {
        try {
            const xlsxFile = request.file('xlsx_file')
            await mkdirp.sync(Env.get('AGING_PATH'))
            const xlsx_name = Date.now()+'.xlsx'
            await xlsxFile.move(Env.get('AGING_PATH'), {name:xlsx_name, overwrite: true })
            const esitoName = await this.generateXLSX(xlsx_name)
            const buffer = fsExtra.readFileSync(Env.get('AGING_PATH')+ '/'+ esitoName);
            fsExtra.unlinkSync(Env.get('AGING_PATH')+ esitoName)
            fsExtra.unlinkSync(Env.get('AGING_PATH')+ xlsx_name)
            return response.send(buffer)
        } catch (error) {
            return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }

    async generateXLSX(xlsx_name){
        try {
          const xmlJSON = require('xml-js')
          var file = Env.get('AGING_PATH') + '/' + xlsx_name
          const data = await this.xlsxToJson(file)
          const esitoName = 'esito.xlsx'
          for(let i in data) {
            let codice_fiscale = ''
            if(data[i].PIVA) codice_fiscale = data[i].PIVA
            else if(data[i].CFISC) codice_fiscale = data[i].CFISC
            //Connection WebService 
            const params = new URLSearchParams();
            params.append('IDAnagrafica', Number(data[i].IDANAGRAFICA));
            params.append('DataRiferimento', '');
            params.append('IDTipoSede', '');
            const object = await new Promise(async(resolve,reject)=> {
              let finalObject = {'EMAIL':'','TELEFONO': '','PEC': '','FAX': ''}
              await axios.post('http://trapp1.ugmlocal.com/DataExport/wsMain.asmx/GetSyncAnagrafica', params ,
              {headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
              .then(async (res)=> {
                const resXml = xmlJSON.xml2js(res.data, {compact: true, spaces: 4})
                if(resXml.DataTable && resXml.DataTable['diffgr:diffgram'] && resXml.DataTable['diffgr:diffgram'].NewDataSet && resXml.DataTable['diffgr:diffgram'].NewDataSet.TSyncTable){
                  let element = resXml.DataTable['diffgr:diffgram'].NewDataSet.TSyncTable
                  if(!element.EMail || !element.Telefono) {
                    //WS NON UTILIZZABILE
                    if(codice_fiscale){
                      const temp = await this.checkOnDB(codice_fiscale,data[i].IDAZIENDA)
                      if(temp.status == 200) finalObject = temp.data
                    }
                  }else{
                    finalObject = {'EMAIL': element.EMail._text,'TELEFONO': Number(element.Telefono._text), 'PEC': element.Pec ? element.Pec._text : '','FAX': element.Fax ? Number(element.Fax._text) : ''}
                  }
                  resolve(finalObject)
                } else{
                  if(codice_fiscale){
                    const temp = await this.checkOnDB(codice_fiscale,data[i].IDAZIENDA)
                    if(temp.status == 200) finalObject = finalObject.data
                  }
                  resolve(finalObject)
                }  
              }).catch((e)=> {
                console.log("ERRORE DURANTE WEBSERVICE",e)
                resolve(finalObject)
              });
            })
            data[i] = {...data[i], ...object}
          }
          var xlsxFile = await json2xlsx(data,{
            fieldNames: Object.keys(data[0])
        });
          await fsExtra.writeFileSync(`${Env.get('AGING_PATH')}/${esitoName}`, xlsxFile, 'binary');
          return esitoName
        } catch (error) {
          console.log("err",error)
          return error
        }
    }
}

module.exports = AgingController

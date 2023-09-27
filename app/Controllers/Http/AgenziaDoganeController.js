'use strict'

const mkdirp = require('mkdirp')
var builder = require('xmlbuilder2');
var accounting = require("accounting")
const fsExtra = require('fs');
const Env = use('Env')

class AgenziaDoganeController {

    async startConvertitore({response,request}) {
        try {
          const xmlFile = request.file('xml_file')
          await mkdirp.sync(Env.get('AGENZIA_PATH'))
          const xml_name = Date.now()+'.xml'
          await xmlFile.move(Env.get('AGENZIA_PATH'), {name:xml_name, overwrite: true })
          const xml = fsExtra.readFileSync(Env.get('AGENZIA_PATH') + '/' + xml_name)
          const buff = Buffer.from(xml, 'utf-8');
          fsExtra.unlinkSync(Env.get('AGENZIA_PATH')+ '/' + xml_name)
          let base64data = await buff.toString('base64');
          return response.send(base64data)
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
      
    async startAgenziaSingle({response,request}) {
        try {
          const dicFile = request.file('dic_file')
          await mkdirp.sync(Env.get('AGENZIA_PATH'))
          const dic_name = Date.now()+'.dic'
          await dicFile.move(Env.get('AGENZIA_PATH'), {name:dic_name, overwrite: true })
          var array = fsExtra.readFileSync(Env.get('AGENZIA_PATH') + '/' + dic_name).toString().split("\n");
          let esitoName = null
          if(array[0].slice(0,6) === 'ELETTR') esitoName = await this.singleEnergia(array)
          else esitoName = await this.singleGas(array)
          const buffer = fsExtra.readFileSync(Env.get('AGENZIA_PATH')+ '/'+ esitoName);
          fsExtra.unlinkSync(Env.get('AGENZIA_PATH')+ esitoName)
          fsExtra.unlinkSync(Env.get('AGENZIA_PATH')+ dic_name)
          return response.send(buffer)
        } catch (error) {
          console.log(error)
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
  
    async startAgenziaMultipleFirst({response,request}){
        try {
          const dicFile = request.file('dic_file')
          return response.send(await this.startAgenziaMultiple(dicFile,'first'))
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
  
    async startAgenziaMultipleSecond({response,request}){
        try {
          const dicFile = request.file('dic_file')
          return response.send(await this.startAgenziaMultiple(dicFile,'second'))
        } catch (error) {
          return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
        }
    }
  
    async startAgenziaMultiple(dicFile,file) {
        try {
          await mkdirp.sync(Env.get('AGENZIA_PATH'))
          const dic_name = Date.now()+'.dic'
          await dicFile.move(Env.get('AGENZIA_PATH'), {name:dic_name, overwrite: true })
          var array = fsExtra.readFileSync(Env.get('AGENZIA_PATH') + '/' + dic_name).toString().split("\n");
          let esitoName = null   
          if(array[0].slice(0,6) === 'ELETTR') esitoName = await this.multipleEnergia(array,file)
          else esitoName = await this.multipleGas(array,file)
          const buffer = fsExtra.readFileSync(Env.get('AGENZIA_PATH')+ '/'+ esitoName);
          fsExtra.unlinkSync(Env.get('AGENZIA_PATH')+ esitoName)
          fsExtra.unlinkSync(Env.get('AGENZIA_PATH')+ dic_name)
          return buffer
        } catch (error) {
          console.log(error)
          return error
        }
    }

    checkType(value){
        if(!!value) {
          if(Array.isArray(value)) return value
          else if(typeof(value) == 'object') return [value]
        }else return []
    }
    
    async singleEnergia(array){
    try {
        const esitoName = 'esito.xml'
        const EnergiaElettrica = {
        Dichiarante: {},
        Anno:{},
        ContatoriProduzione: [],
        ContatoriUsoPromiscuo : [],
        ContatoriConsumiEsentiDaAccisa: [],
        ContatoriConsumiAssoggettatiAdAccisa: [],
        EnergiaElettricaCeduta: [],
        EnergiaElettricaRicevuta: [],
        EnergiaElettricaFatturata : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        Perdite : [],
        ConsumiNonSottopostiAdAccisa: [],
        ConsumiEsentiDaAccisa : [],
        ConsumiAssoggettatiAdAccisa : [],
        RettificheFatturazione: [],
        LiquidazioneAccisa : [],
        RiepilogoSaldoAccisa : [],
        LiquidazioneAddizionale : [],
        RiepilogoSaldoAddizionale: [],
        ElencoClienti: [],
        ElencoPropriFornitori : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        }
        for(let i in array) {
            const str = array[i].replace(/\s/g, '')
            switch(str.slice(19,21)) {
            case '00': 
                EnergiaElettrica.Anno = array[i].slice(15,19),
                EnergiaElettrica.Dichiarante = {
                CodiceDitta: array[i].slice(6,15),
                TipoSoggetto: array[i].slice(25,26),
                // CodiceAttivita: array[i].slice(23,25),
                CodiceAttivita: '',
                Denominazione: array[i].slice(27,87).trim(),
                ComuneSede: array[i].slice(87,132).trim(),
                ProvinciaSede: array[i].slice(132,134).trim(),
                IndirizzoSede: array[i].slice(134,184).trim(),
                ComuneUfficioAmministrativo: array[i].slice(184,229).trim(),
                ProvinciaUfficioAmministrativo: array[i].slice(229,231).trim(),
                IndirizzoUfficioAmministrativo: array[i].slice(231,281).trim(),
                }
                break;
            case '26':  
                EnergiaElettrica.EnergiaElettricaFatturata.TipoRecord = str.slice(19,21),
                EnergiaElettrica.EnergiaElettricaFatturata.Mese = Number(str.slice(21,23)),
                EnergiaElettrica.EnergiaElettricaFatturata.inner.key = 'ContatoreQuantita'
                //TIPOLOGIA
                if(str.slice(24,25) === '9') {
                //ULTIMO VALORE
                EnergiaElettrica.EnergiaElettricaFatturata.inner.value.push({
                    Matricola: str.slice(24,39),
                    Tipologia: '',
                    CodiceIdentificativo: '',
                    Chilowattora:  Number(str.slice(39,52)),
                    CodiceCatastale : ''
                })
                }else{
                EnergiaElettrica.EnergiaElettricaFatturata.inner.value.push({
                    Matricola: '',
                    Tipologia: str.slice(24,25),
                    CodiceIdentificativo: str.slice(25,36),
                    Chilowattora:  Number(str.slice(36,49)),
                    CodiceCatastale : str.slice(-4)
                })
                }
                break;
            case '41':
                var existItem = EnergiaElettrica.ConsumiEsentiDaAccisa.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25))));
                if(existItem){
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                    NumeroUtenze: Number(str.slice(42,50)),
                    ConsumiUsiCommerciali: Number(str.slice(50,64))
                })
                }else{
                EnergiaElettrica.ConsumiEsentiDaAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    inner: {
                    key: 'Consumi',
                    value: [
                        {
                        Progressivo: Number(str.slice(26,28)),
                        ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                        NumeroUtenze: Number(str.slice(42,50)),
                        ConsumiUsiCommerciali: Number(str.slice(50,64))
                        }
                    ]
                    }
                })
                }
                break;
            case '42':  
            var existItem = EnergiaElettrica.ConsumiAssoggettatiAdAccisa.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4)));
                if(existItem){
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                    NumeroUtenze: Number(str.slice(42,50)),
                    ConsumiUsiCommerciali: Number(str.slice(50,64))
                })
                }else{
                EnergiaElettrica.ConsumiAssoggettatiAdAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    inner: {
                    key: 'Consumi',
                    value: [
                        {
                        Progressivo: Number(str.slice(26,28)),
                        ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                        NumeroUtenze: Number(str.slice(42,50)),
                        ConsumiUsiCommerciali: Number(str.slice(50,64))
                        }
                    ]
                    }
                })
                }
                break;
            case '51':
                var existItem = EnergiaElettrica.LiquidazioneAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,34)),
                    TipoRigo: str.slice(34,35),
                    ProgressivoRecord: Number(str.slice(35,37)),
                    Consumi: Number(str.slice(37,51)),
                    Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                    Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                })
                }else{
                EnergiaElettrica.LiquidazioneAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    inner: {
                    key: 'Liquidazione',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,34)),
                        TipoRigo: str.slice(34,35),
                        ProgressivoRecord: Number(str.slice(35,37)),
                        Consumi: Number(str.slice(37,51)),
                        Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                        Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                        }
                    ]
                    }
                })
                }
                break;
            case '61': 
                var existItem = EnergiaElettrica.RiepilogoSaldoAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                EnergiaElettrica.RiepilogoSaldoAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    'ConguaglioRatealeDL34-2020': 'SI',
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
            case '82':  
                EnergiaElettrica.ElencoPropriFornitori.TipoRecord = str.slice(19,21),
                EnergiaElettrica.ElencoPropriFornitori.Mese = Number(str.slice(21,23)),
                EnergiaElettrica.ElencoPropriFornitori.inner.key = 'Fornitore'
                EnergiaElettrica.ElencoPropriFornitori.inner.value.push({
                Provenienza: str.slice(24,25),
                CodiceIdentificativo: str.slice(25,36),
                Quantita: Number(str.slice(36,49))
                })
                break;
            // default: 
            }
        }
        var starter = builder.create({version: '1.0',encoding:"UTF-8"})
        var root = starter.ele('EnergiaElettrica', {
        'xmlns': 'http://energiaelettrica.jaxb.types.controlliEEGN.accise.adm.finanze.it',
        'xmlns:xsi':"http://www.w3.org/2001/XMLSchema-instance",
        'xsi:schemaLocation':"http://energiaelettrica.jaxb.types.controlliEEGN.accise.adm.finanze.it schema.xsd"
        });
        for (const [sheet_key, sheet_value] of Object.entries(EnergiaElettrica)) {
        let putInArray = this.checkType(EnergiaElettrica[sheet_key])
        if(sheet_key == 'Anno') root.ele(sheet_key).txt(sheet_value)
        else{
            putInArray.forEach(item => {
            var sheet_key_item = root.ele(sheet_key);
            for (const [element_key, element_value] of Object.entries(item)) {
                if(element_key == 'inner' && item[element_key].key){
                let putInArrayValue = this.checkType(item[element_key].value)
                putInArrayValue.forEach(element => {
                    var element_key_item = sheet_key_item.ele(item[element_key].key);
                    for (const [inner_key, inner_value] of Object.entries(element)) {
                    element_key_item.ele(inner_key).txt(inner_value)
                    }
                });
                }else{
                sheet_key_item.ele(element_key).txt(element_value)
                }
            }
            });
        }
        }
        var xml = starter.end({ prettyPrint: true });
        await fsExtra.writeFileSync(`${Env.get('AGENZIA_PATH')}/${esitoName}`, xml, 'binary');
        return esitoName
    } catch (error) {
        console.log("error",error)
        return false
    }
    }
    
    async singleGas(array){
    try {
        const esitoName = 'esito.xml'
        const Gas = {
        Dichiarante: {},
        Anno:{},
        Introdotto: [],
        Estratto: [],
        Venduto: { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        FatturatoImpiegatoSenzaAccisa : [],
        FatturatoImpiegatoFasceClimatiche : [],
        FatturatoImpiegatoTotale: [],
        RettificheFatturazione: [],
        LiquidazioneAccisa : [],
        RiepilogoSaldoAccisa : [],
        LiquidazioneAddizionale : [],
        RiepilogoSaldoAddizionale: [],
        LiquidazioneImpostaSostitutiva : [],
        RiepilogoSaldoImpostaSostitutiva: [],
        ElencoClienti: [],
        ElencoPropriFornitori : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        }
        for(let i in array) {
        const str = array[i].replace(/\s/g, '')
        switch(str.slice(19,21)) {
            case '00': 
                Gas.Anno = array[i].slice(15,19),
                Gas.Dichiarante = {
                CodiceDitta: array[i].slice(6,15),
                TipoSoggetto: array[i].slice(25,26),
                // CodiceAttivita: array[i].slice(23,25),
                CodiceAttivita: '01',
                Denominazione: array[i].slice(27,87).trim(),
                ComuneSede: array[i].slice(87,132).trim(),
                ProvinciaSede: array[i].slice(132,134).trim(),
                IndirizzoSede: array[i].slice(134,184).trim(),
                ComuneUfficioAmministrativo: array[i].slice(184,229).trim(),
                ProvinciaUfficioAmministrativo: array[i].slice(229,231).trim(),
                IndirizzoUfficioAmministrativo: array[i].slice(231,281).trim(),
            }
            break;
            case '16': 
                Gas.Venduto.TipoRecord = str.slice(19,21),
                Gas.Venduto.Mese = Number(str.slice(21,23)),
                Gas.Venduto.inner.key = 'EstrattoVenduto'
                if(str.slice(24,25) === '9') {
                Gas.Venduto.inner.value.push({
                    TipoRigo: str.slice(24,25),
                    Tipologia: '',
                    CodiceIdentificativo: '',
                    MetriCubi: Number(str.slice(25,38)),
                    CodiceCatastale : '',
                })
                }else{
                Gas.Venduto.inner.value.push({
                    TipoRigo: str.slice(24,25),
                    Tipologia: str.slice(25,26),
                    CodiceIdentificativo: str.slice(26,37),
                    MetriCubi: Number(str.slice(37,50)),
                    CodiceCatastale : str.slice(-4),
                })
                }
            break;
            case '31': 
            let excludeArray = ['tn','go','ud','pa','ag','cl','me','ao','pn','sr','en','rg','ct','ts','tp','bz']
            if(!(excludeArray.includes(str.slice(21,23).toLowerCase()))) {
                var existItem = Gas.FatturatoImpiegatoFasceClimatiche.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25)) && item.FasciaClimatica === str.slice(26,27)));
                if(existItem){
                var checkExistFather = existItem.inner.value.find(item => (item.Progressivo == Number(str.slice(27,29))));
                if(checkExistFather){
                    checkExistFather.NumeroUtenze +=  Number(str.slice(29,37))
                    checkExistFather.Quantita += Number(str.slice(37,51))
                }
                else{
                    existItem.inner.value.push({
                    Progressivo: Number(str.slice(27,29)),
                    NumeroUtenze: Number(str.slice(29,37)),
                    Quantita: Number(str.slice(37,51))
                    })
                } 
                }else{
                Gas.FatturatoImpiegatoFasceClimatiche.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    FasciaClimatica : str.slice(26,27),
                    inner: {
                    key: 'FatturatoImpiegato',
                    value: [
                        {
                        Progressivo: Number(str.slice(27,29)),
                        NumeroUtenze: Number(str.slice(29,37)),
                        Quantita: Number(str.slice(37,51))
                        }
                    ]
                    }
                })
                }
            }
            break;
            case '32': 
            var existItem = Gas.FatturatoImpiegatoTotale.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25))));
            if(existItem){
                var checkExistFather = existItem.inner.value.find(item => (item.Progressivo == Number(str.slice(26,28))));
                if(checkExistFather){
                checkExistFather.NumeroUtenze +=  Number(str.slice(28,36))
                checkExistFather.Quantita += Number(str.slice(36,50))
                }
                else{
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    NumeroUtenze: Number(str.slice(28,36)),
                    Quantita: Number(str.slice(36,50))
                })
                }
            }else{
                Gas.FatturatoImpiegatoTotale.push({
                TipoRecord : str.slice(19,21),
                Provincia : str.slice(21,23),
                CodiceCatastale : str.slice(-4),
                Mese : Number(str.slice(23,25)),
                inner: {
                    key: 'FatturatoImpiegato',
                    value: [
                    {
                        Progressivo: Number(str.slice(26,28)),
                        NumeroUtenze: Number(str.slice(28,36)),
                        Quantita: Number(str.slice(36,50))
                    }
                    ]
                }
                })
            }
            break;
            case '50':  
            var existItem = Gas.LiquidazioneAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
            if(existItem) {
                existItem.inner.value.push({
                Progressivo: Number(str.slice(33,35)),
                TipoRigo: str.slice(32,33),
                ProgressivoRecord: Number(str.slice(35,37)),
                Consumi: Number(str.slice(37,51)),
                Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                })
            }else{
                Gas.LiquidazioneAccisa.push({
                TipoRecord : str.slice(19,21),
                Provincia : str.slice(21,23),
                Mese : Number(str.slice(23,25)),
                CapitoloImputazione : str.slice(26,30),
                ArticoloCapitolo : str.slice(30,32),
                inner: {
                    key: 'Liquidazione',
                    value: [
                    {
                        Progressivo: Number(str.slice(33,35)),
                        TipoRigo: str.slice(32,33),
                        ProgressivoRecord: Number(str.slice(35,37)),
                        Consumi: Number(str.slice(37,51)),
                        Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                        Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                    }
                    ]
                }
                })
            }
            break;
            case '55':  
            var existItem = Gas.RiepilogoSaldoAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                Gas.RiepilogoSaldoAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    // ArticoloCapitolo : '01',
                    'ConguaglioRatealeDL34-2020': 'SI',
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
            case '60':  
            var existItem = Gas.LiquidazioneAddizionale.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                //Totale
                if(str.slice(32,33)!=0) {
                    if(!existItem.inner2) {
                    existItem.inner2 =  {
                        key: 'Totali',
                        value: [
                        {
                            Progressivo: Number(str.slice(34,36)),
                            TipoRigo: Number(str.slice(32,33)),
                            Imposta: Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        }
                        ]
                    }
                    }else{
                    var checkTotaliExist = existItem.inner2.value.find(item => (item.Progressivo === Number(str.slice(34,36))));
                    if(!checkTotaliExist) {
                        existItem.inner2.value.push({
                        Progressivo: Number(str.slice(34,36)),
                        TipoRigo: Number(str.slice(32,33)),
                        Imposta: Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        })
                    }
                    }
                }else{
                    
                    var checkExistFather = existItem.inner.value.find(item => (item.Progressivo === Number(str.slice(34,36)) && item.FasciaClimatica == str.slice(33,34) && item.ProgressivoRecord == 0));
                    if(checkExistFather) checkExistFather.Imposta = Number(accounting.formatNumber((Number(checkExistFather.Imposta) + Number(Number(str.slice(60,73))+ '.' +str.slice(73,75))), 2, ",", "."))
                    existItem.inner.value.push({
                    FasciaClimatica : str.slice(33,34),
                    Progressivo: Number(str.slice(34,36)),
                    ProgressivoRecord: Number(str.slice(36,38)),
                    Consumi: Number(str.slice(38,52)),
                    Aliquota: str.slice(52,53)+ '.' +str.slice(53,60),
                    Imposta: Number(str.slice(36,38)) != 0 ? '' : Number(str.slice(60,73))+ '.' +str.slice(73,75)
                    })
                }
                }else{
                if(str.slice(32,33)!=0) {
                    console.log("check if is probably")
                }else{
                    Gas.LiquidazioneAddizionale.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                        key: 'Liquidazione',
                        value: [
                        {
                            FasciaClimatica : str.slice(33,34),
                            Progressivo: Number(str.slice(34,36)),
                            ProgressivoRecord: Number(str.slice(36,38)),
                            Consumi: Number(str.slice(38,52)),
                            Aliquota: str.slice(52,53)+ '.' +str.slice(53,60),
                            Imposta: Number(str.slice(36,38)) != 0 ? '' : Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        }
                        ]
                    }
                    })
                }
                }
                break;
            case '65': 
            var existItem = Gas.RiepilogoSaldoAddizionale.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                Gas.RiepilogoSaldoAddizionale.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
                case '80':  
                var existItem = Gas.ElencoClienti.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                    existItem.inner.value.push({
                    CodiceIdentificativo: array[i].slice(31,42),
                    TipologiaUtilizzoQuadro: array[i].slice(42,43),
                    TipologiaUtilizzoRigo: Number(array[i].slice(43,45)),
                    ModalitaApplicazione: array[i].slice(45,46),
                    PercentualeAForfait: Number(array[i].slice(46,49)),
                    PDR: array[i].slice(65,85).trim(),
                    QuantitaFornita: Number(array[i].slice(85,99)),
                    IndirizzoFornitura: array[i].slice(99,149).trim(),
                    CodiceCatastale: array[i].slice(149,153),
                    ImportoAccisaFornita : Number(array[i].slice(153,165))+ '.' +  array[i].slice(165,167),
                    DataInizio: array[i].slice(49,53) +'-'+ array[i].slice(53,55) + '-' +array[i].slice(55,57),
                    DataFine: array[i].slice(57,61) +'-'+ array[i].slice(61,63) + '-' +array[i].slice(63,65),
                    })
                }else{
                    Gas.ElencoClienti.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                        key: 'Cliente',
                        value: [
                        {
                            CodiceIdentificativo: array[i].slice(31,42),
                            TipologiaUtilizzoQuadro: array[i].slice(42,43),
                            TipologiaUtilizzoRigo: Number(array[i].slice(43,45)),
                            ModalitaApplicazione: array[i].slice(45,46),
                            PercentualeAForfait: Number(array[i].slice(46,49)),
                            PDR: array[i].slice(65,85).trim(),
                            QuantitaFornita: Number(array[i].slice(85,99)),
                            IndirizzoFornitura: array[i].slice(99,149).trim(),
                            CodiceCatastale: array[i].slice(149,153),
                            ImportoAccisaFornita : Number(array[i].slice(153,165))+ '.' +  array[i].slice(165,167),
                            DataInizio: array[i].slice(49,53) +'-'+ array[i].slice(53,55) + '-' +array[i].slice(55,57),
                            DataFine: array[i].slice(57,61) +'-'+ array[i].slice(61,63) + '-' +array[i].slice(63,65),
                        }
                        ]
                    }
                    })
                }
                break;

            case '82':  
            Gas.ElencoPropriFornitori.TipoRecord = str.slice(19,21),
            Gas.ElencoPropriFornitori.Mese = Number(str.slice(21,23)),
            Gas.ElencoPropriFornitori.inner.key = 'Fornitore'
            Gas.ElencoPropriFornitori.inner.value.push({
            Provenienza: str.slice(24,25),
            CodiceIdentificativo: str.slice(25,36),
            Quantita: Number(str.slice(36,49))
            })
            break;
        }
        }
        var starter = builder.create({version: '1.0',encoding:"UTF-8"})
        var root = starter.ele('GasNaturale', {
        'xmlns': 'http://gasnaturale.jaxb.types.controlliEEGN.accise.adm.finanze.it',
        'xmlns:xsi':"http://www.w3.org/2001/XMLSchema-instance",
        'xsi:schemaLocation':"http://gasnaturale.jaxb.types.controlliEEGN.accise.adm.finanze.it schema.xsd"
    });
        for (const [sheet_key, sheet_value] of Object.entries(Gas)) {
        let putInArray = this.checkType(Gas[sheet_key])
        if(sheet_key == 'Anno') root.ele(sheet_key).txt(sheet_value)
        else{
            putInArray.forEach(item => {
            var sheet_key_item = root.ele(sheet_key);
            for (const [element_key, element_value] of Object.entries(item)) {
                if((element_key == 'inner' || element_key == 'inner2') && item[element_key].key){
                let putInArrayValue = this.checkType(item[element_key].value)
                putInArrayValue.forEach(element => {
                    var element_key_item = sheet_key_item.ele(item[element_key].key);
                    for (const [inner_key, inner_value] of Object.entries(element)) {
                    element_key_item.ele(inner_key).txt(inner_value)
                    }
                });
                }else{
                sheet_key_item.ele(element_key).txt(element_value)
                }
            }
            });
        }
        }
        var xml = starter.end({ prettyPrint: true });
        
        await fsExtra.writeFileSync(`${Env.get('AGENZIA_PATH')}/${esitoName}`, xml, 'binary');
        return esitoName
    } catch (error) {
        console.log("erro",error)
        return false        
    }
    }
    
    async multipleEnergia(array,file){
    try {
        const esitoName = 'esito.xml'
        const EnergiaElettrica = {
        Dichiarante: {},
        Anno:{},
        ContatoriProduzione: [],
        ContatoriUsoPromiscuo : [],
        ContatoriConsumiEsentiDaAccisa: [],
        ContatoriConsumiAssoggettatiAdAccisa: [],
        EnergiaElettricaCeduta: [],
        EnergiaElettricaRicevuta: [],
        EnergiaElettricaFatturata : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        Perdite : [],
        ConsumiNonSottopostiAdAccisa: [],
        ConsumiEsentiDaAccisa : [],
        ConsumiAssoggettatiAdAccisa : [],
        RettificheFatturazione: [],
        LiquidazioneAccisa : [],
        RiepilogoSaldoAccisa : [],
        LiquidazioneAddizionale : [],
        RiepilogoSaldoAddizionale: [],
        ElencoClienti: [],
        ElencoPropriFornitori : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        }
        for(let i in array) {
            const str = array[i].replace(/\s/g, '')
            switch(str.slice(19,21)) {
            case '00': 
                EnergiaElettrica.Anno = array[i].slice(15,19),
                EnergiaElettrica.Dichiarante = {
                CodiceDitta: array[i].slice(6,15),
                TipoSoggetto: array[i].slice(25,26),
                // CodiceAttivita: array[i].slice(23,25),
                CodiceAttivita: '',
                Denominazione: array[i].slice(27,87).trim(),
                ComuneSede: array[i].slice(87,132).trim(),
                ProvinciaSede: array[i].slice(132,134).trim(),
                IndirizzoSede: array[i].slice(134,184).trim(),
                ComuneUfficioAmministrativo: array[i].slice(184,229).trim(),
                ProvinciaUfficioAmministrativo: array[i].slice(229,231).trim(),
                IndirizzoUfficioAmministrativo: array[i].slice(231,281).trim(),
                }
                break;
            case '26':  
            if((file) == 'second') 
            {
                EnergiaElettrica.EnergiaElettricaFatturata = []
                continue
            }
                EnergiaElettrica.EnergiaElettricaFatturata.TipoRecord = str.slice(19,21),
                EnergiaElettrica.EnergiaElettricaFatturata.Mese = Number(str.slice(21,23)),
                EnergiaElettrica.EnergiaElettricaFatturata.inner.key = 'ContatoreQuantita'
                //TIPOLOGIA
                if(str.slice(24,25) === '9') {
                //ULTIMO VALORE
                EnergiaElettrica.EnergiaElettricaFatturata.inner.value.push({
                    Matricola: str.slice(24,39),
                    Tipologia: '',
                    CodiceIdentificativo: '',
                    Chilowattora:  Number(str.slice(39,52)),
                    CodiceCatastale : ''
                })
                }else{
                EnergiaElettrica.EnergiaElettricaFatturata.inner.value.push({
                    Matricola: '',
                    Tipologia: str.slice(24,25),
                    CodiceIdentificativo: str.slice(25,36),
                    Chilowattora:  Number(str.slice(36,49)),
                    CodiceCatastale : str.slice(-4)
                })
                }
                break;
            case '41':
                if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
                if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
                var existItem = EnergiaElettrica.ConsumiEsentiDaAccisa.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25))));
                if(existItem){
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                    NumeroUtenze: Number(str.slice(42,50)),
                    ConsumiUsiCommerciali: Number(str.slice(50,64))
                })
                }else{
                EnergiaElettrica.ConsumiEsentiDaAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    inner: {
                    key: 'Consumi',
                    value: [
                        {
                        Progressivo: Number(str.slice(26,28)),
                        ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                        NumeroUtenze: Number(str.slice(42,50)),
                        ConsumiUsiCommerciali: Number(str.slice(50,64))
                        }
                    ]
                    }
                })
                }
                break;
            case '42':  
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
                var existItem = EnergiaElettrica.ConsumiAssoggettatiAdAccisa.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4)));
                if(existItem){
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                    NumeroUtenze: Number(str.slice(42,50)),
                    ConsumiUsiCommerciali: Number(str.slice(50,64))
                })
                }else{
                EnergiaElettrica.ConsumiAssoggettatiAdAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    inner: {
                    key: 'Consumi',
                    value: [
                        {
                        Progressivo: Number(str.slice(26,28)),
                        ConsumiUsiPropri: Number(str.slice(29,42)) == 0 ? '' : Number(str.slice(29,42)),
                        NumeroUtenze: Number(str.slice(42,50)),
                        ConsumiUsiCommerciali: Number(str.slice(50,64))
                        }
                    ]
                    }
                })
                }
                break;
            case '51':
                if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
                if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue   
            var existItem = EnergiaElettrica.LiquidazioneAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,34)),
                    TipoRigo: str.slice(34,35),
                    ProgressivoRecord: Number(str.slice(35,37)),
                    Consumi: Number(str.slice(37,51)),
                    Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                    Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                })
                }else{
                EnergiaElettrica.LiquidazioneAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    // Mese : 1,
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    inner: {
                    key: 'Liquidazione',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,34)),
                        TipoRigo: str.slice(34,35),
                        ProgressivoRecord: Number(str.slice(35,37)),
                        Consumi: Number(str.slice(37,51)),
                        Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                        Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                        }
                    ]
                    }
                })
                }
                break;
            case '61': 
                if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
                if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue  
            var existItem = EnergiaElettrica.RiepilogoSaldoAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                EnergiaElettrica.RiepilogoSaldoAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    'ConguaglioRatealeDL34-2020': 'SI',
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
            case '82':  
            if((file) == 'second') {
                EnergiaElettrica.ElencoPropriFornitori = []
                continue
            }
                EnergiaElettrica.ElencoPropriFornitori.TipoRecord = str.slice(19,21),
                EnergiaElettrica.ElencoPropriFornitori.Mese = Number(str.slice(21,23)),
                EnergiaElettrica.ElencoPropriFornitori.inner.key = 'Fornitore'
                EnergiaElettrica.ElencoPropriFornitori.inner.value.push({
                Provenienza: str.slice(24,25),
                CodiceIdentificativo: str.slice(25,36),
                Quantita: Number(str.slice(36,49))
                })
                break;
            // default: 
            }
        }
        var starter = builder.create({version: '1.0',encoding:"UTF-8"})
        var root = starter.ele('EnergiaElettrica', {
        'xmlns': 'http://energiaelettrica.jaxb.types.controlliEEGN.accise.adm.finanze.it',
        'xmlns:xsi':"http://www.w3.org/2001/XMLSchema-instance",
        'xsi:schemaLocation':"http://energiaelettrica.jaxb.types.controlliEEGN.accise.adm.finanze.it schema.xsd"
        });
        for (const [sheet_key, sheet_value] of Object.entries(EnergiaElettrica)) {
        let putInArray = this.checkType(EnergiaElettrica[sheet_key])
        if(sheet_key == 'Anno') root.ele(sheet_key).txt(sheet_value)
        else{
            putInArray.forEach(item => {
            var sheet_key_item = root.ele(sheet_key);
            for (const [element_key, element_value] of Object.entries(item)) {
                if(element_key == 'inner' && item[element_key].key){
                let putInArrayValue = this.checkType(item[element_key].value)
                putInArrayValue.forEach(element => {
                    var element_key_item = sheet_key_item.ele(item[element_key].key);
                    for (const [inner_key, inner_value] of Object.entries(element)) {
                    element_key_item.ele(inner_key).txt(inner_value)
                    }
                });
                }else{
                sheet_key_item.ele(element_key).txt(element_value)
                }
            }
            });
        }
        }
        var xml = starter.end({ prettyPrint: true });
        // let buff = new Buffer(xml);
        // let base64data = buff.toString('base64');
        // return base64data
        await fsExtra.writeFileSync(`${Env.get('AGENZIA_PATH')}/${esitoName}`, xml, 'binary');
        return esitoName
    } catch (error) {
        console.log("error",error)
        return false
    }
    }
    
    async multipleGas(array,file){
    try {
        const esitoName = 'esito.xml'
        const Gas = {
        Dichiarante: {},
        Anno:{},
        Introdotto: [],
        Estratto: [],
        Venduto: { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        FatturatoImpiegatoSenzaAccisa : [],
        FatturatoImpiegatoFasceClimatiche : [],
        FatturatoImpiegatoTotale: [],
        RettificheFatturazione: [],
        LiquidazioneAccisa : [],
        RiepilogoSaldoAccisa : [],
        LiquidazioneAddizionale : [],
        RiepilogoSaldoAddizionale: [],
        LiquidazioneImpostaSostitutiva : [],
        RiepilogoSaldoImpostaSostitutiva: [],
        ElencoClienti: [],
        ElencoPropriFornitori : { TipoRecord: '', Mese : '', inner: { key: '', value: [] }},
        }
        for(let i in array) {
        const str = array[i].replace(/\s/g, '')
        switch(str.slice(19,21)) {
            case '00': 
                Gas.Anno = array[i].slice(15,19),
                Gas.Dichiarante = {
                CodiceDitta: array[i].slice(6,15),
                TipoSoggetto: array[i].slice(25,26),
                // CodiceAttivita: array[i].slice(23,25),
                CodiceAttivita: '01',
                Denominazione: array[i].slice(27,87).trim(),
                ComuneSede: array[i].slice(87,132).trim(),
                ProvinciaSede: array[i].slice(132,134).trim(),
                IndirizzoSede: array[i].slice(134,184).trim(),
                ComuneUfficioAmministrativo: array[i].slice(184,229).trim(),
                ProvinciaUfficioAmministrativo: array[i].slice(229,231).trim(),
                IndirizzoUfficioAmministrativo: array[i].slice(231,281).trim(),
            }
            break;
            case '16': 
            if((file) == 'second') 
            {
            Gas.Venduto = []
            continue
            }
            Gas.Venduto.TipoRecord = str.slice(19,21),
                Gas.Venduto.Mese = Number(str.slice(21,23)),
                Gas.Venduto.inner.key = 'EstrattoVenduto'
                if(str.slice(24,25) === '9') {
                Gas.Venduto.inner.value.push({
                    TipoRigo: str.slice(24,25),
                    Tipologia: '',
                    CodiceIdentificativo: '',
                    MetriCubi: Number(str.slice(25,38)),
                    CodiceCatastale : '',
                })
                }else{
                Gas.Venduto.inner.value.push({
                    TipoRigo: str.slice(24,25),
                    Tipologia: str.slice(25,26),
                    CodiceIdentificativo: str.slice(26,37),
                    MetriCubi: Number(str.slice(37,50)),
                    CodiceCatastale : str.slice(-4),
                })
                }
            break;
            case '31': 
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
            let excludeArray = ['tn','go','ud','pa','ag','cl','me','ao','pn','sr','en','rg','ct','ts','tp','bz']
            if(!(excludeArray.includes(str.slice(21,23).toLowerCase()))) {
                var existItem = Gas.FatturatoImpiegatoFasceClimatiche.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25)) && item.FasciaClimatica === str.slice(26,27)));
                if(existItem){
                var checkExistFather = existItem.inner.value.find(item => (item.Progressivo == Number(str.slice(27,29))));
                if(checkExistFather){
                    checkExistFather.NumeroUtenze +=  Number(str.slice(29,37))
                    checkExistFather.Quantita += Number(str.slice(37,51))
                }
                else{
                    existItem.inner.value.push({
                    Progressivo: Number(str.slice(27,29)),
                    NumeroUtenze: Number(str.slice(29,37)),
                    Quantita: Number(str.slice(37,51))
                    })
                } 
                }else{
                Gas.FatturatoImpiegatoFasceClimatiche.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    CodiceCatastale : str.slice(-4),
                    Mese : Number(str.slice(23,25)),
                    FasciaClimatica : str.slice(26,27),
                    inner: {
                    key: 'FatturatoImpiegato',
                    value: [
                        {
                        Progressivo: Number(str.slice(27,29)),
                        NumeroUtenze: Number(str.slice(29,37)),
                        Quantita: Number(str.slice(37,51))
                        }
                    ]
                    }
                })
                }
            }
            break;
            case '32': 
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
            var existItem = Gas.FatturatoImpiegatoTotale.find(item => (item.Provincia === str.slice(21,23) && item.CodiceCatastale === str.slice(-4) && item.Mese === Number(str.slice(23,25))));
            if(existItem){
                var checkExistFather = existItem.inner.value.find(item => (item.Progressivo == Number(str.slice(26,28))));
                if(checkExistFather){
                checkExistFather.NumeroUtenze +=  Number(str.slice(28,36))
                checkExistFather.Quantita += Number(str.slice(36,50))
                }
                else{
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(26,28)),
                    NumeroUtenze: Number(str.slice(28,36)),
                    Quantita: Number(str.slice(36,50))
                })
                }
            }else{
                Gas.FatturatoImpiegatoTotale.push({
                TipoRecord : str.slice(19,21),
                Provincia : str.slice(21,23),
                CodiceCatastale : str.slice(-4),
                Mese : Number(str.slice(23,25)),
                inner: {
                    key: 'FatturatoImpiegato',
                    value: [
                    {
                        Progressivo: Number(str.slice(26,28)),
                        NumeroUtenze: Number(str.slice(28,36)),
                        Quantita: Number(str.slice(36,50))
                    }
                    ]
                }
                })
            }
            break;
            case '50':  
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
            var existItem = Gas.LiquidazioneAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
            if(existItem) {
                existItem.inner.value.push({
                Progressivo: Number(str.slice(33,35)),
                TipoRigo: str.slice(32,33),
                ProgressivoRecord: Number(str.slice(35,37)),
                Consumi: Number(str.slice(37,51)),
                Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                })
            }else{
                Gas.LiquidazioneAccisa.push({
                TipoRecord : str.slice(19,21),
                Provincia : str.slice(21,23),
                Mese : Number(str.slice(23,25)),
                CapitoloImputazione : str.slice(26,30),
                ArticoloCapitolo : str.slice(30,32),
                inner: {
                    key: 'Liquidazione',
                    value: [
                    {
                        Progressivo: Number(str.slice(33,35)),
                        TipoRigo: str.slice(32,33),
                        ProgressivoRecord: Number(str.slice(35,37)),
                        Consumi: Number(str.slice(37,51)),
                        Aliquota: str.slice(51,52)+ '.' +str.slice(52,59),
                        Imposta: Number(str.slice(59,72))+ '.' +str.slice(72,74)
                    }
                    ]
                }
                })
            }
            break;
            case '55':  
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
            var existItem = Gas.RiepilogoSaldoAccisa.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25)) && item.CapitoloImputazione === str.slice(26,30)));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                Gas.RiepilogoSaldoAccisa.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    CapitoloImputazione : str.slice(26,30),
                    ArticoloCapitolo : str.slice(30,32),
                    // ArticoloCapitolo : '01',
                    'ConguaglioRatealeDL34-2020': 'SI',
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
            case '60':  
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
            var existItem = Gas.LiquidazioneAddizionale.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                //Totale
                if(str.slice(32,33)!=0) {
                    if(!existItem.inner2) {
                    existItem.inner2 =  {
                        key: 'Totali',
                        value: [
                        {
                            Progressivo: Number(str.slice(34,36)),
                            TipoRigo: Number(str.slice(32,33)),
                            Imposta: Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        }
                        ]
                    }
                    }else{
                    var checkTotaliExist = existItem.inner2.value.find(item => (item.Progressivo === Number(str.slice(34,36))));
                    if(!checkTotaliExist) {
                        existItem.inner2.value.push({
                        Progressivo: Number(str.slice(34,36)),
                        TipoRigo: Number(str.slice(32,33)),
                        Imposta: Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        })
                    }
                    }
                }else{
                    
                    var checkExistFather = existItem.inner.value.find(item => (item.Progressivo === Number(str.slice(34,36)) && item.FasciaClimatica == str.slice(33,34) && item.ProgressivoRecord == 0));
                    if(checkExistFather) checkExistFather.Imposta = Number(accounting.formatNumber((Number(checkExistFather.Imposta) + Number(Number(str.slice(60,73))+ '.' +str.slice(73,75))), 2, ",", "."))
                    existItem.inner.value.push({
                    FasciaClimatica : str.slice(33,34),
                    Progressivo: Number(str.slice(34,36)),
                    ProgressivoRecord: Number(str.slice(36,38)),
                    Consumi: Number(str.slice(38,52)),
                    Aliquota: str.slice(52,53)+ '.' +str.slice(53,60),
                    Imposta: Number(str.slice(36,38)) != 0 ? '' : Number(str.slice(60,73))+ '.' +str.slice(73,75)
                    })
                }
                }else{
                if(str.slice(32,33)!=0) {
                    console.log("check if is probably")
                }else{
                    Gas.LiquidazioneAddizionale.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                        key: 'Liquidazione',
                        value: [
                        {
                            FasciaClimatica : str.slice(33,34),
                            Progressivo: Number(str.slice(34,36)),
                            ProgressivoRecord: Number(str.slice(36,38)),
                            Consumi: Number(str.slice(38,52)),
                            Aliquota: str.slice(52,53)+ '.' +str.slice(53,60),
                            Imposta: Number(str.slice(36,38)) != 0 ? '' : Number(str.slice(60,73))+ '.' +str.slice(73,75)
                        }
                        ]
                    }
                    })
                }
                }
                break;
            case '65': 
            if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
            if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue  
            var existItem = Gas.RiepilogoSaldoAddizionale.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                existItem.inner.value.push({
                    Progressivo: Number(str.slice(32,35)),
                    Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                })
                }else{
                Gas.RiepilogoSaldoAddizionale.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                    key: 'RiepilogoSaldo',
                    value: [
                        {
                        Progressivo: Number(str.slice(32,35)),
                        Importo : Number(str.slice(35,48))+ '.' +  str.slice(48,50)
                        }
                    ]
                    }
                })
                }
                break;
                case '80':  
                if((file) == 'first' && !!str.slice(21,23)  && str.slice(21,23).charAt() > 'M') continue
                if((file) == 'second' && !!str.slice(21,23) && str.slice(21,23).charAt() <= 'M') continue 
                var existItem = Gas.ElencoClienti.find(item => (item.Provincia === str.slice(21,23) && item.Mese === Number(str.slice(23,25))));
                if(existItem) {
                    existItem.inner.value.push({
                    CodiceIdentificativo: array[i].slice(31,42),
                    TipologiaUtilizzoQuadro: array[i].slice(42,43),
                    TipologiaUtilizzoRigo: Number(array[i].slice(43,45)),
                    ModalitaApplicazione: array[i].slice(45,46),
                    PercentualeAForfait: Number(array[i].slice(46,49)),
                    PDR: array[i].slice(65,85).trim(),
                    QuantitaFornita: Number(array[i].slice(85,99)),
                    IndirizzoFornitura: array[i].slice(99,149).trim(),
                    CodiceCatastale: array[i].slice(149,153),
                    ImportoAccisaFornita : Number(array[i].slice(153,165))+ '.' +  array[i].slice(165,167),
                    DataInizio: array[i].slice(49,53) +'-'+ array[i].slice(53,55) + '-' +array[i].slice(55,57),
                    DataFine: array[i].slice(57,61) +'-'+ array[i].slice(61,63) + '-' +array[i].slice(63,65),
                    })
                }else{
                    Gas.ElencoClienti.push({
                    TipoRecord : str.slice(19,21),
                    Provincia : str.slice(21,23),
                    Mese : Number(str.slice(23,25)),
                    inner: {
                        key: 'Cliente',
                        value: [
                        {
                            CodiceIdentificativo: array[i].slice(31,42),
                            TipologiaUtilizzoQuadro: array[i].slice(42,43),
                            TipologiaUtilizzoRigo: Number(array[i].slice(43,45)),
                            ModalitaApplicazione: array[i].slice(45,46),
                            PercentualeAForfait: Number(array[i].slice(46,49)),
                            PDR: array[i].slice(65,85).trim(),
                            QuantitaFornita: Number(array[i].slice(85,99)),
                            IndirizzoFornitura: array[i].slice(99,149).trim(),
                            CodiceCatastale: array[i].slice(149,153),
                            ImportoAccisaFornita : Number(array[i].slice(153,165))+ '.' +  array[i].slice(165,167),
                            DataInizio: array[i].slice(49,53) +'-'+ array[i].slice(53,55) + '-' +array[i].slice(55,57),
                            DataFine: array[i].slice(57,61) +'-'+ array[i].slice(61,63) + '-' +array[i].slice(63,65),
                        }
                        ]
                    }
                    })
                }
                break;

            case '82':  
            if((file) == 'second') {
                Gas.ElencoPropriFornitori = []
                continue
            }
            Gas.ElencoPropriFornitori.TipoRecord = str.slice(19,21),
            Gas.ElencoPropriFornitori.Mese = Number(str.slice(21,23)),
            Gas.ElencoPropriFornitori.inner.key = 'Fornitore'
            Gas.ElencoPropriFornitori.inner.value.push({
            Provenienza: str.slice(24,25),
            CodiceIdentificativo: str.slice(25,36),
            Quantita: Number(str.slice(36,49))
            })
            break;
        }
        }
        var starter = builder.create({version: '1.0',encoding:"UTF-8"})
        var root = starter.ele('GasNaturale', {
        'xmlns': 'http://gasnaturale.jaxb.types.controlliEEGN.accise.adm.finanze.it',
        'xmlns:xsi':"http://www.w3.org/2001/XMLSchema-instance",
        'xsi:schemaLocation':"http://gasnaturale.jaxb.types.controlliEEGN.accise.adm.finanze.it schema.xsd"
    });
        for (const [sheet_key, sheet_value] of Object.entries(Gas)) {
        let putInArray = this.checkType(Gas[sheet_key])
        if(sheet_key == 'Anno') root.ele(sheet_key).txt(sheet_value)
        else{
            putInArray.forEach(item => {
            var sheet_key_item = root.ele(sheet_key);
            for (const [element_key, element_value] of Object.entries(item)) {
                if((element_key == 'inner' || element_key == 'inner2') && item[element_key].key){
                let putInArrayValue = this.checkType(item[element_key].value)
                putInArrayValue.forEach(element => {
                    var element_key_item = sheet_key_item.ele(item[element_key].key);
                    for (const [inner_key, inner_value] of Object.entries(element)) {
                    element_key_item.ele(inner_key).txt(inner_value)
                    }
                });
                }else{
                sheet_key_item.ele(element_key).txt(element_value)
                }
            }
            });
        }
        }
        var xml = starter.end({ prettyPrint: true });
        
        await fsExtra.writeFileSync(`${Env.get('AGENZIA_PATH')}/${esitoName}`, xml, 'binary');
        return esitoName
    } catch (error) {
        console.log("erro",error)
        return false        
    }
    }
}

module.exports = AgenziaDoganeController

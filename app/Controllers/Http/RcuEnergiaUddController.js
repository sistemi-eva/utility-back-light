"use strict";
const mkdirp = require("mkdirp");
const Env = use("Env");
const fsExtra = require("fs");
const fs = require("fs").promises;
const Token = use("App/Models/Token");
const Database = use("Database");
const createCsvStringifier = require("csv-writer").createObjectCsvStringifier;
const Json2csvParser = require("json2csv").Parser;
const moment = require("moment");
const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const mesiDispacciamento = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const Redis = use("Redis");
const name_controller = "RcuEnergiaUddController";

const table = [
  "COD_POD",
  "AREA_RIF",
  "RAGIONE_SOCIALE_DISTR",
  "PIVA_DISTR",
  "DP",
  "RAGIONE_SOCIALE_UDD",
  "PIVA_UDD",
  "RAGIONE_SOCIALE_CC",
  "PIVA_CC",
  "TIPO_POD",
  "FINE_TIPO_POD",
  "DATA_INIZIO_FORNITURA",
  "DATA_FINE_FORNITURA",
  "DATA_INIZIO_DISPACCIAMENTO",
  "CF",
  "PIVA",
  "NOME",
  "COGNOME",
  "RAGIONE_SOCIALE_DENOMINAZIONE",
  "RESIDENZA",
  "SERVIZIO_TUTELA",
  "TENSIONE",
  "DISALIMENTABILITA",
  "TARIFFA_DISTRIBUZIONE",
  "TIPO_MISURATORE",
  "POTCONTRIMP",
  "POTDISP",
  "CONSUMO_TOT",
  "TRATTAMENTO",
  "TRATTAMENTO_SUCC",
  "REGIME_COMPENSAZIONE",
  "BF_DATA_INIZIO",
  "BF_DATA_FINE",
  "BF_DATA_RINNOVO",
  "BE_DATA_INIZIO",
  "BE_DATA_FINE",
  "BE_DATA_RINNOVO",
  "COMUNIC_BONUS",
  "K_TRASFOR_ATT",
  "MAT_MISURATORE_ATT",
  "PMA",
  "TIPO_MERCATO",
  "DATA_DECORRENZA_RET",
  "EMAIL_CLIENTE",
  "TELEFONO_CLIENTE",
  "COD_OFFERTA",
  "AUTOCERTIFICAZIONE",
  "DATA_MESSA_REGIME",
  "MOTIVAZIONE",
  "BE_ANNO_VALIDITA",
  "BE_DATA_CESSAZIONE",
];

const NotNull = ["COD_POD", "RAGIONE_SOCIALE_UDD", "CONSUMO_TOT"];

let month = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
  11: 0,
  12: 0,
};

class RcuEnergiaUddController {
  async statusCache({ response, request }) {
    try {
      let tenant = request.headers().tenant_ee;
      let query = await Database.connection("rcu").raw(`select "MESE","ANNO" from ${tenant}.ee_udd ec order by "ANNO" desc,"MESE" desc limit 1 `);
      let RedisController = use(`App/Controllers/Http/RedisRouteController`);
      const RedisClass = new RedisController();
      let final_value = await RedisClass.statusCache(tenant, name_controller, query.rows[0].MESE, query.rows[0].ANNO);
      return response.send({ status: "success", data: final_value, message: `` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async refreshCache({ response, request }) {
    try {
      let tenant = request.headers().tenant_ee;
      let query = await Database.connection("rcu").raw(`select "MESE","ANNO" from ${tenant}.ee_udd ec order by "ANNO" desc,"MESE" desc limit 1 `);
      if (query.rows.length > 0) {
        let RedisController = use(`App/Controllers/Http/RedisRouteController`);
        const RedisClass = new RedisController();
        RedisClass.updateCacheImport(tenant, name_controller, query.rows[0].MESE, query.rows[0].ANNO);
      }
      return response.send({ status: "success", data: "", message: `Creazione Cache avviata ` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async deleteCache({ response, request }) {
    try {
      let tenant = request.headers().tenant_ee;
      let RedisController = use(`App/Controllers/Http/RedisRouteController`);
      const RedisClass = new RedisController();
      await RedisClass.deleteKeys(tenant, name_controller);
      return response.send({ status: "success", data: "", message: `Cache Eliminata avviata ` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async getLastImport({ request, response }) {
    try {
      let query = await Database.connection("rcu").raw(`select "MESE","ANNO" from ${request.headers().tenant_ee}.ee_udd ec order by "ANNO" desc,"MESE" desc limit 1 `);
      return response.send({ status: "success", data: query.rows, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async deleteRowField({ response, request }) {
    const trx = await Database.connection("rcu").beginTransaction();
    try {
      const key_code = request.header("Secret-Key");
      var tokenUser = await Token.query().where("token", "=", key_code).first();
      var { id } = request.all();
      await trx
        .table(request.headers().tenant_ee + ".ee_udd")
        .where("ee_udd_histories_id", id)
        .delete();
      await trx.table(`${request.headers().tenant_ee}.ee_udd_histories`).where("id", id).update({ deleted: true, delete_owner: tokenUser.username, delete_owner_ip: tokenUser.ip_address });
      await trx.commit();
      return response.send({ status: "success", data: await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).where("deleted", false).orderBy("created_at", "desc"), message: null });
    } catch (error) {
      trx.rollback;
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async csvItemDatabase({ response, request }) {
    try {
      const { id, mese, anno } = request.all();
      let jsonData = null;
      if (id) {
        jsonData = await Database.connection("rcu").raw(
          `select left("COD_POD",14)as "COD_POD" ,"AREA_RIF","RAGIONE_SOCIALE_DISTR","PIVA_DISTR","DP","RAGIONE_SOCIALE_UDD","PIVA_UDD",
          "RAGIONE_SOCIALE_CC","PIVA_CC","TIPO_POD","FINE_TIPO_POD","DATA_INIZIO_FORNITURA","DATA_FINE_FORNITURA",
          "DATA_INIZIO_DISPACCIAMENTO","CF","PIVA","NOME","COGNOME","RAGIONE_SOCIALE_DENOMINAZIONE","RESIDENZA","SERVIZIO_TUTELA",
          "TENSIONE","DISALIMENTABILITA","TARIFFA_DISTRIBUZIONE","TIPO_MISURATORE","POTCONTRIMP","POTDISP","CONSUMO_TOT","TRATTAMENTO",
          "TRATTAMENTO_SUCC","REGIME_COMPENSAZIONE","BF_DATA_INIZIO","BF_DATA_FINE","BF_DATA_RINNOVO","BE_DATA_INIZIO",
          "BE_DATA_FINE","BE_DATA_RINNOVO","COMUNIC_BONUS","K_TRASFOR_ATT","MAT_MISURATORE_ATT","PMA","TIPO_MERCATO",
          "DATA_DECORRENZA_RET","EMAIL_CLIENTE","TELEFONO_CLIENTE","COD_OFFERTA","AUTOCERTIFICAZIONE","DATA_MESSA_REGIME","MOTIVAZIONE","BE_ANNO_VALIDITA",
          "BE_DATA_CESSAZIONE" from ${request.headers().tenant_ee}.ee_udd where ee_udd_histories_id = ? 
          `,
          [id]
        );
      } else {
        jsonData = await Database.connection("rcu").raw(
          `select left("COD_POD",14)as "COD_POD" ,"AREA_RIF","RAGIONE_SOCIALE_DISTR","PIVA_DISTR","DP","RAGIONE_SOCIALE_UDD","PIVA_UDD",
          "RAGIONE_SOCIALE_CC","PIVA_CC","TIPO_POD","FINE_TIPO_POD","DATA_INIZIO_FORNITURA","DATA_FINE_FORNITURA",
          "DATA_INIZIO_DISPACCIAMENTO","CF","PIVA","NOME","COGNOME","RAGIONE_SOCIALE_DENOMINAZIONE","RESIDENZA","SERVIZIO_TUTELA",
          "TENSIONE","DISALIMENTABILITA","TARIFFA_DISTRIBUZIONE","TIPO_MISURATORE","POTCONTRIMP","POTDISP","CONSUMO_TOT","TRATTAMENTO",
          "TRATTAMENTO_SUCC","REGIME_COMPENSAZIONE","BF_DATA_INIZIO","BF_DATA_FINE","BF_DATA_RINNOVO","BE_DATA_INIZIO",
          "BE_DATA_FINE","BE_DATA_RINNOVO","COMUNIC_BONUS","K_TRASFOR_ATT","MAT_MISURATORE_ATT","PMA","TIPO_MERCATO",
          "DATA_DECORRENZA_RET","EMAIL_CLIENTE","TELEFONO_CLIENTE","COD_OFFERTA","AUTOCERTIFICAZIONE","DATA_MESSA_REGIME","MOTIVAZIONE","BE_ANNO_VALIDITA",
          "BE_DATA_CESSAZIONE" from ${request.headers().tenant_ee}.ee_udd where  "MESE" = ? and "ANNO" = ?
          `,
          [mese, anno]
        );
      }
      if (jsonData.rows.length > 0) {
        const json2csvParser = new Json2csvParser({ header: true, delimiter: ";" });
        const csv = await json2csvParser.parse(jsonData.rows);
        return csv;
      } else throw {};
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async createTotal(value) {
    const queryBuilder = {};
    const totale = JSON.parse(JSON.stringify(month));
    //Creao tutti i mesi per i Fornitori
    for (let i in value) {
      queryBuilder[value[i].RAGIONE_SOCIALE_CC] = JSON.parse(JSON.stringify(month));
    }
    for (let i in value) {
      let valueFornitore = value[i].RAGIONE_SOCIALE_CC;
      let valueMonth = value[i].MESE;
      let valueTotal = value[i].totale ? value[i].totale : value[i].TOTALE ? value[i].TOTALE : 0;
      queryBuilder[valueFornitore][valueMonth] = Number(valueTotal).toFixed(2).toString().replace(".", ",");
      totale[valueMonth] += Number(valueTotal);
    }
    for (var [key, value] of Object.entries(totale)) {
      totale[key] = Number(value).toFixed(2).toString().replace(".", ",");
    }
    return { fornitori: queryBuilder, totale };
  }

  async checkSintesi({ response, request }) {
    try {
      const { anno, mese } = request.all();
      let find = Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).where("deleted", false);
      if (anno) find.where("anno", anno);
      if (mese) find.where("mese", mese);
      find = await find.first();
      if (find) return response.send({ status: "success", data: find, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
      return response.status(422).send({ status: "success", data: [], message: `Non è stata trovata alcun importazione per la combinazione di date inserite` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _setTableIncAnnuale(getTotalForFornitore, anno) {
    try {
      const queryBuilder = [];
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_CC)));
      for (let i in fornitori) {
        queryBuilder.push({ societa: fornitori[i], mesi: { ...month }, diff: {}, mese_anno_precedente: 0 });
      }
      for (let i in getTotalForFornitore) {
        for (let b in queryBuilder) {
          if (queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_CC) {
            let totale = getTotalForFornitore[i].totale ? getTotalForFornitore[i].totale : getTotalForFornitore[i].TOTALE ? getTotalForFornitore[i].TOTALE : 0;
            if (getTotalForFornitore[i].ANNO == anno) {
              queryBuilder[b].mesi[getTotalForFornitore[i].MESE] = Number(totale);
            } else if (getTotalForFornitore[i].MESE == "12" && getTotalForFornitore[i].ANNO == anno - 1) queryBuilder[b].mese_anno_precedente = totale;
          }
        }
      }
      for (let i in queryBuilder) {
        for (const [key, value] of Object.entries(queryBuilder[i].mesi)) {
          if (queryBuilder[i].mesi[key - 1] != undefined && value != 0) {
            queryBuilder[i].diff[key] = Number(queryBuilder[i].mesi[key] - queryBuilder[i].mesi[key - 1]).toFixed(2);
          } else {
            if (key == 1 && queryBuilder[i].mese_anno_precedente != 0) {
              queryBuilder[i].diff[key] = Number(queryBuilder[i].mesi[key] - queryBuilder[i].mese_anno_precedente).toFixed(2);
            } else queryBuilder[i].diff[key] = 0;
          }
        }
        let tempDiff = queryBuilder[i].diff;
        queryBuilder[i] = { societa: queryBuilder[i].societa, ...tempDiff };
      }
      return queryBuilder;
    } catch (error) {
      console.log("_setTableIncAnnuale", error);
    }
  }

  async _setTableAnnuale(getTotalForFornitore) {
    try {
      const queryBuilder = [];
      let fornitori = Array.from(new Set(getTotalForFornitore.map((item) => item.RAGIONE_SOCIALE_CC)));
      for (let i in fornitori) {
        queryBuilder.push({ societa: fornitori[i], ...month });
      }
      for (let i in getTotalForFornitore) {
        for (let b in queryBuilder) {
          if (queryBuilder[b].societa == getTotalForFornitore[i].RAGIONE_SOCIALE_CC) {
            let totale = getTotalForFornitore[i].totale ? getTotalForFornitore[i].totale : getTotalForFornitore[i].TOTALE ? getTotalForFornitore[i].TOTALE : 0;
            queryBuilder[b][getTotalForFornitore[i].MESE] = totale;
          }
        }
      }
      return queryBuilder;
    } catch (error) {
      console.log("errore", error);
    }
  }

  async tableIncPod({ request, response }) {
    try {
      const { anno } = request.all();
      let getTotalForFornitore = await Database.connection("rcu").raw(
        `select "RAGIONE_SOCIALE_CC" , count("RAGIONE_SOCIALE_CC") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_ee}.ee_udd fr  where "ANNO" = ? or 
      ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_CC" in (select distinct("RAGIONE_SOCIALE_CC") from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ?))
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_CC" order by "MESE", "RAGIONE_SOCIALE_CC" `,
        [anno, anno - 1, anno]
      );
      getTotalForFornitore = getTotalForFornitore.rows;
      const queryBuilder = await this._setTableIncAnnuale(getTotalForFornitore, anno);
      return response.send({ status: "success", data: queryBuilder, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tableIncVolumi({ request, response }) {
    try {
      const { anno } = request.all();
      let getTotalForFornitore = await Database.connection("rcu").raw(
        `select "RAGIONE_SOCIALE_CC","MESE","ANNO",coalesce(ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2),0) as TOTALE 
      from ${request.headers().tenant_ee}.ee_udd where "ANNO" = ? 
      or ("ANNO" = ? and "MESE" = '12' and "RAGIONE_SOCIALE_CC" in (select distinct("RAGIONE_SOCIALE_CC") from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ?)) group by "RAGIONE_SOCIALE_CC","MESE","ANNO" order by "MESE", "RAGIONE_SOCIALE_CC"`,
        [anno, anno - 1, anno]
      );
      getTotalForFornitore = getTotalForFornitore.rows;
      const queryBuilder = await this._setTableIncAnnuale(getTotalForFornitore, anno);
      return response.send({ status: "success", data: queryBuilder, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tableVolumiAnnuale({ request, response }) {
    try {
      const { anno } = request.all();
      let getTotalForFornitore = await Database.connection("rcu").raw(`select "RAGIONE_SOCIALE_CC","MESE",coalesce(ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd where "ANNO" = ? group by "RAGIONE_SOCIALE_CC","MESE" order by "MESE", "RAGIONE_SOCIALE_CC"`, [anno]);
      getTotalForFornitore = getTotalForFornitore.rows;
      const queryBuilder = await this._setTableAnnuale(getTotalForFornitore);
      return response.send({ status: "success", data: queryBuilder, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tablePodAnnuale({ request, response }) {
    try {
      const { anno } = request.all();
      let getTotalForFornitore = await Database.connection("rcu").raw(
        `select "RAGIONE_SOCIALE_CC" , count("RAGIONE_SOCIALE_CC") as totale ,"MESE" ,"ANNO" from ${request.headers().tenant_ee}.ee_udd fr  where "ANNO" = ? 
      group by "MESE" ,"ANNO","RAGIONE_SOCIALE_CC" order by "MESE", "RAGIONE_SOCIALE_CC" `,
        [anno]
      );
      getTotalForFornitore = getTotalForFornitore.rows;
      const queryBuilder = await this._setTableAnnuale(getTotalForFornitore);
      return response.send({ status: "success", data: queryBuilder, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async RagioneSocialeCC({ request, response }) {
    try {
      const societa = await Database.connection("rcu")
        .table(request.headers().tenant_ee + ".ee_udd")
        .distinct("RAGIONE_SOCIALE_CC");
      return response.send({ status: "success", data: societa, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoTotaleDetailPerditaPod({ request, response }) {
    try {
      const { mese, anno } = request.all();
      let currentDate = `${anno}-${mese}-01`;

      let prevMonth = mese - 1;
      let prevYear = anno;
      if (mese == 1) {
        prevMonth = 12;
        prevYear = anno - 1;
      }
      let finalValue = {};
      let query = await Database.connection("rcu").raw(
        `select count(distinct(left("COD_POD",14))) as totale,"MESE","ANNO" from ${request.headers().tenant_ee}.ee_udd ec 
      where 
      left("COD_POD",14) in 
        (
          select distinct(left("COD_POD",14)) as COD_POD from ${request.headers().tenant_ee}.ee_udd fr2 
          where "ANNO" = ? and "MESE" = ? 
          and left("COD_POD",14) not in (select left("COD_POD",14) from ${request.headers().tenant_ee}.ee_udd fr2 
          where "MESE" = ? and "ANNO" = ?)
        ) and to_date(concat("ANNO","MESE"),'yyyymm') >= ?
      group by ec."ANNO",ec."MESE"  order by "ANNO","MESE" `,
        [anno, mese, prevMonth, prevYear, currentDate]
      );
      let totale = [];
      if (query.rows.length > 0) {
        for (let i = query.rows.length - 1; i >= 0; i--) {
          if (i != 0) {
            totale.push({
              x: `${mesiDispacciamento[query.rows[i].MESE - 1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y: query.rows[i].totale,
              percTA: `[T-${i}]: (${(((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100 - ((query.rows[i - 1].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2)}%)`,
              percMensile: (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2),
              percAnnuale: (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2),
            });
          } else {
            totale.push({
              x: `${mesiDispacciamento[query.rows[i].MESE - 1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y: query.rows[i].totale,
              percTA: `[T-${i}]: (0%)`,
              percMensile: 0,
              percAnnuale: 0,
            });
          }
        }
        finalValue.series = [{ name: "POD", data: totale.reverse() }];
      }
      return response.send({ status: "success", data: finalValue, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tableBonusInformation({ request, response }) {
    try {
      const { anno, mese } = request.all();
      const query = await Database.connection("rcu").raw(
        `select count(distinct"COD_POD") as pod,"REGIME_COMPENSAZIONE" as bonus_tipo
      from ${request.headers().tenant_ee}.ee_udd ec where "REGIME_COMPENSAZIONE" <> 'N/D'AND "MESE" = ? 
      and "ANNO" = ? group by "REGIME_COMPENSAZIONE" order by count(distinct"COD_POD") DESC
      `,
        [mese, anno]
      );
      return response.send({ status: "success", data: query.rows, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tableInfoBonusInformation({ request, response }) {
    try {
      const { anno, mese, search } = request.all();
      let finalDip = [mese, anno];
      let createQuery = `select distinct "COD_POD","REGIME_COMPENSAZIONE",
      case when "BE_DATA_INIZIO" <> '' AND LENGTH("BE_DATA_INIZIO") = 6 then to_date("BE_DATA_INIZIO",'yymmdd') end as "BE_DATA_INIZIO",
      case when "BE_DATA_FINE" <> '' AND LENGTH("BE_DATA_FINE") = 6 then to_date("BE_DATA_FINE",'yymmdd') end as "BE_DATA_FINE",
      case when "BE_DATA_RINNOVO" <> '' AND LENGTH("BE_DATA_RINNOVO") = 4 then to_date("BE_DATA_RINNOVO",'yymm') end as "BE_DATA_RINNOVO",
      case when "BF_DATA_INIZIO" <> '' AND LENGTH("BF_DATA_INIZIO") = 6 then to_date("BF_DATA_INIZIO",'yymmdd') end as "BF_DATA_INIZIO",
      case when "BF_DATA_FINE" <> '' AND LENGTH("BF_DATA_FINE") = 6 then to_date("BF_DATA_FINE",'yymmdd') end as "BF_DATA_FINE" ,
      case when "BF_DATA_RINNOVO" <> '' AND LENGTH("BF_DATA_RINNOVO") = 4 then to_date("BF_DATA_RINNOVO",'yymm') end as "BE_DATA_RINNOVO"
      from ${request.headers().tenant_ee}.ee_udd ec where "REGIME_COMPENSAZIONE" <> 'N/D'  
      and "MESE" = ? and "ANNO" = ? `;
      if (search) {
        createQuery += `and left("COD_POD",14) ilike ?`;
        finalDip = [mese, anno, "%" + search + "%"];
      }
      createQuery += `group by "REGIME_COMPENSAZIONE","COD_POD","BE_DATA_INIZIO","BE_DATA_FINE","BE_DATA_RINNOVO","BF_DATA_INIZIO" ,"BF_DATA_FINE","BF_DATA_RINNOVO" order by "REGIME_COMPENSAZIONE" DESC
      `;
      const query = await Database.connection("rcu").raw(createQuery, finalDip);
      return response.send({ status: "success", data: query.rows, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualeIncrementoBonusInformation({ request, response }) {
    try {
      const { mese, anno } = request.all();
      let finalValue = [];
      let query = await Database.connection("rcu").raw(
        `select count(distinct"COD_POD")as TOTALE,"ANNO" from ${request.headers().tenant_ee}.ee_udd ec where "REGIME_COMPENSAZIONE" <> 'N/D' AND 
      "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO"`,
        [mese, anno, anno - 2]
      );
      if (query.rows.length > 0) {
        for (let i = query.rows.length - 1; i >= 0; i--) {
          if (i != 0) {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2),
                  percIniziale: (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2),
                },
              ],
            });
          } else {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: 0,
                  percIniziale: 0,
                },
              ],
            });
          }
        }
      }
      return response.send({ status: "success", data: finalValue.reverse(), message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualeIncrementoPodInformation({ request, response }) {
    try {
      const { mese, anno } = request.all();
      let finalValue = [];
      let query = await Database.connection("rcu").raw(`select count("COD_POD") as TOTALE,"ANNO" from ${request.headers().tenant_ee}.ee_udd fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `, [mese, anno, anno - 2]);
      if (query.rows.length > 0) {
        for (let i = query.rows.length - 1; i >= 0; i--) {
          if (i != 0) {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2),
                  percIniziale: (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2),
                },
              ],
            });
          } else {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: 0,
                  percIniziale: 0,
                },
              ],
            });
          }
        }
      }
      return response.send({ status: "success", data: finalValue.reverse(), message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualeIncrementoVolumeInformation({ request, response }) {
    try {
      const { mese, anno } = request.all();
      let finalValue = [];
      let query = await Database.connection("rcu").raw(`select coalesce(ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2),0) as TOTALE,"ANNO" from ${request.headers().tenant_ee}.ee_udd fr where "MESE" = ? and "ANNO" <= ? and "ANNO" >= ? group by "ANNO" order by "ANNO" `, [mese, anno, anno - 2]);
      if (query.rows.length > 0) {
        for (let i = query.rows.length - 1; i >= 0; i--) {
          if (i != 0) {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2),
                  percIniziale: (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2),
                },
              ],
            });
          } else {
            finalValue.push({
              name: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
              data: [
                {
                  x: `${mesi[mese - 1]} - ${query.rows[i].ANNO} `,
                  y: query.rows[i].totale,
                  percPrecedente: 0,
                  percIniziale: 0,
                },
              ],
            });
          }
        }
      }
      return response.send({ status: "success", data: finalValue.reverse(), message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualePodInformation({ request, response }) {
    try {
      const { anno, mese } = request.all();
      let finalValue = {};
      let query = await Database.connection("rcu").raw(
        `select count("COD_POD") as totale ,"MESE","ANNO" from  ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? and "MESE" >= ? and left("COD_POD",14) 
      in (select left("COD_POD",14) from  ${request.headers().tenant_ee}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?) group by "MESE","ANNO" order by "MESE","ANNO" `,
        [anno, mese, mese, anno]
      );
      let totale = [];
      if (query.rows.length > 0) {
        for (let i = query.rows.length - 1; i >= 0; i--) {
          if (i != 0) {
            totale.push({
              x: `${mesiDispacciamento[query.rows[i].MESE - 1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y: query.rows[i].totale,
              percMensile: (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2),
              percAnnuale: (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2),
            });
          } else {
            totale.push({
              x: `${mesiDispacciamento[query.rows[i].MESE - 1].toUpperCase()} - ${query.rows[i].ANNO}`,
              y: query.rows[i].totale,
              percMensile: 0,
              percAnnuale: 0,
            });
          }
        }
        finalValue.series = [{ name: "TOTALE POD", data: totale.reverse() }];
      }
      return response.send({ status: "success", data: finalValue, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualePodLast3YearsInformation({ request, response }) {
    try {
      const { anno } = request.all();
      let series = [];
      for (let b = 2; b >= 0; b--) {
        const query = await Database.connection("rcu").raw(`select count(("COD_POD")) as totale,"ANNO","MESE" from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`, [anno - b]);
        let totale = [];
        for (let i = mesi.length - 1; i >= 0; i--) {
          if (anno - b == new Date().getFullYear()) {
            if (i <= new Date().getMonth()) totale.push({ x: mesi[i], y: 0, percMensile: 0, percAnnuale: 0 });
          } else totale.push({ x: mesi[i], y: 0, percMensile: 0, percAnnuale: 0 });
        }
        // console.log(totale)
        if (query.rows.length > 0) {
          for (let i = query.rows.length - 1; i >= 0; i--) {
            for (let k in totale) {
              if (totale[k].x === `${mesi[query.rows[i].MESE - 1]}`) {
                if (i != 0) {
                  (totale[k].y = query.rows[i].totale), (totale[k].percMensile = (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2)), (totale[k].percAnnuale = (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2));
                } else {
                  (totale[k].y = query.rows[i].totale), (totale[k].percMensile = 0), (totale[k].percAnnuale = 0);
                }
              }
            }
          }
          series.push({ name: (anno - b).toString(), data: totale.reverse() });
        }
      }
      return response.send({ status: "success", data: { series }, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualeVolumiLast3YearsInformation({ request, response }) {
    try {
      const { anno } = request.all();
      let series = [];
      for (let b = 2; b >= 0; b--) {
        const query = await Database.connection("rcu").raw(`select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2) as totale,"ANNO","MESE" from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? group by "ANNO","MESE" order by "ANNO","MESE"`, [anno - b]);
        let totale = [];
        for (let i = mesi.length - 1; i >= 0; i--) {
          if (anno - b == new Date().getFullYear()) {
            if (i <= new Date().getMonth()) totale.push({ x: mesi[i], y: 0, percMensile: 0, percAnnuale: 0 });
          } else totale.push({ x: mesi[i], y: 0, percMensile: 0, percAnnuale: 0 });
        }
        // console.log(totale)
        if (query.rows.length > 0) {
          for (let i = query.rows.length - 1; i >= 0; i--) {
            for (let k in totale) {
              if (totale[k].x === `${mesi[query.rows[i].MESE - 1]}`) {
                if (i != 0) {
                  (totale[k].y = query.rows[i].totale), (totale[k].percMensile = (((query.rows[i].totale - query.rows[i - 1].totale) / query.rows[i - 1].totale) * 100).toFixed(2)), (totale[k].percAnnuale = (((query.rows[i].totale - query.rows[0].totale) / query.rows[0].totale) * 100).toFixed(2));
                } else {
                  (totale[k].y = query.rows[i].totale), (totale[k].percMensile = 0), (totale[k].percAnnuale = 0);
                }
              }
            }
          }
          series.push({ name: (anno - b).toString(), data: totale.reverse() });
        }
      }
      return response.send({ status: "success", data: { series }, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAnnualeInformation({ request, response }) {
    try {
      const { anno } = request.all();
      let series = [];
      const totalPod = await Database.connection("rcu").raw(`select count("COD_POD") as totale,"MESE" from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? group by "MESE" order by "MESE"`, [anno]);
      let mesi = [];
      if (totalPod && totalPod.rows.length > 0) {
        mesi = totalPod.rows.map((el) => el.MESE);
        series.push({ name: "Totale Pod", type: "column", data: totalPod.rows.map((el) => el.totale) });
      }
      const totalGwh = await Database.connection("rcu").raw(`select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2) as totale,"MESE" from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? group by "MESE" order by "MESE"`, [anno]);
      if (totalGwh && totalGwh.rows.length > 0) {
        series.push({ name: "Totale Gwh", type: "line", data: totalGwh.rows.map((el) => el.totale) });
      }
      return response.send({ status: "success", data: { series, mesi }, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async sintesiInformation({ request, response }) {
    try {
      const { anno, mese } = request.all();
      let prevMese = mese - 1;
      let prevAnno = anno;
      let MinMonth = await await Database.connection("rcu").raw(`select min("MESE") from ${request.headers().tenant_ee}.ee_udd ec where "ANNO" = ?`, [anno]);
      let startMese = MinMonth.rows.length > 0 ? MinMonth.rows[0].min : `1`;
      if (mese == 1) {
        prevMese = 1;
        prevAnno = anno;
      }
      let query = await Database.connection("rcu").raw(
        `select 
      (
      (select count("COD_POD")::float from  ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_POD")::float from  ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
       case (select count("COD_POD")::float from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?) 
       WHEN 0 THEN 1 
       else (select count("COD_POD")::float from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_mensile 
      ,
      (
      (select count("COD_POD")::float from  ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?) -
      (select count("COD_POD")::float from  ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?)
      )
      /
      case (select count("COD_POD")::float from  ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?)  
      WHEN 0 THEN 1 
      else (select count("COD_POD")::float from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? AND "MESE" = ?) END
      *100.0
      as pod_inc_annuale,
      (
      (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?) end 
      *100 
      as vol_inc_mensile,
      (
      (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?) - 
      (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      ) / 
      case (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?)
      WHEN 0 THEN 1 
      else (select coalesce((sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000),0) as TOTALE from ${request.headers().tenant_ee}.ee_udd fr2 where "ANNO" = ? AND "MESE" = ?) END
      *100 
      as vol_inc_annuale`,
        [anno, mese, prevAnno, prevMese, prevAnno, prevMese, prevAnno, prevMese, anno, mese, anno, startMese, anno, startMese, anno, startMese, anno, mese, prevAnno, prevMese, prevAnno, prevMese, prevAnno, prevMese, anno, mese, anno, startMese, anno, startMese, anno, startMese]
      );
      return response.send({ status: "success", data: query.rows, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async tableInformation({ request, response }) {
    try {
      const { anno, mese } = request.all();
      const query = await Database.connection("rcu").raw(
        `select "RAGIONE_SOCIALE_CC" as societa, 
      count(DISTINCT"COD_POD") as pod,
      ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric)) /1000000,2) as gwh
      from ${request.headers().tenant_ee}.ee_udd fr where "ANNO" = ? and "MESE" = ? group by "RAGIONE_SOCIALE_CC" order by pod desc`,
        [anno, mese]
      );

      return response.send({ status: "success", data: query.rows, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async esportazione({ request, response }) {
    try {
      const { anno } = request.all();
      const getTotalForFornitore = await Database.connection("rcu")
        .from(request.headers().tenant_ee + ".ee_udd")
        .select("RAGIONE_SOCIALE_CC", "MESE")
        .where("ANNO", anno)
        .where((innerWhere) => {
          innerWhere.where("COD_POD", "!=", null);
          innerWhere.orWhere("COD_POD", "!=", "");
        })
        .count("* as TOTALE")
        .groupBy("MESE", "RAGIONE_SOCIALE_CC");
      const queryBuilder = {};
      queryBuilder.contPod = await this.createTotal(getTotalForFornitore);

      let getTotalConsumiForFornitore = await Database.connection("rcu").raw(`select "RAGIONE_SOCIALE_CC","MESE",sum(cast(replace("CONSUMO_TOT",',','.')  as float)) /1000000 as TOTALE from ${request.headers().tenant_ee}.ee_udd where "ANNO" = ? group by "RAGIONE_SOCIALE_CC","MESE" order by "MESE"`, [anno]);
      queryBuilder.contConsumi = await this.createTotal(getTotalConsumiForFornitore.rows);
      return await this.generateCsvRcu(queryBuilder);
    } catch (error) {
      console.log("err", error);
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async total(queryBuilder, contType, primary) {
    try {
      let finalText = "";
      const csvStringifier = createCsvStringifier({
        header: [
          { id: contType === "consumi" ? "gwh" : "N_POD", title: contType === "consumi" ? "GWh" : "N POD" },
          { id: "1", title: "GENNAIO" },
          { id: "2", title: "FEBBRAIO" },
          { id: "3", title: "MARZO" },
          { id: "4", title: "APRILE" },
          { id: "5", title: "MAGGIO" },
          { id: "6", title: "GIUGNO" },
          { id: "7", title: "LUGLIO" },
          { id: "8", title: "AGOSTO" },
          { id: "9", title: "SETTEMBRE" },
          { id: "10", title: "OTTOBRE" },
          { id: "11", title: "NOVEMBRE" },
          { id: "12", title: "DICEMBRE" },
        ],
        fieldDelimiter: ";",
      });
      finalText += csvStringifier.getHeaderString();

      let choosedType = contType === "consumi" ? queryBuilder.contConsumi : queryBuilder.contPod;
      //AGGIUNGO RIGHE MESI PER FORNITORE
      for (const [key, value] of Object.entries(choosedType.fornitori)) {
        let finalObject = contType === "consumi" ? { gwh: key } : { N_POD: key };
        finalText += await csvStringifier.stringifyRecords([{ ...finalObject, ...value }]);
      }
      //AGGIUNGO TOTALE RIGHE MESI
      let finalTotalObject = contType === "consumi" ? { gwh: "TOT GWh" } : { N_POD: "TOT N POD" };
      finalText += await csvStringifier.stringifyRecords([{ ...finalTotalObject, ...choosedType.totale }]);
      return finalText;
    } catch (error) {
      console.log("err", error);
    }
  }

  async generateCsvRcu(queryBuilder) {
    try {
      let finalText = "";
      finalText += await this.total(queryBuilder, "pod");
      finalText += await this.total(queryBuilder, "consumi");
      return finalText;
      fs.writeFile("utility/fatturazione/final.csv", finalText);
    } catch (error) {
      console.log("err", error);
    }
  }

  async insert({ response, request }) {
    var { mese, anno, fatturazione_file } = request.all();
    try {
      const key_code = request.header("Secret-Key");
      var tokenUser = await Token.query().where("token", "=", key_code).first();
      await this.zipFile(fatturazione_file, mese, anno, tokenUser, request);
      fsExtra.unlinkSync(Env.get("RCU_PATH") + "/" + fatturazione_file);
      return response.send({ status: "success", data: "", message: `Importazione avviata ` });
    } catch (error) {
      fsExtra.unlinkSync(Env.get("RCU_PATH") + "/" + fatturazione_file);
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async zipFile(zip_file_name, mese, anno, tokenUser, request) {
    try {
      const unzipper = require("unzipper");
      let buffer = fsExtra.readFileSync(Env.get("RCU_PATH") + "/" + zip_file_name);
      var directory = await unzipper.Open.buffer(buffer);
      for (let i in directory.files) {
        var parentBuffer = await unzipper.Open.buffer(await directory.files[i].buffer());
        for (let b in parentBuffer.files) {
          await this.generateCsv(parentBuffer.files[b], mese, anno, tokenUser, request);
        }
      }
    } catch (error) {
      console.log("err", error);
    }
  }

  async generateCsv(csv, mese, anno, tokenUser, request) {
    const trx = await Database.connection("rcu").beginTransaction();
    let fattLog = null;
    let checkExist = await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).where("note", csv.path)
    .where(inner => {inner.where('status','completato').orWhere('status','in lavorazione')}).whereNot('deleted',true);
    if (checkExist.length == 0) {
      let fattLog = await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).insert({ note: csv.path, mese: mese, anno: anno, importati: 0, status: "in lavorazione", owner: tokenUser.username, owner_ip: tokenUser.ip_address }).returning("id");
      try {
        var counterTotal = 0;
        var csvBuffer = await csv.buffer();
        var datafile = csvBuffer
          .toString()
          .toString() // convert Buffer to string
          .split("\n") // split string to lines
          .map((e) => e.trim()) // remove white spaces for each line
          .map((e) => e.split(";").map((e) => e.trim())); // split each line to array
        //GET POSITION
        const positionObject = {};
        const positionArray = [];

        //MODIFICA CAMPI OBBLIGATORI
        for (let a in datafile[0]) {
          if (datafile[0][a] === "CONSUMO") datafile[0][a] = "CONSUMO_TOT";
        }

        //CONVERTE NOMI PER IL DB
        for (let a in datafile[0]) {
          for (let b in table) {
            if (table[b] === datafile[0][a]) {
              positionObject[a] = { value: table[b] };
              positionArray.push(a);
            }
          }
        }

        //CONTROLLA CAMPI OBBLIGATORI
        for (let i in NotNull) {
          if (!datafile[0].includes(NotNull[i])) throw {};
        }

        //INIZIO CREAZIONE ON DB
        for (let i in datafile) {
          if (i == 0) continue;
          let tempObject = {};
          for (let b in datafile[i]) {
            if (positionArray.includes(b) && !!datafile[i][b]) {
              if (datafile[i][b].startsWith(",")) datafile[i][b] = "0" + datafile[i][b];
              tempObject[positionObject[b].value] = datafile[i][b];
            }
          }
          if (Object.keys(tempObject).length > 0) {
            tempObject = { ...tempObject, MESE: mese, ANNO: anno };
            if (i == 1) {
              let check = trx.table(request.headers().tenant_ee + ".ee_udd");
              for (const [key, value] of Object.entries(tempObject)) {
                check.where(key, value);
              }
              check = await check;
              console.log("check",check)
              // await RcuEnergiaUdd.findBy(tempObject)
              if (check.length > 0) throw {};
            }
            // if(!check)
            if (tempObject.PIVA_UDD != tempObject.PIVA_CC) {
              counterTotal = counterTotal + 1;
              await trx.table(request.headers().tenant_ee + ".ee_udd").insert({ ...tempObject, ee_udd_histories_id: fattLog[0] });
              // await RcuEnergiaUdd.create({...tempObject,ee_udd_histories_id: fattLog.id}, trx)
            }
          }
        }
        await trx.table(`${request.headers().tenant_ee}.ee_udd_histories`).where("id", fattLog[0]).update({ importati: counterTotal, status: "completato" });
        trx.commit();

        return "Completato";
      } catch (e) {
        console.log("e", e);
        trx.rollback();
        await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).table(`${request.headers().tenant_ee}.ee_udd_histories`).where("id", fattLog[0]).update({ importati: 0, status: "in errore" });
        // await fattLog.save()
        throw e;
      }
    } else {
      console.log("gia esistente");
    }
  }

  async uploadZip({ response, request }) {
    try {
      const zipFile = request.file("zip_file");
      await mkdirp.sync(Env.get("RCU_PATH"));
      const zip_name = Date.now() + ".zip";
      await zipFile.move(Env.get("RCU_PATH"), { name: zip_name, overwrite: true });
      return response.send(zip_name);
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async getHistory({ response, request }) {
    try {
      var fatt = await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).where("deleted", false).orderBy("anno", "desc").orderBy("mese", "desc");
      return response.send({ status: "success", data: fatt, message: null });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async getStatusImport({ response, request }) {
    try {
      const fatt = await Database.connection("rcu").table(`${request.headers().tenant_ee}.ee_udd_histories`).where("deleted", false).where("status", "=", "in lavorazione").getCount();
      if (fatt == 1) return response.send({ status: "success", data: { status: "in lavorazione" }, message: null });
      else return response.send({ status: "success", data: { status: "completato" }, message: null });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async graficoAvanzatoTotalePerditaPod({ request, response }) {
    try {
      var { annopartenza, mese, anno } = request.all();
      let tenant = request.headers().tenant_ee;
      let value = await this._graficoATPPFunc({ annopartenza, mese, anno }, tenant);
      return response.send({ status: "success", data: value, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _graficoATPPFunc(request, tenant) {
    try {
      var { annopartenza, mese, anno } = request;
      let currentDate = `${anno}-${mese}-01`;
      let keyRedis = `_graficoATPPFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`;
      let finalValue = {
        labels: [],
        series: [
          { name: "Inizio", data: [], type: "bar" },
          { name: "Oggi", data: [], type: "bar" },
        ],
      };

      const cachedGraficoAvanzato = await Redis.get(keyRedis);
      if (cachedGraficoAvanzato) {
        return JSON.parse(cachedGraficoAvanzato);
      }

      let queryLast = await Database.connection("rcu").raw(`select "MESE","ANNO" from ${tenant}.ee_udd ec order by "ANNO" asc,"MESE" asc limit 1 `);
      let queryLastDate = `01/${queryLast.rows[0].MESE <= 9 ? "0" + queryLast.rows[0].MESE.toString() : queryLast.rows[0].MESE.toString()}/${queryLast.rows[0].ANNO}`;
      queryLastDate = moment(queryLastDate, "DD/MM/YYYY");
      do {
        let prevMonth = mese - 1;
        let prevYear = anno;
        if (mese == 1) {
          prevMonth = 12;
          prevYear = anno - 1;
        }
        let currentDateTemp = `01/${prevMonth <= 9 ? "0" + prevMonth.toString() : prevMonth}/${prevYear}`;
        currentDateTemp = moment(currentDateTemp, "DD/MM/YYYY");
        if (currentDateTemp >= queryLastDate) {
          let query = await Database.connection("rcu").raw(
            `select count(distinct(left("COD_POD",14))) as totale from ${tenant}.ee_udd ec where 
          left("COD_POD",14) in 
            (
              select distinct(left("COD_POD",14)) as COD_POD from ${tenant}.ee_udd fr2 where "ANNO" = ? and "MESE" = ? 
              and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)
            ) and to_date(concat("ANNO","MESE"),'yyyymm') = ?`,
            [anno, mese, prevMonth, prevYear, currentDate]
          );

          let queryAttivazione = await Database.connection("rcu").raw(
            `select count(distinct(left("COD_POD",14))) as totale from ${tenant}.ee_udd fr2 
          where "ANNO" = ? and "MESE" = ? 
          and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)`,
            [anno, mese, prevMonth, prevYear]
          );
          finalValue.labels.push(`${mesiDispacciamento[mese - 1].toUpperCase()} - ${anno}`);
          if (queryAttivazione.rows.length > 0) {
            finalValue.series[0].data.push(queryAttivazione.rows[0].totale);
          } else {
            finalValue.series[0].data.push(0);
          }

          if (query.rows.length > 0) {
            finalValue.series[1].data.push(query.rows[0].totale);
          } else {
            finalValue.series[1].data.push(0);
          }
        }
        mese = mese - 1;
        if (mese == 0) {
          mese = 12;
          anno = anno - 1;
        }
      } while (!(anno == annopartenza - 1));
      finalValue.labels.reverse();
      finalValue.series[0].data.reverse();
      finalValue.series[1].data.reverse();
      await Redis.set(keyRedis, JSON.stringify(finalValue));
      return finalValue;
    } catch (error) {
      console.log("err", error);
      throw error;
    }
  }

  // async _graficoATPPFuncv2(request,tenant){
  //   try {
  //     var {annopartenza,mese,anno} = request
  //     let keyRedis = `_graficoATPPFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`
  //     const cachedGraficoAvanzato = await Redis.get(keyRedis)
  //     if (cachedGraficoAvanzato) {
  //       return JSON.parse(cachedGraficoAvanzato)
  //     }
  //     let finalValue =  {labels:[],series:[{"name":"Inizio", data: [],type:'bar'},{"name":"Oggi", data: [],type:'bar'}]}
  //     do {
  //       let valUnionDisp = `${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`

  //       let queryDetail = await Database.connection('rcu')
  //         .raw(`select count(distinct(left("COD_POD",14))) as totale, "MESE" ,"ANNO"
  //         from ${tenant}.ee_udd fr  where right("DATA_INIZIO_DISPACCIAMENTO" ,6)
  //         ilike ? and left("COD_POD",14) in (select distinct(left("COD_POD",14))
  //         from ${tenant}.ee_udd fr where right("DATA_INIZIO_DISPACCIAMENTO" ,6)
  //         ilike ? and "MESE" = ? and "ANNO" = ?) group by "MESE","ANNO" order by "ANNO","MESE"`,[valUnionDisp,valUnionDisp,mese,anno])
  //       if(queryDetail.rows.length > 0) {
  //         finalValue.labels.push(valUnionDisp.toUpperCase())
  //         finalValue.series[0].data.push(queryDetail.rows[0].totale)
  //         finalValue.series[1].data.push(queryDetail.rows[queryDetail.rows.length-1].totale)
  //       }
  //         mese = mese-1
  //     if(mese == 0) {
  //       mese = 12
  //       anno = anno -1
  //     }

  //     } while (!(anno == annopartenza-1));

  //     finalValue.labels.reverse()
  //     finalValue.series[0].data.reverse()
  //     finalValue.series[1].data.reverse()
  //     await Redis.set(keyRedis, JSON.stringify(finalValue))
  //     return finalValue
  //   } catch (error) {
  //     console.log("err",error)
  //     throw error
  //   }

  // }

  async tableTassoAbbandono({ request, response }) {
    try {
      const { annopartenza, mese, anno, limitElements } = request.all();
      let tenant = request.headers().tenant_ee;
      let value = await this._tableTAFunc({ annopartenza, mese, anno, limitElements }, tenant);
      return response.send({ status: "success", data: value, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _tableTAFunc(request, tenant) {
    try {
	    console.log('in tasso abbandono');
      var { annopartenza, mese, anno, limitElements } = request;
      let keyRedis = `_tableTAFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}_${limitElements}`;
      const cachedTassoAbbandono = await Redis.get(keyRedis);
      if (!cachedTassoAbbandono) {
        return JSON.parse(cachedTassoAbbandono);
      }
      let limitK = limitElements;
      let vista = "percentuale";
      let query = await Database.connection("rcu").raw(`select "MESE" as competenza_mese ,"ANNO" as competenza_anno from ${tenant}.ee_udd ec where "ANNO" >= ? group by "MESE","ANNO" order by "ANNO" ,"MESE"`, annopartenza);
      if (query.rows.length > 0) {
        for (let i in query.rows) {
          query.rows[i].competenza = `${mesiDispacciamento[query.rows[i].competenza_mese - 1]}-${query.rows[i].competenza_anno.toString().slice(-2)}`;
        }
      }

      let table = [];
      let table2 = [];
      let headers = ["competenza"];
      let headersQuarter = [];
      let bigger = null;
      let lower = null;
      let biggerQuarter = null;
      let lowerQuarter = null;

      if (query.rows.length > 0) {
        let tempMonthYear = [];
        for (let i in query.rows) {
          tempMonthYear.push({ totale: 0, MESE: Number(query.rows[i].competenza_mese), ANNO: Number(query.rows[i].competenza_anno) });
        }
        for (let i in query.rows) {
          let currentDate = `${query.rows[i].competenza_anno}-${query.rows[i].competenza_mese}-01`;
          let prevMonth = query.rows[i].competenza_mese - 1;
          let prevYear = query.rows[i].competenza_anno;
          if (query.rows[i].competenza_mese == 1) {
            prevMonth = 12;
            prevYear = query.rows[i].competenza_anno - 1;
          }
          let tempHeaders = [];
          let valUnionDisp = query.rows[i].competenza;
          let innerMonth = Number(query.rows[i].competenza_mese);
          let innerYear = query.rows[i].competenza_anno;
          let queryDetail = await Database.connection("rcu").raw(
            `select count(distinct(left("COD_POD",14))) as totale,"MESE","ANNO" from ${tenant}.ee_udd ec 
          where 
          left("COD_POD",14) in 
            (
              select distinct(left("COD_POD",14)) as COD_POD from ${tenant}.ee_udd fr2 
              where "ANNO" = ? and "MESE" = ? 
              and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 
              where "MESE" = ? and "ANNO" = ?)
            ) and to_date(concat("ANNO","MESE"),'yyyymm') >= ?
          group by ec."ANNO",ec."MESE"  order by "ANNO","MESE" `,
            [query.rows[i].competenza_anno, query.rows[i].competenza_mese, prevMonth, prevYear, currentDate]
          );
          if (queryDetail.rows.length > 0) {
            for (let c in queryDetail.rows) {
              queryDetail.rows[c].competenza = `${mesiDispacciamento[queryDetail.rows[c].MESE - 1]}-${queryDetail.rows[c].ANNO.toString().slice(-2)}`;
            }
          }
          let totale = {};
          let totale2 = {};
          let tempValue = [];
          tempMonthYear.forEach((el) => {
            if (new Date(`${el.ANNO}-${el.MESE}-01`) >= new Date(`${innerYear}-${innerMonth}-01`)) {
              let totale = queryDetail.rows.filter((fil) => fil.MESE == el.MESE && fil.ANNO == el.ANNO);
              if (totale.length > 0) tempValue.push(totale[0]);
              else tempValue.push(el);
            }
          });
          queryDetail.rows = tempValue;
          // console.log("quer",queryDetail.rows)
          if (queryDetail.rows.length - 1 >= 3 && (limitK >= 3 || limitK == 0)) {
            totale2["M1-3"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 6 && (limitK >= 6 || limitK == 0)) {
            totale2["M4-6"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 9 && (limitK >= 9 || limitK == 0)) {
            totale2["M7-9"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 12 && (limitK >= 12 || limitK == 0)) {
            totale2["M10-12"] = 0;
            totale2["M1-12"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 24 && (limitK >= 24 || limitK == 0)) {
            totale2["M1-24"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 36 && (limitK >= 36 || limitK == 0)) {
            totale2["M1-36"] = 0;
          }
          if (queryDetail.rows.length - 1 >= 48 && (limitK >= 48 || limitK == 0)) {
            totale2["M1-48"] = 0;
          }

          for (let k = queryDetail.rows.length - 1; k >= 0; k--) {
            if (k != 0) {
              if (limitK != 0 && k > limitK) continue;
              if (i == 0) tempHeaders.push(`M${k}`);
              let prevMonth = Number(queryDetail.rows[k - 1].totale);
              let currentMonth = Number(queryDetail.rows[k].totale);
              let startMonth = Number(queryDetail.rows[0].totale);
              if (Number(queryDetail.rows[k - 1].totale) < Number(queryDetail.rows[k].totale)) {
                queryDetail.rows[k].totale = Number(queryDetail.rows[k - 1].totale);
                currentMonth = Number(queryDetail.rows[k - 1].totale);
              }
              // else {
              if (k == 1 && queryDetail.rows[k].totale == null) totale[`M${k}`] = 0;
              else {
                if (vista === "percentuale") {
                  if (currentMonth && prevMonth) {
                    console.log(currentMonth, startMonth, prevMonth);
    		    totale[`M${k}`] = `${Number((((currentMonth - startMonth) / startMonth) * 100 - ((prevMonth - startMonth) / startMonth) * 100).toFixed(1))}`;
	 	    console.log(totale);
                  } else {
                    totale[`M${k}`] = "0";
                  }
                } else {
                  totale[`M${k}`] = `${Number((queryDetail.rows[k].totale - queryDetail.rows[0].totale - (queryDetail.rows[k - 1].totale - queryDetail.rows[0].totale)).toFixed(1))}`;
                }
              }
              // }
              if (Math.sign(totale[`M${k}`]) == -1) totale[`M${k}`] = Number(totale[`M${k}`]) * -1;
              if (Math.sign(totale[`M${k}`]) == 1) totale[`M${k}`] = Number(totale[`M${k}`]) * 1;

              if (!bigger || totale[`M${k}`] >= Number(bigger)) bigger = Number(totale[`M${k}`]);
              if (!lower || totale[`M${k}`] < Number(lower)) lower = Number(totale[`M${k}`]);
              if (k >= 1 && k <= 3 && totale2["M1-3"] !== undefined) {
                totale2["M1-3"] += Number(totale[`M${k}`]);
              }
              if (k >= 4 && k <= 6 && totale2["M4-6"] !== undefined) {
                totale2["M4-6"] += Number(totale[`M${k}`]);
              }
              if (k >= 7 && k <= 9 && totale2["M7-9"] !== undefined) totale2["M7-9"] += Number(totale[`M${k}`]);
              if (k >= 10 && k <= 12 && totale2["M10-12"] !== undefined) totale2["M10-12"] += Number(totale[`M${k}`]);
              if (k >= 1 && k <= 12 && totale2["M1-12"] !== undefined) totale2["M1-12"] += Number(totale[`M${k}`]);
              if (k >= 1 && k <= 24 && totale2["M1-24"] !== undefined) totale2["M1-24"] += Number(totale[`M${k}`]);
              if (k >= 1 && k <= 36 && totale2["M1-36"] !== undefined) totale2["M1-36"] += Number(totale[`M${k}`]);
              if (k >= 1 && k <= 48 && totale2["M1-48"] !== undefined) totale2["M1-48"] += Number(totale[`M${k}`]);
            } else if (i == 0) {
              if (queryDetail.rows.length - 1 >= 3 && (limitK >= 3 || limitK == 0)) {
                headersQuarter.push(`M1-3`);
              }
              if (queryDetail.rows.length - 1 >= 6 && (limitK >= 6 || limitK == 0)) {
                headersQuarter.push(`M4-6`);
              }
              if (queryDetail.rows.length - 1 >= 9 && (limitK >= 9 || limitK == 0)) {
                headersQuarter.push(`M7-9`);
              }
              if (queryDetail.rows.length - 1 >= 12 && (limitK >= 12 || limitK == 0)) {
                headersQuarter.push(`M10-12`);
                headersQuarter.push(`M1-12`);
              }
              if (queryDetail.rows.length - 1 >= 24 && (limitK >= 24 || limitK == 0)) {
                headersQuarter.push(`M1-24`);
              }
              if (queryDetail.rows.length - 1 >= 36 && (limitK >= 36 || limitK == 0)) {
                headersQuarter.push(`M1-36`);
              }
              if (queryDetail.rows.length - 1 >= 48 && (limitK >= 48 || limitK == 0)) {
                headersQuarter.push(`M1-48`);
              }
            }
          }
          headers.push(...tempHeaders.reverse());
          if (Object.keys(totale).length > 0) {
            table.push({ competenza: valUnionDisp, ...totale });
          }
          if (Object.keys(totale2).length > 0) {
            for (var [key, value] of Object.entries(totale2)) {
              if (key != "M1-12" && key != "M1-24" && key != "M1-36" && key != "M1-48") {
                if (!biggerQuarter || value > biggerQuarter) biggerQuarter = value;
                if (!lowerQuarter || value < lowerQuarter) lowerQuarter = value;
              }
            }

            table2.push({ competenza: valUnionDisp, ...totale2 });
          }
        }
      }

      if (bigger == 0) bigger = 100;
      if (biggerQuarter == 0) biggerQuarter = 100;
      let range = {
        range1: lower,
        range2: lower + ((bigger - lower) / 30) * 1,
        range3: lower + ((bigger - lower) / 30) * 2,
        range4: lower + ((bigger - lower) / 24) * 3,
        range5: lower + ((bigger - lower) / 18) * 4,
        range6: lower + ((bigger - lower) / 18) * 5,
        range7: lower + ((bigger - lower) / 12) * 6,
        range8: lower + ((bigger - lower) / 12) * 8,
        range9: bigger,
      };

      let rangeQuarter = {
        range1: lowerQuarter,
        range2: lowerQuarter + ((biggerQuarter - lower) / 30) * 1,
        range3: lowerQuarter + ((biggerQuarter - lower) / 30) * 2,
        range4: lowerQuarter + ((biggerQuarter - lower) / 24) * 3,
        range5: lowerQuarter + ((biggerQuarter - lower) / 18) * 4,
        range6: lowerQuarter + ((biggerQuarter - lower) / 18) * 5,
        range7: lowerQuarter + ((biggerQuarter - lower) / 12) * 6,
        range8: lowerQuarter + ((biggerQuarter - lower) / 12) * 8,
        range9: biggerQuarter,
      };
      let finalObject = { range, vista, headers, data: table, rangeQuarter, headersQuarter, dataQuarter: table2 };
      await Redis.set(keyRedis, JSON.stringify(finalObject));
      return finalObject;
    } catch (error) {
      throw error;
    }
  }

  // async _tableTAFunc(request,tenant) {
  //   try {
  //     var {annopartenza,mese,anno,limitElements} = request
  //     let keyRedis = `_tableTAFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}_${limitElements}`
  //     const cachedTassoAbbandono = await Redis.get(keyRedis)
  //     if (cachedTassoAbbandono) {
  //       return JSON.parse(cachedTassoAbbandono)
  //     }
  //     let limitK = limitElements
  //     let vista = 'percentuale'
  //     let query = await Database.connection('rcu')
  //     .raw(`
  //       select lower(right("DATA_INIZIO_DISPACCIAMENTO",6)) as competenza,
  //       case
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'gen' then '01'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'feb' then '02'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'mar' then '03'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'apr' then '04'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'mag' then '05'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'giu' then '06'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'lug' then '07'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'ago' then '08'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'set' then '09'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'ott' then '10'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'nov' then '11'
  //         when LEFT(RIGHT(lower("DATA_INIZIO_DISPACCIAMENTO"),6),3) ilike 'dic' then '12'
  //       end as competenza_mese,
  //       lower(right("DATA_INIZIO_DISPACCIAMENTO",2)) as competenza_anno
  //       from ${tenant}.ee_udd fr
  //       where lower(right("DATA_INIZIO_DISPACCIAMENTO",2)) >= ?
  //       group by
  //       competenza,
  //       competenza_anno,
  //       competenza_mese
  //       order by
  //       competenza_anno,
  //       competenza_mese`,[annopartenza.slice(-2)]
  //     )
  //     let table = []
  //     let table2 = []
  //     let headers = ['competenza']
  //     let headersQuarter = []
  //     let bigger = null
  //     let lower = null
  //     let biggerQuarter = null
  //     let lowerQuarter = null

  //     if(query.rows.length>0) {
  //       let tempMonthYear = []
  //         for(let i in query.rows){
  //           tempMonthYear.push({totale: 0,MESE:Number(query.rows[i].competenza_mese),ANNO:Number('20'+query.rows[i].competenza_anno)})
  //         }
  //       for(let i in query.rows) {
  //         let tempHeaders = []
  //         let valUnionDisp = query.rows[i].competenza
  //         let innerMonth = Number(query.rows[i].competenza_mese)
  //         let innerYear = '20'+query.rows[i].competenza_anno
  //         let queryDetail = await Database.connection('rcu')
  //         .raw(`select count(distinct(left("COD_POD",14))) as totale, "MESE" ,"ANNO"
  //         from ${tenant}.ee_udd fr  where right("DATA_INIZIO_DISPACCIAMENTO" ,6)
  //         ilike ? and left("COD_POD",14) in (select distinct(left("COD_POD",14))
  //         from ${tenant}.ee_udd fr where right("DATA_INIZIO_DISPACCIAMENTO" ,6)
  //         ilike ? and "MESE" = ? and "ANNO" = ?) group by "MESE","ANNO" order by "ANNO","MESE"`,[valUnionDisp,valUnionDisp,innerMonth,innerYear])
  //         let totale = {}
  //         let totale2 = {}
  //         let tempValue = []
  //         tempMonthYear.forEach(el=>{
  //           if(new Date(`${el.ANNO}-${el.MESE}-01`) >= new Date(`${innerYear}-${innerMonth}-01`)) {
  //             let totale = queryDetail.rows.filter(fil => fil.MESE == el.MESE && fil.ANNO == el.ANNO)
  //             if(totale.length > 0) tempValue.push(totale[0])
  //             else tempValue.push(el)
  //           }
  //         })
  //         queryDetail.rows = tempValue
  //         if(queryDetail.rows.length-1 >= 3 && (limitK >= 3 || limitK == 0)) {totale2['M1-3']= 0}
  //         if(queryDetail.rows.length-1 >= 6 && (limitK >= 6 || limitK == 0)){totale2['M4-6']= 0}
  //         if(queryDetail.rows.length-1 >= 9 && (limitK >= 9 || limitK == 0)){totale2['M7-9']= 0}
  //         if(queryDetail.rows.length-1 >= 12 && (limitK >= 12 || limitK == 0)) {totale2['M10-12']= 0;totale2['M1-12']= 0}
  //         if(queryDetail.rows.length-1 >= 24 && (limitK >= 24 || limitK == 0)){totale2['M1-24']= 0}
  //         if(queryDetail.rows.length-1 >= 36 && (limitK >= 36 || limitK == 0)){totale2['M1-36']= 0}
  //         if(queryDetail.rows.length-1 >= 48 && (limitK >= 48 || limitK == 0)) {totale2['M1-48']= 0}

  //         for(let k = queryDetail.rows.length-1; k>=0 ; k--){
  //           if(k != 0) {
  //             if(limitK != 0 && k > limitK) continue
  //             if(i == 0) tempHeaders.push(`M${k}`)
  //             let prevMonth = Number(queryDetail.rows[k-1].totale)
  //             let currentMonth = Number(queryDetail.rows[k].totale)
  //             let startMonth = Number(queryDetail.rows[0].totale)
  //             if(Number(queryDetail.rows[k-1].totale) < Number(queryDetail.rows[k].totale)) {
  //               totale[`M${k}`] = ((currentMonth -startMonth)/startMonth *100).toFixed(1)
  //               queryDetail.rows[k-1].totale = null
  //             }else {
  //               if(k==1 && queryDetail.rows[k].totale == null) totale[`M${k}`] = 0
  //               else {
  //                 if(vista === 'percentuale') {
  //                   if(currentMonth && prevMonth) {
  //                     totale[`M${k}`] = `${Number(
  //                       (
  //                         ((currentMonth -startMonth)/startMonth *100) - ((prevMonth - startMonth)/startMonth*100)
  //                       ).toFixed(1))}`
  //                     } else {totale[`M${k}`] = "0"}
  //                   }else {
  //                     totale[`M${k}`] = `${Number((((queryDetail.rows[k].totale-queryDetail.rows[0].totale)) -
  //                       ((queryDetail.rows[k-1].totale-queryDetail.rows[0].totale))).toFixed(1))}`
  //                     }
  //                 }
  //               }
  //                 if(Math.sign(totale[`M${k}`]) == -1) totale[`M${k}`] = Number(totale[`M${k}`])*-1
  //                 if(Math.sign(totale[`M${k}`]) == 1) totale[`M${k}`] = Number(totale[`M${k}`])*1

  //               if(!bigger || totale[`M${k}`] >= Number(bigger)) bigger = Number(totale[`M${k}`])
  //               if(!lower || totale[`M${k}`] < Number(lower)) lower = Number(totale[`M${k}`])
  //               if(k>=1 && k<=3 && totale2['M1-3'] !== undefined) {totale2['M1-3'] += Number(totale[`M${k}`])}
  //               if(k>=4 && k<=6 && totale2['M4-6'] !== undefined) {totale2['M4-6'] += Number(totale[`M${k}`])}
  //               if(k>=7 && k<=9 && totale2['M7-9'] !== undefined) totale2['M7-9'] += Number(totale[`M${k}`])
  //               if(k>=10 && k<=12 &&totale2['M10-12'] !== undefined) totale2['M10-12'] += Number(totale[`M${k}`])
  //               if(k>=1 && k<=12 && totale2['M1-12'] !== undefined) totale2['M1-12'] += Number(totale[`M${k}`])
  //               if(k>=1 && k<=24 && totale2['M1-24'] !== undefined) totale2['M1-24'] += Number(totale[`M${k}`])
  //               if(k>=1 && k<=36 && totale2['M1-36']!== undefined ) totale2['M1-36'] += Number(totale[`M${k}`])
  //               if(k>=1 && k<=48 && totale2['M1-48']!== undefined ) totale2['M1-48'] += Number(totale[`M${k}`])
  //           }else if(i == 0){
  //             if(queryDetail.rows.length-1 >= 3 && (limitK >= 3 || limitK == 0)) {headersQuarter.push(`M1-3`)}
  //             if(queryDetail.rows.length-1 >= 6 && (limitK >= 6 || limitK == 0)){headersQuarter.push(`M4-6`)}
  //             if(queryDetail.rows.length-1 >= 9 && (limitK >= 9 || limitK == 0)){headersQuarter.push(`M7-9`)}
  //             if(queryDetail.rows.length-1 >= 12 && (limitK >= 12 || limitK == 0)) {headersQuarter.push(`M10-12`);headersQuarter.push(`M1-12`)}
  //             if(queryDetail.rows.length-1 >= 24 && (limitK >= 24 || limitK == 0)){headersQuarter.push(`M1-24`)}
  //             if(queryDetail.rows.length-1 >= 36 && (limitK >= 36 || limitK == 0)){headersQuarter.push(`M1-36`)}
  //             if(queryDetail.rows.length-1 >= 48 && (limitK >= 48 || limitK == 0)) {headersQuarter.push(`M1-48`)}
  //           }
  //         }
  //         headers.push(...tempHeaders.reverse())
  //         if(Object.keys(totale).length>0) {
  //           table.push({competenza: valUnionDisp, ...totale})
  //         }
  //         if(Object.keys(totale2).length>0) {
  //           for (var [key, value] of Object.entries(totale2)) {
  //             if(key != 'M1-12' && key != 'M1-24' &&  key != 'M1-36' && key != 'M1-48') {
  //               if(!biggerQuarter || value> biggerQuarter) biggerQuarter = value
  //               if(!lowerQuarter || value< lowerQuarter) lowerQuarter = value
  //             }
  //           }

  //           table2.push({competenza: valUnionDisp,...totale2})
  //         }
  //       }
  //     }

  //     if(bigger ==0) bigger = 100
  //     if(biggerQuarter ==0) biggerQuarter = 100
  //     let range = {
  //       range1: lower,
  //       range2: lower + ((bigger-lower)/30 *1),
  //       range3: lower + ((bigger-lower)/30 *2),
  //       range4: lower + ((bigger-lower)/24 *3),
  //       range5: lower + ((bigger-lower)/18 *4),
  //       range6: lower + ((bigger-lower)/18 *5),
  //       range7: lower + ((bigger-lower)/12 *6),
  //       range8: lower + ((bigger-lower)/12 *8),
  //       range9: bigger,
  //     }

  //     let rangeQuarter = {
  //       range1: lowerQuarter,
  //       range2: lowerQuarter + ((biggerQuarter-lower)/30 *1),
  //       range3: lowerQuarter + ((biggerQuarter-lower)/30 *2),
  //       range4: lowerQuarter + ((biggerQuarter-lower)/24 *3),
  //       range5: lowerQuarter + ((biggerQuarter-lower)/18 *4),
  //       range6: lowerQuarter + ((biggerQuarter-lower)/18 *5),
  //       range7: lowerQuarter + ((biggerQuarter-lower)/12 *6),
  //       range8: lowerQuarter + ((biggerQuarter-lower)/12 *8),
  //       range9: biggerQuarter,
  //     }
  //     let finalObject = {range,vista,headers,data:table,rangeQuarter,headersQuarter,dataQuarter: table2}
  //     await Redis.set(keyRedis, JSON.stringify(finalObject))
  //     return finalObject
  //   } catch (error) {
  //     throw error
  //   }
  // }

  async andamentoAttDisatVolumi({ request, response }) {
    try {
      var { annopartenza, mese, anno } = request.all();
      let tenant = request.headers().tenant_ee;
      let value = await this._andamentoADVFunc({ annopartenza, mese, anno }, tenant);
      return response.send({ status: "success", data: value, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      console.log("error", error);
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _andamentoADVFunc(request, tenant) {
    try {
      var { annopartenza, mese, anno } = request;
      let keyRedis = `_andamentoADVFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`;
      const cachedAttDisatVolumi = await Redis.get(keyRedis);
      if (cachedAttDisatVolumi) {
        return JSON.parse(cachedAttDisatVolumi);
      }
      let maxPercent = null;
      let max = null;

      let object = {
        series: [
          { name: "Attivazioni", type: "column", data: [], dataPercent: [] },
          { name: "Disattivazioni", type: "column", data: [], dataPercent: [] },
          { name: "Totale Parco", type: "area", data: [], dataPercent: [] },
        ],
        labels: [],
      };

      let objectPercent = {
        series: [
          { name: "Attivazioni", type: "line", data: [] },
          { name: "Disattivazioni", type: "line", data: [] },
        ],
        labels: [],
      };
      let queryTotal = await Database.connection("rcu").raw(
        `select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale,"ANNO","MESE" from ${tenant}.ee_udd fr where 
      "ANNO" >= ? group by "ANNO","MESE" order by "ANNO","MESE"`,
        [annopartenza]
      );

      do {
        let prevMonth = mese - 1;
        let prevYear = anno;
        if (mese == 1) {
          prevMonth = 12;
          prevYear = anno - 1;
        }

        let query = await Database.connection("rcu").raw(
          `select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2 
        where "ANNO" = ? and "MESE" = ? 
        and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?) 
        group by "MESE","ANNO" order by "MESE","ANNO"`,
          [prevYear, prevMonth, mese, anno]
        );

        let queryAttivazione = await Database.connection("rcu").raw(
          `select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2 
        where "ANNO" = ? and "MESE" = ? 
        and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?) 
        group by "MESE","ANNO" order by "MESE","ANNO"`,
          [anno, mese, prevMonth, prevYear]
        );

        let corrispondenza = queryTotal.rows.filter((el) => el.MESE == mese && el.ANNO == anno);
        if (corrispondenza.length > 0) {
          object.series[2].data.push(corrispondenza[0].totale);
        }
        if (queryAttivazione.rows.length > 0 && query.rows.length > 0) {
          if (corrispondenza.length > 0) {
            let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale) / Number(corrispondenza[0].totale)) * 100).toFixed(1) : 0;
            let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale) / Number(corrispondenza[0].totale)) * 100).toFixed(1) : 0;
            objectPercent.series[0].data.push(serZeroPercent);
            objectPercent.series[1].data.push(serUnoPercent);
            if (!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
              if (Number(serZeroPercent) > Number(serUnoPercent)) maxPercent = Number(serZeroPercent);
              else maxPercent = Number(serUnoPercent);
            }
          }

          let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale) : 0;
          let serUno = query.rows.length > 0 ? Number(query.rows[0].totale) : 0;

          if (!max || serZero > max || serUno > max) {
            if (serZero > serUno) max = serZero;
            else max = serUno;
          }
          object.series[0].data.push(serZero);
          object.series[1].data.push(serUno);

          object.labels.push(`${mesiDispacciamento[mese - 1]}-${anno.toString().slice(-2)}`);
          objectPercent.labels.push(`${mesiDispacciamento[mese - 1]}-${anno.toString().slice(-2)}`);
        }
        mese = mese - 1;
        if (mese == 0) {
          mese = 12;
          anno = anno - 1;
        }
      } while (!(anno == annopartenza - 1));
      object.series[0].data.reverse();
      object.series[1].data.reverse();
      object.series[2].data.reverse();
      object.labels.reverse();
      objectPercent.series[0].data.reverse();
      objectPercent.series[1].data.reverse();
      objectPercent.labels.reverse();
      let finalObject = { maxPercent: Number(maxPercent), max: Number(max) > 2 ? Number(max) + 10 : Number(max) + 1, assoluti: object, percentuale: objectPercent };
      await Redis.set(keyRedis, JSON.stringify(finalObject));
      return finalObject;
    } catch (error) {
      throw error;
    }
  }

  // async _andamentoADVFunc(request,tenant) {
  //   try {
  //     var {annopartenza,mese,anno} = request
  //     let keyRedis = `_andamentoADVFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`
  //     const cachedAttDisatVolumi = await Redis.get(keyRedis)
  //     if (cachedAttDisatVolumi) {
  //       return JSON.parse(cachedAttDisatVolumi)
  //     }
  //     let maxPercent = null
  //     let max = null

  //     let object = {series:[{name:'Attivazioni',type: 'column',data: [],dataPercent: []},
  //     {name:'Disattivazioni',type: 'column',data:[],dataPercent:[]},
  //     {name:'Totale Parco',type: 'area',data:[],dataPercent:[]},],labels:[]}

  //     let objectPercent = {series:[{name:'Attivazioni',type: 'line',data: []},
  //     {name:'Disattivazioni',type: 'line',data:[]}],labels:[]}
  //     let queryTotal = await Database.connection('rcu')
  //     .raw(`select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale,"ANNO","MESE" from ${tenant}.ee_udd fr where
  //     "ANNO" >= ? group by "ANNO","MESE" order by "ANNO","MESE"`,[annopartenza])

  //     do {
  //       let prevMonth = mese-1
  //       let prevYear = anno
  //       if(mese == 1) {
  //         prevMonth = 12
  //         prevYear = anno-1
  //       }

  //       let query =  await Database.connection('rcu')
  //       .raw(`select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2
  //       where "ANNO" = ? and "MESE" = ?
  //       and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)
  //       group by "MESE","ANNO" order by "MESE","ANNO"`,[prevYear,prevMonth,mese,anno])

  //       let queryAttivazione =  await Database.connection('rcu')
  //       .raw(`select ROUND(sum(cast(replace("CONSUMO_TOT",',','.')  as numeric))/1000000,2) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2
  //       where "ANNO" = ? and "MESE" = ?
  //       and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)
  //       group by "MESE","ANNO" order by "MESE","ANNO"`,[anno,mese,prevMonth,prevYear])

  //       let corrispondenza = queryTotal.rows.filter(el => el.MESE == mese && el.ANNO == anno)
  //       if(corrispondenza.length > 0) {
  //         object.series[2].data.push(corrispondenza[0].totale)
  //       }
  //       if(queryAttivazione.rows.length > 0 && query.rows.length > 0 ) {
  //         if(corrispondenza.length > 0) {
  //           let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale)/Number(corrispondenza[0].totale))*100).toFixed(1) : 0
  //           let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale)/Number(corrispondenza[0].totale))*100).toFixed(1): 0
  //           objectPercent.series[0].data.push(serZeroPercent)
  //           objectPercent.series[1].data.push(serUnoPercent)
  //           if(!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
  //             if(Number(serZeroPercent)>Number(serUnoPercent)) maxPercent = Number(serZeroPercent)
  //             else maxPercent = Number(serUnoPercent)
  //           }
  //         }

  //         let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale): 0
  //         let serUno = query.rows.length > 0 ? Number(query.rows[0].totale): 0

  //         if(!max || serZero > max || serUno > max) {
  //           if(serZero>serUno) max = serZero
  //           else max = serUno
  //         }
  //         object.series[0].data.push(serZero)
  //         object.series[1].data.push(serUno)

  //         object.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
  //         objectPercent.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
  //       }
  //       mese = mese-1
  //     if(mese == 0) {
  //       mese = 12
  //       anno = anno -1
  //     }
  //     } while (!(anno == annopartenza-1));
  //     object.series[0].data.reverse()
  //     object.series[1].data.reverse()
  //     object.series[2].data.reverse()
  //     object.labels.reverse()
  //     objectPercent.series[0].data.reverse()
  //     objectPercent.series[1].data.reverse()
  //     objectPercent.labels.reverse()
  //     let finalObject = {maxPercent: Number(maxPercent) <85 ? Number(maxPercent)+15 : 100,max: Number(max)> 2 ? Number(max)+10 : Number(max)+1,assoluti: object,percentuale: objectPercent}
  //     await Redis.set(keyRedis, JSON.stringify(finalObject))
  //     return finalObject
  //   } catch (error) {
  //     throw error
  //   }
  // }

  async andamentoAttDisatPod({ request, response }) {
    try {
      var { annopartenza, mese, anno } = request.all();
      let tenant = request.headers().tenant_ee;
      let value = await this._andamentoADPFunc({ annopartenza, mese, anno }, tenant);
      return response.send({ status: "success", data: value, message: `Ritorno di tutti le informazioni necessarie per la dashboard` });
    } catch (error) {
      return response.status(500).send({ status: "error", code: 500, data: null, message: error.message });
    }
  }

  async _andamentoADPFunc(request, tenant) {
    try {
      var { annopartenza, mese, anno } = request;
      let keyRedis = `_andamentoADPFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`;
      const cachedAttDisatPod = await Redis.get(keyRedis);
      if (cachedAttDisatPod) {
        return JSON.parse(cachedAttDisatPod);
      }
      let maxPercent = null;
      let max = null;

      let object = {
        series: [
          { name: "Attivazioni", type: "column", data: [], dataPercent: [] },
          { name: "Disattivazioni", type: "column", data: [], dataPercent: [] },
          { name: "Totale Parco", type: "area", data: [], dataPercent: [] },
        ],
        labels: [],
      };

      let objectPercent = {
        series: [
          { name: "Attivazioni", type: "line", data: [] },
          { name: "Disattivazioni", type: "line", data: [] },
        ],
        labels: [],
      };
      let queryTotal = await Database.connection("rcu").raw(
        `select count(distinct(left("COD_POD",14))) as totale,"ANNO","MESE" from ${tenant}.ee_udd fr where 
      "ANNO" >= ? group by "ANNO","MESE" order by "ANNO","MESE"`,
        [annopartenza]
      );

      do {
        let prevMonth = mese - 1;
        let prevYear = anno;
        if (mese == 1) {
          prevMonth = 12;
          prevYear = anno - 1;
        }

        let query = await Database.connection("rcu").raw(
          `select count(distinct(left("COD_POD",14))) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2 
        where "ANNO" = ? and "MESE" = ? 
        and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?) 
        group by "MESE","ANNO" order by "MESE","ANNO"`,
          [prevYear, prevMonth, mese, anno]
        );

        let queryAttivazione = await Database.connection("rcu").raw(
          `select count(distinct(left("COD_POD",14))) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2 
        where "ANNO" = ? and "MESE" = ? 
        and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?) 
        group by "MESE","ANNO" order by "MESE","ANNO"`,
          [anno, mese, prevMonth, prevYear]
        );

        let corrispondenza = queryTotal.rows.filter((el) => el.MESE == mese && el.ANNO == anno);
        if (corrispondenza.length > 0) {
          object.series[2].data.push(corrispondenza[0].totale);
        }
        if (queryAttivazione.rows.length > 0 && query.rows.length > 0) {
          if (corrispondenza.length > 0) {
            let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale) / Number(corrispondenza[0].totale)) * 100).toFixed(1) : 0;
            let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale) / Number(corrispondenza[0].totale)) * 100).toFixed(1) : 0;
            objectPercent.series[0].data.push(serZeroPercent);
            objectPercent.series[1].data.push(serUnoPercent);
            if (!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
              if (Number(serZeroPercent) > Number(serUnoPercent)) maxPercent = Number(serZeroPercent);
              else maxPercent = Number(serUnoPercent);
            }
          }
          let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale) : 0;
          let serUno = query.rows.length > 0 ? Number(query.rows[0].totale) : 0;

          if (!max || serZero > max || serUno > max) {
            if (serZero > serUno) max = serZero;
            else max = serUno;
          }
          object.series[0].data.push(serZero);
          object.series[1].data.push(serUno);

          object.labels.push(`${mesiDispacciamento[mese - 1]}-${anno.toString().slice(-2)}`);
          objectPercent.labels.push(`${mesiDispacciamento[mese - 1]}-${anno.toString().slice(-2)}`);
        }
        mese = mese - 1;
        if (mese == 0) {
          mese = 12;
          anno = anno - 1;
        }
      } while (!(anno == annopartenza - 1));
      object.series[0].data.reverse();
      object.series[1].data.reverse();
      object.series[2].data.reverse();
      object.labels.reverse();
      objectPercent.series[0].data.reverse();
      objectPercent.series[1].data.reverse();
      objectPercent.labels.reverse();
      let finalObject = { maxPercent: Number(maxPercent), max: Number(max) > 2 ? Number(max) + 10 : Number(max) + 1, assoluti: object, percentuale: objectPercent };
      await Redis.set(keyRedis, JSON.stringify(finalObject));
      return finalObject;
    } catch (error) {
      throw error;
    }
  }

  // async _andamentoADPFunc(request,tenant) {
  //   try {
  //     var {annopartenza,mese,anno} = request
  //     let keyRedis = `_andamentoADPFunc_RcuEnergiaUddController_${tenant}_${annopartenza}_${mese}_${anno}`
  //     const cachedAttDisatPod = await Redis.get(keyRedis)
  //     if (cachedAttDisatPod) {
  //       return JSON.parse(cachedAttDisatPod)
  //     }
  //     let maxPercent = null
  //     let max = null

  //     let object = {series:[{name:'Attivazioni',type: 'column',data: [],dataPercent: []},
  //     {name:'Disattivazioni',type: 'column',data:[],dataPercent:[]},
  //     {name:'Totale Parco',type: 'area',data:[],dataPercent:[]},],labels:[]}

  //     let objectPercent = {series:[{name:'Attivazioni',type: 'line',data: []},
  //     {name:'Disattivazioni',type: 'line',data:[]}],labels:[]}

  //     let queryTotal = await Database.connection('rcu')
  //     .raw(`select count(distinct(left("COD_POD",14))) as totale,"ANNO","MESE" from ${tenant}.ee_udd fr where
  //     "ANNO" >= ? group by "ANNO","MESE" order by "ANNO","MESE"`,[annopartenza])

  //     do {
  //       let prevMonth = mese-1
  //       let prevYear = anno
  //       if(mese == 1) {
  //         prevMonth = 12
  //         prevYear = anno-1
  //       }

  //       let query =  await Database.connection('rcu')
  //       .raw(`select count(distinct(left("COD_POD",14))) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2
  //       where "ANNO" = ? and "MESE" = ?
  //       and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)
  //       group by "MESE","ANNO" order by "MESE","ANNO"`,[prevYear,prevMonth,mese,anno])

  //       let queryAttivazione =  await Database.connection('rcu')
  //       .raw(`select count(distinct(left("COD_POD",14))) as totale ,"MESE","ANNO" from  ${tenant}.ee_udd fr2
  //       where "ANNO" = ? and "MESE" = ?
  //       and left("COD_POD",14) not in (select left("COD_POD",14) from ${tenant}.ee_udd fr2 where "MESE" = ? and "ANNO" = ?)
  //       group by "MESE","ANNO" order by "MESE","ANNO"`,[anno,mese,prevMonth,prevYear])

  //       let corrispondenza = queryTotal.rows.filter(el => el.MESE == mese && el.ANNO == anno)
  //       if(corrispondenza.length > 0) {
  //         object.series[2].data.push(corrispondenza[0].totale)
  //       }
  //       if(queryAttivazione.rows.length > 0 && query.rows.length > 0 ) {
  //         if(corrispondenza.length > 0) {
  //           let serZeroPercent = queryAttivazione.rows.length > 0 ? ((Number(queryAttivazione.rows[0].totale)/Number(corrispondenza[0].totale))*100).toFixed(1) : 0
  //           let serUnoPercent = query.rows.length > 0 ? ((Number(query.rows[0].totale)/Number(corrispondenza[0].totale)*100)).toFixed(1): 0
  //           objectPercent.series[0].data.push(serZeroPercent)
  //           objectPercent.series[1].data.push(serUnoPercent)
  //           if(!maxPercent || Number(serZeroPercent) > Number(maxPercent) || Number(serUnoPercent) > Number(maxPercent)) {
  //             if(Number(serZeroPercent)>Number(serUnoPercent)) maxPercent = Number(serZeroPercent)
  //             else maxPercent = Number(serUnoPercent)
  //           }
  //         }
  //         let serZero = queryAttivazione.rows.length > 0 ? Number(queryAttivazione.rows[0].totale) : 0
  //         let serUno = query.rows.length > 0 ? Number(query.rows[0].totale): 0

  //         if(!max || serZero > max || serUno > max) {
  //           if(serZero>serUno) max = serZero
  //           else max = serUno
  //         }
  //         object.series[0].data.push(serZero)
  //         object.series[1].data.push(serUno)

  //         object.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
  //         objectPercent.labels.push(`${mesiDispacciamento[mese-1]}-${anno.toString().slice(-2)}`)
  //       }
  //       mese = mese-1
  //     if(mese == 0) {
  //       mese = 12
  //       anno = anno -1
  //     }
  //     } while (!(anno == annopartenza-1));
  //     object.series[0].data.reverse()
  //     object.series[1].data.reverse()
  //     object.series[2].data.reverse()
  //     object.labels.reverse()
  //     objectPercent.series[0].data.reverse()
  //     objectPercent.series[1].data.reverse()
  //     objectPercent.labels.reverse()
  //     let finalObject = {maxPercent: Number(maxPercent),max: Number(max)> 1000 ? Number(max)+2000 : Number(max)+200,assoluti: object,percentuale: objectPercent}
  //     await Redis.set(keyRedis, JSON.stringify(finalObject))
  //     return finalObject
  //   } catch (error) {
  //     throw error
  //   }
  // }
}

module.exports = RcuEnergiaUddController;

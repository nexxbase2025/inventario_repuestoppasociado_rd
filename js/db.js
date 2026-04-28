const db = new Dexie("repuesto_pp_asociado_inventory");

db.version(2).stores({
  items: "id, sku, oem, category, brand, model, yearFrom, yearTo, stock, price, updatedAt, createdAt",
  sales: "id, itemId, sku, createdAt"
});

async function dbInitDefaults(){
  const settings = await getSettings();
  if(!settings){
    await setSettings({
      taxPercent: 0,
      currency: "USD",
      bizName: "Repuesto PP & Asociado",
      bizPhone: "(475) 279 1081",
      bizRnc: "",
      bizAddress: "C. A &, Santiago de los Caballeros 51000, RD",
      adminPin: ""
    });
  }
}

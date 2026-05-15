const db = new Dexie("asociado_auto_import_inventory");

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
      bizName: "Asociado Auto Import LLC",
      bizPhone: "475-279-1082",
      bizRnc: "",
      bizAddress: "17 Downs Street, Danbury, Connecticut 06810",
      adminPin: ""
    });
  }
}

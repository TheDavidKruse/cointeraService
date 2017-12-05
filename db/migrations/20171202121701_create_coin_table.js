
exports.up = function(knex, Promise) {
  return knex.schema.createTable(coins[i], function(table){
      table.increments();
      table.string('date');
      table.string('market-cap-usd');
      table.string('price-usd');
      table.string('24-hour-trade-vol-usd');
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable(coins[i]);
};


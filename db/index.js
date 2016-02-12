module.exports = (table, columns) => {
  return `index_${table}_on_${columns.join('_and_')}`;
}

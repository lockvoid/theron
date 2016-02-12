export const id = { type: 'int', primaryKey: true, autoIncrement: true };

export const foreignKey = (table, column) => {
  return { table: table, name: `reference_${column}_to_${table}`, mapping: 'id', rules: { onDelete: 'CASCADE', onUpdate: 'RESTRICT' } };
}

export const indexName = (table: string, columns: string[], unique: boolean): any[] => {
  return [table, `index_${table}_on_${columns.join('_and_')}`, columns, unique || false];
}

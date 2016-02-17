export const SQL = (parts, ...values) => {
  return { text: parts.reduce((prev, curr, index) => [prev, '$', index, curr].join('')), values };
}

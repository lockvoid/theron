export const pdel = `
  for _,k in ipairs(redis.call('keys', KEYS[1])) do
    redis.call('del', k)
  end
`;

export const toCamelCase = (str: string): string => {
  return str.replace(/([-_][a-z])/ig, (match) => {
    return match.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

export const keysToCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamelCase(v));
  }
  if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key);
      result[camelKey] = keysToCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

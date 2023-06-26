export const hasUniqueNumbers = (array: number[][]): boolean => {
  let previousNumbers: number[] = [];
  for (const numbers of array) {
    for (const number of numbers) {
      if (previousNumbers.some((n) => n === number)) {
        return false;
      }
      previousNumbers.push(number);
    }
  }
  return true;
};

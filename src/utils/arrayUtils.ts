export const hasUniqueNumbers = (array: number[][]): boolean => {
  let numbersString = "";
  for (const numbers of array) {
    for (const number of numbers) {
      const char = String(number);
      if (numbersString.includes(char)) {
        return false;
      }
      numbersString += char;
    }
  }
  return true;
};

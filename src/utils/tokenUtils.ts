const allowedCharacters: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

export function generateToken(length: number): string {
  var token: string = "";
  for (var i = 0; i < length; i++) {
    token += allowedCharacters[Math.floor(Math.random() * allowedCharacters.length)];
  }
  return token;
}
